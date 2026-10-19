import React from 'react';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import './ui.css';

/**
 * ConfirmDialog - Confirmation dialog modal
 * @param {boolean} isOpen - Controls visibility
 * @param {Function} onClose - Cancel handler
 * @param {Function} onConfirm - Confirm action handler
 * @param {string} title - Dialog title
 * @param {string} message - Confirmation message body
 * @param {string} confirmLabel - Label for confirm button (default: "Confirm")
 * @param {'green'|'red'} confirmColor - Confirm button color
 * @param {boolean} loading - Show spinner on confirm button
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  confirmColor = 'red',
  loading = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={!loading ? onClose : undefined}
      title={title}
      size="sm"
      footer={
        <div className="confirm-dialog-footer">
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={`btn btn-${confirmColor === 'green' ? 'primary' : 'danger'} confirm-btn`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Processing…</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      }
    >
      <div className="confirm-dialog-body">
        <div className={`confirm-dialog-icon confirm-dialog-icon--${confirmColor}`}>
          {confirmColor === 'red' ? (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 9v6M14 18h.01" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M12.29 3.86L1.82 21a2 2 0 001.71 3h20.94a2 2 0 001.71-3L15.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" />
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2" />
              <path d="M9 14l3.5 3.5L19 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <p className="confirm-dialog-message">{message}</p>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
