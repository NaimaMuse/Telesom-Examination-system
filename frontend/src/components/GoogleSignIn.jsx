import { useEffect, useRef, useState } from 'react';
import api from '../services/api';

let scriptLoad;

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  scriptLoad ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve(window.google?.accounts?.id);
    script.onerror = () => {
      script.remove();
      reject(new Error('Google sign-in could not load.'));
    };
    document.head.append(script);
  }).catch(error => {
    scriptLoad = undefined;
    throw error;
  });
  return scriptLoad;
}

export default function GoogleSignIn({ onCredential, busy }) {
  const button = useRef(null);
  const [message, setMessage] = useState('Loading Google sign-in…');

  useEffect(() => {
    const controller = new AbortController();
    const element = button.current;
    const initialize = async () => {
      if (controller.signal.aborted) return;
      const {data} = await api.post('/auth/google/config', {}, {
        signal:controller.signal, headers:{'X-Session-Mode':'cookie'},
      });
      if (controller.signal.aborted) return;
      if (!data.clientId) {
        setMessage('Google sign-in is unavailable. Contact your administrator.');
        return;
      }
      const google = await loadGoogleIdentity();
      if (controller.signal.aborted) return;
      google.initialize({
        client_id:data.clientId,
        nonce:data.nonce,
        use_fedcm_for_button:true,
        callback:({credential}) => {
          if (!controller.signal.aborted) onCredential(credential);
        },
      });
      google.renderButton(element, {
        theme:'outline', size:'large', text:'signin_with', width:Math.floor(element.clientWidth),
      });
      setMessage('');
    };
    Promise.resolve().then(initialize).catch(() => {
      if (!controller.signal.aborted) setMessage('Google sign-in could not load. Refresh the page to try again.');
    });
    return () => {
      controller.abort();
      element.replaceChildren();
    };
  }, [onCredential]);

  return <>
    {message && <p className="google-sign-in-message" role="status">{message}</p>}
    <div ref={button} className="google-sign-in-button" inert={busy ? '' : undefined} />
  </>;
}
