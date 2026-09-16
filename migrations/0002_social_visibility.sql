-- Mochimo Studios — D1 schema
-- Adds per-platform show/hide toggles for the five quick-connect socials,
-- so a user can keep e.g. an Instagram handle saved on their profile
-- without it appearing on their public link-in-bio page.
-- Defaults to 1 (visible) so every existing account is unaffected until
-- someone explicitly flips a toggle on the My Links > Social Accounts tab.
-- Run with: wrangler d1 execute mochimo-db --file=./migrations/0002_social_visibility.sql

ALTER TABLE users ADD COLUMN social_instagram_visible INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN social_youtube_visible INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN social_tiktok_visible INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN social_x_visible INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN social_linkedin_visible INTEGER NOT NULL DEFAULT 1;
