import React from 'react';

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${Math.random() * 100}%`,
  duration: `${12 + Math.random() * 20}s`,
  delay: `${Math.random() * 15}s`,
  size: Math.random() > 0.6 ? 3 : 2,
  opacity: 0.3 + Math.random() * 0.4,
}));

export const ParticleBackground: React.FC = () => {
  return (
    <div className="particle-bg" aria-hidden="true">
      {/* Ambient gradient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Drifting particle dots */}
      {PARTICLES.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: p.left,
            bottom: `-${10 + Math.random() * 20}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
};
