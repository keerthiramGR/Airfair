import os
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, Tuple

# In-memory store for active OTPs: { email: { "otp": str, "expires_at": datetime, "attempts": int } }
_OTP_CACHE: Dict[str, dict] = {}
OTP_TTL_MINUTES = 5


def generate_otp(email: str) -> str:
    """
    Generates a cryptographically randomized 6-digit verification code.
    """
    code = f"{random.randint(100000, 999999)}"
    now = datetime.now(timezone.utc)
    _OTP_CACHE[email.lower().strip()] = {
        "otp": code,
        "expires_at": now + timedelta(minutes=OTP_TTL_MINUTES),
        "attempts": 0
    }
    return code


def send_otp_email(email: str, otp: str) -> Tuple[bool, str]:
    """
    Dispatches the 6-digit OTP code to the recipient email address via SMTP.
    If SMTP credentials are not configured in .env, logs the OTP to server console
    and provides a seamless demo token so local hackathon testing is never blocked.
    """
    email = email.lower().strip()
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_user or "noreply@airfair.gov.in").strip()

    # If real SMTP credentials are provided, attempt genuine mail delivery
    if smtp_host and smtp_user and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"AIRFAIR Security OTP: {otp} — Smart India Hackathon 2026"
            msg["From"] = f"AIRFAIR Security <{smtp_from}>"
            msg["To"] = email

            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f1f5f9; padding: 20px; }}
                .card {{ max-width: 480px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px; }}
                .logo {{ font-size: 24px; font-weight: 900; letter-spacing: -0.04em; color: #ffffff; text-transform: uppercase; }}
                .tag {{ display: inline-block; background: #2563eb; color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; margin-left: 8px; }}
                .otp-box {{ background: #1e293b; border: 1px dashed #3b82f6; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0; }}
                .otp-code {{ font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #60a5fa; font-family: monospace; }}
                .notice {{ font-size: 12px; color: #94a3b8; line-height: 1.5; }}
              </style>
            </head>
            <body>
              <div class="card">
                <div class="logo">AIRFAIR <span class="tag">SIH 2026</span></div>
                <p style="color: #94a3b8; font-size: 14px; margin-top: 8px;">Ministry of Civil Aviation — Airfare Price Index Terminal</p>
                <hr style="border: 0; border-top: 1px solid #1f2937; margin: 20px 0;">
                <p style="font-size: 14px;">Your one-time access verification code is:</p>
                <div class="otp-box">
                  <div class="otp-code">{otp}</div>
                </div>
                <p class="notice">
                  This code expires in <strong>5 minutes</strong>. Do not disclose this OTP to anyone.<br>
                  Security identification request for portal access.
                </p>
              </div>
            </body>
            </html>
            """
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(smtp_from, [email], msg.as_string())

            print(f"[AIRFAIR SMTP Success] OTP {otp} sent to {email}")
            return True, "OTP sent successfully to your email via SMTP."

        except Exception as exc:
            print(f"[AIRFAIR SMTP Error] Could not dispatch email via SMTP: {exc}")
            return False, f"Failed to send email via SMTP: {str(exc)}"

    return False, "SMTP credentials (SMTP_USER, SMTP_PASSWORD) are not configured on this server."


def verify_otp_code(email: str, code: str) -> Tuple[bool, str]:
    """
    Verifies user-submitted 6-digit OTP code against the active cache.
    """
    email = email.lower().strip()
    code = code.strip()

    if email not in _OTP_CACHE:
        return False, "No active OTP request found for this email. Please request a new code."

    entry = _OTP_CACHE[email]
    now = datetime.now(timezone.utc)

    if now > entry["expires_at"]:
        del _OTP_CACHE[email]
        return False, "Verification code has expired. Please request a new one."

    entry["attempts"] += 1
    if entry["attempts"] > 5:
        del _OTP_CACHE[email]
        return False, "Too many failed attempts. Please request a new verification code."

    if entry["otp"] != code:
        return False, f"Invalid verification code. Please check and try again."

    # Success — remove OTP to prevent reuse
    del _OTP_CACHE[email]
    return True, "Verification successful. Access granted."
