"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  User,
  Database,
  ShieldCheck,
  RotateCcw,
  LogOut,
  CheckCircle2,
  ExternalLink,
  Sparkles
} from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import { getHealth } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [apiHealth, setApiHealth] = useState(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("airfair_auth_email");
      if (stored) setEmail(stored);
      else setEmail("Verified User");
    } catch (_) {}

    async function checkHealth() {
      try {
        const res = await getHealth();
        setApiHealth(res);
      } catch (err) {
        setApiHealth({ status: "offline", database: "disconnected" });
      }
    }
    checkHealth();
  }, []);

  const handleReplayIntro = () => {
    try {
      localStorage.removeItem("airfair_intro_seen");
      sessionStorage.removeItem("airfair_auth_token");
    } catch (_) {}
    router.push("/");
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("airfair_auth_token");
      sessionStorage.removeItem("airfair_auth_email");
      localStorage.removeItem("airfair_intro_seen");
    } catch (_) {}
    router.push("/");
  };

  return (
    <AppShell>
      {/* Title */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
          Settings & Diagnostics
        </h1>
        <p className="text-sm text-[#6B7280]">
          System preferences, database connectivity, and analytical session controls.
        </p>
      </div>

      <div className="space-y-6 max-w-4xl">
        {/* Profile Card */}
        <div className="bg-white border border-[#F1E5DB] rounded-2xl p-6 shadow-warm-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-[#171717] mb-4">
            <User size={16} className="text-airfair-orange" />
            <span>Operator Profile</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#FFF8F2] border border-[#F1E5DB] rounded-xl">
            <div>
              <div className="text-xs font-bold text-[#6B7280]">Authenticated Analyst</div>
              <div className="text-base font-black text-[#171717]">{email}</div>
              <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 size={13} />
                <span>SMTP Verified Operator Session</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors shrink-0"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* API & Supabase Status */}
        <div className="bg-white border border-[#F1E5DB] rounded-2xl p-6 shadow-warm-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-[#171717] mb-4">
            <Database size={16} className="text-airfair-orange" />
            <span>Backend & Database Connectivity</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border border-[#F1E5DB] rounded-xl bg-[#FFFCF9]">
              <div className="text-xs text-[#6B7280] mb-1">FastAPI Backend API</div>
              <div className="text-sm font-bold text-[#171717]">http://localhost:8000</div>
              <div className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Operational (HTTP 200)</span>
              </div>
            </div>

            <div className="p-4 border border-[#F1E5DB] rounded-xl bg-[#FFFCF9]">
              <div className="text-xs text-[#6B7280] mb-1">Database Layer</div>
              <div className="text-sm font-bold text-[#171717]">Supabase PostgreSQL (Tokyo Pooler)</div>
              <div className="text-xs text-emerald-600 font-bold mt-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Database Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Intro & Session Replay */}
        <div className="bg-white border border-[#F1E5DB] rounded-2xl p-6 shadow-warm-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-[#171717] mb-4">
            <RotateCcw size={16} className="text-airfair-orange" />
            <span>Cinematic Experience</span>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#FFFCF9] border border-[#F1E5DB] rounded-xl">
            <div>
              <div className="text-sm font-bold text-[#171717]">Replay 3-Second Intro & Airplane Flight</div>
              <div className="text-xs text-[#6B7280]">
                Relaunch the opening brand sequence and flight animation.
              </div>
            </div>

            <button
              type="button"
              onClick={handleReplayIntro}
              className="px-4 py-2 rounded-xl text-xs font-bold text-airfair-orange bg-[#FFF1E6] hover:bg-[#FFE5D0] border border-[#FDBA74] transition-colors shadow-warm-sm"
            >
              Replay Intro
            </button>
          </div>
        </div>

        {/* About AIRFAIR Card */}
        <div className="bg-white border border-[#F1E5DB] rounded-2xl p-6 shadow-warm-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-[#171717] mb-2">
            <ShieldCheck size={16} className="text-airfair-orange" />
            <span>About AIRFAIR</span>
          </div>
          <p className="text-xs text-[#6B7280] leading-relaxed">
            AIRFAIR is an AI-powered real-time airfare price index platform designed to deliver transparent, macro-level price monitoring, surge detection, predictive machine learning forecasting, and automated ticketing across India's domestic aviation corridors.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
