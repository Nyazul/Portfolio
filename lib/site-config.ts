// Single source of truth for the site URL. Update NEXT_PUBLIC_SITE_URL in
// .env.local once a real domain is purchased - nothing else in the app
// needs to change (see PRD Section 8, Domain note).
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://nyazulansari.duckdns.org";

export const siteConfig = {
  name: "Nyazul Ansari",
  role: "Backend Engineer — Java / Spring Boot",
  tagline:
    "I build multi-tenant systems that hold up under concurrency, not just under a demo.",
  email: "ansarinyazul2003@gmail.com",
  github: "https://github.com/Nyazul",
  linkedin: "https://linkedin.com/in/nyazul-ansari",
  availability: "Open to backend roles",
  location: "Pune, India",
};
