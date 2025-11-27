import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Package from '#models/package'
import Email from '#models/email'

export default class PackageEvent extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare packageId: number | null

  @column()
  declare emailId: number | null

  @column()
  declare orderNumber: string | null

  @column()
  declare trackingNumber: string | null

  @column()
  declare status: string

  @column()
  declare location: string | null

  @column()
  declare description: string | null

  @column.dateTime()
  declare eventTimestamp: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => Package)
  declare package: BelongsTo<typeof Package>

  @belongsTo(() => Email)
  declare email: BelongsTo<typeof Email>
}
