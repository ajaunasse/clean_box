import EmailAccount from '#models/email_account'
import GmailMessageFetcher from '#services/gmail_message_fetcher'
import PromoExtractionService from '#services/promo_extraction_service'
import PackageExtractionService from '#services/package_extraction_service'
import EmailRepository from '#repositories/email_repository'
import PromoCodeRepository from '#repositories/promo_code_repository'
import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'

@inject()
export default class GmailScanServiceV2 {
  constructor(
    protected gmailMessageFetcher: GmailMessageFetcher,
    protected promoExtractionService: PromoExtractionService,
    protected packageExtractionService: PackageExtractionService,
    protected emailRepository: EmailRepository,
    protected promoCodeRepository: PromoCodeRepository
  ) { }

  /**
   * Scan recent emails for promotions and package tracking
   */
  async scan(emailAccount: EmailAccount): Promise<number> {
    let processedCount = 0
    const messagesToDelete: string[] = []

    // 1. Fetch messages from both Gmail categories
    // Fetch promotional emails (for promo codes)
    const promoMessages = await this.gmailMessageFetcher.fetchMessages(
      emailAccount.accessToken,
      emailAccount.refreshToken,
      200,
      'promotions'
    )

    // Fetch updates/notifications (for package tracking)
    const updateMessages = await this.gmailMessageFetcher.fetchMessages(
      emailAccount.accessToken,
      emailAccount.refreshToken,
      200,
      'updates'
    )

    // Combine and deduplicate messages
    const allMessages = [...promoMessages, ...updateMessages]
    const uniqueMessages = Array.from(new Map(allMessages.map((m) => [m.id, m])).values())

    // Sort messages by date (oldest first) to ensure chronological processing
    // This is crucial for package deduplication logic - we want to create with oldest email
    // and update with newer ones
    const sortedMessages = uniqueMessages.sort((a, b) => {
      if (!a.internalDate || !b.internalDate) return 0
      return Number(a.internalDate) - Number(b.internalDate)
    })

    console.log(
      `Found ${sortedMessages.length} messages to scan for account ${emailAccount.id} (${promoMessages.length} promos, ${updateMessages.length} updates) - processing oldest first`
    )

    for (const msg of sortedMessages) {
      try {
        // Check if already processed
        const existing = await this.emailRepository.findByGmailMessageId(msg.id)
        if (existing) {
          continue
        }

        // 2. Get full message details
        const fullMessage = await this.gmailMessageFetcher.getMessage(
          emailAccount.accessToken,
          emailAccount.refreshToken,
          msg.id
        )

        if (!fullMessage) {
          continue
        }

        // 3. Save Email first (all emails, not just promos)
        const email = await this.emailRepository.create({
          emailAccountId: emailAccount.id,
          gmailMessageId: msg.id,
          subject: fullMessage.subject,
          from: fullMessage.from,
          to: fullMessage.to,
          sentAt: fullMessage.sentAt ? DateTime.fromRFC2822(fullMessage.sentAt) : null,
          snippet: fullMessage.snippet,
          body: fullMessage.body,
          size: fullMessage.size,
        })

        // 4. Extract promo details
        const extraction = await this.promoExtractionService.extract(
          fullMessage.subject,
          fullMessage.snippet,
          fullMessage.body,
          fullMessage.from
        )

        // 5. Only save promo codes if there's a promo code OR a discount
        const hasPromo = extraction.codes.length > 0 || extraction.discounts.length > 0

        let hasPackage = false

        if (hasPromo) {
          // Save Promo Codes
          for (const code of extraction.codes) {
            await this.promoCodeRepository.create({
              emailId: email.id,
              code,
              brand: extraction.brand,
              summary: extraction.summary,
              category: extraction.category,
              url: extraction.url,
              discountRaw: extraction.discounts[0] || null,
              expiresAt: extraction.expiresAt ? DateTime.fromISO(extraction.expiresAt) : null,
            })
          }

          // If no code but discount found, save it as a deal without code
          if (extraction.codes.length === 0 && extraction.discounts.length > 0) {
            await this.promoCodeRepository.create({
              emailId: email.id,
              code: null,
              brand: extraction.brand,
              summary: extraction.summary,
              category: extraction.category,
              url: extraction.url,
              discountRaw: extraction.discounts[0],
              expiresAt: extraction.expiresAt ? DateTime.fromISO(extraction.expiresAt) : null,
            })
          }
        } else {
          // 6. If no promo found, try to extract package tracking information
          hasPackage = await this.packageExtractionService.extract(
            email.id,
            fullMessage.subject,
            fullMessage.snippet,
            fullMessage.body,
            fullMessage.from
          )

          if (!hasPackage) {
            console.log(
              `Email ${msg.id} - no promo or package tracking found (saved for records)`
            )
          }
        }

        // Add to delete queue if auto-delete is enabled
        // ONLY delete promotional emails, NOT package tracking emails
        if (emailAccount.autoDeleteEmails && hasPromo && !hasPackage) {
          messagesToDelete.push(msg.id)
        }

        processedCount++
      } catch (error) {
        console.error(`Failed to process message ${msg.id}`, error)
      }
    }

    // 6. Delete emails from Gmail if auto-delete is enabled
    if (emailAccount.autoDeleteEmails && messagesToDelete.length > 0) {
      console.log(`Auto-delete enabled: moving ${messagesToDelete.length} emails to Gmail trash...`)
      const deletedCount = await this.gmailMessageFetcher.batchTrashMessages(
        emailAccount.accessToken,
        emailAccount.refreshToken,
        messagesToDelete
      )
      console.log(`Successfully moved ${deletedCount} emails to Gmail trash`)
    }

    // 7. Aggregate PackageEvents into Packages
    console.log('Aggregating PackageEvents into Packages...')
    const packagesCreated = await this.packageExtractionService.aggregatePackagesFromEvents(
      emailAccount.id
    )
    console.log(`Aggregation complete: ${packagesCreated} packages created/updated`)

    return processedCount
  }
}
