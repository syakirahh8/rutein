import React, { useRef, useEffect, useState } from 'react';

interface BlurTextProps {
  text: string;
  className?: string;
  delay?: number;
  direction?: 'top' | 'bottom';
  threshold?: number;
  rootMargin?: string;
  style?: React.CSSProperties;
  onAnimationComplete?: () => void;
}

export function BlurText({
  text = '',
  className = '',
  delay = 120,
  direction = 'top',
  threshold = 0.1,
  rootMargin = '-30px',
  style = {},
  onAnimationComplete,
}: BlurTextProps) {
  const words = text.split(' ');
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const animatedCount = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const defaultFrom = direction === 'top' ? 'translate3d(0,-16px,0)' : 'translate3d(0,16px,0)';

  return (
    <p
      ref={ref}
      className={`blur-text-parent ${className}`}
      style={{
        display: 'inline-block',
        margin: 0,
        ...style,
      }}
    >
      {words.map((word, index) => (
        <span
          key={index}
          style={{
            display: 'inline-block',
            marginRight: '0.28em',
            willChange: 'transform, opacity, filter',
            opacity: inView ? 1 : 0,
            filter: inView ? 'blur(0px)' : 'blur(10px)',
            transform: inView ? 'translate3d(0,0,0)' : defaultFrom,
            transition: `opacity 0.75s cubic-bezier(0.16, 1, 0.3, 1) ${index * delay}ms, transform 0.75s cubic-bezier(0.16, 1, 0.3, 1) ${index * delay}ms, filter 0.75s cubic-bezier(0.16, 1, 0.3, 1) ${index * delay}ms`,
          }}
          onTransitionEnd={() => {
            animatedCount.current += 1;
            if (animatedCount.current === words.length && onAnimationComplete) {
              onAnimationComplete();
            }
          }}
        >
          {word}
        </span>
      ))}
    </p>
  );
}

export default BlurText;
