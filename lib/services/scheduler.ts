import cron from "node-cron";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { performCheck, saveCheckResult, getLatestCheckForSite, cleanupOldChecks } from "./health-check";
import { sendDiscordNotification, getWebhookUrl } from "./discord";

let isRunning = false;

async function runChecks() {
  if (isRunning) {
    console.log("[Scheduler] Previous check cycle still running, skipping...");
    return;
  }

  isRunning = true;
  console.log("[Scheduler] Starting check cycle...");

  try {
    // Get all enabled sites
    const sites = await db.query.sites.findMany({
      where: eq(schema.sites.enabled, true),
    });

    console.log(`[Scheduler] Found ${sites.length} enabled sites to check`);

    for (const site of sites) {
      try {
        // Get previous check for status comparison
        const previousCheck = await getLatestCheckForSite(site.id);
        const previousStatus = previousCheck?.status ?? null;

        // Perform the check
        const result = await performCheck(site);
        console.log(`[Scheduler] ${site.name}: ${result.status} (${result.responseTimeMs}ms)`);

        // Save the result
        await saveCheckResult(site.id, result);

        // Send notification if status changed
        if (previousStatus !== result.status) {
          // Get user for discord webhook (falls back to global env)
          const user = await db.query.users.findFirst({
            where: eq(schema.users.id, site.userId),
          });

          const webhookUrl = getWebhookUrl(user?.discordWebhookUrl ?? null);
          if (webhookUrl) {
            const newCheck = await getLatestCheckForSite(site.id);
            if (newCheck) {
              await sendDiscordNotification(
                webhookUrl,
                site,
                newCheck,
                previousStatus
              );
              console.log(`[Scheduler] Sent Discord notification for ${site.name}`);
            }
          }
        }
      } catch (error) {
        console.error(`[Scheduler] Error checking ${site.name}:`, error);
      }
    }

    console.log("[Scheduler] Check cycle complete");
  } catch (error) {
    console.error("[Scheduler] Error in check cycle:", error);
  } finally {
    isRunning = false;
  }
}

async function runCleanup() {
  console.log("[Scheduler] Running cleanup...");
  try {
    await cleanupOldChecks(30);
    console.log("[Scheduler] Cleanup complete");
  } catch (error) {
    console.error("[Scheduler] Cleanup error:", error);
  }
}

export function startScheduler() {
  console.log("[Scheduler] Initializing...");

  // Run checks every 5 minutes
  cron.schedule("*/5 * * * *", () => {
    runChecks();
  });

  // Run cleanup daily at 3 AM
  cron.schedule("0 3 * * *", () => {
    runCleanup();
  });

  // Run initial check after 10 seconds
  setTimeout(() => {
    runChecks();
  }, 10000);

  console.log("[Scheduler] Started - checks every 5 minutes, cleanup daily at 3 AM");
}
