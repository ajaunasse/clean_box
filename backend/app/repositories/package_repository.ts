import Package from '#models/package'
import { DateTime } from 'luxon'
import type { PackageItem } from '#services/openai_service'

export interface CreatePackageData {
  emailId: number
  trackingNumber: string
  trackingUrl: string | null
  carrier: string | null
  carrierRaw: string | null
  status: string
  brand: string | null
  itemName: string | null
  items: PackageItem[] | null
  orderNumber: string | null
  orderDate: DateTime | null
  estimatedDelivery: DateTime | null
  actualDelivery: DateTime | null
  currentLocation: string | null
  destinationCity: string | null
  destinationState: string | null
  destinationZip: string | null
}

export default class PackageRepository {
  /**
   * Create a new package
   */
  async create(data: CreatePackageData): Promise<Package> {
    return Package.create(data)
  }

  /**
   * Find active packages for a user (not delivered, cancelled, or failed)
   */
  async findActiveForUser(userId: number, page: number = 1, limit: number = 20) {
    return Package.query()
      .apply((scopes) => scopes.forUser(userId))
      .apply((scopes) => scopes.active())
      .preload('email')
      .orderByRaw(
        `(
        SELECT MAX(event_timestamp)
        FROM package_events
        WHERE package_events.package_id = packages.id
      ) DESC NULLS LAST`
      )
      .orderBy('updatedAt', 'desc')
      .paginate(page, limit)
  }

  /**
   * Find all packages for a user
   */
  async findAllForUser(userId: number, page: number = 1, limit: number = 20) {
    return Package.query()
      .apply((scopes) => scopes.forUser(userId))
      .preload('email')
      .orderByRaw(
        `(
        SELECT MAX(event_timestamp)
        FROM package_events
        WHERE package_events.package_id = packages.id
      ) DESC NULLS LAST`
      )
      .orderBy('updatedAt', 'desc')
      .paginate(page, limit)
  }

  /**
   * Find packages by status for a user
   */
  async findByStatusForUser(userId: number, status: string, page: number = 1, limit: number = 20) {
    return Package.query()
      .apply((scopes) => scopes.forUser(userId))
      .apply((scopes) => scopes.byStatus(status))
      .preload('email')
      .orderByRaw(
        `(
        SELECT MAX(event_timestamp)
        FROM package_events
        WHERE package_events.package_id = packages.id
      ) DESC NULLS LAST`
      )
      .orderBy('updatedAt', 'desc')
      .paginate(page, limit)
  }

  /**
   * Find delivered packages for a user
   */
  async findDeliveredForUser(userId: number, page: number = 1, limit: number = 20) {
    return Package.query()
      .apply((scopes) => scopes.forUser(userId))
      .apply((scopes) => scopes.delivered())
      .preload('email')
      .orderBy('actualDelivery', 'desc')
      .paginate(page, limit)
  }

  /**
   * Find a package by ID
   */
  async findById(id: number): Promise<Package | null> {
    return Package.find(id)
  }

  /**
   * Find a package by tracking number
   */
  async findByTrackingNumber(trackingNumber: string): Promise<Package | null> {
    return Package.query().where('trackingNumber', trackingNumber).first()
  }

  /**
   * Find a package by order number
   */
  async findByOrderNumber(orderNumber: string): Promise<Package | null> {
    return Package.query().where('orderNumber', orderNumber).first()
  }

  /**
   * Update a package
   */
  async update(packageId: number, data: Partial<CreatePackageData>): Promise<Package> {
    const pkg = await Package.findOrFail(packageId)
    pkg.merge(data)
    await pkg.save()
    return pkg
  }
}
