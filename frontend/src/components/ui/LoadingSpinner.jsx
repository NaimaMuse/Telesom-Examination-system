import React from 'react';
import './ui.css';

/**
 * LoadingSpinner - A CSS spinner component
 * @param {'sm'|'md'|'lg'} size - Spinner size
 * @param {string} color - CSS color value (overrides default)
 * @param {boolean} fullPage - Center in full viewport
 */
const LoadingSpinner = ({ size = 'md', color, fullPage = false }) => {
  const spinner = (
    <div
      className={`loading-spinner loading-spinner--${size}`}
      style={color ? { borderTopColor: color } : undefined}
      role="status"
      aria-label="Loading"
    />
  );

  if (fullPage) {
    return (
      <div className="loading-spinner-fullpage">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
