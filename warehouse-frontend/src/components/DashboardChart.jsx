import { useState } from 'react';
import { formatMoney, formatNumber } from './Badge';

/**
 * Biểu đồ xu hướng xuất/nhập kho trực quan (Interactive SVG Chart)
 * @param {Array} data - Mảng 7 ngày gần nhất [{ label, shortLabel, inAmount, inCount, outAmount, outCount }]
 */
export default function DashboardChart({ data = [] }) {
  const [metric, setMetric] = useState('amount'); // 'amount' | 'count'
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const isAmount = metric === 'amount';

  const maxValue = Math.max(
    1,
    ...data.map((d) => Math.max(isAmount ? d.inAmount : d.inCount, isAmount ? d.outAmount : d.outCount))
  );

  // Height and dimensions
  const height = 180;
  const paddingBottom = 28;
  const chartHeight = height - paddingBottom;

  return (
    <div className="card" style={{ padding: '20px 22px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.4px' }}>
            Biểu đồ xu hướng
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', margin: '2px 0 0 0' }}>
            Biến động Nhập – Xuất 7 ngày qua
          </h3>
        </div>

        {/* Toggle & Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, fontWeight: 600 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#0284c7' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#0284c7', display: 'inline-block' }} />
              Nhập kho
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#9333ea' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#9333ea', display: 'inline-block' }} />
              Xuất kho
            </span>
          </div>

          {/* Metric switch */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', padding: 3, borderRadius: 6, border: '1px solid #cbd5e1' }}>
            <button
              type="button"
              onClick={() => setMetric('amount')}
              style={{
                border: 'none',
                background: isAmount ? '#ffffff' : 'transparent',
                color: isAmount ? 'var(--ink)' : 'var(--text-muted)',
                fontWeight: isAmount ? 700 : 500,
                fontSize: 11.5,
                padding: '4px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                boxShadow: isAmount ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Giá trị (đ)
            </button>
            <button
              type="button"
              onClick={() => setMetric('count')}
              style={{
                border: 'none',
                background: !isAmount ? '#ffffff' : 'transparent',
                color: !isAmount ? 'var(--ink)' : 'var(--text-muted)',
                fontWeight: !isAmount ? 700 : 500,
                fontSize: 11.5,
                padding: '4px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                boxShadow: !isAmount ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Số phiếu
            </button>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div style={{ position: 'relative', flex: 1, minHeight: height, marginTop: 'auto' }}>
        <svg
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = chartHeight * (1 - pct);
            return (
              <g key={idx}>
                <line
                  x1="0"
                  y1={y}
                  x2="100"
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, idx) => {
            const groupWidth = 100 / data.length;
            const barWidth = groupWidth * 0.32;
            const groupX = idx * groupWidth;

            const inVal = isAmount ? d.inAmount : d.inCount;
            const outVal = isAmount ? d.outAmount : d.outCount;

            const inBarH = maxValue > 0 ? (inVal / maxValue) * (chartHeight - 10) : 0;
            const outBarH = maxValue > 0 ? (outVal / maxValue) * (chartHeight - 10) : 0;

            const inX = groupX + groupWidth * 0.16;
            const outX = inX + barWidth + groupWidth * 0.04;

            const inY = chartHeight - inBarH;
            const outY = chartHeight - outBarH;

            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={d.date || idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Background hover highlight */}
                {isHovered && (
                  <rect
                    x={groupX}
                    y={0}
                    width={groupWidth}
                    height={chartHeight}
                    fill="#f8fafc"
                    rx="2"
                  />
                )}

                {/* Nhập kho Bar */}
                <rect
                  x={inX}
                  y={inY}
                  width={barWidth}
                  height={Math.max(2, inBarH)}
                  rx="1.5"
                  fill="#0284c7"
                  opacity={isHovered ? 1 : 0.88}
                />

                {/* Xuất kho Bar */}
                <rect
                  x={outX}
                  y={outY}
                  width={barWidth}
                  height={Math.max(2, outBarH)}
                  rx="1.5"
                  fill="#9333ea"
                  opacity={isHovered ? 1 : 0.88}
                />

                {/* Label (Date) */}
                <text
                  x={groupX + groupWidth / 2}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="4"
                  fill={isHovered ? 'var(--ink)' : 'var(--text-muted)'}
                  fontWeight={isHovered ? '700' : '500'}
                  style={{ userSelect: 'none' }}
                >
                  {d.shortLabel || d.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Box */}
        {hoveredIdx !== null && data[hoveredIdx] && (
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: `${((hoveredIdx + 0.5) / data.length) * 100}%`,
              transform: 'translateX(-50%)',
              background: '#0f172a',
              color: '#ffffff',
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 12,
              boxShadow: '0 8px 18px rgba(0,0,0,0.25)',
              pointerEvents: 'none',
              zIndex: 10,
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, color: '#94a3b8', fontSize: 11, borderBottom: '1px solid #334155', paddingBottom: 3 }}>
              {data[hoveredIdx].label || data[hoveredIdx].date}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#38bdf8' }} />
              <span>Nhập:</span>
              <strong style={{ color: '#38bdf8' }}>
                {isAmount ? formatMoney(data[hoveredIdx].inAmount) : `${formatNumber(data[hoveredIdx].inCount)} phiếu`}
              </strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: '#c084fc' }} />
              <span>Xuất:</span>
              <strong style={{ color: '#c084fc' }}>
                {isAmount ? formatMoney(data[hoveredIdx].outAmount) : `${formatNumber(data[hoveredIdx].outCount)} phiếu`}
              </strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
