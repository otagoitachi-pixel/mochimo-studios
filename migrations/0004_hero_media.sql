-- Dedicated hero banner media, independent from the Featured Work gallery.
-- Previously the hero image was just gallery[0], which meant it also
-- appeared (and autoplayed, if a reel) inside the Featured Work/Reels
-- slider below it. This gives the hero its own slot so it never repeats.
ALTER TABLE appearance ADD COLUMN hero_media_url TEXT NOT NULL DEFAULT '';
ALTER TABLE appearance ADD COLUMN hero_media_type TEXT NOT NULL DEFAULT 'image';
