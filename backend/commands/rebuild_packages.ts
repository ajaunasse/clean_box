import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Package from '#models/package'
import PackageEvent from '#models/package_event'
import EmailAccount from '#models/email_account'
import PackageExtractionService from '#services/package_extraction_service'

export default class RebuildPackages extends BaseCommand {
  static commandName = 'rebuild:packages'
  static description = 'Delete all packages for an email account and rebuild them from events'

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

    this.logger.info(`Rebuilding packages for email account ${emailAccountIdNum}...`)

    // Step 1: Get all packages for this email account
    const packages = await Package.query()
      .apply((scopes) => scopes.forUser(emailAccount.userId))
      .preload('email')

    this.logger.info(`Found ${packages.length} packages to delete`)

    // Step 2: Delete all packages (this will orphan the events)
    for (const pkg of packages) {
      await pkg.delete()
    }

    this.logger.info('All packages deleted')

    // Step 3: Reset packageId on all events for this account
    this.logger.info('Querying events for this account...')

    const events = await PackageEvent.query()
      .whereHas('email', (emailQuery) => {
        emailQuery.where('emailAccountId', emailAccountIdNum)
      })
      .preload('email')

    this.logger.info(`Found ${events.length} events`)

    if (events.length > 0) {
      this.logger.info(
        `Sample event IDs: ${events
          .slice(0, 5)
          .map((e) => e.id)
          .join(', ')}`
      )
      this.logger.info(
        `Sample packageIds: ${events
          .slice(0, 5)
          .map((e) => e.packageId || 'null')
          .join(', ')}`
      )
    }

    this.logger.info(`Resetting packageId for ${events.length} events`)

    for (const event of events) {
      event.packageId = null
      await event.save()
    }

    // Step 4: Rebuild packages from events using the aggregation service
    this.logger.info('Aggregating events into new packages...')

    const packageExtractionService = await this.app.container.make(PackageExtractionService)
    const packagesCreated =
      await packageExtractionService.aggregatePackagesFromEvents(emailAccountIdNum)

    this.logger.success(`✅ Rebuild complete!`)
    this.logger.info(`Created ${packagesCreated} packages from ${events.length} events`)
  }
}
