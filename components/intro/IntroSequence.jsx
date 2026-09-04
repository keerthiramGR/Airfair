"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AirplaneTransition from "./AirplaneTransition";

/**
 * AIRFAIR Intro Sequence
 * Phase A: 3s bold typography reveal ("AIRFAIR.") on warm canvas
 * Phase B: Commercial airliner flight across the screen with curved orange contrail
 * Phase C: Screen transition wave carrying the user into the Authentication screen
 */
export default function IntroSequence({ onIntroComplete }) {
  // Stages: "wordmark" (0s - 3s) -> "airplane" (3s - 4.8s) -> "transition_complete"
  const [phase, setPhase] = useState("wordmark");

  useEffect(() => {
    // Phase A: 3 seconds of wordmark presence
    const wordmarkTimer = setTimeout(() => {
      setPhase("airplane");
    }, 3000);

    return () => clearTimeout(wordmarkTimer);
  }, []);

  const handleSkip = () => {
    try {
      localStorage.setItem("airfair_intro_seen", "true");
    } catch (_) {}
    if (onIntroComplete) onIntroComplete();
  };

  const handleFlightComplete = () => {
    try {
      localStorage.setItem("airfair_intro_seen", "true");
    } catch (_) {}
    if (onIntroComplete) onIntroComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#FFFCF9] overflow-hidden select-none">
      {/* Background Warm Radial Atmosphere & Grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-radial from-[#FFF1E6]/70 via-[#FFF8F2]/40 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(#F97316 1px, transparent 1px)`,
            backgroundSize: "32px 32px"
          }}
        />
      </div>

      {/* PHASE A: Centered Wordmark with Bold Impact Typography */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl">
        {/* Top Tag */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF1E6] border border-[#F1E5DB] text-[11px] font-bold tracking-[0.16em] text-airfair-orange uppercase mb-6 shadow-warm-sm"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-airfair-orange animate-pulse" />
          SIH 2026 • Problem Statement 26056
        </motion.div>

        {/* Large Bold Identity Wordmark ("AIRFAIR.") */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.94, letterSpacing: "-0.08em" }}
          animate={{
            opacity: 1,
            scale: 1,
            letterSpacing: "-0.04em",
            transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
          }}
          className="text-6xl sm:text-8xl md:text-9xl font-black text-[#171717] tracking-tighter leading-none"
        >
          AIRFAIR<span className="text-airfair-orange">.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
          className="mt-6 text-xs sm:text-sm md:text-base font-bold tracking-[0.24em] text-[#6B7280] uppercase"
        >
          Real-Time Airfare Price Index for India
        </motion.p>

        {/* 3-Second Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="w-48 h-1 bg-[#F1E5DB] rounded-full mt-10 overflow-hidden"
        >
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 2.8, ease: "easeInOut" }}
            className="h-full bg-gradient-to-r from-[#FDBA74] to-airfair-orange rounded-full"
          />
        </motion.div>
      </div>

      {/* PHASE B & C: Airplane Flight Across Screen & Wave Transition */}
      <AnimatePresence>
        {phase === "airplane" && (
          <>
            {/* Airplane with curved contrail */}
            <AirplaneTransition duration={1.8} onComplete={handleFlightComplete} />

            {/* Light Orange Transition Wave following behind the airplane */}
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: "100%", opacity: [0, 0.6, 0] }}
              transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-0 pointer-events-none bg-gradient-to-r from-transparent via-[#FFF1E6] to-transparent z-40"
            />
          </>
        )}
      </AnimatePresence>

      {/* Subtle Skip Button in bottom-right */}
      <button
        type="button"
        onClick={handleSkip}
        className="fixed bottom-6 right-8 text-xs font-semibold text-[#6B7280] hover:text-airfair-orange transition-colors z-50 flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-[#FFF1E6]/50"
      >
        <span>Skip intro</span>
        <span>→</span>
      </button>
    </div>
  );
}
