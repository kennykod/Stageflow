import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-ink-3 uppercase">404</p>
      <h1 className="mt-2 font-display text-3xl font-medium">Sidan finns inte</h1>
      <p className="mt-2 text-ink-3">Den kan ha flyttats, eller så är länken felaktig.</p>
      <Link href="/" className="mt-6 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink">
        Till startsidan
      </Link>
    </main>
  );
}
