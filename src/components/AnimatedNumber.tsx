import React, { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
}

/**
 * Smooth odometer / counter that rolls numbers up or down like a countdown / count-up
 * using smooth cubic easing on values changes.
 */
export const AnimatedNumber: React.FC<Props> = ({
  value,
  duration = 650,
  format = (n) => String(Math.round(n)),
  className = '',
}) => {
  const [display, setDisplay] = useState(value);
  const startVal = useRef(value);
  const targetVal = useRef(value);
  const startTime = useRef<number | null>(null);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    if (value === targetVal.current) return;

    startVal.current = display;
    targetVal.current = value;
    startTime.current = null;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      if (!startTime.current) startTime.current = now;
      const elapsed = now - startTime.current;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(progress);

      const current = startVal.current + (targetVal.current - startVal.current) * eased;
      setDisplay(current);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(step);
      } else {
        setDisplay(targetVal.current);
      }
    };

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(step);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
};
