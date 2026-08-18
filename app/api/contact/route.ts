import { NextRequest, NextResponse } from "next/server";

type ContactPayload = {
  name?: string;
  email?: string;
  message?: string;
  company?: string; // honeypot field - must always be empty
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Resend REST endpoint - hit directly via fetch (same pattern as the GitHub
// metrics route) so there's no extra SDK dependency to install/maintain.
const RESEND_URL = "https://api.resend.com/emails";

// Delivery envelope, overridable per-deployment. The From address must be a
// domain you've verified in Resend, or the API rejects the send.
const sendFrom =
  process.env.CONTACT_FROM ??
  "Portfolio Contact <onboarding@resend.dev>";
const sendTo = process.env.CONTACT_TO ?? "ansarinyazul2003@gmail.com";

export async function POST(req: NextRequest) {
  let payload: ContactPayload;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Honeypot: bots fill every field including hidden ones. A real visitor
  // never sees or fills this. Fail closed but don't reveal why - no need
  // to teach a bot what tripped it.
  if (payload.company) {
    return NextResponse.json({ error: "Submission rejected." }, { status: 400 });
  }

  const name = (payload.name ?? "").trim();
  const email = (payload.email ?? "").trim();
  const message = (payload.message ?? "").trim();

  // Server-side validation regardless of what the client already checked -
  // the client-side `required`/`type="email"` attributes are UX, not security.
  if (!name || name.length > 200) {
    return NextResponse.json({ error: "Please provide a valid name." }, { status: 400 });
  }
  if (!email || !isValidEmail(email) || email.length > 320) {
    return NextResponse.json({ error: "Please provide a valid email." }, { status: 400 });
  }
  if (!message || message.length < 10 || message.length > 5000) {
    return NextResponse.json(
      { error: "Message must be between 10 and 5000 characters." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;

  // No key configured: fall back to validating + logging (and still return
  // ok so the form UX doesn't break), but flag it server-side so it's obvious
  // sends aren't real. This is the pre-launch state until RESEND_API_KEY is set.
  if (!apiKey) {
    console.log(
      "[contact] RESEND_API_KEY not set - validated but NOT emailing:",
      { name, email, message },
    );
    return NextResponse.json({ ok: true });
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sendFrom,
        to: [sendTo],
        reply_to: email,
        subject: `Portfolio contact from ${name} <${email}>`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[contact] Resend responded ${res.status}: ${body}`);
      return NextResponse.json(
        { error: "Message could not be sent. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] Failed to send via Resend:", err);
    return NextResponse.json(
      { error: "Message could not be sent. Please try again." },
      { status: 502 },
    );
  }
}
