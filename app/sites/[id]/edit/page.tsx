import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { EditSiteForm } from "./form";

async function getSite(siteId: string, userId: string) {
  return db.query.sites.findFirst({
    where: and(
      eq(schema.sites.id, siteId),
      eq(schema.sites.userId, userId)
    ),
  });
}

export default async function EditSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const site = await getSite(id, session.user.id);

  if (!site) {
    notFound();
  }

  return (
    <div className="min-h-screen p-8">
      <header className="max-w-2xl mx-auto mb-8">
        <Link
          href={`/sites/${site.id}`}
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm mb-6"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Site
        </Link>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Edit Site
        </h1>
        <p className="text-text-secondary mt-2">
          Update the monitoring settings for {site.name}.
        </p>
      </header>

      <main className="max-w-2xl mx-auto">
        <EditSiteForm site={site} />
      </main>
    </div>
  );
}
