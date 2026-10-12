import { useState, useEffect } from 'react';

/**
 * Custom hook for smooth numerical count-up animation on KPI metrics.
 * Respects prefers-reduced-motion for accessibility.
 */
export function useCountUp(endValue: number, duration: number = 700, decimals: number = 0): string {
  const [count, setCount] = useState<number>(() => {
    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return endValue;
    }
    return 0;
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(endValue);
      return;
    }

    let startTime: number | null = null;
    let frameId: number;

    const startValue = 0;
    const diff = endValue - startValue;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + diff * easeOut;

      setCount(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };

    frameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frameId);
  }, [endValue, duration]);

  return count.toFixed(decimals);
}
