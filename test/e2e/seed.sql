-- E2E Test Setup
-- Run this script ONCE in BOTH Supabase projects before executing `npm run test:e2e`.
-- Dashboard: SQL Editor → paste → Run
-- To clean up afterwards: DROP TABLE IF EXISTS e2e_test_notes;

CREATE TABLE IF NOT EXISTS e2e_test_notes (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL,
  content     text        NOT NULL DEFAULT '',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE e2e_test_notes DISABLE ROW LEVEL SECURITY;
