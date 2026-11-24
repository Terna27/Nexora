'use client';

import React, { useEffect } from 'react';
import { motion, useSpring, useTransform, useReducedMotion } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  prefix = '',
  suffix = '',
  decimals = 2,
  className = '',
}) => {
  const prefersReduced = useReducedMotion();

  const spring = useSpring(value, {
    stiffness: 220,
    damping: 24,
    mass: 0.8,
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  const display = useTransform(spring, (current) => {
    if (prefersReduced) {
      return `${prefix}${value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;
    }

    const num = isNaN(current) ? 0 : current;
    return `${prefix}${num.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;
  });

  return (
    <motion.span className={`tabular-nums inline-block ${className}`}>
      {display}
    </motion.span>
  );
};
