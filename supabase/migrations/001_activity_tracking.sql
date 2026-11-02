-- ============================================================
-- Lumio Pathways — SLT Activity Tracking
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS prescribed_activities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id        UUID NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  slt_user_id     UUID NOT NULL,
  domain          TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  frequency       TEXT DEFAULT 'daily',
  duration_mins   INT DEFAULT 10,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_completions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id     UUID NOT NULL REFERENCES prescribed_activities(id) ON DELETE CASCADE,
  child_id        UUID NOT NULL,
  completed_by    UUID NOT NULL,
  completed_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT,
  mood            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_completion_unique_day
  ON activity_completions (activity_id, completed_date);

CREATE INDEX IF NOT EXISTS idx_activities_child ON prescribed_activities (child_id);
CREATE INDEX IF NOT EXISTS idx_activities_slt ON prescribed_activities (slt_user_id);
CREATE INDEX IF NOT EXISTS idx_completions_activity ON activity_completions (activity_id);
CREATE INDEX IF NOT EXISTS idx_completions_child ON activity_completions (child_id);

ALTER TABLE prescribed_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_completions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slt_manage_activities" ON prescribed_activities
  FOR ALL USING (auth.uid() = slt_user_id);

CREATE POLICY "parent_read_activities" ON prescribed_activities
  FOR SELECT USING (
    child_id IN (
      SELECT id FROM child_profiles WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "parent_log_completions" ON activity_completions
  FOR INSERT WITH CHECK (auth.uid() = completed_by);

CREATE POLICY "parent_read_completions" ON activity_completions
  FOR SELECT USING (auth.uid() = completed_by);

CREATE POLICY "slt_read_completions" ON activity_completions
  FOR SELECT USING (
    activity_id IN (
      SELECT id FROM prescribed_activities WHERE slt_user_id = auth.uid()
    )
  );
