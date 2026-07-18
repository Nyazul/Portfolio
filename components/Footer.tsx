import { siteConfig } from "@/lib/site-config";

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 text-sm text-text-tertiary md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} {siteConfig.name}</p>
        <div className="flex gap-6">
          <a href={siteConfig.github} className="hover:text-text-primary">
            GitHub
          </a>
          <a href={siteConfig.linkedin} className="hover:text-text-primary">
            LinkedIn
          </a>
          <a href="/Nyazul_Ansari_Resume.pdf" className="hover:text-text-primary">
            Résumé
          </a>
        </div>
      </div>
    </footer>
  );
}
