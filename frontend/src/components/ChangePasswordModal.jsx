import { useEffect, useRef } from 'react';
import ChangePasswordForm from './ChangePasswordForm';
import './ChangePasswordModal.css';

export default function ChangePasswordModal({ required = false, onClose, onSuccess, onSignOut }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (element && !element.open) element.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      if (previous && document.contains(previous)) previous.focus();
    };
  }, []);
  return <dialog ref={dialog} className="change-password-dialog" aria-labelledby="change-password-title" onCancel={event => { event.preventDefault(); if (!required) onClose?.(); }}>
    <ChangePasswordForm required={required} onClose={onClose} onSuccess={onSuccess} onSignOut={onSignOut}/>
  </dialog>;
}
