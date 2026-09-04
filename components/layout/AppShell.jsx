"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Plane,
  LineChart,
  Settings,
  Menu,
  X,
  RefreshCw,
  Search,
  User,
  LogOut,
  ChevronRight,
  RotateCcw,
  Ticket,
  Luggage,
  Bot,
  Sparkles
} from "lucide-react";
import AirfairChatbot from "@/components/AirfairChatbot";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Book Flights", href: "/book", icon: Ticket },
  { name: "My Bookings", href: "/my-bookings", icon: Luggage },
  { name: "Route Explorer", href: "/routes", icon: Plane },
  { name: "Airfare Index", href: "/airfare-index", icon: LineChart },
  { name: "AI Flight Assistant", isChatTrigger: true, icon: Bot },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function AppShell({ children, onRefresh, lastUpdated = "Just now" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState("analyst@civilaviation.gov.in");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    try {
      const email = sessionStorage.getItem("airfair_auth_email");
      if (email) setUserEmail(email);
    } catch (_) {}
  }, []);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleOpenChat = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("open-airfair-chat"));
    }
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("airfair_auth_token");
      sessionStorage.removeItem("airfair_auth_email");
      localStorage.removeItem("airfair_intro_seen");
    } catch (_) {}
    router.push("/");
  };

  const handleReplayIntro = () => {
    try {
      localStorage.removeItem("airfair_intro_seen");
    } catch (_) {}
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#FFFCF9] flex flex-col lg:flex-row text-[#171717]">
      {/* ===================================================================== */}
      {/* DESKTOP SIDEBAR                                                       */}
      {/* White background, subtle border, light orange active pills            */}
      {/* ===================================================================== */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-[#F1E5DB] shrink-0 sticky top-0 h-screen z-30 justify-between">
        <div>
          {/* Brand Header */}
          <div className="h-18 flex items-center px-6 border-b border-[#F1E5DB]">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-airfair-orange flex items-center justify-center text-white shadow-warm-sm group-hover:scale-105 transition-transform">
                <Plane size={18} />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-[#171717]">
                  AIRFAIR<span className="text-airfair-orange">.</span>
                </span>
                <span className="block text-[10px] font-bold text-[#6B7280] tracking-wider uppercase">
                  Aviation Intelligence
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5" aria-label="Main Navigation">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.href ? pathname === item.href : false;

              if (item.isChatTrigger) {
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={handleOpenChat}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-[#171717] hover:bg-[#FFF8F2] hover:text-airfair-orange group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1 rounded-lg bg-orange-100 text-airfair-orange group-hover:bg-airfair-orange group-hover:text-white transition-colors">
                        <Icon size={16} />
                      </div>
                      <span>{item.name}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-orange-100 text-airfair-orange tracking-wider">
                      AI
                    </span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-[#FFF1E6] text-airfair-orange shadow-warm-sm"
                      : "text-[#171717] hover:bg-[#FFF8F2] hover:text-airfair-orange"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      size={18}
                      className={isActive ? "text-airfair-orange" : "text-[#6B7280]"}
                    />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight size={15} className="text-airfair-orange" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer — Status & Quick Action */}
        <div className="p-4 border-t border-[#F1E5DB] space-y-3">
          <div className="p-3 bg-[#FFF8F2] border border-[#F1E5DB] rounded-xl flex items-center justify-between text-xs">
            <span className="text-[#6B7280]">Database:</span>
            <span className="font-bold text-emerald-600 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Supabase Live
            </span>
          </div>

          <button
            type="button"
            onClick={handleReplayIntro}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-[#6B7280] hover:text-airfair-orange transition-colors"
          >
            <RotateCcw size={13} />
            <span>Replay Cinematic Intro</span>
          </button>
        </div>
      </aside>

      {/* ===================================================================== */}
      {/* MOBILE HEADER & DRAWER                                                */}
      {/* ===================================================================== */}
      <div className="lg:hidden bg-white border-b border-[#F1E5DB] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-airfair-orange flex items-center justify-center text-white">
            <Plane size={15} />
          </div>
          <span className="text-lg font-black text-[#171717]">AIRFAIR.</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenChat}
            className="p-2 text-airfair-orange bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
            title="Open AI Flight Assistant"
          >
            <Bot size={18} />
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 text-[#6B7280] hover:text-airfair-orange"
            title="Refresh airfare data"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-[#171717] hover:text-airfair-orange"
            aria-label="Toggle navigation drawer"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-white border-b border-[#F1E5DB] px-4 py-4 space-y-1 z-40">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.href ? pathname === item.href : false;

            if (item.isChatTrigger) {
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    handleOpenChat();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-[#171717] hover:bg-[#FFF8F2] hover:text-airfair-orange"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} className="text-airfair-orange" />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-airfair-orange">
                    AI
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${
                  isActive
                    ? "bg-[#FFF1E6] text-airfair-orange"
                    : "text-[#171717] hover:bg-[#FFF8F2]"
                }`}
              >
                <Icon size={18} className={isActive ? "text-airfair-orange" : "text-[#6B7280]"} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MAIN CONTENT AREA & TOP BAR                                           */}
      {/* ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white/90 backdrop-blur-sm border-b border-[#F1E5DB] px-6 flex items-center justify-between sticky top-0 z-20">
          {/* Right Header Actions */}
          <div className="flex items-center gap-4 ml-auto">
            <button
              type="button"
              onClick={handleOpenChat}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] rounded-lg transition-all shadow-warm-sm"
              title="Open AI Flight Assistant"
            >
              <Sparkles size={13} className="animate-pulse" />
              <span>Ask AI</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-[#6B7280]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Updated: {lastUpdated}</span>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-airfair-orange bg-[#FFF1E6] hover:bg-[#FFE5D0] border border-[#FDBA74] rounded-lg transition-colors shadow-warm-sm"
              title="Poll latest airfare telemetry from FastAPI"
            >
              <RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} />
              <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[#F1E5DB] hover:bg-[#FFF8F2] text-xs font-semibold text-[#171717] transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#F97316] to-[#FDBA74] text-white flex items-center justify-center text-[10px] font-bold">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : "A"}
                </div>
                <span className="hidden md:inline max-w-[140px] truncate">{userEmail}</span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#F1E5DB] rounded-xl shadow-warm-lg p-2 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-[#F1E5DB]">
                    <div className="font-bold text-[#171717]">Authorized Analyst</div>
                    <div className="text-[#6B7280] truncate">{userEmail}</div>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#FFF8F2] text-[#171717]"
                    >
                      <Settings size={14} className="text-[#6B7280]" />
                      <span>Settings & API</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 font-semibold"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Children Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global AI Chatbot Widget */}
      <AirfairChatbot />
    </div>
  );
}

