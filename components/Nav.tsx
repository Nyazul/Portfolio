const links = [
  { href: "#about", label: "About" },
  { href: "#architecture", label: "Architecture" },
  { href: "#work", label: "Work" },
  { href: "#stack", label: "Stack" },
  { href: "#experience", label: "Experience" },
  { href: "#contact", label: "Contact" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" className="font-mono text-sm tracking-tight text-text-primary">
          NA
        </a>
        <ul className="hidden gap-8 text-sm text-text-secondary md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="transition-colors duration-200 hover:text-text-primary"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href="/resume.pdf"
          className="rounded-none border border-border px-4 py-2 text-sm text-text-primary transition-colors duration-200 hover:border-text-primary"
        >
          Résumé
        </a>
      </nav>
    </header>
  );
}
