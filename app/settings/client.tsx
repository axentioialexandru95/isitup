"use client";

import { useActionState } from "react";
import { updateSettings, type SettingsState } from "@/lib/actions/settings";

export function SettingsForm({ discordWebhookUrl }: { discordWebhookUrl: string }) {
  const [state, formAction, isPending] = useActionState<SettingsState, FormData>(
    updateSettings,
    {}
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.success && (
        <div className="p-3 rounded-lg bg-accent-glow border border-accent/30 text-accent text-sm">
          Settings saved successfully
        </div>
      )}

      {state.error && (
        <div className="p-3 rounded-lg bg-danger-glow border border-danger/30 text-danger text-sm">
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="discordWebhookUrl"
          className="block text-sm font-medium text-text-secondary mb-2"
        >
          Discord Webhook URL
        </label>
        <input
          id="discordWebhookUrl"
          name="discordWebhookUrl"
          type="url"
          defaultValue={discordWebhookUrl}
          className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-text-primary placeholder:text-text-muted transition-all duration-200 hover:border-text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          placeholder="https://discord.com/api/webhooks/..."
        />
        {state.fieldErrors?.discordWebhookUrl && (
          <p className="mt-1.5 text-sm text-danger">
            {state.fieldErrors.discordWebhookUrl[0]}
          </p>
        )}
        <p className="mt-2 text-xs text-text-muted">
          Get this URL from your Discord server settings → Integrations → Webhooks
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="py-3 px-6 bg-accent text-bg-primary font-medium rounded-lg transition-all duration-200 hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
