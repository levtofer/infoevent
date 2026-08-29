CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`start_date` text NOT NULL,
	`end_date` text,
	`location_name` text NOT NULL,
	`google_maps_url` text,
	`latitude` real,
	`longitude` real,
	`gallery_urls` text,
	`tags` text,
	`admin_note` text,
	`created_at` integer
);
