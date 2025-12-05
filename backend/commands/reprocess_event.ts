import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Email from '#models/email'
import PackageEvent from '#models/package_event'
import PackageExtractionService from '#services/package_extraction_service'

export default class ReprocessEvent extends BaseCommand {
  static commandName = 'reprocess:event'
  static description = 'Reprocess a package event by calling OpenAI again with the email content'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'Email ID' })
  declare emailId: string

  async run() {
    const emailIdNum = Number.parseInt(this.emailId, 10)

    if (Number.isNaN(emailIdNum)) {
      this.logger.error('Invalid email ID')
      return
    }

    // Find the email
    const email = await Email.find(emailIdNum)
    if (!email) {
      this.logger.error(`Email ${emailIdNum} not found`)
      return
    }

    this.logger.info(`Processing email ${emailIdNum}: ${email.subject}`)

    // Find existing package event for this email
    const existingEvent = await PackageEvent.query().where('emailId', emailIdNum).first()

    if (!existingEvent) {
      this.logger.error(`No package event found for email ${emailIdNum}`)
      return
    }

    this.logger.info(`Found existing event ${existingEvent.id}`)

    // Get extraction service
    const extractionService = await this.app.container.make(PackageExtractionService)

    // Use the extraction service with force=true to update existing event
    const result = await extractionService.extract(
      email.id,
      email.subject || '',
      email.snippet || '',
      email.body || '',
      email.from || '',
      true // force update
    )

    if (result) {
      // Reload the event to get updated data
      await existingEvent.refresh()
      const description = existingEvent.description ? JSON.parse(existingEvent.description) : {}

      this.logger.success(`✅ Event ${existingEvent.id} updated successfully!`)
      this.logger.info(`Order: ${existingEvent.orderNumber}`)
      this.logger.info(`Tracking: ${existingEvent.trackingNumber || 'N/A'}`)
      this.logger.info(`Brand: ${description.brand || 'N/A'}`)
      this.logger.info(`Items: ${description.items ? JSON.stringify(description.items) : 'N/A'}`)
      this.logger.info(`ItemName: ${description.itemName || 'N/A'}`)
    } else {
      this.logger.warning('Event was skipped (blacklisted sender or not a tracking email)')
    }
  }
}
