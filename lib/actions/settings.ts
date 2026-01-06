"use server";

import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const settingsSchema = z.object({
  discordWebhookUrl: z.string().url().optional().or(z.literal("")),
});

export type SettingsState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function updateSettings(
  _prevState: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const rawData = {
    discordWebhookUrl: (formData.get("discordWebhookUrl") as string) || "",
  };

  // Validate webhook URL format if provided
  if (rawData.discordWebhookUrl && !rawData.discordWebhookUrl.startsWith("https://discord.com/api/webhooks/")) {
    return {
      fieldErrors: {
        discordWebhookUrl: ["Must be a valid Discord webhook URL"],
      },
    };
  }

  await db
    .update(schema.users)
    .set({
      discordWebhookUrl: rawData.discordWebhookUrl || null,
    })
    .where(eq(schema.users.id, session.user.id));

  revalidatePath("/settings");

  return { success: true };
}

export async function getUserSettings() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.user.id),
  });

  return user ? { discordWebhookUrl: user.discordWebhookUrl } : null;
}
