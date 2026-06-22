import React from 'react';

const SkeletonCard: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <div className="skeleton" style={{ height: '14px', width: '80%', borderRadius: '6px' }} />
    <div className="skeleton" style={{ height: '11px', width: '60%', borderRadius: '6px' }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
      <div className="skeleton" style={{ height: '16px', width: '45px', borderRadius: '4px' }} />
      <div className="skeleton" style={{ height: '20px', width: '20px', borderRadius: '50%' }} />
    </div>
  </div>
);

const SkeletonColumn: React.FC<{ cardCount?: number }> = ({ cardCount = 3 }) => (
  <div className="skeleton-column">
    {/* Column header */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: '8px', height: '8px', borderRadius: '50%' }} />
        <div className="skeleton" style={{ height: '14px', width: '80px', borderRadius: '6px' }} />
        <div className="skeleton" style={{ height: '18px', width: '22px', borderRadius: '5px' }} />
      </div>
      <div className="skeleton" style={{ height: '22px', width: '22px', borderRadius: '5px' }} />
    </div>

    {/* Task card skeletons */}
    {Array.from({ length: cardCount }).map((_, i) => (
      <div
        key={i}
        style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '10px',
          padding: '0.875rem',
          animationDelay: `${i * 0.15}s`,
        }}
      >
        <SkeletonCard />
      </div>
    ))}

    {/* Add task button skeleton */}
    <div className="skeleton" style={{ height: '34px', borderRadius: '8px', marginTop: '0.5rem' }} />
  </div>
);

export const SkeletonLoader: React.FC = () => (
  <div style={{ display: 'flex', gap: '1.25rem', padding: '0.25rem', overflow: 'hidden' }}>
    <SkeletonColumn cardCount={4} />
    <SkeletonColumn cardCount={2} />
    <SkeletonColumn cardCount={3} />
  </div>
);
