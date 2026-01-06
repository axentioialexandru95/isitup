CREATE TABLE `checks` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`timestamp` integer NOT NULL,
	`status` text NOT NULL,
	`http_status` integer,
	`response_time_ms` integer,
	`ssl_valid` integer,
	`ssl_expires_at` integer,
	`dns_resolved` integer NOT NULL,
	`content_found` integer,
	`error_message` text,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`check_ssl` integer DEFAULT true NOT NULL,
	`check_content` text,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`discord_webhook_url` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);