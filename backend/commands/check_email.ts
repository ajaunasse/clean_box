import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import Email from '#models/email'

export default class CheckEmail extends BaseCommand {
  static commandName = 'check:email'
  static description = 'Check if an email has promo codes or package tracking'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'The email ID to check' })
  declare emailId: string

  async run() {
    const emailIdNum = parseInt(this.emailId, 10)
    this.logger.info(`Checking email ID: ${emailIdNum}`)

    try {
      const email = await Email.query()
        .where('id', emailIdNum)
        .preload('promoCodes')
        .preload('packages')
        .first()

      if (!email) {
        this.logger.error('Email not found')
        return
      }

      this.logger.info(`Subject: "${email.subject}"`)
      this.logger.info(`From: ${email.from}`)
      this.logger.info(`Sent at: ${email.sentAt?.toISO() || 'unknown'}`)

      const hasPromos = email.promoCodes && email.promoCodes.length > 0
      const hasPackages = email.packages && email.packages.length > 0

      this.logger.info(`Has PromoCode: ${hasPromos}`)
      this.logger.info(`Has Package: ${hasPackages}`)

      if (hasPromos) {
        this.logger.info('\n--- Promo Codes ---')
        email.promoCodes.forEach((promo, idx) => {
          console.log(`  ${idx + 1}. Code: ${promo.code || 'N/A'}`)
          console.log(`     Discount: ${promo.discountRaw || 'N/A'}`)
          console.log(`     Brand: ${promo.brand || 'N/A'}`)
        })
      }

      if (hasPackages) {
        this.logger.info('\n--- Packages ---')
        email.packages.forEach((pkg, idx) => {
          console.log(`  ${idx + 1}. Tracking: ${pkg.trackingNumber}`)
          console.log(`     Brand: ${pkg.brand || 'N/A'}`)
          console.log(`     Status: ${pkg.status}`)
        })
      }

      if (!hasPromos && !hasPackages) {
        this.logger.warning('⚠️  This email has neither promo codes nor package tracking')
      }
    } catch (error) {
      this.logger.error('Error checking email:')
      console.error(error)
      this.exitCode = 1
    }
  }
}