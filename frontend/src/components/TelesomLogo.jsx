/**
 * TelesomLogo Component
 * Accurately replicates the official Telesom Academy crest and brand typography.
 *
 * @param {string} size - 'sm' | 'md' | 'lg' (default: 'md')
 * @param {boolean} showText - whether to render "TELESOM ACADEMY" next to the crest (default: true)
 * @param {string} className - optional extra class names
 */
export default function TelesomLogo({ size = 'md', showText = true, className = '' }) {
  const crestSizes = {
    sm: { width: 34, height: 38 },
    md: { width: 44, height: 50 },
    lg: { width: 56, height: 64 },
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
      {/* ── Official Crest / Shield Vector ── */}
      <svg
        width={dim.width}
        height={dim.height}
        viewBox="0 0 100 114"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      >
        {/* Shield Outer Border (Telesom Gold/Amber) */}
        <path
          d="M50 4 L88 18 C88 56 74 92 50 110 C26 92 12 56 12 18 Z"
          fill="#FFFFFF"
          stroke="#D68B29"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Inner Shield (Telesom Green) */}
        <path
          d="M50 11 L81 23 C81 53 69 84 50 100 C31 84 19 53 19 23 Z"
          fill="#F4FBF6"
          stroke="#229948"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Graduation Cap (Mortarboard) - Green */}
        <path
          d="M50 28 L72 38 L50 48 L28 38 Z"
          fill="#229948"
        />
        {/* Cap skull base */}
        <path
          d="M37 43.5 V52 C37 57 43 60 50 60 C57 60 63 57 63 52 V43.5"
          stroke="#229948"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        {/* Tassel (Gold) */}
        <path
          d="M65 41 L70 51 L72 51"
          stroke="#D68B29"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="70" cy="52" r="1.5" fill="#D68B29" />

        {/* Open Book - Knowledge Symbol */}
        <path
          d="M50 68 C44 65 35 65 31 67 V81 C35 79 44 79 50 82 C56 79 65 79 69 81 V67 C65 65 56 65 50 68 Z"
          fill="#FFFFFF"
          stroke="#229948"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <line x1="50" y1="68" x2="50" y2="82" stroke="#229948" strokeWidth="2" />

        {/* Lower Banner Ribbon with "TELESOM ACADEMY" */}
        <rect
          x="14"
          y="88"
          width="72"
          height="14"
          rx="3"
          fill="#D68B29"
        />
        <text
          x="50"
          y="98"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="6.2"
          fontWeight="800"
          letterSpacing="0.6"
          fontFamily="system-ui, sans-serif"
        >
          TELESOM ACADEMY
        </text>
      </svg>

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
              color: '#229948',
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
              color: '#229948',
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
