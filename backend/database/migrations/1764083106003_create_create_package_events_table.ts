import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'package_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Foreign key to packages table
      table
        .integer('package_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('packages')
        .onDelete('CASCADE')

      // Event details
      table.string('status', 50).notNullable()
      table.string('location', 255).nullable()
      table.text('description').nullable()
      table.timestamp('event_timestamp').notNullable()

      table.timestamp('created_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}