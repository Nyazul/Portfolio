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

  // TODO (before this goes live): wire an actual email provider (Resend,
  // Postmark, or SMTP via Nodemailer) here. For now this only validates and
  // logs server-side so the form doesn't silently break the build - nothing
  // is sent yet. Track this in the repo so it isn't forgotten.
  console.log("Contact form submission:", { name, email, message });

  return NextResponse.json({ ok: true });
}
