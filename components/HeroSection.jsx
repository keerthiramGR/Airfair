"use client";

import React from "react";
import { Compass, TrendingUp, Sparkles } from "lucide-react";

export default function HeroSection({ onExploreRoutes, onViewIndex }) {
  return (
    <section className="hero-section">
      <div className="container">
        <div className="hero-inner">
          <div className="hero-content">
            <div className="hero-badge-strip">
              <span className="sih-tag">Real-Time Intelligence</span>
              <span>Autonomous Domestic Airfare Price Index Platform</span>
            </div>
            <h1 className="hero-title">India Airfare Intelligence</h1>
            <p className="hero-subtitle">
              Monitor airfare inflation, detect price surges, and understand domestic flight price trends in real time.
            </p>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={onExploreRoutes}
            >
              <Compass size={16} />
              <span>Explore Routes</span>
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={onViewIndex}
            >
              <TrendingUp size={16} />
              <span>View Airfare Index</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
