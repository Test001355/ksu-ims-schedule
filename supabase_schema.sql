-- ==========================================
-- KSU IMS Schedule - Supabase Database Schema
-- ==========================================

-- 1. ลบตารางเดิมถ้ามี (เพื่อความชัวร์ตอนรันสคริปต์ซ้ำ)
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

-- 2. สร้างตาราง 'teachers' (อาจารย์)
CREATE TABLE teachers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. สร้างตาราง 'subjects' (วิชา)
CREATE TABLE subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  credit NUMERIC DEFAULT 3,
  theory_hours NUMERIC DEFAULT 2,
  practical_hours NUMERIC DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. สร้างตาราง 'rooms' (ห้องเรียน)
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'บรรยาย', -- 'บรรยาย' หรือ 'ปฏิบัติการ'
  capacity NUMERIC DEFAULT 40,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. สร้างตาราง 'groups' (กลุ่มเรียน)
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  student_count NUMERIC DEFAULT 40,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. สร้างตาราง 'schedules' (ตารางสอน)
CREATE TABLE schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL, -- จันทร์, อังคาร, ...
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. เพิ่มข้อมูลจำลองเริ่มต้น (Mock Data)
INSERT INTO teachers (name, department) VALUES 
('อ.สรายุทธ', 'วิศวกรรมคอมพิวเตอร์'),
('อ.ธนกร', 'วิศวกรรมซอฟต์แวร์'),
('อ.กำธร', 'เทคโนโลยีสารสนเทศ');

INSERT INTO subjects (code, name, credit, theory_hours, practical_hours) VALUES 
('EN813701', 'Software Engineering', 3, 2, 2),
('EN813702', 'Database Systems', 3, 2, 2);

INSERT INTO rooms (name, type, capacity) VALUES 
('ห้องปฏิบัติการคอมพิวเตอร์ 1', 'ปฏิบัติการ', 40),
('EN-304', 'บรรยาย', 50);

INSERT INTO groups (name, student_count) VALUES 
('วศ.บ. 65/1', 35),
('วศ.บ. 65/2', 30);
