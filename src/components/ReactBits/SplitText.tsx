import React, { useRef, useEffect, useState } from 'react';

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  animationFrom?: { opacity: number; transform: string; filter?: string };
  animationTo?: { opacity: number; transform: string; filter?: string };
  easing?: string;
  threshold?: number;
  rootMargin?: string;
  textAlign?: 'left' | 'right' | 'center' | 'justify';
  onLetterAnimationComplete?: () => void;
  style?: React.CSSProperties;
}

export function SplitText({
  text = '',
  className = '',
  delay = 25,
  animationFrom = { opacity: 0, transform: 'translate3d(0,24px,0)', filter: 'blur(6px)' },
  animationTo = { opacity: 1, transform: 'translate3d(0,0,0)', filter: 'blur(0px)' },
  easing = 'cubic-bezier(0.16, 1, 0.3, 1)',
  threshold = 0.1,
  rootMargin = '-20px',
  textAlign = 'left',
  onLetterAnimationComplete,
  style = {},
}: SplitTextProps) {
  const words = text.split(' ');
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const animatedCount = useRef(0);
  const totalLetters = text.replace(/\s/g, '').length;

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

  let globalLetterIdx = 0;

  return (
    <span
      ref={ref}
      className={`split-parent ${className}`}
      style={{
        textAlign,
        display: 'inline',
        ...style,
      }}
    >
      {words.map((word, wordIdx) => {
        const wordLetters = word.split('');
        return (
          <span
            key={wordIdx}
            style={{
              display: 'inline-block',
              whiteSpace: 'nowrap',
            }}
          >
            {wordLetters.map((letter) => {
              const currentDelay = globalLetterIdx * delay;
              globalLetterIdx++;

              return (
                <span
                  key={globalLetterIdx}
                  style={{
                    display: 'inline-block',
                    willChange: 'transform, opacity, filter',
                    opacity: inView ? animationTo.opacity : animationFrom.opacity,
                    transform: inView ? animationTo.transform : animationFrom.transform,
                    filter: inView ? animationTo.filter : animationFrom.filter,
                    transition: `opacity 0.65s ${easing} ${currentDelay}ms, transform 0.65s ${easing} ${currentDelay}ms, filter 0.65s ${easing} ${currentDelay}ms`,
                  }}
                  onTransitionEnd={() => {
                    animatedCount.current += 1;
                    if (animatedCount.current === totalLetters && onLetterAnimationComplete) {
                      onLetterAnimationComplete();
                    }
                  }}
                >
                  {letter}
                </span>
              );
            })}
            {wordIdx < words.length - 1 && <span style={{ display: 'inline-block' }}>&nbsp;</span>}
          </span>
        );
      })}
    </span>
  );
}

export default SplitText;
