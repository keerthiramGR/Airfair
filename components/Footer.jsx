"use client";

import React from "react";
import { Plane, ShieldCheck, Database, FileText, Code2, ExternalLink } from "lucide-react";

export default function Footer({ onOpenMethodology, onOpenAPI, onOpenAbout }) {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top-grid">
          {/* Institutional Information */}
          <div>
            <div className="footer-brand-title">
              AIRFAIR — Real-Time Airfare Price Index for India
            </div>
            <p className="footer-desc">
              An analytical platform for airfare monitoring, inflation analysis and informed decision-making.
              Designed to bring pricing transparency, regulatory visibility, and economic insights to India's domestic civil aviation sector.
            </p>
          </div>

          {/* Analytical Pillars */}
          <div>
            <div className="footer-col-title">Methodology & Science</div>
            <ul className="footer-links-list">
              <li className="footer-link-item">
                <a href="#index-methodology" onClick={(e) => { e.preventDefault(); onOpenMethodology && onOpenMethodology(); }}>
                  Laspeyres Basket Index
                </a>
              </li>
              <li className="footer-link-item">
                <a href="#leadtime-section">Advance Purchase Curve</a>
              </li>
              <li className="footer-link-item">
                <a href="#heatmap-section">Corridor Density Matrix</a>
              </li>
              <li className="footer-link-item">
                <a href="#forecast-section">7-Day Velocity Modeling</a>
              </li>
            </ul>
          </div>

          {/* Developer & Platform Links */}
          <div>
            <div className="footer-col-title">Documentation & API</div>
            <ul className="footer-links-list">
              <li className="footer-link-item">
                <a href="#api-spec" onClick={(e) => { e.preventDefault(); onOpenAPI && onOpenAPI(); }}>
                  Phase 2 API Specifications
                </a>
              </li>
              <li className="footer-link-item">
                <a href="#data-sources" onClick={(e) => { e.preventDefault(); onOpenAPI && onOpenAPI(); }}>
                  Data Pipeline Architecture
                </a>
              </li>
              <li className="footer-link-item">
                <a href="#about-platform" onClick={(e) => { e.preventDefault(); onOpenAbout && onOpenAbout(); }}>
                  About Problem Statement 26056
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar with SIH 2026 Attribution */}
        <div className="footer-bottom-bar">
          <div className="sih-attribution-badge">
            <ShieldCheck size={14} style={{ color: "#2563eb" }} />
            <span>Prototype — Smart India Hackathon 2026</span>
          </div>

          <div>
            Problem Statement: <strong>26056</strong> | Ministry of Civil Aviation / Autonomous Airfare Intelligence Prototype
          </div>

          <div>
            Frontend Phase 1 • Next.js & Pure CSS (No Backend Active)
          </div>
        </div>
      </div>
    </footer>
  );
}
