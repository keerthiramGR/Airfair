"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plane, ShieldCheck, Mail, KeyRound, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, Sparkles } from "lucide-react";
import { sendOTP, verifyOTP } from "@/lib/api";

export default function IntroSplashAuth({ onAuthenticated }) {
  // Stages: "splash" (3s) -> "flight" (1.8s) -> "login" -> "authenticated"
  const [stage, setStage] = useState("splash");
  const [email, setEmail] = useState("analyst@civilaviation.gov.in");
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [demoCode, setDemoCode] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(300);

  const otpInputRefs = useRef([]);

  // Stage 1: 3-Second Splash Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setStage("flight");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Stage 2: Flight Animation Timer (1.8s) -> Transition to Login
  useEffect(() => {
    if (stage === "flight") {
      const flightTimer = setTimeout(() => {
        setStage("login");
      }, 1800);
      return () => clearTimeout(flightTimer);
    }
  }, [stage]);

  // OTP Countdown Timer
  useEffect(() => {
    if (otpSent && timeLeft > 0) {
      const interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [otpSent, timeLeft]);

  // Handle Send OTP via Backend SMTP
  const handleSendOTP = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage("");
    setStatusMessage("");
    setIsSendingOTP(true);

    try {
      const res = await sendOTP(email);
      setOtpSent(true);
      setTimeLeft(300);
      setStatusMessage(res.message || "OTP code sent via SMTP.");
      if (res.demo_otp) {
        setDemoCode(res.demo_otp);
      }
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      if (err.message === "BACKEND_OFFLINE") {
        // Backend not running — fall back to demo mode
        setOtpSent(true);
        setTimeLeft(300);
        setDemoCode("123456");
        setStatusMessage("Backend is offline. Using demo mode — enter the code shown below.");
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 100);
      } else {
        setErrorMessage(err.message || "Unable to send verification code. Please check backend connection.");
      }
    } finally {
      setIsSendingOTP(false);
    }
  };

  // Handle OTP Box Input and Auto-advance
  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste of complete 6-digit code
      const pasted = value.replace(/\D/g, "").slice(0, 6);
      if (pasted.length > 0) {
        const newVals = [...otpValues];
        for (let i = 0; i < 6; i++) {
          newVals[i] = pasted[i] || "";
        }
        setOtpValues(newVals);
        const nextIdx = Math.min(pasted.length, 5);
        otpInputRefs.current[nextIdx]?.focus();
        return;
      }
    }

    const cleanChar = value.slice(-1).replace(/\D/g, "");
    const newVals = [...otpValues];
    newVals[index] = cleanChar;
    setOtpValues(newVals);

    if (cleanChar && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Auto-fill test demo OTP
  const handleUseDemoCode = () => {
    if (!demoCode) return;
    const digits = demoCode.split("");
    setOtpValues(digits);
    otpInputRefs.current[5]?.focus();
  };

  // Handle Verify OTP
  const handleVerifyOTP = async (e) => {
    if (e) e.preventDefault();
    const fullCode = otpValues.join("");
    if (fullCode.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit verification code.");
      return;
    }

    setErrorMessage("");
    setIsVerifying(true);

    // Demo mode bypass: if demoCode matches, skip backend call
    if (demoCode && fullCode === demoCode) {
      setStage("authenticated");
      sessionStorage.setItem("airfair_auth_token", "demo_token_" + Date.now());
      sessionStorage.setItem("airfair_auth_email", email);
      setTimeout(() => {
        if (onAuthenticated) onAuthenticated(email);
      }, 1200);
      setIsVerifying(false);
      return;
    }

    try {
      const res = await verifyOTP(email, fullCode);
      if (res.verified) {
        setStage("authenticated");
        sessionStorage.setItem("airfair_auth_token", res.token);
        sessionStorage.setItem("airfair_auth_email", email);

        setTimeout(() => {
          if (onAuthenticated) onAuthenticated(email);
        }, 1200);
      }
    } catch (err) {
      setErrorMessage(err.message || "Invalid OTP code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className={`intro-auth-overlay ${stage === "authenticated" ? "fade-out" : ""}`}>
      {/* Background Animated Atmosphere */}
      <div className="aero-grid-background">
        <div className="radar-circle circle-1"></div>
        <div className="radar-circle circle-2"></div>
        <div className="radar-circle circle-3"></div>
        <div className="radar-sweep-beam"></div>
      </div>

      {/* ========================================================================= */}
      {/* STAGE 1: BOLD INTRO SPLASH SCREEN (3 Seconds)                            */}
      {/* Inspired by bold typography aesthetic ("THUNDER.")                       */}
      {/* ========================================================================= */}
      {stage === "splash" && (
        <div className="splash-stage-container">
          <div className="splash-badge-pill">
            <span className="live-dot-pulse"></span>
            GOVERNMENT OF INDIA • SMART INDIA HACKATHON 2026
          </div>

          <h1 className="bold-impact-title" aria-label="AIRFAIR">
            AIRFAIR.
          </h1>

          <p className="splash-subtitle">
            REAL-TIME AIRFARE PRICE INDEX FOR INDIA • PROBLEM STATEMENT 26056
          </p>

          <div className="splash-loading-bar-wrapper">
            <div className="splash-loading-progress"></div>
          </div>

          <button
            type="button"
            className="skip-intro-btn"
            onClick={() => setStage("login")}
            title="Skip directly to authentication"
          >
            Skip Intro →
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: FLIGHT TAKEOFF TRANSITION ANIMATION                             */}
      {/* A sleek commercial airliner banks and soars across the viewport          */}
      {/* ========================================================================= */}
      {stage === "flight" && (
        <div className="flight-stage-container">
          {/* Supersonic Contrail Trail */}
          <div className="jet-contrail"></div>

          {/* Jet Aircraft SVG */}
          <div className="jet-aircraft-wrapper">
            <svg
              className="jet-svg"
              viewBox="0 0 1024 1024"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Commercial airliner silhouette with wings & stabilizers */}
              <path
                d="M512 64c-16 0-32 16-32 48v240L128 544v64l352-96v208l-96 80v48l128-32 128 32v-48l-96-80V512l352 96v-64L544 352V112c0-32-16-48-32-48z"
                fill="#ffffff"
              />
              <circle cx="512" cy="180" r="16" fill="#38bdf8" />
              {/* Navigational Wingtip Lights */}
              <circle cx="140" cy="580" r="12" fill="#ef4444" className="wingtip-light" />
              <circle cx="884" cy="580" r="12" fill="#22c55e" className="wingtip-light" />
            </svg>
            <div className="jet-afterburner-glow"></div>
          </div>

          <div className="flight-callout-text">
            <span>FLIGHT TRANSIT: DEL → BOM CORRIDOR 09R</span>
            <div className="flight-subtext">INITIALIZING SECURE TERMINAL GATEWAY...</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: INSTITUTIONAL LOGIN WITH SMTP OTP VERIFICATION                  */}
      {/* ========================================================================= */}
      {(stage === "login" || stage === "authenticated") && (
        <div className="login-card-container">
          <div className="login-glass-card">
            {/* Ministry Brand Header */}
            <div className="card-top-identity">
              <div className="terminal-chip">
                <ShieldCheck size={14} style={{ color: "#38bdf8" }} />
                <span>MINISTRY OF CIVIL AVIATION • RESTRICTED ACCESS</span>
              </div>
              <h2 className="login-title">
                AIRFAIR <span style={{ color: "#38bdf8" }}>Portal</span>
              </h2>
              <p className="login-desc">
                Authorized Analytical Terminal for Real-Time Airfare Price Tracking & Inflation Monitoring.
              </p>
            </div>

            {/* Stage: Enter Email to Request SMTP OTP */}
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="auth-form-step">
                <div className="input-group">
                  <label htmlFor="auth-email" className="input-label">
                    Official / Institutional Email
                  </label>
                  <div className="input-with-icon">
                    <Mail size={18} className="field-icon" />
                    <input
                      id="auth-email"
                      type="email"
                      className="text-input"
                      placeholder="analyst@civilaviation.gov.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <span className="input-helper">
                    A 6-digit one-time passcode will be dispatched via SMTP to this inbox.
                  </span>
                </div>

                {errorMessage && (
                  <div className="auth-alert error">
                    <AlertCircle size={16} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-primary-btn"
                  disabled={isSendingOTP || !email}
                >
                  {isSendingOTP ? (
                    <>
                      <RefreshCw size={16} className="spinning" />
                      <span>Sending verification code via SMTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Stage: Enter Received OTP */
              <form onSubmit={handleVerifyOTP} className="auth-form-step">
                <div className="otp-sent-banner">
                  <div className="banner-left">
                    <CheckCircle2 size={16} style={{ color: "#10b981" }} />
                    <span>Code sent to <strong>{email}</strong></span>
                  </div>
                  <button
                    type="button"
                    className="change-email-btn"
                    onClick={() => {
                      setOtpSent(false);
                      setOtpValues(["", "", "", "", "", ""]);
                    }}
                  >
                    Change
                  </button>
                </div>

                {/* Development demo notice chip */}
                {demoCode && (
                  <div className="demo-otp-chip" onClick={handleUseDemoCode}>
                    <Sparkles size={14} />
                    <span>Demo mode active: Click to fill code <strong>{demoCode}</strong></span>
                  </div>
                )}

                <div className="otp-box-row">
                  {otpValues.map((val, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      className={`otp-digit-input ${val ? "filled" : ""}`}
                      value={val}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e.target)}
                      aria-label={`Digit ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="otp-timer-row">
                  <span className="timer-text">
                    Code expires in: <strong>{formatTime(timeLeft)}</strong>
                  </span>
                  <button
                    type="button"
                    className="resend-btn"
                    disabled={isSendingOTP || timeLeft > 270}
                    onClick={handleSendOTP}
                  >
                    Resend Code
                  </button>
                </div>

                {errorMessage && (
                  <div className="auth-alert error">
                    <AlertCircle size={16} />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {statusMessage && !errorMessage && (
                  <div className="auth-alert success">
                    <CheckCircle2 size={16} />
                    <span>{statusMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-primary-btn"
                  disabled={isVerifying || otpValues.join("").length !== 6}
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw size={16} className="spinning" />
                      <span>Verifying credential authenticity...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={16} />
                      <span>Verify & Access AIRFAIR Terminal</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer institutional credentials note */}
            <div className="card-footer-notice">
              <span>Smart India Hackathon 2026 • AI-Powered Price Index System</span>
              <span style={{ color: "#64748b" }}>Secured with TLS 1.3 & SMTP Authentication</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: AUTHENTICATED SUCCESS BANNER (1.2s Dissolve into Dashboard)      */}
      {/* ========================================================================= */}
      {stage === "authenticated" && (
        <div className="auth-success-modal">
          <div className="success-icon-badge">
            <CheckCircle2 size={48} style={{ color: "#10b981" }} />
          </div>
          <h2 className="success-title">Access Authorized</h2>
          <p className="success-desc">
            Identity confirmed for <strong>{email}</strong>. Decrypting live Supabase airfare telemetry...
          </p>
        </div>
      )}
    </div>
  );
}

