"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createSite, type SiteState } from "@/lib/actions/sites";

export default function NewSitePage() {
  const [state, formAction, isPending] = useActionState<SiteState, FormData>(
    createSite,
    {}
  );

  return (
    <div className="min-h-screen p-8">
      <header className="max-w-2xl mx-auto mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Add New Site
        </h1>
        <p className="text-text-secondary mt-2">
          Enter the details of the website you want to monitor.
        </p>
      </header>

      <main className="max-w-2xl mx-auto">
        <div className="bg-bg-secondary border border-border rounded-xl p-8">
          {state.error && (
            <div className="mb-6 p-3 rounded-lg bg-danger-glow border border-danger/30 text-danger text-sm">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Site Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder:text-text-muted transition-all duration-200 hover:border-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="My Website"
              />
              {state.fieldErrors?.name && (
                <p className="mt-1.5 text-sm text-danger">{state.fieldErrors.name[0]}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="url"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                URL
              </label>
              <input
                id="url"
                name="url"
                type="url"
                required
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder:text-text-muted transition-all duration-200 hover:border-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="https://example.com"
              />
              {state.fieldErrors?.url && (
                <p className="mt-1.5 text-sm text-danger">{state.fieldErrors.url[0]}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <input
                id="checkSsl"
                name="checkSsl"
                type="checkbox"
                defaultChecked
                className="w-5 h-5 rounded border-border bg-bg-tertiary text-accent focus:ring-accent focus:ring-offset-0"
              />
              <label htmlFor="checkSsl" className="text-sm text-text-primary">
                Check SSL certificate validity
              </label>
            </div>

            <div>
              <label
                htmlFor="checkContent"
                className="block text-sm font-medium text-text-secondary mb-2"
              >
                Content Check{" "}
                <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <input
                id="checkContent"
                name="checkContent"
                type="text"
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder:text-text-muted transition-all duration-200 hover:border-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="Text that should appear on the page"
              />
              <p className="mt-1.5 text-xs text-text-muted">
                The site will be marked as degraded if this text is not found on the page.
              </p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-3 px-4 bg-accent text-bg-primary font-medium rounded-lg transition-all duration-200 hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                <span className={isPending ? "opacity-0" : ""}>Add Site</span>
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
              <Link
                href="/dashboard"
                className="px-6 py-3 border border-border text-text-secondary rounded-lg transition-colors hover:border-text-muted hover:text-text-primary"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
