import React from "react";
import { motion } from "framer-motion";

interface AnimatedRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  valueText?: string;
}

export function AnimatedRing({
  percentage,
  size = 120,
  strokeWidth = 10,
  color = "#6D5EF5",
  trackColor = "rgba(255,255,255,0.08)",
  label,
  valueText,
}: AnimatedRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <motion.span
          className="text-2xl font-bold text-white tracking-tight"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {valueText || `${percentage}%`}
        </motion.span>
        {label && (
          <span className="text-xs text-jury-text-muted mt-1 uppercase tracking-wider font-semibold">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
