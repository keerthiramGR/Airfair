"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * AIRFAIR_AUTH_GATE — Temporarily disabled.
 * The intro splash (IntroSequence) and OTP login (AuthCard) have been
 * bypassed for development. To restore, search for "AIRFAIR_AUTH_GATE"
 * and re-enable the original auth flow that was here.
 *
 * Original imports:
 *   import IntroSequence from "@/components/intro/IntroSequence";
 *   import AuthCard from "@/components/auth/AuthCard";
 */

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Skip auth — go straight to dashboard
    try {
      if (!sessionStorage.getItem("airfair_auth_token")) {
        sessionStorage.setItem("airfair_auth_token", "dev_bypass_" + Date.now());
        sessionStorage.setItem("airfair_auth_email", "developer@airfair.dev");
      }
    } catch (_) {}
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#FFFCF9] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-airfair-orange border-t-transparent animate-spin" />
    </div>
  );
}

