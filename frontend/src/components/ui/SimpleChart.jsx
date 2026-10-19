import React, { useMemo } from 'react';
import './ui.css';

/**
 * SimpleChart - Lightweight pure-CSS/SVG chart component
 * @param {'bar'|'line'|'donut'} type - Chart type
 * @param {{ label: string, value: number, color?: string }[]} data - Data points
 * @param {string} title - Chart title
 * @param {number} height - Chart height in px (for bar/line)
 */

/* ─────────────── Colour helpers ─────────────── */
const DEFAULT_COLORS = [
  '#229948', '#e5a319', '#32a85b', '#ba741d', '#1b823d',
  '#fef9c3', '#14532d', '#d68b29', '#166534', '#92400e',
];

const getColor = (item, idx) => item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

/* ─────────────── Bar Chart ─────────────── */
const BarChart = ({ data, height = 220 }) => {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bar-chart" style={{ height }}>
      <div className="bar-chart-bars">
        {data.map((item, idx) => {
          const pct = (item.value / max) * 100;
          const color = getColor(item, idx);
          return (
            <div key={idx} className="bar-chart-col">
              <div className="bar-chart-bar-wrap">
                <div
                  className="bar-chart-bar"
                  style={{ height: `${pct}%`, backgroundColor: color }}
                  title={`${item.label}: ${item.value}`}
                >
                  <span className="bar-chart-val">{item.value}</span>
                </div>
              </div>
              <span className="bar-chart-label">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────── Line / Area Chart ─────────────── */
const LineChart = ({ data, height = 220 }) => {
  const W = 600;
  const H = height;
  const PAD = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const max = Math.max(...data.map((d) => d.value), 1);
  const min = 0;
  const range = max - min || 1;

  const points = data.map((item, idx) => ({
    x: PAD.left + (idx / Math.max(data.length - 1, 1)) * chartW,
    y: PAD.top + (1 - (item.value - min) / range) * chartH,
    ...item,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaPath = [
    `M ${points[0].x} ${PAD.top + chartH}`,
    ...points.map((p) => `L ${p.x} ${p.y}`),
    `L ${points[points.length - 1].x} ${PAD.top + chartH}`,
    'Z',
  ].join(' ');

  // Y-axis ticks
  const ticks = 5;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round(min + (range * i) / ticks)
  );

  return (
    <div className="line-chart">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height }}
      >
        <defs>
          <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#229948" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#229948" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y grid lines */}
        {yTicks.map((tick, i) => {
          const y = PAD.top + (1 - (tick - min) / range) * chartH;
          return (
            <g key={i}>
              <line
                x1={PAD.left} y1={y}
                x2={PAD.left + chartW} y2={y}
                stroke="#e5e7eb" strokeWidth="1"
              />
              <text
                x={PAD.left - 6} y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#6b7280"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#lineAreaGrad)" />

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#229948"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="#229948" />
            <circle cx={p.x} cy={p.y} r="2.5" fill="#fff" />
            <text
              x={p.x}
              y={PAD.top + chartH + 20}
              textAnchor="middle"
              fontSize="11"
              fill="#6b7280"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

/* ─────────────── Donut Chart ─────────────── */
const DonutChart = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 70;
  const CX = 90;
  const CY = 90;
  const strokeW = 28;
  const circumference = 2 * Math.PI * R;

  // Build segments
  const segments = useMemo(() => {
    let offset = 0;
    return data.map((item, idx) => {
      const pct = item.value / total;
      const dash = pct * circumference;
      const seg = { ...item, dash, gap: circumference - dash, offset, color: getColor(item, idx) };
      offset += dash;
      return seg;
    });
  }, [data, total, circumference]);

  return (
    <div className="donut-chart">
      <svg width={CX * 2} height={CY * 2} viewBox={`0 0 ${CX * 2} ${CY * 2}`}>
        {/* Background ring */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={strokeW}
        />
        {/* Segments */}
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeW}
            strokeDasharray={`${seg.dash} ${seg.gap}`}
            strokeDashoffset={-seg.offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${CX}px ${CY}px` }}
          >
            <title>{`${seg.label}: ${seg.value}`}</title>
          </circle>
        ))}
        {/* Centre text */}
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="#111827">
          {total}
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle" fontSize="11" fill="#6b7280">
          Total
        </text>
      </svg>

      {/* Legend */}
      <div className="donut-legend">
        {segments.map((seg, i) => (
          <div key={i} className="donut-legend-item">
            <span className="donut-legend-dot" style={{ backgroundColor: seg.color }} />
            <span className="donut-legend-label">{seg.label}</span>
            <span className="donut-legend-value">{seg.value}</span>
            <span className="donut-legend-pct">
              ({Math.round((seg.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─────────────── Main export ─────────────── */
const SimpleChart = ({ type = 'bar', data = [], title, height = 220 }) => {
  const renderChart = () => {
    switch (type) {
      case 'line':
        return <LineChart data={data} height={height} />;
      case 'donut':
        return <DonutChart data={data} />;
      case 'bar':
      default:
        return <BarChart data={data} height={height} />;
    }
  };

  return (
    <div className="simple-chart">
      {title && <h3 className="simple-chart-title">{title}</h3>}
      {renderChart()}
    </div>
  );
};

export default SimpleChart;
