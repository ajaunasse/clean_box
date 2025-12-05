import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'packages'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('tracking_url').nullable().after('tracking_number')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('tracking_url')
    })
  }
}
