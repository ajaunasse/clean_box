import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Email from '#models/email'
import GmailOAuthService from '#services/gmail_o_auth_service'
import { google } from 'googleapis'

export default class TestGmailApi extends BaseCommand {
  static commandName = 'test:gmail'
  static description = 'Test Gmail API by fetching an email by its database ID'

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
      this.logger.info(`  From: ${email.from}`)
      this.logger.info(`  Sent At: ${email.sentAt}`)
      this.logger.info(`  Email Account: ${email.emailAccount.email}`)

      // Get OAuth service and create Gmail client
      const oauthService = await this.app.container.make(GmailOAuthService)
      const oauth2Client = oauthService.getClient(
        email.emailAccount.accessToken,
        email.emailAccount.refreshToken
      )

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

      this.logger.info(`\nFetching full message from Gmail API...`)

      // Fetch the full message from Gmail
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: email.gmailMessageId,
        format: 'full',
      })

      this.logger.info(`\n✅ Gmail API Response:`)
      this.logger.info(`  Message ID: ${response.data.id}`)
      this.logger.info(`  Thread ID: ${response.data.threadId}`)
      this.logger.info(`  Label IDs: ${response.data.labelIds?.join(', ')}`)
      this.logger.info(`  Snippet: ${response.data.snippet}`)
      this.logger.info(`  Size Estimate: ${response.data.sizeEstimate} bytes`)
      this.logger.info(`  Internal Date: ${response.data.internalDate}`)

      // Parse headers
      const headers = response.data.payload?.headers || []
      this.logger.info(`\n📧 Email Headers:`)
      const importantHeaders = ['From', 'To', 'Subject', 'Date', 'Content-Type', 'Message-ID']
      for (const headerName of importantHeaders) {
        const header = headers.find((h) => h.name === headerName)
        if (header) {
          this.logger.info(`  ${headerName}: ${header.value}`)
        }
      }

      // Body info
      const payload = response.data.payload
      this.logger.info(`\n📝 Payload Info:`)
      this.logger.info(`  MIME Type: ${payload?.mimeType}`)
      this.logger.info(`  Parts: ${payload?.parts?.length || 0}`)

      if (payload?.parts && payload.parts.length > 0) {
        this.logger.info(`\n  Parts breakdown:`)
        payload.parts.forEach((part, index) => {
          this.logger.info(`    Part ${index + 1}:`)
          this.logger.info(`      MIME Type: ${part.mimeType}`)
          this.logger.info(`      Filename: ${part.filename || '(none)'}`)
          if (part.body?.size) {
            this.logger.info(`      Size: ${part.body.size} bytes`)
          }
        })
      }

      // Raw body data
      if (payload?.body?.data) {
        this.logger.info(`\n  Body data size: ${payload.body.data.length} chars (base64)`)
        const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8')
        this.logger.info(`  Decoded preview (first 200 chars):`)
        this.logger.info(`    ${decoded.substring(0, 200)}...`)
      }

      // Full JSON dump (optional - can be very large)
      this.logger.info(`\n💾 Full JSON response saved to: /tmp/gmail-api-response.json`)
      const fs = await import('node:fs/promises')
      await fs.writeFile(
        '/tmp/gmail-api-response.json',
        JSON.stringify(response.data, null, 2),
        'utf-8'
      )

      this.logger.success(`\n✅ Test completed successfully!`)
    } catch (error) {
      this.logger.error(`❌ Error: ${error.message}`)
      if (error.response) {
        this.logger.error(`Gmail API Error Response:`)
        this.logger.error(JSON.stringify(error.response.data, null, 2))
      }
      if (error.stack) {
        this.logger.error(`Stack trace:`)
        this.logger.error(error.stack)
      }
    }
  }
}
