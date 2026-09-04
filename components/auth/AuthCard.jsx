"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Mail, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, KeyRound, Sparkles } from "lucide-react";
import { sendOTP, verifyOTP } from "@/lib/api";

export default function AuthCard({ onAuthenticated }) {
  const [step, setStep] = useState("email"); // "email" | "otp" | "success"
  const [email, setEmail] = useState("analyst@civilaviation.gov.in");
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoCode, setDemoCode] = useState(null);
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
    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const res = await sendOTP(email);
      setStep("otp");
      setCountdown(30);
      if (res.demo_otp) {
        setDemoCode(res.demo_otp);
      }
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

  // Auto-fill demo OTP
  const handleFillDemoCode = () => {
    if (!demoCode) return;
    const digits = demoCode.split("");
    setOtpValues(digits);
    otpRefs.current[5]?.focus();
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
      const res = await verifyOTP(email, code);
      if (res.verified) {
        setStep("success");
        try {
          sessionStorage.setItem("airfair_auth_token", res.token);
          sessionStorage.setItem("airfair_auth_email", email);
        } catch (_) {}

        // Short celebratory delay with mini-airplane flight before transitioning to dashboard
        setTimeout(() => {
          if (onAuthenticated) onAuthenticated(email);
        }, 1200);
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
    <div className="min-h-screen bg-[#FFFCF9] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Decorative Warm Ambient Glows */}
      <div className="absolute top-12 left-12 w-72 h-72 bg-[#FFF1E6] rounded-full blur-3xl pointer-events-none opacity-60" />
      <div className="absolute bottom-12 right-12 w-80 h-80 bg-[#FFF8F2] rounded-full blur-3xl pointer-events-none opacity-70" />

      {/* Main Two-Column Auth Container */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-4xl bg-white border border-[#F1E5DB] rounded-2xl shadow-warm-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12"
      >
        {/* ================================================================= */}
        {/* LEFT COLUMN: Brand Identity & Aviation Visual                     */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#FFF8F2] via-[#FFF1E6]/80 to-white p-8 sm:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#F1E5DB]">
          <div>
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#F1E5DB] text-[11px] font-bold tracking-wider text-airfair-orange uppercase mb-8 shadow-warm-sm">
              <Plane size={14} />
              <span>Indian Aviation Intelligence</span>
            </div>

            {/* Main Wordmark */}
            <h2 className="text-3xl sm:text-4xl font-black text-[#171717] tracking-tight mb-3">
              AIRFAIR<span className="text-airfair-orange">.</span>
            </h2>

            <p className="text-sm text-[#6B7280] leading-relaxed mb-8">
              Track real-time airfare movements, market inflation, and pricing anomalies across India's domestic corridors.
            </p>

            {/* Stylized Aviation Corridor Graphic */}
            <div className="p-4 bg-white/90 border border-[#F1E5DB] rounded-xl shadow-warm-sm">
              <div className="flex items-center justify-between text-xs font-bold text-[#171717] mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-airfair-orange" />
                  DEL (Delhi)
                </span>
                <span className="text-airfair-orange">✈ ───→</span>
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

          <div className="mt-8 pt-6 border-t border-[#F1E5DB]/80 text-[11px] text-[#6B7280]">
            Smart India Hackathon 2026 • Ministry of Civil Aviation
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN: Authentication Form                                 */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {/* STEP 1: Email Form */}
            {step === "email" && (
              <motion.div
                key="step-email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-8">
                  <h3 className="text-2xl font-black text-[#171717] tracking-tight mb-2">
                    Welcome to AIRFAIR
                  </h3>
                  <p className="text-sm text-[#6B7280]">
                    Sign in to access airfare intelligence and price index data.
                  </p>
                </div>

                <form onSubmit={handleSendEmail} className="space-y-5">
                  <div>
                    <label htmlFor="user-email" className="block text-xs font-bold uppercase tracking-wider text-[#171717] mb-2">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                      <input
                        id="user-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="analyst@civilaviation.gov.in"
                        required
                        className="w-full pl-10 pr-4 py-3 bg-[#FFFCF9] border border-[#F1E5DB] rounded-xl text-sm text-[#171717] placeholder:text-[#9CA3AF] focus:outline-none focus:border-airfair-orange focus:ring-2 focus:ring-airfair-orange/20 transition-all"
                      />
                    </div>
                    <span className="block mt-2 text-xs text-[#6B7280]">
                      We will send a 6-digit one-time passcode to this email via SMTP.
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
                    disabled={isSubmitting || !email}
                    className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-airfair-orange hover:bg-airfair-orange-hover text-white rounded-xl text-sm font-bold shadow-warm-md hover:shadow-warm-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Sending OTP code...</span>
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
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-black text-[#171717] tracking-tight mb-2">
                    Verify your email
                  </h3>
                  <p className="text-sm text-[#6B7280]">
                    We've sent a 6-digit verification code to{" "}
                    <span className="font-semibold text-[#171717]">{maskedEmail || email}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtpValues(["", "", "", "", "", ""]);
                      setErrorMessage("");
                    }}
                    className="mt-1 text-xs font-semibold text-airfair-orange hover:underline"
                  >
                    Change email
                  </button>
                </div>

                {/* Development demo OTP chip */}
                {demoCode && (
                  <div
                    onClick={handleFillDemoCode}
                    className="mb-6 p-2.5 bg-[#FFF1E6] border border-[#FDBA74] text-airfair-orange-dark rounded-xl text-xs flex items-center gap-2 cursor-pointer hover:bg-[#FFE5D0] transition-colors"
                  >
                    <Sparkles size={15} />
                    <span>Demo mode: Click to fill code <strong>{demoCode}</strong></span>
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  {/* 6-Digit Boxes */}
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
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
                        className="w-11 h-13 sm:w-13 sm:h-14 text-center text-xl sm:text-2xl font-black text-[#171717] bg-[#FFFCF9] border border-[#F1E5DB] rounded-xl focus:outline-none focus:border-airfair-orange focus:ring-2 focus:ring-airfair-orange/20 transition-all"
                        aria-label={`Digit ${idx + 1}`}
                      />
                    ))}
                  </div>

                  {/* Resend Countdown */}
                  <div className="flex items-center justify-between text-xs text-[#6B7280]">
                    <span>Didn't receive the code?</span>
                    {countdown > 0 ? (
                      <span className="font-semibold text-[#171717]">
                        Resend in 00:{countdown < 10 ? `0${countdown}` : countdown}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendEmail}
                        disabled={isSubmitting}
                        className="font-bold text-airfair-orange hover:underline"
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
                    className="w-full flex items-center justify-center gap-2 py-3 px-5 bg-airfair-orange hover:bg-airfair-orange-hover text-white rounded-xl text-sm font-bold shadow-warm-md hover:shadow-warm-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Verifying OTP...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={16} />
                        <span>Verify OTP</span>
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
                className="py-10 text-center flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4 shadow-warm-sm">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-2xl font-black text-[#171717] tracking-tight mb-1">
                  Email verified ✓
                </h3>
                <p className="text-sm font-bold text-airfair-orange mb-6">
                  Welcome to AIRFAIR
                </p>

                {/* Subtle Mini Airplane Flying Right */}
                <motion.div
                  initial={{ x: -60, opacity: 0 }}
                  animate={{ x: 80, opacity: [0, 1, 0] }}
                  transition={{ duration: 1.1, ease: "easeInOut" }}
                  className="text-airfair-orange"
                >
                  <Plane size={24} className="rotate-45" />
                </motion.div>

                <span className="text-xs text-[#6B7280] mt-4">
                  Entering live analytical dashboard...
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
