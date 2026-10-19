import React from 'react';
import './ui.css';

/**
 * StatsCard - A statistics overview card component
 * @param {string} title - Card title
 * @param {string|number} value - Main statistic value
 * @param {string} subtitle - Subtitle text below value
 * @param {JSX.Element} icon - SVG icon element
 * @param {'green'|'gold'|'navy'|'teal'|'red'} color - Color theme
 * @param {{ value: number, direction: 'up'|'down' }} trend - Optional trend data
 * @param {boolean} loading - Loading skeleton state
 */
const StatsCard = ({
  title,
  value,
  subtitle,
  icon,
  color = 'green',
  trend,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="stats-card stats-card--loading">
        <div className="stats-card-icon-wrapper skeleton-circle" />
        <div className="stats-card-content">
          <div className="skeleton skeleton-text skeleton-title" />
          <div className="skeleton skeleton-text skeleton-value" />
          <div className="skeleton skeleton-text skeleton-subtitle" />
        </div>
      </div>
    );
  }

  return (
    <div className={`stats-card stats-card--${color}`}>
      <div className={`stats-card-icon stats-card-icon--${color}`}>
        {icon}
      </div>
      <div className="stats-card-content">
        <p className="stats-card-title">{title}</p>
        <p className="stats-card-value">{value}</p>
        <div className="stats-card-footer">
          {subtitle && (
            <span className="stats-card-subtitle">{subtitle}</span>
          )}
          {trend && (
            <span
              className={`stats-card-trend stats-card-trend--${
                trend.direction === 'up' ? 'up' : 'down'
              }`}
            >
              {trend.direction === 'up' ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2L10 8H2L6 2Z" fill="currentColor" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 10L2 4H10L6 10Z" fill="currentColor" />
                </svg>
              )}
              {Math.abs(trend.value)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
