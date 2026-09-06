import nodemailer from "nodemailer";
import { OTP_CACHE, OTP_TTL_MS } from "@/lib/otpStore";

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildEmailHTML(otp, email) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FFFCF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #F1E5DB;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#FFF1E6,#ffffff);padding:32px 32px 24px;border-bottom:1px solid #F1E5DB;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="width:36px;height:36px;background:#E8681A;border-radius:8px;text-align:center;line-height:36px;">
                <span style="color:white;font-size:18px;">✈</span>
              </td>
              <td style="padding-left:12px;">
                <div style="font-size:20px;font-weight:900;color:#171717;letter-spacing:-0.04em;">AIRFAIR<span style="color:#E8681A;">.</span></div>
                <div style="font-size:10px;font-weight:700;color:#6B7280;letter-spacing:0.08em;text-transform:uppercase;">Aviation Intelligence · SIH 2026</div>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:14px;color:#6B7280;">Hello,</p>
            <p style="margin:0 0 24px;font-size:14px;color:#171717;line-height:1.6;">
              Your one-time verification code for <strong>AIRFAIR</strong> is:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr><td align="center" style="background:#FFF8F2;border:2px dashed #E8681A;border-radius:12px;padding:24px;">
                <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#E8681A;font-family:monospace;">${otp}</div>
              </td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F2;border-radius:8px;border:1px solid #F1E5DB;margin-bottom:24px;">
              <tr><td style="padding:16px;">
                <div style="font-size:13px;color:#6B7280;line-height:1.8;">
                  ⏱ Expires in <strong style="color:#171717;">5 minutes</strong><br>
                  🔒 Do not share this code with anyone<br>
                  📧 Sent to: <strong style="color:#171717;">${email}</strong>
                </div>
              </td></tr>
            </table>
            <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6;">
              If you did not request this code, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #F1E5DB;background:#FFFCF9;">
            <p style="margin:0;font-size:11px;color:#9CA3AF;text-align:center;">
              AIRFAIR — Real-Time Airfare Price Index &amp; Predictive Booking<br>
              National Aviation Analytics Platform
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();

    if (!email || !email.includes("@") || !email.includes(".")) {
      return Response.json({ detail: "Please enter a valid email address." }, { status: 400 });
    }

    // Generate 6-digit OTP and store with TTL
    const otp = generateOTP();
    OTP_CACHE.set(email, {
      otp,
      expiresAt: Date.now() + OTP_TTL_MS,
      attempts: 0,
    });

    const smtpHost = process.env.SMTP_HOST || "";
    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const smtpUser = process.env.SMTP_USER || "";
    const smtpPass = process.env.SMTP_PASSWORD || "";
    const smtpFrom = process.env.SMTP_FROM_EMAIL || smtpUser;

    console.log(`[AIRFAIR AUTH] OTP request for: ${email}`);
    console.log(`[AIRFAIR AUTH] SMTP configured: host=${smtpHost || "NONE"}, user=${smtpUser || "NONE"}`);

    // Attempt real SMTP delivery
    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
          tls: { rejectUnauthorized: false },
        });

        await transporter.sendMail({
          from: `"AIRFAIR Security" <${smtpFrom}>`,
          to: email,
          subject: `${otp} — Your AIRFAIR Verification Code`,
          html: buildEmailHTML(otp, email),
          text: `Your AIRFAIR verification code: ${otp}\n\nExpires in 5 minutes. Do not share.`,
        });

        console.log(`[AIRFAIR SMTP ✓] OTP delivered to ${email}`);
        return Response.json({
          status: "ok",
          message: "Verification code sent to your email inbox.",
        });
      } catch (smtpErr) {
        console.error(`[AIRFAIR SMTP ✗] Delivery failed: ${smtpErr.message}`);
        return Response.json(
          { detail: `Failed to dispatch email via SMTP (${smtpErr.message}). Please verify your email address.` },
          { status: 502 }
        );
      }
    }

    // If SMTP is not configured on the server
    console.error("[AIRFAIR SMTP] SMTP credentials (SMTP_USER, SMTP_PASSWORD) are not configured.");
    return Response.json(
      { detail: "SMTP email service is not configured on this server. Real-time email delivery required." },
      { status: 503 }
    );
  } catch (err) {
    console.error("[AIRFAIR OTP Error]", err);
    return Response.json({ detail: "Failed to process OTP request. Please try again." }, { status: 500 });
  }
}
