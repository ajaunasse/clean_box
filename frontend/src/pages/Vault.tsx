import { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { Toast } from '../components/Toast';
import './Vault.css';

interface PromoCode {
  id: number;
  code: string;
  discountRaw: string | null;
  brand: string;
  summary: string | null;
  category: string;
  url: string | null;
  expiresAt: string | null;
  email: {
    subject: string;
    sentAt: string;
  };
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
  // Simple heuristic: Google search for the brand
  return `https://www.google.com/search?q=${encodeURIComponent(brand)}`;
};

const CATEGORIES = [
  'All',
  'Fashion',
  'Technology',
  'Sports & Fitness',
  'Beauty & Health',
  'Food & Beverage',
  'Home & Garden',
  'Travel',
  'Entertainment',
  'Books & Media',
  'Services',
  'Other',
];

const ITEMS_PER_PAGE = 20;

export const Vault = () => {
  const { t } = useTranslation('vault');
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchBrand, setSearchBrand] = useState<string>('');
  const [showExpired, setShowExpired] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const fetchCodes = async () => {
      try {
        setIsLoading(true);
        const res = await api.get('/promo-codes', { params: { page: 1, limit: ITEMS_PER_PAGE } });
        console.log('[VAULT] Initial fetch response:', res.data);
        const codesData = res.data.data;

        // Sort: expiring soon first, then by expiry date, then by created date
        const sorted = codesData.sort((a: PromoCode, b: PromoCode) => {
          const aExpiringSoon = isExpiringSoon(a.expiresAt);
          const bExpiringSoon = isExpiringSoon(b.expiresAt);

          if (aExpiringSoon && !bExpiringSoon) return -1;
          if (!aExpiringSoon && bExpiringSoon) return 1;

          if (a.expiresAt && b.expiresAt) {
            return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
          }

          return new Date(b.email.sentAt).getTime() - new Date(a.email.sentAt).getTime();
        });

        setCodes(sorted);
        setCurrentPage(1);

        // Lucid paginate returns: { data, meta: { total, per_page, current_page, last_page, first_page, ... } }
        const hasMorePages = res.data.meta && res.data.meta.current_page < res.data.meta.last_page;
        console.log('[VAULT] Pagination meta:', res.data.meta, 'hasMore:', hasMorePages);
        setHasMore(hasMorePages);
      } catch (error) {
        console.error('Failed to fetch codes', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch on initial mount (not on subsequent renders)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchCodes();
    }
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast({ message: t('toast.copied'), type: 'success' });
  };

  // Infinite scroll - load more from backend
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      console.log('[VAULT] loadMore skipped - isLoadingMore:', isLoadingMore, 'hasMore:', hasMore);
      return;
    }

    try {
      console.log('[VAULT] loadMore starting - currentPage:', currentPage);
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      const res = await api.get('/promo-codes', { params: { page: nextPage, limit: ITEMS_PER_PAGE } });
      console.log('[VAULT] loadMore response:', res.data);
      const newCodes = res.data.data;

      if (newCodes.length > 0) {
        // Sort new codes
        const sorted = newCodes.sort((a: PromoCode, b: PromoCode) => {
          const aExpiringSoon = isExpiringSoon(a.expiresAt);
          const bExpiringSoon = isExpiringSoon(b.expiresAt);

          if (aExpiringSoon && !bExpiringSoon) return -1;
          if (!aExpiringSoon && bExpiringSoon) return 1;

          if (a.expiresAt && b.expiresAt) {
            return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
          }

          return new Date(b.email.sentAt).getTime() - new Date(a.email.sentAt).getTime();
        });

        console.log('[VAULT] Adding', sorted.length, 'new codes');
        setCodes((prev) => [...prev, ...sorted]);
        setCurrentPage(nextPage);

        const hasMorePages = res.data.meta && res.data.meta.current_page < res.data.meta.last_page;
        console.log('[VAULT] Updated hasMore:', hasMorePages);
        setHasMore(hasMorePages);
      } else {
        console.log('[VAULT] No more codes');
        setHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more codes', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentPage, hasMore, isLoadingMore]);

  useEffect(() => {
    if (!hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore, hasMore, isLoadingMore]);

  // Filter codes based on selected category, brand search, and expiry status
  const filteredCodes = codes.filter((code) => {
    // Category filter
    const matchesCategory = selectedCategory === 'All' || code.category === selectedCategory;

    // Brand filter
    const matchesBrand =
      searchBrand === '' || code.brand?.toLowerCase().includes(searchBrand.toLowerCase());

    // Expiry filter - hide expired unless showExpired is true
    const expired = isExpired(code.expiresAt);
    const matchesExpiryFilter = showExpired || !expired;

    return matchesCategory && matchesBrand && matchesExpiryFilter;
  });

  if (isLoading) return <div>{t('loading')}</div>;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <div className="vault-container">
        <div className="vault-header">
          <div className="vault-header-left">
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </div>
          {codes.length > 0 && (
            <div className="vault-header-right">
              <div className="vault-search">
                <input
                  type="text"
                  placeholder={t('search_placeholder')}
                  value={searchBrand}
                  onChange={(e) => setSearchBrand(e.target.value)}
                  className="vault-search-input"
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
        {codes.length > 0 && (
          <div className="category-filters">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`category-filter-btn ${selectedCategory === category ? 'active' : ''}`}
                style={
                  selectedCategory === category
                    ? category === 'All'
                      ? { backgroundColor: '#4f46e5', color: 'white', borderColor: 'transparent' }
                      : {
                          backgroundColor: getCategoryColor(category),
                          color: 'white',
                          borderColor: 'transparent',
                        }
                    : {}
                }
              >
                {t(`categories.${category.toLowerCase().replace(/ & /g, '').replace(/ /g, '_')}`)}
              </button>
            ))}
          </div>
        )}

        {codes.length === 0 ? (
          <div className="empty-state-large">
            <h3>{t('empty.title')}</h3>
            <p>{t('empty.description')}</p>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="empty-state-large">
            <h3>{t('no_match.title')}</h3>
            <p>{t('no_match.description')}</p>
          </div>
        ) : (
          <>
            <div className="vault-list">
              {filteredCodes.map((code) => {
                const expiringSoon = isExpiringSoon(code.expiresAt);
                const expired = isExpired(code.expiresAt);

                return (
                  <a
                    key={code.id}
                    href={code.url || getBrandUrl(code.brand)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`vault-item ${expired ? 'expired' : ''}`}
                  >
                    <div className="vault-item-left">
                      <div className="vault-header-row">
                        <div className="vault-vendor">{code.brand}</div>
                        <span
                          className="category-badge"
                          style={{ backgroundColor: getCategoryColor(code.category) }}
                        >
                          {code.category}
                        </span>
                        {expiringSoon && !expired && (
                          <span className="expire-soon-badge">{t('badges.expires_soon')}</span>
                        )}
                        {expired && <span className="expired-badge">{t('badges.expired')}</span>}
                      </div>
                      <div className="vault-discount">{code.discountRaw}</div>
                      <div className="vault-subject">{code.summary || code.email.subject}</div>
                      {code.expiresAt && (
                        <div
                          className={`vault-expiry ${expiringSoon ? 'expiring-soon' : ''} ${expired ? 'expired' : ''}`}
                        >
                          {t('expires', { date: formatExpiryDate(code.expiresAt) })}
                        </div>
                      )}
                    </div>
                    <div className="vault-item-right">
                      <div
                        className="code-display"
                        onClick={(e) => {
                          e.preventDefault();
                          copyToClipboard(code.code);
                        }}
                      >
                        {code.code}
                        <span className="copy-icon" title="Copy">
                          📋
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
            {/* Intersection observer target */}
            {hasMore && (
              <div ref={observerTarget} className="loading-trigger" style={{ padding: '2rem', textAlign: 'center' }}>
                <div className="loading-spinner">
                  {isLoadingMore ? t('loading_more') : t('loading')}
                </div>
              </div>
            )}
            {!hasMore && codes.length > 0 && (
              <div className="end-of-list" style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                <p>{t('no_more')}</p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
