-- PolSpeak Database Schema
-- Run this SQL in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Groups Table (must be created BEFORE students because of foreign key)
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  color TEXT NOT NULL,
  description TEXT,
  recurring_schedule JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students Table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  color TEXT NOT NULL,
  level TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  email TEXT,
  phone TEXT,
  parent_name TEXT,
  parent_email TEXT,
  parent_phone TEXT,
  notes TEXT,
  recurring_schedule JSONB,
  homework JSONB DEFAULT '[]'::jsonb,
  topics_covered TEXT[] DEFAULT ARRAY[]::TEXT[],
  custom_topics TEXT[] DEFAULT ARRAY[]::TEXT[],
  payments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Curriculum Topics Table
CREATE TABLE curriculum_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level TEXT NOT NULL CHECK (level IN ('a1', 'a2', 'b1', 'b2', 'c1')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons (Schedule) Table
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  student_name TEXT,
  group_name TEXT,
  group_color TEXT,
  title TEXT NOT NULL,
  notes TEXT,
  day INTEGER NOT NULL CHECK (day >= 0 AND day <= 6),
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  type TEXT DEFAULT 'regular' CHECK (type IN ('regular', 'trial', 'makeup')),
  completed BOOLEAN DEFAULT FALSE,
  is_recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure either student_id or group_id is set, but not both
  CHECK (
    (student_id IS NOT NULL AND group_id IS NULL) OR
    (student_id IS NULL AND group_id IS NOT NULL)
  )
);

-- Lesson History Table
CREATE TABLE lesson_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  lesson_id UUID,
  date DATE NOT NULL,
  topic TEXT NOT NULL,
  time TEXT,
  duration INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lesson Content Table (for /lessons pages)
CREATE TABLE lesson_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level TEXT NOT NULL CHECK (level IN ('a1', 'a2', 'b1', 'b2', 'c1')),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  curriculum_topic_id UUID REFERENCES curriculum_topics(id) ON DELETE SET NULL,
  modules JSONB DEFAULT '[]'::jsonb,
  last_modified TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_students_group_id ON students(group_id);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_lessons_student_id ON lessons(student_id);
CREATE INDEX idx_lessons_group_id ON lessons(group_id);
CREATE INDEX idx_lessons_date ON lessons(date);
CREATE INDEX idx_lessons_completed ON lessons(completed);
CREATE INDEX idx_lesson_history_student_id ON lesson_history(student_id);
CREATE INDEX idx_lesson_history_group_id ON lesson_history(group_id);
CREATE INDEX idx_lesson_history_date ON lesson_history(date);
CREATE INDEX idx_curriculum_topics_level ON curriculum_topics(level);
CREATE INDEX idx_lesson_content_level ON lesson_content(level);
CREATE INDEX idx_lesson_content_status ON lesson_content(status);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_curriculum_topics_updated_at BEFORE UPDATE ON curriculum_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_content_updated_at BEFORE UPDATE ON lesson_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_content ENABLE ROW LEVEL SECURITY;

-- Public access policies (for now - you can add auth later)
CREATE POLICY "Enable all access for all users" ON students FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON groups FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON curriculum_topics FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON lessons FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON lesson_history FOR ALL USING (true);
CREATE POLICY "Enable all access for all users" ON lesson_content FOR ALL USING (true);
