import { OTP_CACHE, MAX_ATTEMPTS } from "@/lib/otpStore";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    const code = (body.otp || "").trim();

    if (!email || !code) {
      return Response.json({ detail: "Email and OTP code are required." }, { status: 400 });
    }

    const entry = OTP_CACHE.get(email);

    // No active OTP for this email
    if (!entry) {
      return Response.json(
        { detail: "No active verification code found for this email. Please request a new code." },
        { status: 400 }
      );
    }

    // Check expiry
    if (Date.now() > entry.expiresAt) {
      OTP_CACHE.delete(email);
      return Response.json(
        { detail: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Increment attempts
    entry.attempts += 1;

    // Too many failed attempts
    if (entry.attempts > MAX_ATTEMPTS) {
      OTP_CACHE.delete(email);
      return Response.json(
        { detail: "Too many failed attempts. Please request a new verification code." },
        { status: 400 }
      );
    }

    // Invalid code
    if (entry.otp !== code) {
      const remaining = MAX_ATTEMPTS - entry.attempts;
      return Response.json(
        { detail: `Invalid verification code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.` },
        { status: 400 }
      );
    }

    // ✅ SUCCESS — delete OTP so it can't be reused
    OTP_CACHE.delete(email);
    console.log(`[AIRFAIR AUTH ✓] Email verified successfully: ${email}`);

    return Response.json({
      verified: true,
      message: "Verification successful. Access granted.",
      token: `airfair_auth_${Buffer.from(email).toString("base64")}_${Date.now()}`,
    });
  } catch (err) {
    console.error("[AIRFAIR Verify OTP Error]", err);
    return Response.json(
      { detail: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
