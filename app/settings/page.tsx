import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getUserSettings } from "@/lib/actions/settings";
import { SettingsForm } from "./client";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const settings = await getUserSettings();

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
          Settings
        </h1>
      </header>

      <main className="max-w-2xl mx-auto">
        <div className="bg-bg-secondary border border-border rounded-xl p-8">
          <h2
            className="text-lg font-semibold mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Notifications
          </h2>

          <SettingsForm discordWebhookUrl={settings?.discordWebhookUrl ?? ""} />
        </div>
      </main>
    </div>
  );
}
