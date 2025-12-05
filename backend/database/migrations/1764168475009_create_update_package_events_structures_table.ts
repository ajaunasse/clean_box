import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'package_events'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Make package_id nullable (events created before packages)
      table.integer('package_id').unsigned().nullable().alter()

      // Add order_number to identify which order this event belongs to
      table.string('order_number', 255).nullable()

      // Add tracking_number to this specific event
      table.string('tracking_number', 255).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('order_number')
      table.dropColumn('tracking_number')

      // Restore package_id to not nullable (this might fail if there are null values)
      table.integer('package_id').unsigned().notNullable().alter()
    })
  }
}
