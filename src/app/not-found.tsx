import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="eyebrow">404</p>
      <h1 className="font-serif text-3xl font-bold">We couldn&apos;t find that page</h1>
      <Link href="/" className="btn-navy">Back to home</Link>
    </div>
  );
}
