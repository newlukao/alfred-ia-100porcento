import React, { useEffect, useRef } from 'react';

// Mascote simpático: robô mordomo cartoon
const MascotSVG: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="180"
    height="180"
    viewBox="0 0 180 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ display: 'block' }}
  >
    {/* Corpo */}
    <ellipse cx="90" cy="120" rx="50" ry="40" fill="#F3F4F6" stroke="#B0B6C3" strokeWidth="3" />
    {/* Cabeça */}
    <ellipse cx="90" cy="70" rx="38" ry="36" fill="#fff" stroke="#B0B6C3" strokeWidth="3" />
    {/* Olhos */}
    <ellipse id="eye-left" cx="75" cy="70" rx="6" ry="8" fill="#222" />
    <ellipse id="eye-right" cx="105" cy="70" rx="6" ry="8" fill="#222" />
    {/* Sobrancelhas */}
    <rect x="68" y="60" width="14" height="3" rx="1.5" fill="#B0B6C3" />
    <rect x="98" y="60" width="14" height="3" rx="1.5" fill="#B0B6C3" />
    {/* Sorriso */}
    <path d="M80 85 Q90 95 100 85" stroke="#B0B6C3" strokeWidth="3" fill="none" />
    {/* Gravata */}
    <ellipse cx="90" cy="110" rx="10" ry="5" fill="#4F46E5" />
    <rect x="85" y="115" width="10" height="12" rx="3" fill="#6366F1" />
    {/* Braços */}
    <rect x="35" y="110" width="15" height="7" rx="3.5" fill="#B0B6C3" />
    <rect x="130" y="110" width="15" height="7" rx="3.5" fill="#B0B6C3" />
    {/* Detalhes */}
    <circle cx="90" cy="40" r="6" fill="#6366F1" stroke="#B0B6C3" strokeWidth="2" />
  </svg>
);

export default MascotSVG; 