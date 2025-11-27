import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany, scope } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Email from '#models/email'
import PackageEvent from '#models/package_event'

export default class Package extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare emailId: number

  @column()
  declare trackingNumber: string

  @column()
  declare trackingUrl: string | null

  @column()
  declare carrier: string | null

  @column()
  declare carrierRaw: string | null

  @column()
  declare status: string

  @column()
  declare brand: string | null

  @column()
  declare itemName: string | null

  @column({
    prepare: (value) => {
      if (value === null || value === undefined) return null
      if (typeof value === 'string') return value // Already stringified
      return JSON.stringify(value)
    },
    consume: (value) => {
      if (value === null || value === undefined) return null
      if (typeof value === 'object') return value // Already parsed
      return JSON.parse(value)
    },
  })
  declare items: Array<{
    name: string
    quantity?: number | null
    variant?: string | null
    price?: string | null
  }> | null

  @column()
  declare orderNumber: string | null

  @column.dateTime()
  declare orderDate: DateTime | null

  @column.dateTime()
  declare estimatedDelivery: DateTime | null

  @column.dateTime()
  declare actualDelivery: DateTime | null

  @column.dateTime()
  declare lastCheckedAt: DateTime | null

  @column()
  declare currentLocation: string | null

  @column()
  declare destinationCity: string | null

  @column()
  declare destinationState: string | null

  @column()
  declare destinationZip: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => Email)
  declare email: BelongsTo<typeof Email>

  @hasMany(() => PackageEvent)
  declare events: HasMany<typeof PackageEvent>

  // Query Scopes
  static forUser = scope((query, userId: number) => {
    query.whereHas('email' as any, (emailQuery: any) => {
      emailQuery.whereHas('emailAccount' as any, (accountQuery: any) => {
        accountQuery.where('user_id', userId)
      })
    })
  })

  static byStatus = scope((query, status: string) => {
    query.where('status', status)
  })

  static active = scope((query) => {
    query.whereNotIn('status', ['delivered', 'cancelled', 'failed'])
  })

  static delivered = scope((query) => {
    query.where('status', 'delivered')
  })

  static byCarrier = scope((query, carrier: string) => {
    query.where('carrier', carrier)
  })
}
