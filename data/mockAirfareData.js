/**
 * AIRFAIR — AI-Powered Real-Time Airfare Price Index for India
 * Smart India Hackathon 2026 — Problem Statement 26056
 * 
 * CENTRALIZED MOCK DATA STORE
 * 
 * NOTE FOR PHASE 2 / BACKEND DEVELOPERS:
 * This file serves as the canonical data contract for the AIRFAIR frontend.
 * In Phase 2, replace the static exports in this file with API client calls
 * to your backend (e.g. FastAPI / Express / PostgreSQL endpoints) or update
 * custom React Query / SWR hooks pointing to:
 * - GET /api/v1/metrics/summary
 * - GET /api/v1/index/timeseries?range={7d|30d|90d|1y}
 * - GET /api/v1/routes/top-movers
 * - GET /api/v1/routes/heatmap
 * - GET /api/v1/ai/insights
 * - GET /api/v1/forecast/fare?route={code}
 * - GET /api/v1/analysis/lead-time
 * - GET /api/v1/alerts/recent
 */

export const mockKPIData = {
  airfareIndex: {
    value: "120.4",
    change: "+8.2%",
    isPositive: true, // Upward inflation
    comparisonLabel: "vs Base Period",
    basePeriod: "Q1 2024 (Index = 100.0)",
    status: "Elevated"
  },
  averageDomesticFare: {
    value: "₹7,840",
    rawValue: 7840,
    change: "+5.6%",
    isPositive: true,
    comparisonLabel: "vs Last Month",
    nationalMedian: "₹7,250"
  },
  routesMonitored: {
    count: 48,
    activeAirports: 18,
    trackedAirlines: 6,
    dailyDataPoints: "124,500+"
  },
  priceAlerts: {
    total: 12,
    highPriority: 3,
    mediumPriority: 5,
    lowPriority: 4,
    lastTriggered: "14 mins ago"
  }
};

export const mockIndexTrendData = {
  "7D": [
    { date: "Day -6", index: 116.8, base: 100.0, avgFare: 7620 },
    { date: "Day -5", index: 117.2, base: 100.0, avgFare: 7650 },
    { date: "Day -4", index: 117.9, base: 100.0, avgFare: 7710 },
    { date: "Day -3", index: 118.5, base: 100.0, avgFare: 7750 },
    { date: "Day -2", index: 119.1, base: 100.0, avgFare: 7790 },
    { date: "Yesterday", index: 119.8, base: 100.0, avgFare: 7810 },
    { date: "Today", index: 120.4, base: 100.0, avgFare: 7840 }
  ],
  "30D": [
    { date: "Day 1", index: 105.0, base: 100.0, avgFare: 6920 },
    { date: "Day 5", index: 108.0, base: 100.0, avgFare: 7100 },
    { date: "Day 10", index: 111.0, base: 100.0, avgFare: 7280 },
    { date: "Day 15", index: 109.0, base: 100.0, avgFare: 7150 },
    { date: "Day 20", index: 114.0, base: 100.0, avgFare: 7460 },
    { date: "Day 25", index: 118.0, base: 100.0, avgFare: 7710 },
    { date: "Day 30", index: 120.4, base: 100.0, avgFare: 7840 }
  ],
  "90D": [
    { date: "Week 1", index: 102.4, base: 100.0, avgFare: 6750 },
    { date: "Week 3", index: 104.1, base: 100.0, avgFare: 6860 },
    { date: "Week 5", index: 107.5, base: 100.0, avgFare: 7080 },
    { date: "Week 7", index: 106.8, base: 100.0, avgFare: 7020 },
    { date: "Week 9", index: 111.3, base: 100.0, avgFare: 7310 },
    { date: "Week 11", index: 115.6, base: 100.0, avgFare: 7580 },
    { date: "Week 13", index: 120.4, base: 100.0, avgFare: 7840 }
  ],
  "1Y": [
    { date: "Oct '25", index: 98.2, base: 100.0, avgFare: 6480 },
    { date: "Nov '25", index: 101.5, base: 100.0, avgFare: 6690 },
    { date: "Dec '25", index: 109.4, base: 100.0, avgFare: 7210 },
    { date: "Jan '26", index: 104.8, base: 100.0, avgFare: 6910 },
    { date: "Feb '26", index: 108.2, base: 100.0, avgFare: 7130 },
    { date: "Mar '26", index: 112.5, base: 100.0, avgFare: 7420 },
    { date: "Apr '26", index: 115.0, base: 100.0, avgFare: 7570 },
    { date: "May '26", index: 121.2, base: 100.0, avgFare: 7890 },
    { date: "Jun '26", index: 118.6, base: 100.0, avgFare: 7720 },
    { date: "Jul '26", index: 114.2, base: 100.0, avgFare: 7490 },
    { date: "Aug '26", index: 117.8, base: 100.0, avgFare: 7690 },
    { date: "Sep '26", index: 120.4, base: 100.0, avgFare: 7840 }
  ]
};

export const mockRoutePerformance = [
  {
    id: "DEL-BOM",
    route: "DEL → BOM",
    originCity: "Delhi (Indira Gandhi Intl)",
    destCity: "Mumbai (Chhatrapati Shivaji)",
    avgFare: "₹8,420",
    fareNum: 8420,
    change: "+15.2%",
    changeNum: 15.2,
    index: 118.4,
    status: "Rising",
    volumeTier: "High Demand",
    surgeAlert: true
  },
  {
    id: "BOM-BLR",
    route: "BOM → BLR",
    originCity: "Mumbai (Chhatrapati Shivaji)",
    destCity: "Bengaluru (Kempegowda Intl)",
    avgFare: "₹7,850",
    fareNum: 7850,
    change: "+11.8%",
    changeNum: 11.8,
    index: 114.2,
    status: "Rising",
    volumeTier: "High Demand",
    surgeAlert: true
  },
  {
    id: "MAA-DEL",
    route: "MAA → DEL",
    originCity: "Chennai (Chennai Intl)",
    destCity: "Delhi (Indira Gandhi Intl)",
    avgFare: "₹9,120",
    fareNum: 9120,
    change: "+8.4%",
    changeNum: 8.4,
    index: 109.7,
    status: "Stable",
    volumeTier: "Moderate",
    surgeAlert: false
  },
  {
    id: "BLR-HYD",
    route: "BLR → HYD",
    originCity: "Bengaluru (Kempegowda Intl)",
    destCity: "Hyderabad (Rajiv Gandhi Intl)",
    avgFare: "₹5,240",
    fareNum: 5240,
    change: "-3.2%",
    changeNum: -3.2,
    index: 97.4,
    status: "Falling",
    volumeTier: "High Demand",
    surgeAlert: false
  },
  {
    id: "DEL-BLR",
    route: "DEL → BLR",
    originCity: "Delhi (Indira Gandhi Intl)",
    destCity: "Bengaluru (Kempegowda Intl)",
    avgFare: "₹8,760",
    fareNum: 8760,
    change: "+6.1%",
    changeNum: 6.1,
    index: 106.8,
    status: "Stable",
    volumeTier: "Very High Demand",
    surgeAlert: false
  },
  {
    id: "CCU-DEL",
    route: "CCU → DEL",
    originCity: "Kolkata (Netaji Subhash Chandra)",
    destCity: "Delhi (Indira Gandhi Intl)",
    avgFare: "₹7,640",
    fareNum: 7640,
    change: "+4.2%",
    changeNum: 4.2,
    index: 104.5,
    status: "Stable",
    volumeTier: "Moderate",
    surgeAlert: false
  },
  {
    id: "PNQ-DEL",
    route: "PNQ → DEL",
    originCity: "Pune (Pune Airport)",
    destCity: "Delhi (Indira Gandhi Intl)",
    avgFare: "₹6,980",
    fareNum: 6980,
    change: "+2.1%",
    changeNum: 2.1,
    index: 102.3,
    status: "Stable",
    volumeTier: "Moderate",
    surgeAlert: false
  },
  {
    id: "COK-BOM",
    route: "COK → BOM",
    originCity: "Kochi (Cochin Intl)",
    destCity: "Mumbai (Chhatrapati Shivaji)",
    avgFare: "₹6,450",
    fareNum: 6450,
    change: "-1.8%",
    changeNum: -1.8,
    index: 99.1,
    status: "Falling",
    volumeTier: "Moderate",
    surgeAlert: false
  }
];

export const mockIndianCities = [
  { id: "DEL", name: "Delhi", x: 38, y: 22, code: "DEL", airport: "Indira Gandhi International" },
  { id: "BOM", name: "Mumbai", x: 26, y: 56, code: "BOM", airport: "Chhatrapati Shivaji Maharaj" },
  { id: "BLR", name: "Bengaluru", x: 42, y: 78, code: "BLR", airport: "Kempegowda International" },
  { id: "MAA", name: "Chennai", x: 52, y: 80, code: "MAA", airport: "Chennai International" },
  { id: "HYD", name: "Hyderabad", x: 45, y: 62, code: "HYD", airport: "Rajiv Gandhi International" },
  { id: "CCU", name: "Kolkata", x: 74, y: 44, code: "CCU", airport: "Netaji Subhash Chandra Bose" },
  { id: "PNQ", name: "Pune", x: 32, y: 60, code: "PNQ", airport: "Pune International" },
  { id: "COK", name: "Kochi", x: 38, y: 92, code: "COK", airport: "Cochin International" }
];

export const mockHeatmapRoutes = [
  {
    id: "DEL-BOM",
    from: "DEL",
    to: "BOM",
    fromCity: "Delhi",
    toCity: "Mumbai",
    avgFare: "₹8,420",
    index: 118.4,
    change: "+15.2%",
    status: "Surging",
    intensity: "high",
    color: "#dc2626"
  },
  {
    id: "BOM-BLR",
    from: "BOM",
    to: "BLR",
    fromCity: "Mumbai",
    toCity: "Bengaluru",
    avgFare: "₹7,850",
    index: 114.2,
    change: "+11.8%",
    status: "Surging",
    intensity: "high",
    color: "#dc2626"
  },
  {
    id: "MAA-DEL",
    from: "MAA",
    to: "DEL",
    fromCity: "Chennai",
    toCity: "Delhi",
    avgFare: "₹9,120",
    index: 109.7,
    change: "+8.4%",
    status: "Stable",
    intensity: "medium",
    color: "#d97706"
  },
  {
    id: "BLR-HYD",
    from: "BLR",
    to: "HYD",
    fromCity: "Bengaluru",
    toCity: "Hyderabad",
    avgFare: "₹5,240",
    index: 97.4,
    change: "-3.2%",
    status: "Falling",
    intensity: "low",
    color: "#059669"
  },
  {
    id: "DEL-BLR",
    from: "DEL",
    to: "BLR",
    fromCity: "Delhi",
    toCity: "Bengaluru",
    avgFare: "₹8,760",
    index: 106.8,
    change: "+6.1%",
    status: "Stable",
    intensity: "medium",
    color: "#d97706"
  },
  {
    id: "DEL-CCU",
    from: "DEL",
    to: "CCU",
    fromCity: "Delhi",
    toCity: "Kolkata",
    avgFare: "₹7,640",
    index: 104.5,
    change: "+4.2%",
    status: "Stable",
    intensity: "medium",
    color: "#2563eb"
  },
  {
    id: "BOM-PNQ",
    from: "BOM",
    to: "PNQ",
    fromCity: "Mumbai",
    toCity: "Pune",
    avgFare: "₹3,450",
    index: 101.1,
    change: "+0.8%",
    status: "Stable",
    intensity: "low",
    color: "#2563eb"
  },
  {
    id: "BLR-COK",
    from: "BLR",
    to: "COK",
    fromCity: "Bengaluru",
    toCity: "Kochi",
    avgFare: "₹4,120",
    index: 98.6,
    change: "-1.5%",
    status: "Falling",
    intensity: "low",
    color: "#059669"
  }
];

export const mockAIInsights = [
  {
    id: "INS-01",
    type: "surge",
    category: "Price Surge Detected",
    route: "DEL → BOM",
    badge: "Surge Alert",
    severity: "high", // high | medium | low
    explanation: "DEL → BOM fares increased by 15.2% in the last 24 hours. Spikes concentrated in peak morning departure slots (06:00 - 09:30).",
    confidence: "94% Model Confidence",
    actionable: "Flagged for regulatory surge threshold review."
  },
  {
    id: "INS-02",
    type: "forecast",
    category: "Upcoming Increase",
    route: "MAA → DEL",
    badge: "Forecast Warning",
    severity: "medium",
    explanation: "MAA → DEL prices are expected to rise by approximately 9% over the next 7 days driven by rising load factors on trunk aircraft.",
    confidence: "88% Model Confidence",
    actionable: "Early passenger advisory recommended."
  },
  {
    id: "INS-03",
    type: "stable",
    category: "Stable Route",
    route: "BLR → HYD",
    badge: "Normal Stability",
    severity: "low",
    explanation: "BLR → HYD has remained relatively stable over the past 14 days, trading within a narrow ₹5,100 – ₹5,380 corridor.",
    confidence: "96% Model Confidence",
    actionable: "Corridor pricing within expected baseline envelope."
  },
  {
    id: "INS-04",
    type: "volatility",
    category: "Advance Purchase Volatility",
    route: "BOM → BLR",
    badge: "Volatility Detected",
    severity: "medium",
    explanation: "Rapid compression of fare discounts observed within 5-day advance purchase windows across low-cost carriers.",
    confidence: "89% Model Confidence",
    actionable: "Continuous monitoring active."
  }
];

export const mockForecastData = {
  "DEL-BOM": {
    route: "DEL → BOM",
    expectedIncrease: "+9.0%",
    historicalFare: 8420,
    confidenceBand: "±2.5%",
    points: [
      { day: "Today", fare: 8420, type: "current" },
      { day: "Tomorrow", fare: 8550, type: "forecast" },
      { day: "+2 Days", fare: 8680, type: "forecast" },
      { day: "+3 Days", fare: 8820, type: "forecast" },
      { day: "+4 Days", fare: 8950, type: "forecast" },
      { day: "+5 Days", fare: 9020, type: "forecast" },
      { day: "+6 Days", fare: 9100, type: "forecast" },
      { day: "+7 Days", fare: 9180, type: "forecast" }
    ]
  },
  "BOM-BLR": {
    route: "BOM → BLR",
    expectedIncrease: "+6.4%",
    historicalFare: 7850,
    confidenceBand: "±3.0%",
    points: [
      { day: "Today", fare: 7850, type: "current" },
      { day: "Tomorrow", fare: 7920, type: "forecast" },
      { day: "+2 Days", fare: 8050, type: "forecast" },
      { day: "+3 Days", fare: 8140, type: "forecast" },
      { day: "+4 Days", fare: 8210, type: "forecast" },
      { day: "+5 Days", fare: 8290, type: "forecast" },
      { day: "+6 Days", fare: 8330, type: "forecast" },
      { day: "+7 Days", fare: 8350, type: "forecast" }
    ]
  },
  "MAA-DEL": {
    route: "MAA → DEL",
    expectedIncrease: "+8.8%",
    historicalFare: 9120,
    confidenceBand: "±2.2%",
    points: [
      { day: "Today", fare: 9120, type: "current" },
      { day: "Tomorrow", fare: 9240, type: "forecast" },
      { day: "+2 Days", fare: 9380, type: "forecast" },
      { day: "+3 Days", fare: 9510, type: "forecast" },
      { day: "+4 Days", fare: 9650, type: "forecast" },
      { day: "+5 Days", fare: 9740, type: "forecast" },
      { day: "+6 Days", fare: 9830, type: "forecast" },
      { day: "+7 Days", fare: 9920, type: "forecast" }
    ]
  },
  "BLR-HYD": {
    route: "BLR → HYD",
    expectedIncrease: "-1.2%",
    historicalFare: 5240,
    confidenceBand: "±1.8%",
    points: [
      { day: "Today", fare: 5240, type: "current" },
      { day: "Tomorrow", fare: 5210, type: "forecast" },
      { day: "+2 Days", fare: 5190, type: "forecast" },
      { day: "+3 Days", fare: 5180, type: "forecast" },
      { day: "+4 Days", fare: 5170, type: "forecast" },
      { day: "+5 Days", fare: 5175, type: "forecast" },
      { day: "+6 Days", fare: 5180, type: "forecast" },
      { day: "+7 Days", fare: 5180, type: "forecast" }
    ]
  }
};

export const mockLeadTimeData = [
  { window: "T+1", days: 1, fare: 11200, label: "Last Minute (1 Day)", surgeFactor: "+42.8%" },
  { window: "T+7", days: 7, fare: 9400, label: "Short Advance (7 Days)", surgeFactor: "+19.9%" },
  { window: "T+15", days: 15, fare: 8100, label: "Recommended (15 Days)", surgeFactor: "+3.3%" },
  { window: "T+30", days: 30, fare: 7200, label: "Advance (30 Days)", surgeFactor: "-8.2%" },
  { window: "T+45", days: 45, fare: 6800, label: "Early Bird (45 Days)", surgeFactor: "-13.3%" }
];

export const mockAlerts = [
  {
    id: "ALT-8841",
    severity: "High",
    color: "#dc2626",
    route: "DEL → BOM",
    routeId: "DEL-BOM",
    headline: "Fare increased by 23%",
    details: "Abrupt surge detected across economy inventory between 07:00 and 11:00 departure blocks.",
    timestamp: "2 hours ago",
    status: "Active Alert"
  },
  {
    id: "ALT-8839",
    severity: "Medium",
    color: "#d97706",
    route: "MAA → DEL",
    routeId: "MAA-DEL",
    headline: "Unusual price movement detected",
    details: "Multi-airline synchronous price increase of ~8.4% recorded across next 5 days of flight schedules.",
    timestamp: "5 hours ago",
    status: "Investigating"
  },
  {
    id: "ALT-8822",
    severity: "Low",
    color: "#059669",
    route: "BLR → HYD",
    routeId: "BLR-HYD",
    headline: "Prices returned to normal range",
    details: "Corridor volatility stabilized following seat capacity additions by regional carriers.",
    timestamp: "1 day ago",
    status: "Resolved"
  },
  {
    id: "ALT-8815",
    severity: "High",
    color: "#dc2626",
    route: "BOM → CCU",
    routeId: "BOM-CCU",
    headline: "Surge threshold exceeded (+19.4%)",
    details: "Holiday travel demand triggered upper ceiling price alert on evening direct non-stop sectors.",
    timestamp: "1 day ago",
    status: "Active Alert"
  }
];

export const mockMethodologyData = {
  indexFormula: "Laspeyres Modified Basket Price Index",
  basePeriod: "Q1 2024 (January 1 - March 31, 2024 = 100.0)",
  routeWeighting: "Weighted by DGCA Annual Passenger Traffic Volume",
  carriersSampled: ["IndiGo", "Air India", "Air India Express", "SpiceJet", "Akasa Air", "Vistara (Merged)"],
  bookingWindows: ["T+1", "T+3", "T+7", "T+15", "T+30", "T+45"],
  normalizationFormula: "Index_t = ∑ (P_it * W_i) / ∑ (P_i0 * W_i) × 100"
};
