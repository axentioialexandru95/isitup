"use client";

import { useActionState } from "react";
import Link from "next/link";
import { register, type AuthState } from "@/lib/actions/auth";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    register,
    {}
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(var(--accent) 1px, transparent 1px),
            linear-gradient(90deg, var(--accent) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Gradient orb */}
      <div
        className="absolute bottom-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
      />

      <div className="w-full max-w-md relative">
        {/* Logo/Brand */}
        <div className="text-center mb-10 opacity-0 animate-fade-in">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-accent status-pulse" />
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              IsItUp
            </h1>
          </div>
          <p className="text-text-secondary text-sm">
            Start monitoring your services today.
          </p>
        </div>

        {/* Register Form */}
        <div
          className="bg-bg-secondary border border-border rounded-xl p-8 opacity-0 animate-fade-in delay-100"
          style={{ animationFillMode: "forwards" }}
        >
          <h2
            className="text-xl font-semibold mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Create account
          </h2>

          {state.error && (
            <div className="mb-6 p-3 rounded-lg bg-danger-glow border border-danger/30 text-danger text-sm">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder:text-text-muted transition-all duration-200 hover:border-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="you@example.com"
              />
              {state.fieldErrors?.email && (
                <p className="mt-1.5 text-sm text-danger">{state.fieldErrors.email[0]}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder:text-text-muted transition-all duration-200 hover:border-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="••••••••"
              />
              {state.fieldErrors?.password && (
                <p className="mt-1.5 text-sm text-danger">{state.fieldErrors.password[0]}</p>
              )}
              <p className="mt-1.5 text-xs text-text-muted">
                Must be at least 8 characters
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder:text-text-muted transition-all duration-200 hover:border-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="••••••••"
              />
              {state.fieldErrors?.confirmPassword && (
                <p className="mt-1.5 text-sm text-danger">{state.fieldErrors.confirmPassword[0]}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 bg-accent text-bg-primary font-medium rounded-lg transition-all duration-200 hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            >
              <span className={isPending ? "opacity-0" : ""}>
                Create account
              </span>
              {isPending && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Login link */}
        <p
          className="text-center mt-6 text-text-secondary text-sm opacity-0 animate-fade-in delay-200"
          style={{ animationFillMode: "forwards" }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-accent hover:text-accent-hover transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
