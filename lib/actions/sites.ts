"use server";

import { auth } from "@/auth";
import { db, schema } from "@/lib/db";
import { eq, and, desc, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

// Block internal/private URLs to prevent SSRF
function isPublicUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();

    // Block localhost variants
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return false;
    }

    // Block private IP ranges
    const parts = hostname.split(".").map(Number);
    if (parts.length === 4 && parts.every(p => !isNaN(p))) {
      // 10.x.x.x
      if (parts[0] === 10) return false;
      // 172.16-31.x.x
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
      // 192.168.x.x
      if (parts[0] === 192 && parts[1] === 168) return false;
      // 169.254.x.x (link-local, AWS metadata)
      if (parts[0] === 169 && parts[1] === 254) return false;
    }

    // Block common internal hostnames
    if (hostname.endsWith(".local") || hostname.endsWith(".internal")) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

const siteSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  url: z.string().url("Must be a valid URL").refine(isPublicUrl, "Internal/private URLs not allowed"),
  checkSsl: z.boolean().default(true),
  checkContent: z.string().optional(),
});

export type SiteState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createSite(
  _prevState: SiteState,
  formData: FormData
): Promise<SiteState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  const rawData = {
    name: formData.get("name") as string,
    url: formData.get("url") as string,
    checkSsl: formData.get("checkSsl") === "on",
    checkContent: (formData.get("checkContent") as string) || undefined,
  };

  const parsed = siteSchema.safeParse(rawData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const id = crypto.randomUUID();
  await db.insert(schema.sites).values({
    id,
    userId: session.user.id,
    name: parsed.data.name,
    url: parsed.data.url,
    checkSsl: parsed.data.checkSsl,
    checkContent: parsed.data.checkContent || null,
  });

  redirect("/dashboard");
}

export async function updateSite(
  siteId: string,
  _prevState: SiteState,
  formData: FormData
): Promise<SiteState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Not authenticated" };
  }

  // Verify ownership
  const site = await db.query.sites.findFirst({
    where: and(
      eq(schema.sites.id, siteId),
      eq(schema.sites.userId, session.user.id)
    ),
  });

  if (!site) {
    return { error: "Site not found" };
  }

  const rawData = {
    name: formData.get("name") as string,
    url: formData.get("url") as string,
    checkSsl: formData.get("checkSsl") === "on",
    checkContent: (formData.get("checkContent") as string) || undefined,
  };

  const parsed = siteSchema.safeParse(rawData);
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await db
    .update(schema.sites)
    .set({
      name: parsed.data.name,
      url: parsed.data.url,
      checkSsl: parsed.data.checkSsl,
      checkContent: parsed.data.checkContent || null,
    })
    .where(eq(schema.sites.id, siteId));

  revalidatePath(`/sites/${siteId}`);
  revalidatePath("/dashboard");

  return {};
}

export async function deleteSite(siteId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  // Verify ownership
  const site = await db.query.sites.findFirst({
    where: and(
      eq(schema.sites.id, siteId),
      eq(schema.sites.userId, session.user.id)
    ),
  });

  if (!site) {
    throw new Error("Site not found");
  }

  await db.delete(schema.sites).where(eq(schema.sites.id, siteId));
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function toggleSiteEnabled(siteId: string, enabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }

  const site = await db.query.sites.findFirst({
    where: and(
      eq(schema.sites.id, siteId),
      eq(schema.sites.userId, session.user.id)
    ),
  });

  if (!site) {
    throw new Error("Site not found");
  }

  await db
    .update(schema.sites)
    .set({ enabled })
    .where(eq(schema.sites.id, siteId));

  revalidatePath(`/sites/${siteId}`);
  revalidatePath("/dashboard");
}

export async function getUserSites() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  return db.query.sites.findMany({
    where: eq(schema.sites.userId, session.user.id),
    orderBy: [desc(schema.sites.createdAt)],
  });
}

export async function getUserSitesPaginated(page: number = 1, pageSize: number = 10) {
  const session = await auth();
  if (!session?.user?.id) {
    return { sites: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const offset = (page - 1) * pageSize;

  const [sites, totalResult] = await Promise.all([
    db.query.sites.findMany({
      where: eq(schema.sites.userId, session.user.id),
      orderBy: [desc(schema.sites.createdAt)],
      limit: pageSize,
      offset,
    }),
    db
      .select({ count: count() })
      .from(schema.sites)
      .where(eq(schema.sites.userId, session.user.id)),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return { sites, total, page, pageSize, totalPages };
}

export async function getSiteWithLatestCheck(siteId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const site = await db.query.sites.findFirst({
    where: and(
      eq(schema.sites.id, siteId),
      eq(schema.sites.userId, session.user.id)
    ),
  });

  if (!site) return null;

  const latestCheck = await db.query.checks.findFirst({
    where: eq(schema.checks.siteId, siteId),
    orderBy: [desc(schema.checks.timestamp)],
  });

  return { ...site, latestCheck };
}
