import type { Site, Check } from "@/lib/db/schema";

type DiscordEmbed = {
  title: string;
  description: string;
  color: number;
  fields: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp: string;
};

const COLORS = {
  up: 0x06d6a0, // cyan/teal (matches our accent)
  down: 0xff5757, // red
  degraded: 0xffbe0b, // yellow
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

function getStatusEmoji(status: "up" | "down" | "degraded"): string {
  switch (status) {
    case "up": return "🟢";
    case "down": return "🔴";
    case "degraded": return "🟡";
  }
}

function buildDiagnostics(check: Check): string[] {
  const diagnostics: string[] = [];

  // DNS status
  if (!check.dnsResolved) {
    diagnostics.push("❌ DNS resolution failed - domain may be unreachable or misconfigured");
  }

  // HTTP status analysis
  if (check.httpStatus) {
    if (check.httpStatus >= 500) {
      diagnostics.push(`❌ Server error (HTTP ${check.httpStatus}) - internal server issue`);
    } else if (check.httpStatus >= 400) {
      diagnostics.push(`⚠️ Client error (HTTP ${check.httpStatus}) - resource not found or forbidden`);
    } else if (check.httpStatus >= 300) {
      diagnostics.push(`ℹ️ Redirect (HTTP ${check.httpStatus})`);
    }
  } else if (check.dnsResolved) {
    diagnostics.push("❌ Connection failed - server may be down or blocking requests");
  }

  // Response time analysis
  if (check.responseTimeMs) {
    if (check.responseTimeMs > 10000) {
      diagnostics.push(`🐌 Very slow response (${formatDuration(check.responseTimeMs)}) - severe performance issue`);
    } else if (check.responseTimeMs > 5000) {
      diagnostics.push(`🐢 Slow response (${formatDuration(check.responseTimeMs)}) - performance degradation`);
    } else if (check.responseTimeMs > 3000) {
      diagnostics.push(`⚠️ Response time above threshold (${formatDuration(check.responseTimeMs)})`);
    }
  }

  // SSL analysis
  if (check.sslValid === false) {
    diagnostics.push("🔓 SSL certificate is invalid or expired");
  } else if (check.sslExpiresAt) {
    const daysUntilExpiry = Math.floor((check.sslExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 0) {
      diagnostics.push("🔓 SSL certificate has expired");
    } else if (daysUntilExpiry <= 7) {
      diagnostics.push(`⚠️ SSL certificate expires in ${daysUntilExpiry} days`);
    } else if (daysUntilExpiry <= 14) {
      diagnostics.push(`ℹ️ SSL certificate expires in ${daysUntilExpiry} days`);
    }
  }

  // Content check
  if (check.contentFound === false) {
    diagnostics.push("📝 Expected content not found on page");
  }

  return diagnostics;
}

export async function sendDiscordNotification(
  webhookUrl: string,
  site: Site,
  check: Check,
  previousStatus: "up" | "down" | "degraded" | null
): Promise<boolean> {
  if (!webhookUrl) return false;

  // Only notify on status changes
  if (previousStatus === check.status) return false;

  const emoji = getStatusEmoji(check.status);
  let title: string;
  let description: string;

  if (check.status === "down") {
    title = `${emoji} INCIDENT: ${site.name} is DOWN`;
    description = `The site is no longer responding and requires attention.`;
  } else if (check.status === "degraded") {
    title = `${emoji} WARNING: ${site.name} is DEGRADED`;
    description = `The site is experiencing performance issues or partial failures.`;
  } else if (check.status === "up" && previousStatus === "down") {
    title = `${emoji} RESOLVED: ${site.name} is back UP`;
    description = `The incident has been resolved. The site is now fully operational.`;
  } else if (check.status === "up" && previousStatus === "degraded") {
    title = `${emoji} RESOLVED: ${site.name} is fully operational`;
    description = `Performance issues have been resolved.`;
  } else {
    return false;
  }

  const embed: DiscordEmbed = {
    title,
    description,
    color: COLORS[check.status],
    fields: [
      {
        name: "🌐 Site",
        value: `[${site.name}](${site.url})`,
        inline: true,
      },
      {
        name: "📊 Status",
        value: `**${check.status.toUpperCase()}**`,
        inline: true,
      },
      {
        name: "🔄 Previous",
        value: previousStatus ? previousStatus.toUpperCase() : "N/A",
        inline: true,
      },
    ],
    footer: {
      text: "Uptime Monitor",
    },
    timestamp: new Date().toISOString(),
  };

  // Add HTTP status
  if (check.httpStatus) {
    embed.fields.push({
      name: "🔢 HTTP Status",
      value: check.httpStatus.toString(),
      inline: true,
    });
  }

  // Add response time
  if (check.responseTimeMs) {
    embed.fields.push({
      name: "⏱️ Response Time",
      value: formatDuration(check.responseTimeMs),
      inline: true,
    });
  }

  // Add SSL status
  if (check.sslValid !== null) {
    let sslValue = check.sslValid ? "✅ Valid" : "❌ Invalid";
    if (check.sslExpiresAt) {
      const daysUntilExpiry = Math.floor((check.sslExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      sslValue += ` (expires in ${daysUntilExpiry}d)`;
    }
    embed.fields.push({
      name: "🔒 SSL",
      value: sslValue,
      inline: true,
    });
  }

  // Add error message if present
  if (check.errorMessage) {
    embed.fields.push({
      name: "❌ Error",
      value: `\`\`\`${check.errorMessage}\`\`\``,
      inline: false,
    });
  }

  // Add diagnostics for non-up status
  if (check.status !== "up" || previousStatus !== null) {
    const diagnostics = buildDiagnostics(check);
    if (diagnostics.length > 0) {
      embed.fields.push({
        name: "🔍 Diagnostics",
        value: diagnostics.join("\n"),
        inline: false,
      });
    }
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!response.ok) {
      console.error(`Discord webhook failed: ${response.status} ${response.statusText}`);
    }

    return response.ok;
  } catch (error) {
    console.error("Failed to send Discord notification:", error);
    return false;
  }
}

// Get webhook URL: prefer user's setting, fall back to global env
export function getWebhookUrl(userWebhook: string | null): string | null {
  return userWebhook || process.env.DISCORD_WEBHOOK_URL || null;
}
