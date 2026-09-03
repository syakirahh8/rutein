import React, { useRef, useState, useEffect } from 'react';

interface TiltedCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  maxRotateX?: number;
  maxRotateY?: number;
  scaleOnHover?: number;
}

export function TiltedCard({
  children,
  className = '',
  style = {},
  maxRotateX = 10,
  maxRotateY = 10,
  scaleOnHover = 1.02,
}: TiltedCardProps) {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const rafId = useRef<number | null>(null);
  const isTouchDevice = useRef<boolean>(false);

  useEffect(() => {
    // Detect if device is primary touch/tablet device
    if (typeof window !== 'undefined') {
      isTouchDevice.current = window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Skip heavy calculations on pure touch devices for 100% smooth scrolling
    if (isTouchDevice.current) return;

    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    const clientX = e.clientX;
    const clientY = e.clientY;

    rafId.current = requestAnimationFrame(() => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const rotateY = ((clientX - centerX) / (rect.width / 2)) * maxRotateY;
      const rotateX = -((clientY - centerY) / (rect.height / 2)) * maxRotateX;

      setRotate({ x: rotateX, y: rotateY });
    });
  };

  const handleMouseEnter = () => {
    if (!isTouchDevice.current) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      className={`tilted-card-wrapper ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        perspective: 1000,
        WebkitPerspective: 1000,
        transformStyle: 'preserve-3d',
        WebkitTransformStyle: 'preserve-3d',
      }}
    >
      <div
        style={{
          transform: isHovered
            ? `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(${scaleOnHover}, ${scaleOnHover}, ${scaleOnHover}) translateZ(0)`
            : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0)',
          transition: isHovered ? 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)' : 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          height: '100%',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default TiltedCard;
