import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import './Trash.css';

interface TrashEmail {
  id: number;
  subject: string | null;
  from: string | null;
  sentAt: string | null;
  snippet: string | null;
}

export const Trash = () => {
  const { t } = useTranslation('trash');
  const [emails, setEmails] = useState<TrashEmail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const isInitialMount = useRef(true);

  useEffect(() => {
    const fetchTrash = async () => {
      try {
        const res = await api.get('/emails/trash');
        setEmails(res.data.data);
      } catch (error) {
        console.error('Failed to fetch trash', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch on initial mount (not on subsequent renders)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchTrash();
    }
  }, []);

  // Filter emails based on search term
  const filteredEmails = emails.filter((email) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      email.subject?.toLowerCase().includes(searchLower) ||
      email.from?.toLowerCase().includes(searchLower) ||
      email.snippet?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) return <div>{t('loading')}</div>;

  return (
    <div className="trash-container">
      <div className="trash-header">
        <div className="trash-header-left">
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </div>
        {emails.length > 0 && (
          <div className="trash-search">
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="trash-search-input"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="clear-search">
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {emails.length === 0 ? (
        <div className="empty-state-large">
          <h3>{t('empty.title')}</h3>
          <p>{t('empty.description')}</p>
        </div>
      ) : filteredEmails.length === 0 ? (
        <div className="empty-state-large">
          <h3>{t('no_match.title')}</h3>
          <p>{t('no_match.description')}</p>
        </div>
      ) : (
        <div className="trash-list">
          {filteredEmails.map((email) => (
            <div key={email.id} className="trash-item">
              <div className="trash-item-header">
                <span className="trash-from">{email.from}</span>
                <span className="trash-date">
                  {email.sentAt ? new Date(email.sentAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <h3 className="trash-subject">{email.subject || t('no_subject')}</h3>
              <p className="trash-snippet">{email.snippet}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
