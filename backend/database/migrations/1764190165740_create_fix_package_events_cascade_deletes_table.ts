import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'package_events'

  async up() {
    this.schema.raw(`
      -- Drop the existing foreign key constraint with CASCADE
      ALTER TABLE ${this.tableName}
      DROP CONSTRAINT IF EXISTS package_events_package_id_foreign;

      -- Add the foreign key back with SET NULL instead of CASCADE
      ALTER TABLE ${this.tableName}
      ADD CONSTRAINT package_events_package_id_foreign
      FOREIGN KEY (package_id)
      REFERENCES packages(id)
      ON DELETE SET NULL;
    `)
  }

  async down() {
    this.schema.raw(`
      -- Restore the original CASCADE behavior
      ALTER TABLE ${this.tableName}
      DROP CONSTRAINT IF EXISTS package_events_package_id_foreign;

      ALTER TABLE ${this.tableName}
      ADD CONSTRAINT package_events_package_id_foreign
      FOREIGN KEY (package_id)
      REFERENCES packages(id)
      ON DELETE CASCADE;
    `)
  }
}
