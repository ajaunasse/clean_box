import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'package_events'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table
        .integer('email_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('emails')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('email_id')
    })
  }
}
