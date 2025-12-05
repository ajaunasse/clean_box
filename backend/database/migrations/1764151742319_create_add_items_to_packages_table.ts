import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'packages'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Add items column as JSON
      table.json('items').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('items')
    })
  }
}
