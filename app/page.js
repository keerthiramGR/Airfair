"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Plane,
  ShieldCheck,
  TrendingUp,
  Zap,
  CalendarCheck,
  Activity,
  ArrowRight,
  Sparkles,
  Lock,
  ChevronRight,
  BarChart3,
  Globe2,
  CheckCircle2,
  X
} from "lucide-react";
import AuthCard from "@/components/auth/AuthCard";

export default function RootPage() {
  const router = useRouter();

  // 1. Initial 3-Second Loading Splash State
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState("Initializing Airfare Neural Engine...");

  // 2. Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check existing session & signin query param on mount
  useEffect(() => {
    try {
      const token = sessionStorage.getItem("airfair_auth_token");
      if (token) {
        setIsAuthenticated(true);
      }
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("signin") === "true") {
          setShowAuthModal(true);
          setLoading(false); // Skip splash animation if redirected for sign-in
        }
      }
    } catch (_) {}
  }, []);

  // 3-Second Loading Animation Timer
  useEffect(() => {
    const startTime = Date.now();
    const duration = 3000; // 3.0 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.round((elapsed / duration) * 100), 100);
      setProgress(pct);

      if (pct < 35) {
        setLoadingStatus("Connecting to Real-Time Flight Data Stream...");
      } else if (pct < 70) {
        setLoadingStatus("Calibrating 6 High-Density Metro Corridor Price Indexes...");
      } else if (pct < 95) {
        setLoadingStatus("Synchronizing GDS Quote Stream & Auto-Booking Scheduler...");
      } else {
        setLoadingStatus("Ready. Launching AIRFAIR Platform...");
      }

      if (elapsed >= duration) {
        clearInterval(interval);
        setLoading(false);
      }
    }, 40);

    return () => clearInterval(interval);
  }, []);

  const handleAuthenticated = (email, token) => {
    try {
      if (token) sessionStorage.setItem("airfair_auth_token", token);
      else sessionStorage.setItem("airfair_auth_token", "token_" + Date.now());
      if (email) sessionStorage.setItem("airfair_auth_email", email);
    } catch (_) {}
    setShowAuthModal(false);
    setIsAuthenticated(true);
    router.replace("/dashboard");
  };

  // ---------------------------------------------------------------------------
  // STAGE 1: 3-Second Loading Screen
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
        {/* Ambient background glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Center Loading Card */}
        <div className="max-w-md w-full flex flex-col items-center text-center space-y-6 z-10">
          
          {/* Animated Glowing Emblem */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            {/* Pulsing rings */}
            <div className="absolute inset-0 rounded-full border-2 border-orange-500/30 animate-ping opacity-40" />
            <div className="absolute inset-2 rounded-full border border-orange-500/50 animate-spin" style={{ animationDuration: "6s" }} />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Plane size={32} className="text-white transform -rotate-45 animate-pulse" />
            </div>
          </div>

          {/* Title & Hackathon Tag */}
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[11px] font-bold tracking-wider uppercase">
              <Sparkles size={12} />
              <span>Real-Time Intelligence</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              AIR<span className="text-orange-500">FAIR</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              National Real-Time Airfare Price Index & Forecasting Platform
            </p>
          </div>

          {/* Progress Bar & Percentage */}
          <div className="w-full space-y-2 pt-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">{loadingStatus}</span>
              <span className="text-orange-400 font-bold">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 rounded-full transition-all duration-75 ease-out shadow-sm shadow-orange-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Live Corridor Quick Badge */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Tracking DEL &middot; BOM &middot; BLR &middot; MAA &middot; CCU &middot; HYD</span>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // STAGE 2: Website Introduction, Pictures, Overview & Top-Right Sign In
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#FFFCF9] text-[#171717] font-sans relative selection:bg-orange-100 selection:text-orange-900">
      
      {/* =========================================================================
          TOP NAVIGATION BAR (with prominent SIGN IN button on top right)
         ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-[#F1E5DB] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between py-3">
          
          {/* Logo & National Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-warm-xs">
              <Plane size={20} className="transform -rotate-45" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-[#171717]">
                  AIR<span className="text-airfair-orange">FAIR</span>
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FFF1E6] text-airfair-orange uppercase tracking-wider">
                  AI Engine
                </span>
              </div>
              <p className="text-[10px] text-[#6B7280] hidden sm:block font-semibold">
                National Airfare Intelligence &amp; Price Index
              </p>
            </div>
          </div>

          {/* Center Navigation Links (Hidden on small mobile) */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-[#6B7280]">
            <a href="#overview" className="hover:text-airfair-orange transition-colors">Platform Overview</a>
            <a href="#features" className="hover:text-airfair-orange transition-colors">Core Pillars</a>
            <a href="#visuals" className="hover:text-airfair-orange transition-colors">Live Radar</a>
            <a href="#autobook" className="hover:text-airfair-orange transition-colors">Auto-Booking</a>
          </nav>

          {/* Top Right "Sign In" / "Enter Dashboard" Button */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button
                onClick={() => router.push("/dashboard")}
                className="px-5 py-2.5 rounded-xl bg-airfair-orange hover:bg-orange-600 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <span>Enter Dashboard</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                id="top-nav-sign-in-btn"
                onClick={() => setShowAuthModal(true)}
                className="px-5 py-2.5 rounded-xl bg-airfair-orange hover:bg-orange-600 active:scale-95 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-sm hover:shadow-orange-500/25 transition-all cursor-pointer"
              >
                <Lock size={15} />
                <span>Sign In</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>

        </div>
      </header>

      {/* =========================================================================
          HERO SECTION: OVERVIEW, PICTURES & STATS
         ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
        
        {/* Hero Text Block */}
        <section className="text-center max-w-3xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF1E6] border border-orange-200 text-airfair-orange text-xs font-black tracking-wide uppercase">
            <Sparkles size={14} />
            <span>Intelligent Aviation Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-[#171717] tracking-tight leading-[1.15]">
            India’s Real-Time Airfare <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500">
              Price Index & Predictive Booking
            </span>
          </h1>

          <p className="text-sm sm:text-base text-[#6B7280] leading-relaxed max-w-2xl mx-auto">
            An institutional-grade aviation intelligence platform tracking domestic airfare inflation across
            high-density metro corridors, forecasting price shifts with machine learning, and automatically
            purchasing flights on the statistically lowest fare day.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                if (isAuthenticated) router.push("/dashboard");
                else setShowAuthModal(true);
              }}
              className="px-6 py-3.5 rounded-xl bg-airfair-orange hover:bg-orange-600 text-white font-black text-sm flex items-center gap-2.5 shadow-warm-md hover:shadow-orange-500/30 transition-all scale-100 hover:scale-105 cursor-pointer"
            >
              <Lock size={16} />
              <span>{isAuthenticated ? "Enter Live Dashboard" : "Sign In to Access Platform"}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </section>

        {/* =========================================================================
            PICTURES SHOWCASE (High-impact visual preview of flight & radar)
           ========================================================================= */}
        <section id="visuals" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Primary Visual: Commercial Flight HUD & Sky Route */}
            <div className="lg:col-span-7 rounded-2xl overflow-hidden border-2 border-[#F1E5DB] bg-white shadow-warm-md relative group">
              <div className="relative aspect-[16/10] w-full bg-slate-900 overflow-hidden">
                <img
                  src="/images/airfair_hero_flight.jpg"
                  alt="AIRFAIR Aerospace Flight Telemetry"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

                {/* Floating Top Badge */}
                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Real-Time Route Telemetry: DEL &rarr; BOM</span>
                </div>

                {/* Floating Bottom Live Price Callout */}
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-white/95 backdrop-blur-md border border-orange-200 text-[#171717] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                  <div>
                    <div className="text-[10px] font-bold text-airfair-orange uppercase tracking-wider">Live Corridor Rate</div>
                    <div className="text-lg font-black text-[#171717]">₹4,890 <span className="text-xs font-semibold text-emerald-600">(-14% below 30-day baseline)</span></div>
                  </div>
                  <button
                    onClick={() => {
                      if (isAuthenticated) router.push("/book");
                      else setShowAuthModal(true);
                    }}
                    className="px-4 py-2 rounded-lg bg-airfair-orange hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                  >
                    <span>{isAuthenticated ? "Book Flights" : "Sign In to Book"}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Secondary Visual: National Radar & Operations Center */}
            <div className="lg:col-span-5 rounded-2xl overflow-hidden border-2 border-[#F1E5DB] bg-white shadow-warm-md relative group flex flex-col">
              <div className="relative aspect-[16/10] lg:aspect-auto lg:flex-1 w-full bg-slate-900 overflow-hidden min-h-[260px]">
                <img
                  src="/images/airfair_radar_analytics.jpg"
                  alt="AIRFAIR Aviation Operations Radar"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

                <div className="absolute top-4 left-4 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white text-xs font-bold flex items-center gap-2">
                  <Activity size={14} className="text-amber-400 animate-pulse" />
                  <span>National Operations Radar</span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs space-y-1">
                  <div className="font-black text-sm text-amber-300">6 Metro Hubs Connected</div>
                  <div className="text-[11px] text-slate-300">
                    24/7 GDS Price Ingestion from IndiGo, Air India, Akasa Air & SpiceJet.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* =========================================================================
            KEY PLATFORM METRICS & STATS
           ========================================================================= */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#F1E5DB] shadow-warm-xs space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-[#171717]">6 Corridors</div>
            <div className="text-xs text-[#6B7280]">High-Density Metros</div>
            <div className="text-[11px] text-emerald-600 font-bold">DEL, BOM, BLR, MAA, CCU, HYD</div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-[#F1E5DB] shadow-warm-xs space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-[#171717]">7-Day ML</div>
            <div className="text-xs text-[#6B7280]">Forward Price Curves</div>
            <div className="text-[11px] text-airfair-orange font-bold">Predicts Lowest Purchase Day</div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-[#F1E5DB] shadow-warm-xs space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-[#171717]">06:00 IST</div>
            <div className="text-xs text-[#6B7280]">Daily Auto-Booking Cron</div>
            <div className="text-[11px] text-blue-600 font-bold">Automated GDS Ticketing</div>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-[#F1E5DB] shadow-warm-xs space-y-1">
            <div className="text-2xl sm:text-3xl font-black text-[#171717]">100% DGCA</div>
            <div className="text-xs text-[#6B7280]">Regulatory Compliance</div>
            <div className="text-[11px] text-purple-600 font-bold">Surge & Anomaly Audits</div>
          </div>
        </section>

        {/* =========================================================================
            PLATFORM OVERVIEW: 4 CORE PILLARS
           ========================================================================= */}
        <section id="features" className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
              Platform Overview & Capabilities
            </h2>
            <p className="text-xs sm:text-sm text-[#6B7280]">
              Everything built into AIRFAIR for civil aviation monitoring and smart consumer savings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl bg-white border border-[#F1E5DB] shadow-warm-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-airfair-orange flex items-center justify-center font-bold">
                <BarChart3 size={24} />
              </div>
              <h3 className="text-lg font-black text-[#171717]">
                1. Real-Time Airfare Inflation Index (AFI)
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                National composite benchmark using the Laspeyres index methodology. Continuously captures fare movements,
                calculates daily inflation, and tracks corridor price surges across all major domestic carriers.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl bg-white border border-[#F1E5DB] shadow-warm-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-lg font-black text-[#171717]">
                2. 7-Day Predictive Fare Forecasting
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                Machine-learning driven advance purchase curves (T+1 to T+45) and 7-day predictive curves.
                Identifies optimal booking windows and warns consumers when prices are at peak versus sweet spots.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl bg-white border border-[#F1E5DB] shadow-warm-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <CalendarCheck size={24} />
              </div>
              <h3 className="text-lg font-black text-[#171717]">
                3. Automated Best-Fare Booking Scheduler
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                Users can book for any departure date. Choose to book instantly or schedule auto-booking on the
                cheapest predicted day. The background APScheduler automatically triggers daily at 06:00 IST to execute ticketing!
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-2xl bg-white border border-[#F1E5DB] shadow-warm-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-lg font-black text-[#171717]">
                4. DGCA Anomaly Detection & Regulatory Auditing
              </h3>
              <p className="text-xs sm:text-sm text-[#6B7280] leading-relaxed">
                Automated regulatory surveillance detects excessive price gouging during emergencies, festivals,
                or adverse weather, providing civil aviation authorities with actionable compliance reports.
              </p>
            </div>

          </div>
        </section>

        {/* =========================================================================
            CALL TO ACTION BANNER
           ========================================================================= */}
        <section className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-[#1E293B] to-[#0F172A] text-white text-center space-y-5 shadow-warm-lg relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Ready to Access the National Airfare Radar?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Sign in to monitor live corridor price indexes, forecast airline pricing trends, and set up automated bookings.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  if (isAuthenticated) router.push("/dashboard");
                  else setShowAuthModal(true);
                }}
                className="px-6 py-3.5 rounded-xl bg-airfair-orange hover:bg-orange-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-orange-500/30 transition-all scale-100 hover:scale-105 cursor-pointer"
              >
                <Lock size={16} />
                <span>{isAuthenticated ? "Access Live Dashboard" : "Sign In to Enter Platform"}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#F1E5DB] bg-white py-8 text-center text-xs text-[#9CA3AF] space-y-1">
        <div>AIRFAIR &middot; Real-Time Airfare Price Index &amp; Predictive Booking Platform</div>
        <div>All Rights Reserved &middot; Commercial Aviation Intelligence</div>
      </footer>

      {/* =========================================================================
          SIGN IN MODAL
         ========================================================================= */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl my-auto">
            <AuthCard
              onAuthenticated={handleAuthenticated}
              onClose={() => setShowAuthModal(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}
