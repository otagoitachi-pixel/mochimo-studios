-- Additive only. Existing columns, tables, defaults and data are untouched.
-- Existing users are unaffected: `theme` keeps defaulting to 'mochimo' and
-- these new columns default to empty, so nothing changes for them.

ALTER TABLE users ADD COLUMN social_facebook TEXT DEFAULT '';

-- JSON array of { url, caption, category } — the Photographer theme's
-- "Featured Work" gallery. Stored per-appearance (theme-specific config),
-- not on the user record itself. Empty by default for every account.
ALTER TABLE appearance ADD COLUMN photographer_gallery_json TEXT DEFAULT '[]';
