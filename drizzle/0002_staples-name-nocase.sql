-- Make staple names case-insensitively unique so "Milk" and "milk" can't both
-- exist (they would otherwise double up on restock).
DROP INDEX `staples_name_unique`;--> statement-breakpoint
-- Remove any pre-existing case-variant duplicates, keeping the lowest id.
DELETE FROM `staples` WHERE `id` NOT IN (
  SELECT MIN(`id`) FROM `staples` GROUP BY LOWER(`name`)
);--> statement-breakpoint
CREATE UNIQUE INDEX `staples_name_unique` ON `staples` (`name` COLLATE NOCASE);
