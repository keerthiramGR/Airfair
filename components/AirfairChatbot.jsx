"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Send,
  Plane,
  Sparkles,
  Loader2,
  ChevronDown,
  Bot,
  User,
  HelpCircle,
  Compass,
  Luggage,
  ShieldCheck,
  TrendingDown,
  RotateCcw
} from "lucide-react";

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || "";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are AIRFAIR AI Assistant — the authoritative, friendly, and expert aviation & flight intelligence assistant for India (developed for Smart India Hackathon 2026, Problem Statement 26056).

YOUR MISSION:
Answer ANY and ALL questions related to flights, air travel, airlines, airports, baggage, DGCA regulations, passenger rights, fare pricing trends, and the AIRFAIR platform.

DOMAINS YOU EXPERTLY COVER:
1. **Flight Search & Fare Trends**:
   - Best times to book (4-6 weeks out, Tuesdays/Wednesdays, 30-day advance purchase window).
   - Route fare ranges in India: DEL-BOM (₹3,800 - ₹8,500), BLR-DEL (₹4,200 - ₹9,200), BOM-GOI (₹2,200 - ₹5,500), CCU-DEL (₹3,500 - ₹7,800), MAA-BLR (₹1,900 - ₹4,000), HYD-BOM (₹2,800 - ₹6,200).
   - Seasonality: Festival surges (Diwali, Chhath, Durga Puja, Christmas/New Year), fog season delays in North India (Dec-Jan), monsoon buffer times.

2. **Airlines in India**:
   - **IndiGo**: 6E network, standard 15kg check-in, 7kg cabin, 6E Prime/XL seats, stretch seats.
   - **Air India**: Full-service carrier, 15-25kg check-in (fare type dependent), complimentary meals, Star Alliance benefits, Maharaja Club loyalty.
   - **Vistara / Air India Group**: Premium Economy, Club Vistara integration, complimentary gourmet dining, priority boarding.
   - **Akasa Air**: Modern Boeing 737 MAX fleet, Cafe Akasa, pet-in-cabin policy (Pets on Akasa), standard 15kg/7kg allowances.
   - **SpiceJet & Regional**: SpiceMax legroom, Alliance Air, FlyBig, Star Air UDAN regional connectivity.

3. **Baggage & Security Rules (BCAS & DGCA)**:
   - Domestic check-in allowance: Typically 15 kg for standard economy (Air India allows up to 20-25 kg depending on ticket class).
   - Hand / Cabin baggage: Maximum 1 piece up to 7 kg + 1 small personal item (laptop bag/handbag).
   - Power banks, lithium batteries, e-cigarettes: MUST BE in cabin baggage only, strictly prohibited in checked baggage.
   - Liquids/Gels: Under 100ml per container in transparent pouch for security.

4. **Airport Experience & DigiYatra**:
   - **DigiYatra**: Biometric facial recognition for paperless entry at DEL, BOM, BLR, HYD, CCU, MAA, PNQ, etc.
   - Reporting time: Arrive at least 2 hours before domestic departure (3 hours during peak holiday seasons/fog).
   - Web check-in: Mandatory for most airlines, opens 48 hours to 60 minutes prior to scheduled departure.
   - Gate closure: Boarding gates close 25 minutes before departure.

5. **Passenger Rights & DGCA Charter**:
   - **Flight Delay**: Free meals/refreshments for >2 hr delay; refund or alternate flight for >6 hr delay.
   - **Cancellation**: Full refund or alternate flight + compensation (₹5,000 - ₹10,000 or basic fare + fuel charge) if cancelled without 2 weeks prior notice.
   - **Denied Boarding (Overbooking)**: Alternate flight within 1 hr or compensation up to 400% of basic fare.
   - **Baggage Loss/Damage**: Claim with Property Irregularity Report (PIR) before exiting airport, compensation up to ₹20,000 under DGCA rules.

6. **AIRFAIR Platform Features**:
   - **Real-Time Airfare Index**: Composite benchmark index tracking domestic price inflation across high-density metro corridors.
   - **30-Day Auto-Booking**: Choose travel date (≥30 days out) → calendar predicts the lowest fare purchase date → auto-executes ticket booking.
   - **Route Heatmaps & Forecasts**: 7-day predictive curves and lead-time analysis.

STYLE & TONE:
- Professional, concise, warm, and highly knowledgeable.
- Use ₹ for currency.
- Format responses with clean markdown (bullet points, bold key terms).
- For general flight questions, provide actionable, direct tips.`;

const SUGGESTED_QUESTIONS = [
  "Cheapest time to book DEL to BOM?",
  "IndiGo vs Air India baggage rules?",
  "How does AIRFAIR Auto-Booking work?",
  "What are my rights if my flight is delayed?",
  "How to use DigiYatra at airports?",
  "Can I carry power banks in check-in luggage?"
];

// Offline fallback answers for common queries in case of network interruption
function getOfflineFallbackAnswer(query) {
  const q = query.toLowerCase();
  if (q.includes("baggage") || q.includes("luggage") || q.includes("kg") || q.includes("carry")) {
    return "🧳 **Standard Indian Domestic Baggage Rules**:\n- **Cabin Baggage**: 1 piece up to 7 kg + 1 personal laptop/handbag.\n- **Checked Baggage**: 15 kg for Economy (Air India allows 20–25 kg depending on class).\n- **Power banks & lithium batteries**: Must be kept in cabin baggage ONLY (strictly prohibited in checked baggage).\n- **Excess Baggage**: Pre-book online (approx. ₹450–₹600/kg) to save compared to airport counter rates (₹550–₹700/kg).";
  }
  if (q.includes("auto-book") || q.includes("booking") || q.includes("calendar") || q.includes("airfair")) {
    return "✈️ **How AIRFAIR Auto-Booking Works**:\n1. Select your **Origin & Destination** (e.g., Delhi to Mumbai).\n2. Pick a **Travel Date** at least 30 days ahead.\n3. The **30-Day Booking Calendar** analyzes historical trends and highlights the statistically cheapest day to purchase.\n4. Enter passenger details & payment token — our system monitors and locks in your ticket at the optimal fare!";
  }
  if (q.includes("delay") || q.includes("cancel") || q.includes("rights") || q.includes("refund") || q.includes("dgca")) {
    return "⚖️ **DGCA Passenger Rights Charter**:\n- **Delay > 2 Hours**: Airline must provide complimentary refreshments/meals.\n- **Delay > 6 Hours**: Entitled to full refund or free reschedule.\n- **Cancellation**: Full refund or alternate flight + compensation if not informed at least 14 days in advance.\n- **Baggage Lost/Damaged**: File a Property Irregularity Report (PIR) immediately at the airport counter before exiting.";
  }
  if (q.includes("del") || q.includes("bom") || q.includes("blr") || q.includes("route") || q.includes("cheap")) {
    return "📊 **Cheapest Booking Strategy for Domestic Routes**:\n- **DEL ⇄ BOM**: Best booked 21–35 days in advance (fares typically ₹3,800–₹5,200 vs ₹9,000+ last minute).\n- **BLR ⇄ DEL**: Best booked 28–42 days out.\n- **Cheapest Days to Fly**: Tuesdays & Wednesdays are 12–18% cheaper than Friday/Sunday evening departures.\n- **Red-eye & Early Morning**: Flights before 06:30 AM or after 10:00 PM offer the best value.";
  }
  if (q.includes("digiyatra") || q.includes("airport") || q.includes("check-in") || q.includes("terminal")) {
    return "📱 **Airport & DigiYatra Guidelines**:\n- **DigiYatra**: Download the DigiYatra app, verify Aadhaar via DigiLocker, scan boarding pass, and use fast-track biometric e-gates at DEL (T2/T3), BOM (T2), BLR, HYD, CCU, etc.\n- **Web Check-In**: Mandatory for most airlines, opens 48 hours prior to departure.\n- **Airport Arrival**: Reach at least 2 hours before domestic flight departure (gates close 25 mins prior).";
  }
  return "✈️ **AIRFAIR Flight Intelligence**: I can assist with any flight query across Indian domestic routes (DEL, BOM, BLR, CCU, HYD, MAA, GOI), baggage policies (IndiGo, Air India, Akasa, SpiceJet), best booking dates, DGCA compensation rules, and AIRFAIR price analytics. Feel free to ask!";
}

export default function AirfairChatbot({ defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! 👋 I'm **AIRFAIR Flight Assistant**.\n\nAsk me anything about **flight bookings**, **cheapest routes**, **airline baggage policies**, **DigiYatra**, **DGCA passenger rights**, or how to use the **30-Day Auto-Booking calendar**!"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
      setHasUnread(false);
    }
  }, [isOpen]);

  // Global event listener to open chat from any button/navigation link in the app
  useEffect(() => {
    const handleOpenChat = (event) => {
      setIsOpen(true);
      if (event?.detail?.query) {
        sendMessage(event.detail.query);
      }
    };
    window.addEventListener("open-airfair-chat", handleOpenChat);
    return () => window.removeEventListener("open-airfair-chat", handleOpenChat);
  }, [messages]);

  const sendMessage = async (userMessage) => {
    const trimmed = userMessage?.trim();
    if (!trimmed) return;

    const newMessages = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Build conversation history for Groq
      const apiMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...newMessages.slice(-10).map((m) => ({
          role: m.role,
          content: m.content
        }))
      ];

      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "qwen/qwen3.8-27b",
          messages: apiMessages,
          temperature: 0.6,
          max_tokens: 600,
          stream: false
        })
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      const data = await res.json();
      const reply =
        data.choices?.[0]?.message?.content ||
        getOfflineFallbackAnswer(trimmed);

      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      if (!isOpen) setHasUnread(true);
    } catch (err) {
      console.warn("Groq API request failed, serving verified flight knowledge fallback:", err);
      const fallbackReply = getOfflineFallbackAnswer(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: fallbackReply
        }
      ]);
      if (!isOpen) setHasUnread(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (q) => {
    sendMessage(q);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared! How can I help you with your flight queries today?"
      }
    ]);
  };

  // Markdown-lite renderer (bold, bullet points, headers, line breaks)
  const renderContent = (text) => {
    const lines = text.split("\n");
    return lines.map((line, lineIdx) => {
      // Bold text handling
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const formattedParts = parts.map((part, partIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={partIdx} className="font-bold text-[#111827]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      return (
        <div key={lineIdx} className={line.trim().startsWith("-") || line.trim().startsWith("•") ? "pl-2 py-0.5" : "py-0.5"}>
          {formattedParts}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 group">
        {!isOpen && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white text-xs font-semibold text-[#171717] border border-[#F1E5DB] rounded-full shadow-lg pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity">
            <Sparkles size={13} className="text-airfair-orange animate-pulse" />
            <span>Flight AI Assistant</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-warm-lg transition-all duration-300 border ${
            isOpen
              ? "bg-[#171717] text-white border-neutral-700 rotate-0 scale-95"
              : "bg-gradient-to-br from-[#F97316] via-[#EA580C] to-[#C2410C] text-white border-orange-400 hover:scale-105 hover:shadow-orange-500/25"
          }`}
          aria-label={isOpen ? "Close flight assistant chat" : "Open flight assistant chat"}
        >
          {isOpen ? (
            <X size={22} />
          ) : (
            <>
              <Bot size={26} className="text-white" />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-ping" />
              )}
            </>
          )}
        </button>
      </div>

      {/* Chat Window Container */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-[#F1E5DB] flex flex-col overflow-hidden transition-all"
          style={{ height: "560px", animation: "chatSlideUp 0.25s ease-out" }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-3.5 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 text-white">
                <Bot size={18} />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-1.5">
                  AIRFAIR Flight Assistant
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-semibold">AI Live</span>
                </div>
                <div className="text-[10px] text-white/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  Ask any airline, fare, route or booking query
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-white/70 hover:text-white p-1 rounded-lg transition-colors"
                title="Reset conversation"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg transition-colors"
                title="Close chat"
              >
                <ChevronDown size={20} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5 bg-[#FFFCF9]">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#F97316] to-[#FDBA74] flex items-center justify-center shrink-0 mt-0.5 text-white shadow-xs">
                    <Bot size={14} />
                  </div>
                )}
                <div
                  className={`max-w-[84%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white rounded-br-xs shadow-sm"
                      : "bg-white border border-[#F1E5DB] text-[#374151] rounded-bl-xs shadow-warm-sm"
                  }`}
                >
                  {renderContent(msg.content)}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-xl bg-[#171717] flex items-center justify-center shrink-0 mt-0.5 text-white shadow-xs">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#F97316] to-[#FDBA74] flex items-center justify-center shrink-0 text-white">
                  <Bot size={14} />
                </div>
                <div className="bg-white border border-[#F1E5DB] rounded-2xl rounded-bl-xs px-4 py-3 shadow-warm-sm flex items-center gap-2">
                  <span className="text-[11px] text-[#6B7280] font-medium">Analyzing flight data...</span>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-[#F97316] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 bg-[#F97316] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 bg-[#F97316] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="px-3.5 py-2 border-t border-[#F1E5DB] bg-[#FFF8F2] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-bold text-[#9CA3AF] shrink-0 uppercase tracking-wider">Quick:</span>
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSuggestion(q)}
                className="px-2.5 py-1 text-[10px] font-semibold text-[#C2410C] bg-white border border-[#FED7AA] rounded-lg hover:bg-[#FFF1E6] hover:border-orange-400 transition-all shrink-0 whitespace-nowrap shadow-xs"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="px-3 py-2.5 border-t border-[#F1E5DB] bg-white flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about flights, fares, baggage, DGCA, DigiYatra..."
              disabled={isLoading}
              className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-[#E5E7EB] bg-[#FFFCF9] text-[#171717] placeholder-[#9CA3AF] focus:ring-2 focus:ring-orange-300 focus:border-orange-400 outline-none disabled:opacity-50 transition-all"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-warm-sm"
              title="Send question"
            >
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </form>
        </div>
      )}

      {/* Global Slide-Up Keyframes */}
      <style jsx global>{`
        @keyframes chatSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
}

