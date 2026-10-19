import React from 'react';
import './ui.css';

/**
 * EmptyState - Centered empty state for tables/sections
 * @param {JSX.Element} icon - SVG icon element
 * @param {string} title - Main heading
 * @param {string} description - Supporting description
 * @param {{ label: string, onClick: Function }} action - Optional CTA button
 */
const EmptyState = ({ icon, title, description, action }) => {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      {action && (
        <button className="empty-state-action btn btn-primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
