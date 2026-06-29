import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

logger = logging.getLogger(__name__)

EMAIL_HOST     = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT     = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USERNAME = os.getenv("EMAIL_USERNAME", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
EMAIL_FROM     = os.getenv("EMAIL_FROM", "ZITLAS Experts <noreply@zitlas.com>")
ADMIN_EMAIL    = "zitlas111@gmail.com"
APP_BASE_URL   = os.getenv("APP_BASE_URL", "https://zitlas.com")

_BRAND_HEADER = """
<div style="background:#FF7A00;padding:20px 24px;border-radius:8px 8px 0 0;">
  <h1 style="color:#0f172a;margin:0;font-size:22px;font-weight:900;letter-spacing:-0.03em;">ZITL<span style="color:#0f172a;">A</span>S <span style="font-weight:400;font-size:14px;opacity:0.7;">Experts</span></h1>
</div>
"""
_BRAND_FOOTER = """
<p style="text-align:center;font-size:12px;color:#aaa;margin-top:20px;padding-top:16px;border-top:1px solid #eee;">
  ZITLAS Experts — AI + Human Experts for Better Fitness Results<br>
  <a href="https://zitlas.com" style="color:#FF7A00;text-decoration:none;">zitlas.com</a>
</p>
"""


def _wrap(body: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:32px auto;padding:0 16px;">
    <div style="background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      {_BRAND_HEADER}
      <div style="padding:28px 28px 20px;">{body}</div>
    </div>
    {_BRAND_FOOTER}
  </div>
</body></html>"""


def _send(to: str, subject: str, html: str) -> None:
    """Send a single HTML email via SMTP. Logs warning and returns if not configured."""
    if not EMAIL_USERNAME or not EMAIL_PASSWORD:
        logger.warning("Email not configured — skipping send to %s | subject: %s", to, subject)
        return
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = EMAIL_FROM
    msg["To"]      = to
    msg.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT, timeout=15) as srv:
            srv.ehlo()
            srv.starttls()
            srv.login(EMAIL_USERNAME, EMAIL_PASSWORD)
            srv.sendmail(EMAIL_FROM, to, msg.as_string())
        logger.info("Email sent  to=%s  subject=%s", to, subject)
    except smtplib.SMTPException as exc:
        logger.error("SMTP error sending to %s: %s", to, exc)
        raise


def notify_admin_new_application(app) -> None:
    """Notify zitlas111@gmail.com when a new expert application is submitted."""
    submitted = app.submitted_at.strftime("%d %b %Y, %I:%M %p UTC") if app.submitted_at else "N/A"
    expert_type = (app.role or "").replace("_", " ").title()

    rows = f"""
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
      <tr>
        <td style="padding:10px 0 10px 0;color:#64748b;width:120px;vertical-align:top;">Name</td>
        <td style="padding:10px 0;color:#0f172a;font-weight:600;">{app.name}</td>
      </tr>
      <tr style="border-top:1px solid #f1f5f9;">
        <td style="padding:10px 0;color:#64748b;">Email</td>
        <td style="padding:10px 0;color:#0f172a;">{app.email or "—"}</td>
      </tr>
      <tr style="border-top:1px solid #f1f5f9;">
        <td style="padding:10px 0;color:#64748b;">Phone</td>
        <td style="padding:10px 0;color:#0f172a;">{app.phone or "—"}</td>
      </tr>
      <tr style="border-top:1px solid #f1f5f9;">
        <td style="padding:10px 0;color:#64748b;">Expert Type</td>
        <td style="padding:10px 0;">
          <span style="display:inline-block;padding:2px 10px;background:#fff7ed;color:#c2410c;border-radius:20px;font-size:13px;font-weight:600;">{expert_type}</span>
        </td>
      </tr>
      <tr style="border-top:1px solid #f1f5f9;">
        <td style="padding:10px 0;color:#64748b;">Submitted At</td>
        <td style="padding:10px 0;color:#0f172a;">{submitted}</td>
      </tr>
    </table>
    """

    body = f"""
    <h2 style="color:#0f172a;font-size:18px;margin:0 0 4px;font-weight:700;">New Expert Application</h2>
    <p style="color:#64748b;font-size:14px;margin:0 0 20px;">A new applicant is waiting for review.</p>
    {rows}
    <div style="margin-top:20px;padding:14px 16px;background:#fff7ed;border-radius:8px;border-left:4px solid #FF7A00;">
      <p style="margin:0;font-size:13.5px;color:#92400e;">Review this application from the <strong>Admin Dashboard</strong>.</p>
    </div>
    <a href="{APP_BASE_URL}/admin/applications"
       style="display:inline-block;margin-top:20px;padding:12px 28px;background:#FF7A00;color:#0f172a;font-weight:700;font-size:14px;border-radius:8px;text-decoration:none;">
      Open Admin Dashboard →
    </a>
    """
    try:
        _send(ADMIN_EMAIL, f"New Expert Application — {expert_type} · {app.name}", _wrap(body))
    except Exception as exc:
        logger.error("Failed to notify admin of new application id=%s: %s", getattr(app, "id", "?"), exc)


def send_approval_email(name: str, email: str, setup_token: str) -> None:
    """Send approval + password setup link to the approved expert."""
    setup_link = f"{APP_BASE_URL}/set-password?token={setup_token}"

    body = f"""
    <h2 style="color:#0f172a;font-size:20px;margin:0 0 12px;font-weight:800;">Congratulations, {name}! 🎉</h2>
    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 12px;">
      Your application has been <strong style="color:#16a34a;">approved</strong> and you are now an
      official expert on <strong>ZITLAS Experts</strong>.
    </p>
    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Please create your password using the secure link below:
    </p>
    <div style="text-align:center;margin:28px 0;">
      <a href="{setup_link}"
         style="display:inline-block;padding:15px 36px;background:#FF7A00;color:#0f172a;font-weight:800;font-size:16px;border-radius:10px;text-decoration:none;letter-spacing:0.01em;">
        Set Up My Password
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;text-align:center;margin:0 0 24px;">
      This link expires in <strong>24 hours</strong> and can only be used once.
    </p>
    <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 20px;">
    <p style="color:#64748b;font-size:13.5px;margin:0 0 4px;">
      Login URL: <a href="https://experts.zitlas.com/login" style="color:#FF7A00;text-decoration:none;">experts.zitlas.com/login</a>
    </p>
    <p style="color:#94a3b8;font-size:13px;margin-top:16px;">
      Regards,<br><strong style="color:#475569;">Team ZITLAS</strong>
    </p>
    """
    try:
        _send(email, "Welcome to ZITLAS Experts — Set Up Your Password", _wrap(body))
    except Exception as exc:
        logger.error("Failed to send approval email to %s: %s", email, exc)


def send_rejection_email(name: str, email: str, reason: str) -> None:
    """Send rejection notification to the applicant."""
    body = f"""
    <h2 style="color:#0f172a;font-size:18px;margin:0 0 16px;font-weight:700;">Update on Your ZITLAS Application</h2>
    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 12px;">Hello {name},</p>
    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Thank you for applying to become a ZITLAS Expert. Unfortunately, your application was
      not approved at this time.
    </p>
    <div style="background:#fff1f2;border-left:4px solid #f43f5e;border-radius:6px;padding:16px 18px;margin:0 0 20px;">
      <p style="color:#881337;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 6px;">Reason</p>
      <p style="color:#9f1239;font-size:14.5px;margin:0;line-height:1.6;">{reason}</p>
    </div>
    <p style="color:#475569;font-size:15px;line-height:1.7;margin:0 0 24px;">
      You are welcome to apply again in the future after addressing the feedback above.
    </p>
    <p style="color:#94a3b8;font-size:13px;margin-top:24px;">
      Regards,<br><strong style="color:#475569;">Team ZITLAS</strong>
    </p>
    """
    try:
        _send(email, "Update on Your ZITLAS Expert Application", _wrap(body))
    except Exception as exc:
        logger.error("Failed to send rejection email to %s: %s", email, exc)
