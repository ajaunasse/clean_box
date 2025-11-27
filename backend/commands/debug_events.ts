import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import PackageEvent from '#models/package_event'
import Email from '#models/email'

export default class DebugEvents extends BaseCommand {
  static commandName = 'debug:events'
  static description = 'Debug events for an email account'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'Email account ID' })
  declare emailAccountId: string

  async run() {
    const emailAccountIdNum = parseInt(this.emailAccountId, 10)

    if (isNaN(emailAccountIdNum)) {
      this.logger.error('Invalid email account ID')
      return
    }

    // First, check if there are any emails for this account
    const emails = await Email.query().where('emailAccountId', emailAccountIdNum)

    this.logger.info(`Found ${emails.length} emails for account ${emailAccountIdNum}`)

    if (emails.length === 0) {
      this.logger.warning('No emails found for this account')
      return
    }

    this.logger.info(`Sample email IDs: ${emails.slice(0, 5).map((e) => e.id).join(', ')}`)

    // Now check for events
    const events = await PackageEvent.query()
      .whereHas('email', (emailQuery) => {
        emailQuery.where('emailAccountId', emailAccountIdNum)
      })
      .preload('email')

    this.logger.info(`Found ${events.length} events for account ${emailAccountIdNum}`)

    if (events.length > 0) {
      this.logger.info(`Sample event IDs: ${events.slice(0, 5).map((e) => e.id).join(', ')}`)
      this.logger.info(
        `Sample packageIds: ${events.slice(0, 5).map((e) => e.packageId || 'null').join(', ')}`
      )
      this.logger.info(
        `Sample order numbers: ${events.slice(0, 5).map((e) => e.orderNumber || 'N/A').join(', ')}`
      )

      // Count how many have packageId set
      const withPackageId = events.filter((e) => e.packageId !== null).length
      this.logger.info(`Events with packageId: ${withPackageId}`)
      this.logger.info(`Events without packageId: ${events.length - withPackageId}`)
    }
  }
}
