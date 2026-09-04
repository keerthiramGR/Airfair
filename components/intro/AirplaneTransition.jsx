"use client";

import React from "react";
import { motion } from "framer-motion";

/**
 * Reusable Airplane Transition Component
 * Uses Framer Motion to move a commercial airliner SVG smoothly across the screen
 * with a subtle curved flight path and an aerodynamic warm-orange vapor trail.
 */
export default function AirplaneTransition({
  duration = 1.8,
  onComplete,
  className = "",
  showTrail = true
}) {
  return (
    <div className={`fixed inset-0 pointer-events-none z-50 overflow-hidden ${className}`}>
      {/* SVG Curved Vapor Flight Path Trail */}
      {showTrail && (
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <motion.path
            d="M -100 650 Q 400 480, 800 340 T 1800 120"
            fill="none"
            stroke="url(#orangeTrailGrad)"
            strokeWidth="3.5"
            strokeDasharray="8 6"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 0.85, 0] }}
            transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
          />
          <defs>
            <linearGradient id="orangeTrailGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFF1E6" stopOpacity="0" />
              <stop offset="30%" stopColor="#FDBA74" stopOpacity="0.7" />
              <stop offset="85%" stopColor="#F97316" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#F97316" stopOpacity="0.3" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {/* Airplane Body */}
      <motion.div
        className="absolute top-0 left-0 w-24 h-24"
        initial={{
          x: "-120px",
          y: "65vh",
          rotate: -14,
          scale: 0.85,
          opacity: 0
        }}
        animate={{
          x: ["-120px", "40vw", "75vw", "110vw"],
          y: ["65vh", "45vh", "28vh", "12vh"],
          rotate: [-14, -18, -22, -26],
          scale: [0.85, 1, 1.12, 1.25],
          opacity: [0, 1, 1, 0]
        }}
        transition={{
          duration,
          ease: [0.22, 1, 0.36, 1],
          times: [0, 0.4, 0.75, 1]
        }}
        onAnimationComplete={() => {
          if (onComplete) onComplete();
        }}
      >
        {/* Commercial airliner silhouette with sleek aviation curves */}
        <svg
          viewBox="0 0 1024 1024"
          className="w-full h-full text-airfair-orange filter drop-shadow-[0_12px_24px_rgba(249,115,22,0.35)]"
          fill="currentColor"
        >
          {/* Main Fuselage & Swept Wings */}
          <path
            d="M512 80c-18 0-36 16-36 48v232L120 540v64l356-92v204l-96 76v48l132-32 132 32v-48l-96-76V512l356 92v-64L548 360V128c0-32-18-48-36-48z"
            fill="#F97316"
          />
          {/* Cockpit Visor & Wing Accents */}
          <ellipse cx="512" cy="190" rx="14" ry="24" fill="#ffffff" />
          <circle cx="132" cy="580" r="10" fill="#22C55E" />
          <circle cx="892" cy="580" r="10" fill="#EF4444" />
        </svg>

        {/* Dynamic Engine Exhaust Glow */}
        <div className="absolute bottom-2 left-6 w-12 h-3 bg-gradient-to-r from-transparent via-amber-300 to-airfair-orange rounded-full blur-[3px] opacity-70" />
      </motion.div>
    </div>
  );
}
