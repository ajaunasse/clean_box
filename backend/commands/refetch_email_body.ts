import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Email from '#models/email'
import GmailMessageFetcher from '#services/gmail_message_fetcher'

export default class RefetchEmailBody extends BaseCommand {
  static commandName = 'refetch:body'
  static description = 'Re-fetch email body from Gmail and update database'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'Email database ID' })
  declare emailId: string

  async run() {
    const emailIdNum = parseInt(this.emailId, 10)

    if (isNaN(emailIdNum)) {
      this.logger.error('Invalid email ID')
      return
    }

    try {
      // Find the email in database
      const email = await Email.query()
        .where('id', emailIdNum)
        .preload('emailAccount')
        .firstOrFail()

      this.logger.info(`Found email in database:`)
      this.logger.info(`  ID: ${email.id}`)
      this.logger.info(`  Gmail Message ID: ${email.gmailMessageId}`)
      this.logger.info(`  Subject: ${email.subject}`)
      this.logger.info(`  Current body length: ${email.body?.length || 0} chars`)
      this.logger.info(`  Current body is null: ${email.body === null}`)

      // Get GmailMessageFetcher service
      const fetcher = await this.app.container.make(GmailMessageFetcher)

      this.logger.info(`\nFetching message from Gmail...`)

      // Fetch the full message
      const gmailMessage = await fetcher.getMessage(
        email.emailAccount.accessToken,
        email.emailAccount.refreshToken,
        email.gmailMessageId
      )

      if (!gmailMessage) {
        this.logger.error('Failed to fetch message from Gmail')
        return
      }

      this.logger.info(`\n✅ Fetched from Gmail:`)
      this.logger.info(`  Body length: ${gmailMessage.body.length} chars`)
      this.logger.info(`  Body is empty: ${gmailMessage.body === ''}`)
      this.logger.info(`  Body preview (first 200 chars):`)
      this.logger.info(`    ${gmailMessage.body.substring(0, 200)}...`)

      // Update the email in database
      email.body = gmailMessage.body
      email.size = gmailMessage.size
      await email.save()

      this.logger.success(`\n✅ Updated email ${emailIdNum} in database!`)
      this.logger.info(`  New body length: ${email.body?.length || 0} chars`)
    } catch (error) {
      this.logger.error(`❌ Error: ${error.message}`)
      if (error.stack) {
        this.logger.error(`Stack trace:`)
        this.logger.error(error.stack)
      }
    }
  }
}
