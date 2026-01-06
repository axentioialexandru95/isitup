"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateSite, deleteSite, type SiteState } from "@/lib/actions/sites";
import { useState } from "react";

type Site = {
  id: string;
  name: string;
  url: string;
  checkSsl: boolean;
  checkContent: string | null;
};

export function EditSiteForm({ site }: { site: Site }) {
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const updateSiteWithId = updateSite.bind(null, site.id);
  const [state, formAction, isPending] = useActionState<SiteState, FormData>(
    async (prevState, formData) => {
      const result = await updateSiteWithId(prevState, formData);
      if (!result.error && !result.fieldErrors) {
        router.push(`/sites/${site.id}`);
      }
      return result;
    },
    {}
  );

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSite(site.id);
    } catch (error) {
      console.error("Delete failed:", error);
      setIsDeleting(false);
    }
  };

  return (
    <>
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
              defaultValue={site.name}
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
              defaultValue={site.url}
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
              defaultChecked={site.checkSsl}
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
              defaultValue={site.checkContent || ""}
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
              <span className={isPending ? "opacity-0" : ""}>Save Changes</span>
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
              href={`/sites/${site.id}`}
              className="px-6 py-3 border border-border text-text-secondary rounded-lg transition-colors hover:border-text-muted hover:text-text-primary"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 bg-bg-secondary border border-danger/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-danger mb-2" style={{ fontFamily: "var(--font-display)" }}>
          Danger Zone
        </h3>
        <p className="text-text-secondary text-sm mb-4">
          Deleting this site will permanently remove all monitoring history and data.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 border border-danger/50 text-danger rounded-lg transition-colors hover:bg-danger-glow hover:border-danger"
          >
            Delete Site
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary">Are you sure?</span>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-danger text-white rounded-lg transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  );
}
