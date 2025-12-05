import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'packages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Foreign key to emails table
      table
        .integer('email_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('emails')
        .onDelete('CASCADE')

      // Tracking information
      table.string('tracking_number', 255).notNullable()
      table.string('carrier', 100).nullable()
      table.string('carrier_raw', 255).nullable()
      table.string('status', 50).notNullable()

      // Order details
      table.string('brand', 255).nullable()
      table.text('item_name').nullable()
      table.string('order_number', 255).nullable()
      table.timestamp('order_date').nullable()

      // Delivery information
      table.timestamp('estimated_delivery').nullable()
      table.timestamp('actual_delivery').nullable()
      table.timestamp('last_checked_at').nullable()

      // Location information
      table.string('current_location', 255).nullable()
      table.string('destination_city', 255).nullable()
      table.string('destination_state', 100).nullable()
      table.string('destination_zip', 20).nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
