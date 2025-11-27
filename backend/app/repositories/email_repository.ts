import Email from '#models/email'
import { DateTime } from 'luxon'

export interface CreateEmailData {
  emailAccountId: number
  gmailMessageId: string
  subject: string
  from: string
  to: string
  sentAt: DateTime | null
  snippet: string
  body?: string
  size?: number | null
}

export default class EmailRepository {
  /**
   * Find email by Gmail message ID
   */
  async findByGmailMessageId(gmailMessageId: string): Promise<Email | null> {
    return Email.query().where('gmailMessageId', gmailMessageId).first()
  }

  /**
   * Create a new email
   */
  async create(data: CreateEmailData): Promise<Email> {
    return Email.create(data)
  }

  /**
   * Find emails for a user with promo codes
   */
  async findWithPromoCodesForUser(
    userId: number,
    page: number = 1,
    limit: number = 20,
    options: { includeExpired?: boolean; category?: string } = {}
  ) {
    const now = DateTime.now()
    const query = Email.query().apply((scopes) => scopes.forUser(userId))

    // Filter by expiry unless includeExpired is true
    if (!options.includeExpired) {
      query.whereHas('promoCodes' as any, (promoQuery: any) => {
        promoQuery.where((q: any) => {
          q.whereNull('expiresAt').orWhere('expiresAt', '>', now.toSQL())
        })
      })
    } else {
      // Still need at least one promo code
      query.apply((scopes) => scopes.withPromoCodes())
    }

    // Filter by category if specified
    if (options.category) {
      query.whereHas('promoCodes' as any, (promoQuery: any) => {
        promoQuery.where('category', options.category)
      })
    }

    // Preload relations with filters applied
    query.preload('emailAccount' as any)
    query.preload('promoCodes' as any, (promoQuery: any) => {
      // Filter by expiry
      if (!options.includeExpired) {
        promoQuery.where((q: any) => {
          q.whereNull('expiresAt').orWhere('expiresAt', '>', now.toSQL())
        })
      }
      // Filter by category
      if (options.category) {
        promoQuery.where('category', options.category)
      }
    })

    return query.orderBy('sentAt', 'desc').paginate(page, limit)
  }

  /**
   * Find emails without promo codes for a user (trash)
   */
  async findWithoutPromoCodesForUser(userId: number, page: number = 1, limit: number = 50) {
    return Email.query()
      .apply((scopes) => scopes.forUser(userId))
      .apply((scopes) => scopes.withoutPromoCodes())
      .orderBy('sentAt', 'desc')
      .paginate(page, limit)
  }
}
