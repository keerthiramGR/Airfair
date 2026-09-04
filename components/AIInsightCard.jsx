"use client";

import React from "react";
import { Sparkles, ArrowUpRight, CheckCircle2, TrendingUp, Zap } from "lucide-react";
import { mockAIInsights } from "@/data/mockAirfareData";

export default function AIInsightCard({ insights }) {
  const getInsightIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "price_surge":
      case "surge":
        return <Zap size={16} style={{ color: "#dc2626" }} />;
      case "forecast":
        return <ArrowUpRight size={16} style={{ color: "#d97706" }} />;
      case "stable":
        return <CheckCircle2 size={16} style={{ color: "#059669" }} />;
      default:
        return <TrendingUp size={16} style={{ color: "#2563eb" }} />;
    }
  };

  const dataList = insights && insights.length > 0
    ? insights.map((item, idx) => ({
        id: `ins-${idx}`,
        type: item.type?.toLowerCase() || "surge",
        category: item.title || "Pricing Insight",
        route: item.route?.replace("-", " → ") || "DEL → BOM",
        badge: item.severity === "HIGH" ? "Surge Alert" : item.severity === "LOW" ? "Normal Stability" : "Forecast Warning",
        severity: item.severity?.toLowerCase() || "medium",
        explanation: item.description,
        confidence: "Prototype / Heuristic Model"
      }))
    : mockAIInsights;

  return (
    <div className="analytics-card" id="ai-insights-section">
      <div className="card-header">
        <div>
          <h2 className="card-title">
            <Sparkles size={18} style={{ color: "#4338ca" }} />
            AI-Powered Insights
          </h2>
          <p className="card-subtitle">
            Heuristic pattern recognition on price anomalies and inventory compression
          </p>
        </div>

        <span className="ai-prototype-badge">
          FastAPI / Prototype
        </span>
      </div>

      <div className="insight-card-list">
        {dataList.map((insight) => (
          <div
            key={insight.id}
            className={`ai-insight-item severity-${insight.severity}`}
          >
            <div className="insight-header-row">
              <div className="insight-category-title">
                {getInsightIcon(insight.type)}
                <span>{insight.category}</span>
              </div>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: "999px",
                  backgroundColor:
                    insight.severity === "high"
                      ? "#fef2f2"
                      : insight.severity === "medium"
                      ? "#fffbeb"
                      : "#ecfdf5",
                  color:
                    insight.severity === "high"
                      ? "#dc2626"
                      : insight.severity === "medium"
                      ? "#d97706"
                      : "#059669"
                }}
              >
                {insight.badge}
              </span>
            </div>

            <p className="insight-body-text">{insight.explanation}</p>

            <div className="insight-footer-row">
              <span style={{ fontWeight: 600, color: "#1e3a8a" }}>
                Route: {insight.route}
              </span>
              <span>{insight.confidence}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "14px", padding: "10px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px dashed #cbd5e1", fontSize: "0.75rem", color: "#64748b" }}>
        <strong>Phase 2 Architecture:</strong> Insights served live via FastAPI <code style={{ color: "#2563eb" }}>/api/insights</code>. Real-time ML inference will be connected in Phase 3.
      </div>
    </div>
  );
}
