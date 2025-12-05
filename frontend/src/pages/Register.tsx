import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

export const Register = () => {
  const { t } = useTranslation('auth');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register({ fullName, email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          t('register.error')
      );
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>{t('register.title')}</h1>
        <p className="auth-subtitle">{t('register.subtitle')}</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName">{t('register.full_name')}</label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">{t('register.email')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('register.password')}</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full">
            {t('register.submit')}
          </button>
        </form>

        <div className="auth-divider">
          <span>{t('register.or')}</span>
        </div>

        <a
          href="http://localhost:3333/api/auth/google/redirect"
          className="btn btn-google btn-full"
        >
          {t('register.google_button')}
        </a>

        <p className="auth-footer">
          {t('register.footer')} <Link to="/login">{t('register.footer_link')}</Link>
        </p>
      </div>
    </div>
  );
};
