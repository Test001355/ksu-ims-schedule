-- Update subjects table to support Section and Instructors
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES groups(id) ON DELETE SET NULL;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS instructor_ids UUID[] DEFAULT '{}';
