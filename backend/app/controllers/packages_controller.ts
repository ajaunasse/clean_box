import type { HttpContext } from '@adonisjs/core/http'
import PackageRepository from '#repositories/package_repository'
import EmailPolicy from '#policies/email_policy'
import { inject } from '@adonisjs/core'
import Package from '#models/package'
import { DateTime } from 'luxon'

@inject()
export default class PackagesController {
  constructor(protected packageRepository: PackageRepository) {}

  /**
   * Get all packages for the authenticated user
   * GET /api/packages
   */
  async index({ auth, request, response, bouncer }: HttpContext) {
    const user = auth.user!
    await bouncer.with(EmailPolicy).authorize('viewAny')

    const page = request.input('page', 1)
    const limit = request.input('limit', 20)

    const packages = await this.packageRepository.findAllForUser(user.id, page, limit)

    return response.ok(packages)
  }

  /**
   * Get active packages (in transit, not delivered)
   * GET /api/packages/active
   */
  async active({ auth, request, response, bouncer }: HttpContext) {
    const user = auth.user!
    await bouncer.with(EmailPolicy).authorize('viewAny')

    const page = request.input('page', 1)
    const limit = request.input('limit', 20)

    const packages = await this.packageRepository.findActiveForUser(user.id, page, limit)

    return response.ok(packages)
  }

  /**
   * Get delivered packages
   * GET /api/packages/delivered
   */
  async delivered({ auth, request, response, bouncer }: HttpContext) {
    const user = auth.user!
    await bouncer.with(EmailPolicy).authorize('viewAny')

    const page = request.input('page', 1)
    const limit = request.input('limit', 20)

    const packages = await this.packageRepository.findDeliveredForUser(user.id, page, limit)

    return response.ok(packages)
  }

  /**
   * Get packages by status
   * GET /api/packages/status/:status
   */
  async byStatus({ auth, request, response, bouncer, params }: HttpContext) {
    const user = auth.user!
    await bouncer.with(EmailPolicy).authorize('viewAny')

    const { status } = params
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)

    const packages = await this.packageRepository.findByStatusForUser(user.id, status, page, limit)

    return response.ok(packages)
  }

  /**
   * Get a single package by ID
   * GET /api/packages/:id
   */
  async show({ auth, response, bouncer, params }: HttpContext) {
    const user = auth.user!
    await bouncer.with(EmailPolicy).authorize('viewAny')

    const { id } = params

    const pkg = await Package.query()
      .where('id', id)
      .apply((scopes) => scopes.forUser(user.id))
      .preload('email', (emailQuery) => {
        emailQuery.preload('emailAccount')
      })
      .preload('events', (eventsQuery) => {
        eventsQuery.orderBy('eventTimestamp', 'desc')
      })
      .firstOrFail()

    return response.ok(pkg)
  }

  /**
   * Mark a package as delivered
   * PUT /api/packages/:id/mark-delivered
   */
  async markDelivered({ auth, request, response, bouncer, params }: HttpContext) {
    const user = auth.user!
    await bouncer.with(EmailPolicy).authorize('viewAny')

    const { id } = params
    const { deliveryDate } = request.only(['deliveryDate'])

    // Find package and verify ownership
    const pkg = await Package.query()
      .where('id', id)
      .apply((scopes) => scopes.forUser(user.id))
      .firstOrFail()

    // Parse delivery date
    const actualDelivery = deliveryDate ? DateTime.fromISO(deliveryDate) : DateTime.now()

    // Update package
    await this.packageRepository.update(pkg.id, {
      status: 'delivered',
      actualDelivery,
    })

    // Fetch updated package
    const updatedPkg = await this.packageRepository.findById(pkg.id)

    return response.ok(updatedPkg)
  }
}
