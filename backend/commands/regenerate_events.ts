import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import EmailAccount from '#models/email_account'
import PackageEvent from '#models/package_event'
import PackageExtractionService from '#services/package_extraction_service'

export default class RegenerateEvents extends BaseCommand {
  static commandName = 'regenerate:events'
  static description = 'Regenerate all package events for an email account using OpenAI'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'Email account ID' })
  declare emailAccountId: string

  async run() {
    const emailAccountIdNum = Number.parseInt(this.emailAccountId, 10)

    if (Number.isNaN(emailAccountIdNum)) {
      this.logger.error('Invalid email account ID')
      return
    }

    // Verify email account exists
    const emailAccount = await EmailAccount.find(emailAccountIdNum)
    if (!emailAccount) {
      this.logger.error(`Email account ${emailAccountIdNum} not found`)
      return
    }

    this.logger.info(`🔄 Regenerating events for email account ${emailAccountIdNum}...`)

    // Get all package events for this account
    const events = await PackageEvent.query()
      .whereHas('email', (emailQuery) => {
        emailQuery.where('emailAccountId', emailAccountIdNum)
      })
      .preload('email')
      .orderBy('id', 'asc')

    this.logger.info(`Found ${events.length} events to regenerate`)

    if (events.length === 0) {
      this.logger.warning('No events found for this account')
      return
    }

    // Get extraction service
    const extractionService = await this.app.container.make(PackageExtractionService)

    let successCount = 0
    let errorCount = 0
    let skipCount = 0

    for (const [index, event] of events.entries()) {
      try {
        const email = event.email

        this.logger.info(
          `[${index + 1}/${events.length}] Processing event ${event.id} (email ${email.id})`
        )

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
          this.logger.info(`  ✅ Updated event ${event.id}`)
          successCount++
        } else {
          this.logger.warning(`  ⚠️  Skipped (blacklisted or not tracking email)`)
          skipCount++
        }

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 500))
      } catch (error) {
        this.logger.error(`  ❌ Failed to process event ${event.id}:`, error.message)
        errorCount++
      }
    }

    this.logger.success(`\n🎉 Regeneration complete!`)
    this.logger.info(`✅ Success: ${successCount}`)
    this.logger.info(`⚠️  Skipped: ${skipCount}`)
    this.logger.info(`❌ Errors: ${errorCount}`)
  }
}
