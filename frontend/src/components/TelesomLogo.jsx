/**
 * TelesomLogo Component
 * Displays the supplied official Telesom Academy logo from local assets.
 *
 * @param {string} size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} showText - whether to render "TELESOM ACADEMY" next to the crest (default: true)
 * @param {string} className - optional extra class names
 */
export default function TelesomLogo({ size = 'md', showText = true, className = '' }) {
  const crestSizes = {
    sm: { width: 40, height: 40 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 },
  };

  const dim = crestSizes[size] || crestSizes.md;

  return (
    <div
      className={`telesom-logo ${size} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '8px' : size === 'lg' ? '14px' : '10px',
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      <img
        src="/telesom-academy-logo.png"
        alt="Telesom Academy"
        width={dim.width}
        height={dim.height}
        style={{ flexShrink: 0, objectFit: 'contain', background: 'transparent' }}
        decoding="async"
      />

      {/* ── Brand Typography: TELESOM ACADEMY ── */}
      {showText && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            lineHeight: 1.05,
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              color: 'var(--brand-green)',
              fontWeight: 800,
              fontSize: size === 'sm' ? '0.85rem' : size === 'lg' ? '1.45rem' : '1.15rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            Telesom
          </span>
          <span
            style={{
              color: 'var(--brand-green)',
              fontWeight: 800,
              fontSize: size === 'sm' ? '0.85rem' : size === 'lg' ? '1.45rem' : '1.15rem',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            Academy
          </span>
        </div>
      )}
    </div>
  );
}
