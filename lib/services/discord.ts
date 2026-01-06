import type { Site, Check } from "@/lib/db/schema";

type DiscordEmbed = {
  title: string;
  description: string;
  color: number;
  fields: { name: string; value: string; inline?: boolean }[];
  timestamp: string;
};

const COLORS = {
  up: 0x10b981, // green
  down: 0xef4444, // red
  degraded: 0xf59e0b, // yellow
};

export async function sendDiscordNotification(
  webhookUrl: string,
  site: Site,
  check: Check,
  previousStatus: "up" | "down" | "degraded" | null
): Promise<boolean> {
  if (!webhookUrl) return false;

  // Only notify on status changes
  if (previousStatus === check.status) return false;

  let title: string;
  let description: string;

  if (check.status === "down") {
    title = `🔴 ${site.name} is DOWN`;
    description = `The site ${site.url} is no longer responding.`;
  } else if (check.status === "degraded") {
    title = `🟡 ${site.name} is DEGRADED`;
    description = `The site ${site.url} is experiencing issues.`;
  } else if (check.status === "up" && previousStatus === "down") {
    title = `🟢 ${site.name} is back UP`;
    description = `The site ${site.url} has recovered.`;
  } else if (check.status === "up" && previousStatus === "degraded") {
    title = `🟢 ${site.name} is fully operational`;
    description = `The site ${site.url} is no longer degraded.`;
  } else {
    return false;
  }

  const embed: DiscordEmbed = {
    title,
    description,
    color: COLORS[check.status],
    fields: [
      {
        name: "URL",
        value: site.url,
        inline: true,
      },
      {
        name: "Status",
        value: check.status.toUpperCase(),
        inline: true,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  if (check.httpStatus) {
    embed.fields.push({
      name: "HTTP Status",
      value: check.httpStatus.toString(),
      inline: true,
    });
  }

  if (check.responseTimeMs) {
    embed.fields.push({
      name: "Response Time",
      value: `${check.responseTimeMs}ms`,
      inline: true,
    });
  }

  if (check.errorMessage) {
    embed.fields.push({
      name: "Error",
      value: check.errorMessage,
      inline: false,
    });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    return response.ok;
  } catch {
    console.error("Failed to send Discord notification");
    return false;
  }
}
