import os
import logging
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

logger = logging.getLogger(__name__)

ACCOUNT_SID  = os.getenv("TWILIO_ACCOUNT_SID", "")
AUTH_TOKEN   = os.getenv("TWILIO_AUTH_TOKEN", "")
FROM_NUMBER  = os.getenv("TWILIO_PHONE_NUMBER", "")

_OTP_TEMPLATE = (
    "Your ZITLAS verification code is:\n\n"
    "{otp}\n\n"
    "This code expires in 5 minutes.\n"
    "Do not share this code with anyone."
)


def send_otp_sms(phone_number: str, otp_code: str) -> None:
    """
    Send an OTP SMS via Twilio.
    Skips with a warning log if credentials are not configured
    (allows local development without Twilio).
    Raises RuntimeError on Twilio API failure.
    """
    if not ACCOUNT_SID or not AUTH_TOKEN or not FROM_NUMBER:
        logger.warning(
            "Twilio not configured — OTP SMS skipped for %s (code=%s)",
            phone_number, otp_code,
        )
        return

    # Lazy import so the app starts even if twilio wheel is absent
    try:
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException
    except ImportError as exc:
        logger.error("twilio package not installed: %s", exc)
        raise RuntimeError("SMS service unavailable — contact support") from exc

    to_number = f"+91{phone_number}"
    body      = _OTP_TEMPLATE.format(otp=otp_code)

    try:
        client  = Client(ACCOUNT_SID, AUTH_TOKEN)
        message = client.messages.create(body=body, from_=FROM_NUMBER, to=to_number)
        logger.info("OTP SMS sent: sid=%s to=%s", message.sid, to_number)
    except TwilioRestException as exc:
        logger.error("Twilio API error for %s: %s", to_number, exc)
        raise RuntimeError(f"Failed to send SMS: {exc.msg}") from exc
