"use client";

import React, { useState } from "react";
import { Plane, RefreshCw, User, Database, ShieldAlert, BookOpen, Layers, LogOut, CheckCircle2 } from "lucide-react";

export default function Header({ 
  onNavClick, 
  activeTab = "Dashboard",
  onRefresh,
  lastUpdatedText = "Just now",
  userEmail = "analyst@civilaviation.gov.in",
  onLogout
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const navItems = [
    { label: "Dashboard", id: "dashboard", icon: Layers },
    { label: "Book Flights", id: "book", icon: Plane },
    { label: "Route Explorer", id: "routes", icon: Plane },
    { label: "Airfare Index", id: "index", icon: BookOpen }
  ];

  return (
    <header className="site-header">
      <div className="container">
        <div className="header-inner">
          {/* Brand Identity */}
          <div className="brand-wrapper">
            <div className="brand-badge-icon" title="AIRFAIR Aviation Analytics">
              <Plane size={20} />
            </div>
            <div className="brand-text">
              <div className="brand-title">
                AIRFAIR
                <span className="brand-tag">SIH 2026</span>
              </div>
              <span className="brand-subline">Real-Time Airfare Price Index for India</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="header-nav" aria-label="Main Navigation">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-link ${activeTab === item.label ? "active" : ""}`}
                onClick={() => onNavClick && onNavClick(item.label)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Action Controls */}
          <div className="header-actions">
            <div className="telemetry-indicator" title="Live Telemetry Status">
              <span className="pulse-dot"></span>
              <span>Updated: {lastUpdatedText}</span>
            </div>

            <button
              type="button"
              className={`refresh-btn ${isRefreshing ? "spinning" : ""}`}
              onClick={handleRefreshClick}
              title="Poll latest airfare telemetry from FastAPI"
            >
              <RefreshCw size={14} />
              <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
            </button>

            {/* Authenticated User Menu */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="icon-btn"
                title={`Authorized: ${userEmail}`}
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: showUserMenu ? "rgba(37, 99, 235, 0.1)" : "transparent"
                }}
              >
                <User size={16} />
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#10b981", display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }}></span>
                  Auth
                </span>
              </button>

              {showUserMenu && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    marginTop: "8px",
                    width: "240px",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)",
                    padding: "12px",
                    zIndex: 1000,
                    color: "#0f172a"
                  }}
                >
                  <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: "4px" }}>
                    Verified Terminal Operator
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600, wordBreak: "break-all", marginBottom: "10px", color: "#1e3a8a" }}>
                    {userEmail}
                  </div>
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowUserMenu(false);
                        if (onLogout) onLogout();
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 10px",
                        fontSize: "0.82rem",
                        color: "#ef4444",
                        background: "#fef2f2",
                        border: "1px solid #fee2e2",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: 600
                      }}
                    >
                      <LogOut size={14} />
                      <span>Lock & Replay Intro</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
