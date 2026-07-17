"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      e.currentTarget.reset();
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <p className="text-text-primary">
        Thanks — I&apos;ll get back to you soon.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      {/* Honeypot: real users never see/fill this. Server rejects any
          submission where this is non-empty. Not a substitute for
          server-side validation of the real fields - just the first,
          cheapest filter. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      <div>
        <label className="mb-2 block text-sm text-text-secondary" htmlFor="name">
          Name
        </label>
        <input
          id="name"
          name="name"
          required
          className="w-full border border-border bg-transparent px-4 py-3 text-text-primary outline-none transition-colors duration-200 focus:border-text-primary"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-text-secondary" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full border border-border bg-transparent px-4 py-3 text-text-primary outline-none transition-colors duration-200 focus:border-text-primary"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-text-secondary" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full border border-border bg-transparent px-4 py-3 text-text-primary outline-none transition-colors duration-200 focus:border-text-primary"
        />
      </div>

      {status === "error" && (
        <p className="text-sm text-text-secondary">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="border border-text-primary px-6 py-3 text-sm text-text-primary transition-colors duration-200 hover:bg-text-primary hover:text-inverse-text disabled:opacity-50"
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
