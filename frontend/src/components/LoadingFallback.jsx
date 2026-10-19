import LoadingSpinner from './ui/LoadingSpinner';

/**
 * Full-page loading fallback shown during lazy-loaded route transitions.
 */
export default function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f7faf8',
      gap: '1rem',
    }}>
      <div style={{
        width: 48,
        height: 48,
        border: '4px solid #edf8f0',
        borderTopColor: '#229948',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <p style={{ color: '#64748b', fontSize: '0.9rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
        Loading Telesom Academy Portal…
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
