import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Email from '#models/email'
import OpenAIService from '#services/openai_service'
import { cleanEmailForAI } from '#utils/email_cleaner'

export default class TestPackageExtraction extends BaseCommand {
  static commandName = 'test:package-extraction'
  static description = 'Test package extraction on a specific email ID'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'The email ID to test' })
  declare emailId: string

  async run() {
    const emailIdNum = parseInt(this.emailId, 10)
    this.logger.info(`Testing package extraction for email ID: ${emailIdNum}`)

    try {
      // 1. Fetch the email
      const email = await Email.findOrFail(emailIdNum)
      this.logger.info(`Email found: "${email.subject}" from ${email.from}`)

      // 2. Clean email content
      console.log('EMAIL', email)
      const cleaned = cleanEmailForAI(email.subject || '', email.snippet || '', email.body || '')
      this.logger.info(`Cleaned email: ${cleaned.body}`)

      const textToScan = cleaned.body || cleaned.snippet || ''

      this.logger.info(`Cleaned content length: ${textToScan.length} chars`)

      // 3. Call OpenAI service
      const openaiService = new OpenAIService()
      this.logger.info('Calling OpenAI package extraction...')
      this.logger.info(`Subject: ${cleaned.subject}`)
      this.logger.info(`From: ${email.from}`)
      this.logger.info(`Body: ${textToScan}`)
      const packageDetails = await openaiService.extractPackageDetails(
        cleaned.subject,
        email.from || '',
        textToScan
      )

      // 4. Display results
      this.logger.success('OpenAI Response:')
      console.log(JSON.stringify(packageDetails, null, 2))

      // 5. Validation check
      if (packageDetails) {
        this.logger.info('\n--- Validation ---')
        this.logger.info(`isOrderTracking: ${packageDetails.isOrderTracking}`)
        this.logger.info(`trackingNumber: ${packageDetails.trackingNumber || 'null'}`)
        this.logger.info(`brand: ${packageDetails.brand || 'null'}`)
        this.logger.info(`status: ${packageDetails.status || 'null'}`)
        this.logger.info(`carrier: ${packageDetails.carrier || 'null'}`)

        if (!packageDetails.isOrderTracking) {
          this.logger.warning('⚠️  This email is NOT an order tracking email')
        }

        if (!packageDetails.trackingNumber) {
          this.logger.warning('⚠️  No tracking number found')
        }
      } else {
        this.logger.error('OpenAI returned null')
      }
    } catch (error) {
      this.logger.error('Error during package extraction:')
      console.error(error)
      this.exitCode = 1
    }
  }
}
