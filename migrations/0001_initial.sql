-- Mochimo Studios — D1 schema
-- Run with: wrangler d1 execute mochimo-db --file=./backend/schema.sql

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  avatar_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  location TEXT DEFAULT '',
  website TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  social_instagram TEXT DEFAULT '',
  social_youtube TEXT DEFAULT '',
  social_tiktok TEXT DEFAULT '',
  social_x TEXT DEFAULT '',
  social_linkedin TEXT DEFAULT '',
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,          -- random session token (stored hashed if desired)
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'custom',
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail TEXT DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 1,
  clicks INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_links_user ON links(user_id, sort_order);

CREATE TABLE IF NOT EXISTS appearance (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'mochimo',
  button_style TEXT NOT NULL DEFAULT 'soft',
  layout TEXT NOT NULL DEFAULT 'classic',
  font TEXT NOT NULL DEFAULT 'fraunces',
  background TEXT NOT NULL DEFAULT 'cream',
  custom_bg TEXT DEFAULT '',
  accent_color TEXT NOT NULL DEFAULT '#C1728A',
  fx_shadows INTEGER NOT NULL DEFAULT 1,
  fx_borders INTEGER NOT NULL DEFAULT 0,
  fx_bg_shapes INTEGER NOT NULL DEFAULT 0,
  fx_animations INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notif_email INTEGER NOT NULL DEFAULT 1,
  notif_product INTEGER NOT NULL DEFAULT 1,
  language TEXT NOT NULL DEFAULT 'en',
  search_visible INTEGER NOT NULL DEFAULT 1
);

-- One row per real event. This table is the ONLY source for analytics —
-- the API must never synthesize numbers that don't come from here.
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,             -- 'view' | 'click' | 'nfc_tap' | 'qr_scan'
  link_id TEXT,                   -- set only for 'click' events
  visitor_id TEXT,                -- anonymous per-browser id from a cookie/localStorage on the visitor
  source TEXT,                    -- 'Direct' | 'QR' | 'NFC' | 'Instagram' | etc, when known
  device TEXT,                    -- 'Mobile' | 'Desktop' | 'Tablet', when known
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_user_type ON events(user_id, type);
