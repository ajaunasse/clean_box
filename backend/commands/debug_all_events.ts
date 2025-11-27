import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import PackageEvent from '#models/package_event'

export default class DebugAllEvents extends BaseCommand {
  static commandName = 'debug:all-events'
  static description = 'Debug all events in the system'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const events = await PackageEvent.query().preload('email').orderBy('id', 'desc').limit(10)

    this.logger.info(`Total events in system: ${events.length}`)

    if (events.length > 0) {
      this.logger.info('Sample events:')
      for (const event of events) {
        this.logger.info(
          `  Event ${event.id}: emailId=${event.emailId}, emailAccountId=${event.email?.emailAccountId}, packageId=${event.packageId}, order=${event.orderNumber}`
        )
      }
    } else {
      this.logger.warning('No events found in the system!')
    }
  }
}
