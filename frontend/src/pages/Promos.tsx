import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import './Promos.css';

interface Promo {
  id: number;
  subject: string;
  from: string;
  sentAt: string;
  promoCodes: {
    code: string | null;
    discountRaw: string | null;
    brand: string;
    summary: string | null;
    category: string;
    url: string | null;
    expiresAt: string | null;
  }[];
}

const getCategoryColor = (category: string): string => {
  const colors: { [key: string]: string } = {
    Fashion: '#ec4899',
    Technology: '#3b82f6',
    'Sports & Fitness': '#10b981',
    'Beauty & Health': '#f97316',
    'Food & Beverage': '#eab308',
    'Home & Garden': '#8b5cf6',
    Travel: '#06b6d4',
    Entertainment: '#ef4444',
    'Books & Media': '#6366f1',
    Services: '#64748b',
    Other: '#9ca3af',
  };
  return colors[category] || colors['Other'];
};

const isExpiringSoon = (expiresAt: string | null): boolean => {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt);
  const now = new Date();
  const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
};

const isExpired = (expiresAt: string | null): boolean => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};

const formatExpiryDate = (expiresAt: string | null): string => {
  if (!expiresAt) return '';
  return new Date(expiresAt).toLocaleDateString();
};

const getBrandUrl = (brand: string): string => {
  return `https://www.google.com/search?q=${encodeURIComponent(brand)}`;
};

const CATEGORY_KEYS = [
  'all',
  'fashion',
  'technology',
  'sports_fitness',
  'beauty_health',
  'food_beverage',
  'home_garden',
  'travel',
  'entertainment',
  'books_media',
  'services',
  'other',
] as const;

const ITEMS_PER_PAGE = 12;

export const Promos = () => {
  const { t } = useTranslation('promos');
  const [allPromos, setAllPromos] = useState<Promo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchBrand, setSearchBrand] = useState<string>('');
  const [showExpired, setShowExpired] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const currentPageRef = useRef(1);

  // Fetch promos with current filters
  useEffect(() => {
    const fetchPromos = async () => {
      try {
        setIsLoading(true);
        const params: Record<string, string | number | boolean> = {
          page: 1,
          limit: ITEMS_PER_PAGE,
          includeExpired: showExpired,
        };

        if (selectedCategory !== 'all') {
          params.category = t(`categories.${selectedCategory}`);
        }

        const res = await api.get('/promos', { params });
        const promosData = res.data.data;

        // Sort by expiring soon first
        const sorted = promosData.sort((a: Promo, b: Promo) => {
          const aExpiringSoon = a.promoCodes.some((pc) => isExpiringSoon(pc.expiresAt));
          const bExpiringSoon = b.promoCodes.some((pc) => isExpiringSoon(pc.expiresAt));

          if (aExpiringSoon && !bExpiringSoon) return -1;
          if (!aExpiringSoon && bExpiringSoon) return 1;

          return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
        });

        setAllPromos(sorted);
        currentPageRef.current = 1;

        // Lucid paginate returns: { data, meta: { total, per_page, current_page, last_page, first_page, ... } }
        const meta = res.data.meta;
        const currentPageNum = meta?.currentPage ?? meta?.current_page ?? 1;
        const lastPageNum = meta?.lastPage ?? meta?.last_page ?? 1;
        const hasMorePages = currentPageNum < lastPageNum;
        setHasMore(hasMorePages);
      } catch (error) {
        console.error('Failed to fetch promos', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPromos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, showExpired]);

  // Filter promos by brand search only (category and expiry are handled by backend)
  const filteredPromos = allPromos.filter((promo) => {
    const firstCode = promo.promoCodes[0];

    // Brand filter (client-side for instant feedback)
    const matchesBrand =
      searchBrand === '' || firstCode?.brand?.toLowerCase().includes(searchBrand.toLowerCase());

    return matchesBrand;
  });

  // Infinite scroll - load more from backend
  const loadMore = async () => {
    if (loadingRef.current || !hasMore) {
      return;
    }

    try {
      loadingRef.current = true;
      setIsLoadingMore(true);
      const nextPage = currentPageRef.current + 1;
      const params: Record<string, string | number | boolean> = {
        page: nextPage,
        limit: ITEMS_PER_PAGE,
        includeExpired: showExpired,
      };

      if (selectedCategory !== 'all') {
        params.category = t(`categories.${selectedCategory}`);
      }

      const res = await api.get('/promos', { params });
      const newPromos = res.data.data;

      if (newPromos.length > 0) {
        // Sort new promos
        const sorted = newPromos.sort((a: Promo, b: Promo) => {
          const aExpiringSoon = a.promoCodes.some((pc) => isExpiringSoon(pc.expiresAt));
          const bExpiringSoon = b.promoCodes.some((pc) => isExpiringSoon(pc.expiresAt));

          if (aExpiringSoon && !bExpiringSoon) return -1;
          if (!aExpiringSoon && bExpiringSoon) return 1;

          return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
        });

        setAllPromos((prev) => [...prev, ...sorted]);
        currentPageRef.current = nextPage;

        const meta = res.data.meta;
        const currentPageNum = meta?.currentPage ?? meta?.current_page ?? nextPage;
        const lastPageNum = meta?.lastPage ?? meta?.last_page ?? nextPage;
        const hasMorePages = currentPageNum < lastPageNum;
        setHasMore(hasMorePages);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more promos', error);
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!hasMore) {
      return;
    }

    let observer: IntersectionObserver | null = null;
    let observedElement: HTMLDivElement | null = null;

    // Wait for next tick to ensure DOM is rendered
    const timer = setTimeout(() => {
      const currentTarget = observerTarget.current;

      if (!currentTarget) {
        return;
      }

      observedElement = currentTarget;

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && !loadingRef.current) {
              loadMore();
            }
          });
        },
        {
          root: null,
          rootMargin: '200px',
          threshold: 0
        }
      );

      observer.observe(currentTarget);

      // Check if element is already in viewport
      const rect = currentTarget.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

      if (isVisible && !loadingRef.current) {
        loadMore();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (observer && observedElement) {
        observer.unobserve(observedElement);
        observer.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore]);

  if (isLoading) return <div>{t('loading')}</div>;

  return (
    <div className="promos-container" ref={containerRef}>
      <div className="promos-header">
        <div className="promos-header-left">
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
        {allPromos.length > 0 && (
          <div className="promos-header-right">
            <div className="promos-search">
              <input
                type="text"
                placeholder={t('search_placeholder')}
                value={searchBrand}
                onChange={(e) => setSearchBrand(e.target.value)}
                className="promos-search-input"
              />
              {searchBrand && (
                <button onClick={() => setSearchBrand('')} className="clear-search">
                  ✕
                </button>
              )}
            </div>
            <div className="toggle-container">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={showExpired}
                  onChange={(e) => setShowExpired(e.target.checked)}
                  className="toggle-checkbox"
                />
                <span className="toggle-slider"></span>
                <span className="toggle-text">{t('show_expired')}</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Category Filters */}
      {allPromos.length > 0 && (
        <div className="category-filters">
          {CATEGORY_KEYS.map((categoryKey) => (
            <button
              key={categoryKey}
              onClick={() => setSelectedCategory(categoryKey)}
              className={`category-filter-btn ${selectedCategory === categoryKey ? 'active' : ''}`}
              style={
                selectedCategory === categoryKey
                  ? categoryKey === 'all'
                    ? { backgroundColor: '#4f46e5', color: 'white', borderColor: 'transparent' }
                    : {
                        backgroundColor: getCategoryColor(t(`categories.${categoryKey}`)),
                        color: 'white',
                        borderColor: 'transparent',
                      }
                  : {}
              }
            >
              {t(`categories.${categoryKey}`)}
            </button>
          ))}
        </div>
      )}

      {allPromos.length === 0 ? (
        <div className="empty-state-large">
          <h3>{t('empty.title')}</h3>
          <p>{t('empty.description')}</p>
        </div>
      ) : filteredPromos.length === 0 ? (
        <div className="empty-state-large">
          <h3>{t('no_match.title')}</h3>
          <p>{t('no_match.description')}</p>
        </div>
      ) : (
        <>
          <div className="promos-grid">
            {filteredPromos.map((promo) => {
            const firstCode = promo.promoCodes[0];
            const expiringSoon = firstCode && isExpiringSoon(firstCode.expiresAt);
            const expired = firstCode && isExpired(firstCode.expiresAt);

            return (
              <a
                key={promo.id}
                href={firstCode?.url || (firstCode?.brand ? getBrandUrl(firstCode.brand) : '#')}
                target="_blank"
                rel="noopener noreferrer"
                className={`promo-card ${expired ? 'expired' : ''}`}
              >
                <div className="promo-header">
                  <div className="promo-vendor-row">
                    <span className="promo-vendor">{firstCode?.brand || promo.from}</span>
                    {firstCode?.category && (
                      <span
                        className="category-badge"
                        style={{ backgroundColor: getCategoryColor(firstCode.category) }}
                      >
                        {firstCode.category}
                      </span>
                    )}
                    {expiringSoon && !expired && (
                      <span className="expire-soon-badge">{t('badges.expires_soon')}</span>
                    )}
                    {expired && <span className="expired-badge">{t('badges.expired')}</span>}
                  </div>
                  <span className="promo-date">{new Date(promo.sentAt).toLocaleDateString()}</span>
                </div>
                <h3 className="promo-subject">{firstCode?.summary || promo.subject}</h3>

                <div className="promo-codes">
                  {promo.promoCodes.map((code, idx) => (
                    <div key={idx} className="code-badge">
                      {code.code ? (
                        <span className="code-value">{code.code}</span>
                      ) : (
                        <span className="discount-value">{code.discountRaw}</span>
                      )}
                      {code.code && code.discountRaw && (
                        <span className="code-discount">({code.discountRaw})</span>
                      )}
                    </div>
                  ))}
                </div>

                {firstCode?.expiresAt && (
                  <div
                    className={`promo-expiry ${expiringSoon ? 'expiring-soon' : ''} ${expired ? 'expired' : ''}`}
                  >
                    {t('expires', { date: formatExpiryDate(firstCode.expiresAt) })}
                  </div>
                )}
              </a>
            );
          })}
          </div>
          {/* Intersection observer target */}
          {hasMore && (
            <div ref={observerTarget} className="loading-trigger">
              <div className="loading-spinner">
                {isLoadingMore ? t('loading_more') : t('loading')}
              </div>
            </div>
          )}
          {!hasMore && allPromos.length > 0 && (
            <div className="end-of-list">
              <p>{t('no_more')}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
