import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import './Auth.css';

export const Login = () => {
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          t('login.error')
      );
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>{t('login.title')}</h1>
        <p className="auth-subtitle">{t('login.subtitle')}</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">{t('login.email')}</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('login.password')}</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full">
            {t('login.submit')}
          </button>
        </form>

        <div className="auth-divider">
          <span>{t('login.or')}</span>
        </div>

        <a
          href="http://localhost:3333/api/auth/google/redirect"
          className="btn btn-google btn-full"
        >
          {t('login.google_button')}
        </a>

        <p className="auth-footer">
          {t('login.footer')} <Link to="/register">{t('login.footer_link')}</Link>
        </p>
      </div>
    </div>
  );
};
