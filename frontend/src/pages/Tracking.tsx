import { useEffect, useState } from 'react';
import { Package as PackageIcon, Truck, CheckCircle, Clock, AlertCircle, ExternalLink, X, MapPin, Calendar } from 'lucide-react';
import api from '../api/client';
import './Tracking.css';

interface PackageEvent {
  id: number;
  packageId: number;
  emailId: number | null;
  orderNumber: string | null;
  trackingNumber: string | null;
  status: string;
  location: string | null;
  description: string | null;
  eventTimestamp: string;
  createdAt: string;
}

interface PackageData {
  id: number;
  trackingNumber: string;
  trackingUrl: string | null;
  carrier: string | null;
  carrierRaw: string | null;
  status: string;
  brand: string | null;
  itemName: string | null;
  orderNumber: string | null;
  orderDate: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  currentLocation: string | null;
  destinationCity: string | null;
  destinationState: string | null;
  destinationZip: string | null;
  createdAt: string;
  updatedAt: string;
  events?: PackageEvent[];
}

const getStatusColor = (status: string): string => {
  const colors: { [key: string]: string } = {
    ordered: '#64748b',
    processing: '#eab308',
    shipped: '#3b82f6',
    in_transit: '#3b82f6',
    out_for_delivery: '#f97316',
    delivered: '#10b981',
    exception: '#ef4444',
    cancelled: '#94a3b8',
    unknown: '#9ca3af',
  };
  return colors[status] || colors['unknown'];
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'delivered':
      return <CheckCircle size={20} />;
    case 'out_for_delivery':
    case 'in_transit':
    case 'shipped':
      return <Truck size={20} />;
    case 'exception':
      return <AlertCircle size={20} />;
    case 'processing':
    case 'ordered':
      return <Clock size={20} />;
    default:
      return <PackageIcon size={20} />;
  }
};

const getStatusLabel = (status: string): string => {
  const labels: { [key: string]: string } = {
    ordered: 'Ordered',
    processing: 'Processing',
    shipped: 'Shipped',
    in_transit: 'In Transit',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    exception: 'Exception',
    cancelled: 'Cancelled',
    unknown: 'Unknown',
  };
  return labels[status] || status;
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isActive = (status: string): boolean => {
  return !['delivered', 'cancelled', 'exception'].includes(status);
};

export const Tracking = () => {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [packageToMarkDelivered, setPackageToMarkDelivered] = useState<PackageData | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');

  useEffect(() => {
    fetchPackages();
  }, [filter]);

  const fetchPackages = async () => {
    try {
      setIsLoading(true);
      let endpoint = '/packages';
      if (filter === 'active') endpoint = '/packages/active';
      if (filter === 'delivered') endpoint = '/packages/delivered';

      const res = await api.get(endpoint);
      setPackages(res.data.data);
    } catch (error) {
      console.error('Failed to fetch packages', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkDelivered = (pkg: PackageData, e: React.MouseEvent) => {
    e.stopPropagation();
    setPackageToMarkDelivered(pkg);
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    setDeliveryDate(today);
    setShowDeliveryModal(true);
  };

  const confirmMarkDelivered = async () => {
    if (!packageToMarkDelivered) return;

    try {
      await api.put(`/packages/${packageToMarkDelivered.id}/mark-delivered`, {
        deliveryDate,
      });

      // Refresh packages list
      await fetchPackages();

      // Close modals
      setShowDeliveryModal(false);
      setPackageToMarkDelivered(null);
      setSelectedPackage(null);
    } catch (error) {
      console.error('Failed to mark package as delivered', error);
      alert('Failed to mark package as delivered');
    }
  };

  const cancelMarkDelivered = () => {
    setShowDeliveryModal(false);
    setPackageToMarkDelivered(null);
  };

  const loadPackageDetails = async (pkg: PackageData) => {
    try {
      setIsLoadingDetails(true);
      setSelectedPackage(pkg);

      // Fetch full package details with events
      const res = await api.get(`/packages/${pkg.id}`);
      setSelectedPackage(res.data);
    } catch (error) {
      console.error('Failed to load package details', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const activeCount = packages.filter((pkg) => isActive(pkg.status)).length;
  const deliveredCount = packages.filter((pkg) => pkg.status === 'delivered').length;

  if (isLoading) {
    return (
      <div className="tracking-container">
        <div className="tracking-loading">
          <div className="spinner"></div>
          <p>Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tracking-container">
      <div className="tracking-header">
        <div className="tracking-title">
          <PackageIcon size={32} />
          <h1>Package Tracking</h1>
        </div>
        <p className="tracking-subtitle">Track all your deliveries in one place</p>
      </div>

      {/* Stats */}
      <div className="tracking-stats">
        <div className="stat-card">
          <div className="stat-icon active">
            <Truck size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{activeCount}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon delivered">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{deliveredCount}</div>
            <div className="stat-label">Delivered</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon total">
            <PackageIcon size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{packages.length}</div>
            <div className="stat-label">Total</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="tracking-filters">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Packages
        </button>
        <button
          className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active
        </button>
        <button
          className={`filter-btn ${filter === 'delivered' ? 'active' : ''}`}
          onClick={() => setFilter('delivered')}
        >
          Delivered
        </button>
      </div>

      {/* Packages Table */}
      <div className="packages-table-container">
        {packages.length === 0 ? (
          <div className="empty-state">
            <PackageIcon size={64} />
            <h2>No packages found</h2>
            <p>Your package tracking information will appear here once we detect delivery emails.</p>
          </div>
        ) : (
          <table className="packages-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Brand / Item</th>
                <th>Tracking</th>
                <th>Order #</th>
                <th>Location</th>
                <th>Delivery</th>
                <th>Carrier</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg) => (
                <tr
                  key={pkg.id}
                  onClick={() => loadPackageDetails(pkg)}
                  className="clickable-row"
                >
                  <td>
                    <div
                      className="status-badge"
                      style={{
                        backgroundColor: getStatusColor(pkg.status),
                      }}
                    >
                      {getStatusIcon(pkg.status)}
                      <span>{getStatusLabel(pkg.status)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="brand-cell">
                      <div className="brand-name">{pkg.brand || 'Unknown'}</div>
                      {pkg.itemName && <div className="item-name">{pkg.itemName}</div>}
                    </div>
                  </td>
                  <td>
                    <div className="tracking-cell">
                      <code className="tracking-code">{pkg.trackingNumber}</code>
                    </div>
                  </td>
                  <td>
                    <div className="order-cell">
                      {pkg.orderNumber || '-'}
                    </div>
                  </td>
                  <td>
                    <div className="location-cell">
                      {pkg.currentLocation ? (
                        <div className="current-location">{pkg.currentLocation}</div>
                      ) : (
                        <div className="destination">
                          {[pkg.destinationCity, pkg.destinationState]
                            .filter(Boolean)
                            .join(', ') || '-'}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="delivery-cell">
                      {pkg.status === 'delivered' && pkg.actualDelivery ? (
                        <div className="delivered-date">
                          <CheckCircle size={14} />
                          {formatDate(pkg.actualDelivery)}
                        </div>
                      ) : pkg.estimatedDelivery ? (
                        <div className="estimated-date">
                          <Clock size={14} />
                          {formatDate(pkg.estimatedDelivery)}
                        </div>
                      ) : (
                        '-'
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="carrier-cell">
                      {pkg.carrier || pkg.carrierRaw || '-'}
                    </div>
                  </td>
                  <td>
                    {pkg.trackingUrl && (
                      <a
                        href={pkg.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="track-link"
                        title="Track package"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mark as Delivered Modal */}
      {showDeliveryModal && packageToMarkDelivered && (
        <div className="modal-overlay" onClick={cancelMarkDelivered}>
          <div className="modal-content delivery-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <CheckCircle size={24} />
                <h2>Mark as Delivered</h2>
              </div>
              <button className="modal-close" onClick={cancelMarkDelivered}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="delivery-modal-content">
                <p className="delivery-modal-description">
                  Mark package <strong>{packageToMarkDelivered.trackingNumber}</strong> as delivered?
                </p>

                <div className="form-group">
                  <label htmlFor="delivery-date">Delivery Date</label>
                  <input
                    id="delivery-date"
                    type="date"
                    className="date-input"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="modal-actions">
                  <button className="btn-cancel" onClick={cancelMarkDelivered}>
                    Cancel
                  </button>
                  <button className="btn-confirm" onClick={confirmMarkDelivered}>
                    <CheckCircle size={18} />
                    Confirm Delivery
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Package Details Modal */}
      {selectedPackage && (
        <div className="modal-overlay" onClick={() => setSelectedPackage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <PackageIcon size={24} />
                <h2>Package Details</h2>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {selectedPackage.status !== 'delivered' && (
                  <button
                    className="mark-delivered-btn"
                    onClick={(e) => handleMarkDelivered(selectedPackage, e)}
                    title="Mark as delivered"
                  >
                    <CheckCircle size={18} />
                    Mark as Delivered
                  </button>
                )}
                <button className="modal-close" onClick={() => setSelectedPackage(null)}>
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="modal-body">
              {/* Status Section */}
              <div className="modal-section">
                <div
                  className="modal-status-badge"
                  style={{
                    backgroundColor: getStatusColor(selectedPackage.status),
                  }}
                >
                  {getStatusIcon(selectedPackage.status)}
                  <span>{getStatusLabel(selectedPackage.status)}</span>
                </div>

                {/* Progress Bar */}
                <div className="progress-bar-container">
                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${
                          selectedPackage.status === 'ordered' ? '20%' :
                          selectedPackage.status === 'processing' ? '40%' :
                          selectedPackage.status === 'shipped' || selectedPackage.status === 'in_transit' ? '60%' :
                          selectedPackage.status === 'out_for_delivery' ? '80%' :
                          selectedPackage.status === 'delivered' ? '100%' :
                          '10%'
                        }`,
                        backgroundColor: getStatusColor(selectedPackage.status),
                      }}
                    ></div>
                  </div>
                  <div className="progress-labels">
                    <span className={selectedPackage.status === 'ordered' || selectedPackage.status === 'processing' || selectedPackage.status === 'shipped' || selectedPackage.status === 'in_transit' || selectedPackage.status === 'out_for_delivery' || selectedPackage.status === 'delivered' ? 'active' : ''}>
                      Ordered
                    </span>
                    <span className={selectedPackage.status === 'shipped' || selectedPackage.status === 'in_transit' || selectedPackage.status === 'out_for_delivery' || selectedPackage.status === 'delivered' ? 'active' : ''}>
                      Shipped
                    </span>
                    <span className={selectedPackage.status === 'out_for_delivery' || selectedPackage.status === 'delivered' ? 'active' : ''}>
                      Out for Delivery
                    </span>
                    <span className={selectedPackage.status === 'delivered' ? 'active' : ''}>
                      Delivered
                    </span>
                  </div>
                </div>
              </div>

              {/* Brand & Item */}
              <div className="modal-section">
                <h3>Order Information</h3>
                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <label>Brand</label>
                    <div className="value">{selectedPackage.brand || 'Unknown'}</div>
                  </div>
                  {selectedPackage.itemName && (
                    <div className="modal-info-item full-width">
                      <label>Item</label>
                      <div className="value">{selectedPackage.itemName}</div>
                    </div>
                  )}
                  {selectedPackage.orderNumber && (
                    <div className="modal-info-item">
                      <label>Order Number</label>
                      <div className="value">{selectedPackage.orderNumber}</div>
                    </div>
                  )}
                  {selectedPackage.orderDate && (
                    <div className="modal-info-item">
                      <label>Order Date</label>
                      <div className="value">
                        <Calendar size={16} />
                        {formatDate(selectedPackage.orderDate)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tracking Information */}
              <div className="modal-section">
                <h3>Tracking Information</h3>
                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <label>Tracking Number</label>
                    <div className="value tracking-number-modal">
                      {selectedPackage.trackingNumber}
                    </div>
                  </div>
                  {(selectedPackage.carrier || selectedPackage.carrierRaw) && (
                    <div className="modal-info-item">
                      <label>Carrier</label>
                      <div className="value">
                        {selectedPackage.carrier || selectedPackage.carrierRaw}
                      </div>
                    </div>
                  )}
                  {selectedPackage.trackingUrl && (
                    <div className="modal-info-item full-width">
                      <label>Tracking Link</label>
                      <div className="value">
                        <a
                          href={selectedPackage.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tracking-link"
                        >
                          <ExternalLink size={16} />
                          Open tracking page
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Location & Delivery */}
              <div className="modal-section">
                <h3>Location & Delivery</h3>
                <div className="modal-info-grid">
                  {selectedPackage.currentLocation && (
                    <div className="modal-info-item full-width">
                      <label>Current Location</label>
                      <div className="value current-loc">
                        <MapPin size={16} />
                        {selectedPackage.currentLocation}
                      </div>
                    </div>
                  )}
                  {(selectedPackage.destinationCity ||
                    selectedPackage.destinationState ||
                    selectedPackage.destinationZip) && (
                    <div className="modal-info-item full-width">
                      <label>Destination</label>
                      <div className="value">
                        <MapPin size={16} />
                        {[
                          selectedPackage.destinationCity,
                          selectedPackage.destinationState,
                          selectedPackage.destinationZip,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </div>
                    </div>
                  )}
                  {selectedPackage.estimatedDelivery && (
                    <div className="modal-info-item">
                      <label>Estimated Delivery</label>
                      <div className="value">
                        <Clock size={16} />
                        {formatDate(selectedPackage.estimatedDelivery)}
                      </div>
                    </div>
                  )}
                  {selectedPackage.actualDelivery && (
                    <div className="modal-info-item">
                      <label>Delivered On</label>
                      <div className="value delivered">
                        <CheckCircle size={16} />
                        {formatDate(selectedPackage.actualDelivery)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Timeline */}
              {selectedPackage.events && selectedPackage.events.length > 0 && (
                <div className="modal-section">
                  <h3>Tracking Timeline</h3>
                  <div className="timeline-container">
                    {isLoadingDetails ? (
                      <div className="timeline-loading">Loading events...</div>
                    ) : (
                      <div className="timeline">
                        {selectedPackage.events
                          .sort((a, b) =>
                            new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime()
                          )
                          .map((event, index) => (
                            <div key={event.id} className="timeline-event">
                              <div className="timeline-marker">
                                <div
                                  className="timeline-dot"
                                  style={{
                                    backgroundColor: index === 0
                                      ? getStatusColor(event.status)
                                      : '#d1d5db'
                                  }}
                                >
                                  {index === 0 && getStatusIcon(event.status)}
                                </div>
                                {index < selectedPackage.events!.length - 1 && (
                                  <div className="timeline-line"></div>
                                )}
                              </div>
                              <div className="timeline-content">
                                <div className="timeline-header">
                                  <div className="timeline-status">
                                    {getStatusLabel(event.status)}
                                  </div>
                                  <div className="timeline-time">
                                    {formatDateTime(event.eventTimestamp)}
                                  </div>
                                </div>
                                {event.location && (
                                  <div className="timeline-location">
                                    <MapPin size={14} />
                                    {event.location}
                                  </div>
                                )}
                                {event.trackingNumber && event.trackingNumber !== selectedPackage.trackingNumber && (
                                  <div className="timeline-tracking">
                                    Tracking: <code>{event.trackingNumber}</code>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="modal-section metadata">
                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <label>Created</label>
                    <div className="value small">{formatDate(selectedPackage.createdAt)}</div>
                  </div>
                  <div className="modal-info-item">
                    <label>Last Updated</label>
                    <div className="value small">{formatDate(selectedPackage.updatedAt)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
