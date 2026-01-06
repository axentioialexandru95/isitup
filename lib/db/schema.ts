import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  discordWebhookUrl: text("discord_webhook_url"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sites = sqliteTable("sites", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  checkSsl: integer("check_ssl", { mode: "boolean" }).notNull().default(true),
  checkContent: text("check_content"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const checks = sqliteTable("checks", {
  id: text("id").primaryKey(),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id, { onDelete: "cascade" }),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  status: text("status", { enum: ["up", "down", "degraded"] }).notNull(),
  httpStatus: integer("http_status"),
  responseTimeMs: integer("response_time_ms"),
  sslValid: integer("ssl_valid", { mode: "boolean" }),
  sslExpiresAt: integer("ssl_expires_at", { mode: "timestamp" }),
  dnsResolved: integer("dns_resolved", { mode: "boolean" }).notNull(),
  contentFound: integer("content_found", { mode: "boolean" }),
  errorMessage: text("error_message"),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Site = typeof sites.$inferSelect;
export type NewSite = typeof sites.$inferInsert;
export type Check = typeof checks.$inferSelect;
export type NewCheck = typeof checks.$inferInsert;
