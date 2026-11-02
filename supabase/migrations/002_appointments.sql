-- ============================================================
-- Lumio Pathways — Appointment Booking System
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS availability_slots (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinician_id    UUID NOT NULL,
  clinician_name  TEXT NOT NULL,
  slot_date       DATE NOT NULL,
  slot_time       TIME NOT NULL,
  duration_mins   INT DEFAULT 30,
  appointment_type TEXT NOT NULL DEFAULT 'phone',
  location        TEXT,
  is_booked       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id         UUID NOT NULL REFERENCES availability_slots(id) ON DELETE CASCADE,
  parent_id       UUID NOT NULL,
  parent_email    TEXT NOT NULL,
  child_id        UUID REFERENCES child_profiles(id) ON DELETE SET NULL,
  child_name      TEXT,
  notes           TEXT,
  status          TEXT DEFAULT 'confirmed',
  booked_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slots_clinician ON availability_slots (clinician_id);
CREATE INDEX IF NOT EXISTS idx_slots_date      ON availability_slots (slot_date);
CREATE INDEX IF NOT EXISTS idx_slots_booked    ON availability_slots (is_booked);
CREATE INDEX IF NOT EXISTS idx_appts_parent    ON appointments (parent_id);
CREATE INDEX IF NOT EXISTS idx_appts_slot      ON appointments (slot_id);

ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments       ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_available_slots" ON availability_slots
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "clinician_manage_slots" ON availability_slots
  FOR ALL USING (auth.uid() = clinician_id);

CREATE POLICY "parent_read_appointments" ON appointments
  FOR SELECT USING (auth.uid() = parent_id);

CREATE POLICY "parent_create_appointments" ON appointments
  FOR INSERT WITH CHECK (auth.uid() = parent_id);

CREATE POLICY "parent_cancel_appointments" ON appointments
  FOR UPDATE USING (auth.uid() = parent_id);

CREATE POLICY "clinician_read_appointments" ON appointments
  FOR SELECT USING (
    slot_id IN (
      SELECT id FROM availability_slots WHERE clinician_id = auth.uid()
    )
  );
