import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="card max-w-sm p-6 text-center">
        <h1 className="text-base font-bold text-white">Nothing here</h1>
        <p className="mt-1.5 text-sm text-slate-400">That page or person doesn&apos;t exist.</p>
        <Link href="/" className="btn btn-primary mt-5">Back to the board</Link>
      </div>
    </div>
  );
}
