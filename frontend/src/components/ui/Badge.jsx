import React from 'react';
import './ui.css';

/**
 * Badge - A simple badge/chip component
 * @param {React.ReactNode} children - Badge content
 * @param {'green'|'gold'|'navy'|'red'|'gray'|'teal'} color - Color variant
 * @param {'sm'|'md'} size - Badge size
 * @param {boolean} dot - Show a status dot indicator
 */
const Badge = ({
  children,
  color = 'green',
  size = 'md',
  dot = false,
}) => {
  return (
    <span className={`badge badge--${color} badge--${size}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
};

export default Badge;
