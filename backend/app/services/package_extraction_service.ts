import OpenAIService from '#services/openai_service'
import PackageRepository from '#repositories/package_repository'
import Email from '#models/email'
import PackageEvent from '#models/package_event'
import { inject } from '@adonisjs/core'
import { cleanEmailForAI } from '#utils/email_cleaner'
import { DateTime } from 'luxon'

@inject()
export default class PackageExtractionService {
  constructor(
    protected openaiService: OpenAIService,
    protected packageRepository: PackageRepository
  ) {}

  /**
   * Truncate item name to a reasonable length (for backwards compatibility)
   */
  private truncateItemName(itemName: string | null): string | null {
    if (!itemName) return null
    const maxLength = 80
    if (itemName.length <= maxLength) return itemName
    return itemName.substring(0, maxLength - 3) + '...'
  }

  /**
   * Generate a fallback itemName from items array for backwards compatibility
   */
  private generateItemNameFromItems(items: any[] | null): string | null {
    if (!items || items.length === 0) return null
    if (items.length === 1) return items[0].name
    return items.map((item) => item.name).join(', ')
  }

  /**
   * Email sender domains to skip (not order tracking emails)
   */
  private readonly BLACKLISTED_SENDERS = ['paypal.com', '@paypal.']

  /**
   * Check if email should be skipped based on sender blacklist
   */
  private shouldSkipEmail(sender: string): boolean {
    const senderLower = sender.toLowerCase()
    return this.BLACKLISTED_SENDERS.some((domain) => senderLower.includes(domain))
  }

  /**
   * Extract package tracking information from email content
   * Creates ONLY PackageEvent (no Package creation here)
   */
  async extract(
    emailId: number,
    subject: string,
    snippet: string,
    body: string | null,
    sender: string,
    force: boolean = false
  ): Promise<boolean> {
    try {
      // Skip blacklisted senders (e.g., PayPal payment notifications)
      if (this.shouldSkipEmail(sender)) {
        console.log(`Skipping blacklisted sender: ${sender}`)
        return false
      }

      // Check if we already have a PackageEvent for this email (avoid duplication)
      const existingEvent = await PackageEvent.query().where('emailId', emailId).first()
      if (existingEvent && !force) {
        console.log(`PackageEvent already exists for email ${emailId}, skipping`)
        return true
      }

      // Clean and truncate email content to avoid token limits
      const cleaned = cleanEmailForAI(subject, snippet, body || '')
      const textToScan = cleaned.body || cleaned.snippet || ''

      console.log(
        `Cleaned package email content: ${textToScan.length} chars (from ${(body || '').length} original)`
      )

      // Use OpenAI to extract package details
      const packageDetails = await this.openaiService.extractPackageDetails(
        cleaned.subject,
        sender,
        textToScan
      )

      // Check if it's actually an order tracking email
      if (!packageDetails || !packageDetails.isOrderTracking) {
        console.log('Email is not an order tracking email (isOrderTracking: false)')
        return false
      }

      // We need at least order number to identify the package
      if (!packageDetails.orderNumber) {
        console.log('No order number found - cannot identify package')
        return false
      }

      const email = await Email.findOrFail(emailId)

      // Parse dates
      const orderDate = packageDetails.orderDate ? DateTime.fromISO(packageDetails.orderDate) : null
      const estimatedDelivery = packageDetails.estimatedDelivery
        ? DateTime.fromISO(packageDetails.estimatedDelivery)
        : null

      // Use items if available
      const items = packageDetails.items
      const itemName = items
        ? this.truncateItemName(this.generateItemNameFromItems(items))
        : null

      const eventData = {
        packageId: existingEvent?.packageId || null, // Keep existing packageId if exists
        emailId,
        orderNumber: packageDetails.orderNumber, // PRIMARY identifier
        trackingNumber: packageDetails.trackingNumber, // Can be null or multiple per order
        status: packageDetails.status,
        location: packageDetails.currentLocation,
        description: JSON.stringify({
          brand: packageDetails.brand,
          items,
          itemName,
          orderDate: orderDate?.toISO(),
          estimatedDelivery: estimatedDelivery?.toISO(),
          trackingUrl: packageDetails.trackingUrl,
          carrier: packageDetails.carrier,
          carrierRaw: packageDetails.carrierRaw,
          destinationCity: packageDetails.destinationCity,
          destinationState: packageDetails.destinationState,
          destinationZip: packageDetails.destinationZip,
        }),
        eventTimestamp: email.sentAt || DateTime.now(),
      }

      // Update existing event or create new one
      if (existingEvent && force) {
        await existingEvent.merge(eventData).save()
        console.log(
          `Updated PackageEvent ${existingEvent.id} for order ${packageDetails.orderNumber}`
        )
      } else {
        await PackageEvent.create(eventData)
        console.log(
          `Created PackageEvent for order ${packageDetails.orderNumber} tracking ${packageDetails.trackingNumber || 'N/A'} (status: ${packageDetails.status})`
        )
      }

      return true
    } catch (error) {
      console.error('Package extraction failed:', error)
      return false
    }
  }

  /**
   * Aggregate all PackageEvents into Packages
   * Call this AFTER all emails have been scanned
   * Groups events by orderNumber and creates/updates Packages
   */
  async aggregatePackagesFromEvents(emailAccountId: number): Promise<number> {
    // Get all events without a packageId for this email account
    const orphanEvents = await PackageEvent.query()
      .whereNull('packageId')
      .whereHas('email', (emailQuery) => {
        emailQuery.where('emailAccountId', emailAccountId)
      })
      .preload('email')

    if (orphanEvents.length === 0) {
      console.log('No orphan events to aggregate')
      return 0
    }

    // Group events by orderNumber
    const eventsByOrder = new Map<string, typeof orphanEvents>()
    for (const event of orphanEvents) {
      if (!event.orderNumber) continue

      if (!eventsByOrder.has(event.orderNumber)) {
        eventsByOrder.set(event.orderNumber, [])
      }
      eventsByOrder.get(event.orderNumber)!.push(event)
    }

    console.log(`Aggregating ${eventsByOrder.size} orders from ${orphanEvents.length} events`)

    let packagesCreated = 0

    // For each orderNumber, create or update a Package
    for (const [orderNumber, events] of eventsByOrder) {
      try {
        // Sort events by timestamp
        const sortedEvents = events.sort((a, b) => {
          const aTime = a.eventTimestamp.toMillis()
          const bTime = b.eventTimestamp.toMillis()
          return aTime - bTime
        })

        // Find or create Package by orderNumber
        let pkg = await this.packageRepository.findByOrderNumber(orderNumber)

        // Aggregate data from all events
        let latestStatus = 'unknown'
        let latestLocation: string | null = null
        let latestTimestamp = DateTime.fromMillis(0)
        let brand: string | null = null
        let items: any = null
        let itemName: string | null = null
        let orderDate: DateTime | null = null
        let estimatedDelivery: DateTime | null = null
        const trackingNumbers: string[] = []
        let trackingUrl: string | null = null
        let carrier: string | null = null
        let carrierRaw: string | null = null
        let destinationCity: string | null = null
        let destinationState: string | null = null
        let destinationZip: string | null = null
        let actualDelivery: DateTime | null = null
        let firstEmailId = sortedEvents[0].emailId

        for (const event of sortedEvents) {
          try {
            const eventData = event.description ? JSON.parse(event.description) : {}

            // Keep most recent status and location
            if (event.eventTimestamp >= latestTimestamp) {
              latestStatus = event.status
              latestLocation = event.location
              latestTimestamp = event.eventTimestamp
            }

            // Collect all tracking numbers
            if (event.trackingNumber && !trackingNumbers.includes(event.trackingNumber)) {
              trackingNumbers.push(event.trackingNumber)
            }

            // Keep first occurrence of complete data
            if (!brand && eventData.brand) brand = eventData.brand
            if (!items && eventData.items) items = eventData.items
            if (!itemName && eventData.itemName) itemName = eventData.itemName
            if (!orderDate && eventData.orderDate) orderDate = DateTime.fromISO(eventData.orderDate)
            if (!trackingUrl && eventData.trackingUrl) trackingUrl = eventData.trackingUrl
            if (!carrier && eventData.carrier) carrier = eventData.carrier
            if (!carrierRaw && eventData.carrierRaw) carrierRaw = eventData.carrierRaw
            if (!destinationCity && eventData.destinationCity) destinationCity = eventData.destinationCity
            if (!destinationState && eventData.destinationState) destinationState = eventData.destinationState
            if (!destinationZip && eventData.destinationZip) destinationZip = eventData.destinationZip

            // Update estimated delivery if more recent info available
            if (eventData.estimatedDelivery) {
              const newEstimate = DateTime.fromISO(eventData.estimatedDelivery)
              if (!estimatedDelivery || newEstimate > estimatedDelivery) {
                estimatedDelivery = newEstimate
              }
            }

            // Set actual delivery if status is delivered
            if (event.status === 'delivered' && !actualDelivery) {
              actualDelivery = event.eventTimestamp
            }
          } catch (err) {
            console.error(`Failed to parse event ${event.id} description:`, err)
          }
        }

        // Use first tracking number or create composite if multiple
        const primaryTrackingNumber = trackingNumbers.length > 0
          ? trackingNumbers[0]
          : `ORDER-${orderNumber}`

        if (!pkg) {
          // Create new package
          pkg = await this.packageRepository.create({
            emailId: firstEmailId || undefined,
            trackingNumber: primaryTrackingNumber,
            trackingUrl,
            carrier,
            carrierRaw,
            status: latestStatus,
            brand,
            itemName,
            items,
            orderNumber,
            orderDate,
            estimatedDelivery,
            actualDelivery,
            currentLocation: latestLocation,
            destinationCity,
            destinationState,
            destinationZip,
          })
          packagesCreated++
          console.log(`Created package for order ${orderNumber} with ${trackingNumbers.length} tracking numbers`)
        } else {
          // Update existing package
          await this.packageRepository.update(pkg.id, {
            trackingNumber: primaryTrackingNumber,
            trackingUrl: trackingUrl || pkg.trackingUrl,
            carrier: carrier || pkg.carrier,
            carrierRaw: carrierRaw || pkg.carrierRaw,
            status: latestStatus,
            brand: pkg.brand || brand,
            itemName: pkg.itemName || itemName,
            items: pkg.items || items,
            orderNumber,
            orderDate: pkg.orderDate || orderDate,
            estimatedDelivery: estimatedDelivery || pkg.estimatedDelivery,
            actualDelivery: actualDelivery || pkg.actualDelivery,
            currentLocation: latestLocation || pkg.currentLocation,
            destinationCity: pkg.destinationCity || destinationCity,
            destinationState: pkg.destinationState || destinationState,
            destinationZip: pkg.destinationZip || destinationZip,
          })
          console.log(`Updated package for order ${orderNumber}`)
        }

        // Link all events to this package
        for (const event of sortedEvents) {
          event.packageId = pkg.id
          await event.save()
        }
      } catch (err) {
        console.error(`Failed to aggregate events for order ${orderNumber}:`, err)
      }
    }

    return packagesCreated
  }
}
