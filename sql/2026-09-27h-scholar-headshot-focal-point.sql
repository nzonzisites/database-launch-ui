-- Adds an admin-adjustable vertical crop position for the listing headshot.
-- ProfilePortrait (the public page) and the Listings tab preview both use
-- object-fit: cover at a fixed height, so a headshot whose subject sits
-- near the top or bottom of the source image can get cropped out; this
-- lets an admin nudge the visible window instead of needing a
-- differently-cropped source image.
alter table public.scholar_profile
  add column if not exists headshot_focal_y smallint not null default 50
    check (headshot_focal_y between 0 and 100);
