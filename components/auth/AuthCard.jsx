"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plane,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  KeyRound,
  Sparkles,
  X
} from "lucide-react";
import { sendOTP, verifyOTP } from "@/lib/api";

export default function AuthCard({ onAuthenticated, onClose }) {
  const [step, setStep] = useState("email"); // "email" | "otp" | "success"
  const [email, setEmail] = useState("");
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [countdown, setCountdown] = useState(30);

  const otpRefs = useRef([]);

  // Resend Countdown
  useEffect(() => {
    let timer;
    if (step === "otp" && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Handle Send OTP
  const handleSendEmail = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || !cleanEmail.includes(".")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      await sendOTP(cleanEmail);
      setStep("otp");
      setCountdown(30);
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 150);
    } catch (err) {
      setErrorMessage(err.message || "Failed to send verification code. Ensure backend is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Paste full OTP code
      const cleanDigits = value.replace(/\D/g, "").slice(0, 6);
      if (cleanDigits.length > 0) {
        const nextVals = [...otpValues];
        for (let i = 0; i < 6; i++) {
          nextVals[i] = cleanDigits[i] || "";
        }
        setOtpValues(nextVals);
        const focusIdx = Math.min(cleanDigits.length, 5);
        otpRefs.current[focusIdx]?.focus();
        return;
      }
    }

    const digit = value.slice(-1).replace(/\D/g, "");
    const nextVals = [...otpValues];
    nextVals[index] = digit;
    setOtpValues(nextVals);

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const code = otpValues.join("");
    if (code.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit code.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await verifyOTP(cleanEmail, code);
      if (res.verified) {
        setStep("success");
        try {
          sessionStorage.setItem("airfair_auth_token", res.token);
          sessionStorage.setItem("airfair_auth_email", cleanEmail);
        } catch (_) {}

        // Short delay with mini-airplane flight before transitioning to dashboard
        setTimeout(() => {
          if (onAuthenticated) onAuthenticated(cleanEmail, res.token);
        }, 1100);
      }
    } catch (err) {
      setErrorMessage(err.message || "Invalid verification code. Please check and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(Math.min(b.length, 6)) + c)
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 14 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="relative z-10 w-full bg-white border border-[#F1E5DB] rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 text-left"
    >
      {/* ================================================================= */}
      {/* LEFT COLUMN: Brand Identity & Aviation Corridor Visual            */}
      {/* ================================================================= */}
      <div className="md:col-span-5 bg-gradient-to-br from-[#FFF8F2] via-[#FFF1E6]/80 to-white p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#F1E5DB]">
        <div>
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#F1E5DB] text-[11px] font-bold tracking-wider text-airfair-orange uppercase mb-6 shadow-sm">
            <Plane size={14} />
            <span>Indian Aviation Intelligence</span>
          </div>

          {/* Main Wordmark */}
          <h2 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight mb-2">
            AIRFAIR<span className="text-airfair-orange">.</span>
          </h2>

          <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed mb-6">
            Track real-time airfare movements, market inflation, and pricing anomalies across India's domestic corridors.
          </p>

          {/* Stylized Aviation Corridor Graphic */}
          <div className="p-4 bg-white/95 border border-[#F1E5DB] rounded-xl shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-[#171717] mb-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-airfair-orange" />
                DEL (Delhi)
              </span>
              <span className="text-airfair-orange text-sm">✈ ───→</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#171717]" />
                BOM (Mumbai)
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
              <span>Corridor 09R • 1,148 km</span>
              <span className="font-semibold text-emerald-600">Active Live Tracking</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#F1E5DB]/80 text-[11px] text-[#6B7280]">
          AIRFAIR &bull; National Airfare Intelligence Platform
        </div>
      </div>

      {/* ================================================================= */}
      {/* RIGHT COLUMN: Authentication Form                                 */}
      {/* ================================================================= */}
      <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center relative">
        {/* Modal Close Button */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-lg text-[#9CA3AF] hover:text-[#171717] hover:bg-[#F3F4F6] flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: Email Form */}
          {step === "email" && (
            <motion.div
              key="step-email"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <h3 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight mb-1.5">
                  Welcome to AIRFAIR
                </h3>
                <p className="text-xs sm:text-sm text-[#6B7280]">
                  Sign in to access airfare intelligence, route forecasting, and automated bookings.
                </p>
              </div>

              <form onSubmit={handleSendEmail} className="space-y-4">
                <div>
                  <label htmlFor="user-email" className="block text-xs font-bold uppercase tracking-wider text-[#171717] mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                    <input
                      id="user-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email (e.g. user@example.com)"
                      required
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 bg-[#FFFCF9] border border-[#F1E5DB] rounded-xl text-sm text-[#171717] placeholder:text-[#9CA3AF] focus:outline-none focus:border-airfair-orange focus:ring-2 focus:ring-airfair-orange/20 transition-all"
                    />
                  </div>
                  <span className="block mt-2 text-[11px] text-[#6B7280]">
                    We will send a 6-digit one-time passcode to this email address.
                  </span>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-airfair-orange hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Sending verification code...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue with Email</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 2: OTP Verification Form */}
          {step === "otp" && (
            <motion.div
              key="step-otp"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-5">
                <h3 className="text-xl sm:text-2xl font-black text-[#171717] tracking-tight mb-1">
                  Verify your email
                </h3>
                <p className="text-xs sm:text-sm text-[#6B7280]">
                  We've sent a 6-digit code to{" "}
                  <span className="font-semibold text-[#171717]">{maskedEmail || email}</span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtpValues(["", "", "", "", "", ""]);
                    setErrorMessage("");
                  }}
                  className="mt-1 text-xs font-bold text-airfair-orange hover:underline cursor-pointer"
                >
                  ← Change email
                </button>
              </div>

              {/* Real-time SMTP Status Indicator */}
              <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                <span>Verification code dispatched via secure SMTP. Please check your inbox and spam folder.</span>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {/* 6-Digit Boxes */}
                <div className="flex items-center justify-between gap-1.5 sm:gap-2.5">
                  {otpValues.map((val, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={val}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-10 h-12 sm:w-12 sm:h-13 text-center text-lg sm:text-xl font-black text-[#171717] bg-[#FFFCF9] border border-[#F1E5DB] rounded-xl focus:outline-none focus:border-airfair-orange focus:ring-2 focus:ring-airfair-orange/20 transition-all"
                      aria-label={`Digit ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Resend Countdown */}
                <div className="flex items-center justify-between text-xs text-[#6B7280]">
                  <span>Didn't receive the code?</span>
                  {countdown > 0 ? (
                    <span className="font-medium text-[#171717]">
                      Resend in 00:{countdown < 10 ? `0${countdown}` : countdown}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendEmail}
                      disabled={isSubmitting}
                      className="font-bold text-airfair-orange hover:underline cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || otpValues.join("").length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-airfair-orange hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Verifying code...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      <span>Verify & Enter Platform</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 3: Verification Success & Mini Airplane Glide */}
          {step === "success" && (
            <motion.div
              key="step-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center flex flex-col items-center"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3 shadow-sm">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-xl font-black text-[#171717] tracking-tight mb-1">
                Email Verified Successfully ✓
              </h3>
              <p className="text-xs font-bold text-airfair-orange mb-5">
                Welcome to AIRFAIR Intelligence
              </p>

              {/* Mini Airplane Flight Animation */}
              <motion.div
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 80, opacity: [0, 1, 0] }}
                transition={{ duration: 1.0, ease: "easeInOut" }}
                className="text-airfair-orange"
              >
                <Plane size={24} className="rotate-45" />
              </motion.div>

              <span className="text-xs text-[#6B7280] mt-3">
                Entering live analytical dashboard...
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
