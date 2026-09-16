"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  const signedOut = error.message === "NOT_AUTHENTICATED";
  const notAllowed = error.message === "NOT_AUTHORIZED";

  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="card max-w-sm p-6 text-center">
        <h1 className="text-base font-bold text-white">
          {signedOut ? "You've been signed out" : notAllowed ? "That's a leader-only action" : "Something broke"}
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          {signedOut
            ? "Sign back in and pick up where you left off."
            : notAllowed
              ? "Ask one of your leaders if you need this done."
              : "Try that again. If it keeps happening, tell whoever runs the board."}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          {signedOut ? (
            <Link href="/login" className="btn btn-primary">Sign in</Link>
          ) : (
            <>
              <button onClick={reset} className="btn btn-primary">Try again</button>
              <Link href="/" className="btn btn-ghost">Home</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
