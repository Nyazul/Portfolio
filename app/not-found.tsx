import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-[80vh] flex-col justify-center px-6 pt-32 pb-24"
    >
      <div className="mx-auto w-full max-w-6xl">
        <p className="font-mono text-sm text-text-tertiary">Error / 404</p>
        <h1 className="mt-6 text-[clamp(6rem,22vw,16rem)] leading-[0.85] font-medium tracking-tight text-text-primary">
          4<span className="text-accent">0</span>4
        </h1>
        <p className="mt-8 max-w-md text-lg text-text-secondary">
          This route doesn&apos;t resolve to anything — no handler, no
          fallback, no silent 200. Unlike some APIs I&apos;ve debugged.
        </p>
        <Link
          href="/"
          className="mt-10 inline-block border border-text-primary px-6 py-3 text-sm text-text-primary transition-colors duration-200 hover:bg-text-primary hover:text-inverse-text"
        >
          ← Back home
        </Link>
      </div>
    </main>
  );
}
