-- PolSpeak Database Schema
-- Run this SQL in Supabase SQL Editor to set up the full database from scratch.
-- Last updated: 2026-06-10

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE public.groups (
  id                 uuid NOT NULL DEFAULT uuid_generate_v4(),
  name               text NOT NULL,
  level              text NOT NULL,
  color              text NOT NULL,
  description        text,
  recurring_schedule jsonb,
  notes              text,
  created_at         timestamp with time zone DEFAULT now(),
  updated_at         timestamp with time zone DEFAULT now(),
  CONSTRAINT groups_pkey PRIMARY KEY (id)
);

CREATE TABLE public.students (
  id                 uuid NOT NULL DEFAULT uuid_generate_v4(),
  name               text NOT NULL,
  initials           text NOT NULL,
  color              text NOT NULL,
  level              text NOT NULL,
  status             text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'paused'::text])),
  group_id           uuid,
  email              text,
  phone              text,
  parent_name        text,
  parent_email       text,
  parent_phone       text,
  notes              text,
  recurring_schedule jsonb,
  homework           jsonb DEFAULT '[]'::jsonb,
  topics_covered     text[] DEFAULT ARRAY[]::text[],
  custom_topics      text[] DEFAULT ARRAY[]::text[],
  payments           jsonb DEFAULT '[]'::jsonb,
  created_at         timestamp with time zone DEFAULT now(),
  updated_at         timestamp with time zone DEFAULT now(),
  user_id            uuid,
  language           text DEFAULT 'uk'::text,
  payment_notes      text DEFAULT '[]'::text,
  CONSTRAINT students_pkey PRIMARY KEY (id),
  CONSTRAINT students_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id),
  CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.curriculum_topics (
  id          uuid NOT NULL DEFAULT uuid_generate_v4(),
  level       text NOT NULL CHECK (level = ANY (ARRAY['a1'::text, 'a2'::text, 'b1'::text, 'b2'::text, 'c1'::text])),
  category    text NOT NULL,
  title       text NOT NULL,
  description text,
  "order"     integer NOT NULL,
  created_at  timestamp with time zone DEFAULT now(),
  updated_at  timestamp with time zone DEFAULT now(),
  CONSTRAINT curriculum_topics_pkey PRIMARY KEY (id)
);

CREATE TABLE public.lessons (
  id           uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id   uuid,
  group_id     uuid,
  student_name text,
  group_name   text,
  group_color  text,
  title        text NOT NULL,
  notes        text,
  day          integer NOT NULL CHECK (day >= 0 AND day <= 6),
  date         date NOT NULL,
  start_time   text NOT NULL,
  end_time     text NOT NULL,
  duration     integer NOT NULL,
  type         text DEFAULT 'regular'::text CHECK (type = ANY (ARRAY['regular'::text, 'trial'::text, 'makeup'::text])),
  completed    boolean DEFAULT false,
  is_recurring boolean DEFAULT false,
  created_at   timestamp with time zone DEFAULT now(),
  updated_at   timestamp with time zone DEFAULT now(),
  CONSTRAINT lessons_pkey PRIMARY KEY (id),
  CONSTRAINT lessons_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT lessons_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);

CREATE TABLE public.lesson_history (
  id         uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid,
  group_id   uuid,
  lesson_id  uuid,
  date       date NOT NULL,
  topic      text NOT NULL,
  time       text,
  duration   integer NOT NULL,
  notes      text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_history_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_history_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT lesson_history_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id)
);

CREATE TABLE public.lesson_content (
  id                  uuid NOT NULL DEFAULT uuid_generate_v4(),
  level               text NOT NULL CHECK (level = ANY (ARRAY['a1'::text, 'a2'::text, 'b1'::text, 'b2'::text, 'c1'::text, 'c2'::text])),
  title               text NOT NULL,
  status              text DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'published'::text])),
  curriculum_topic_id uuid,
  modules             jsonb DEFAULT '[]'::jsonb,
  last_modified       timestamp with time zone DEFAULT now(),
  created_at          timestamp with time zone DEFAULT now(),
  updated_at          timestamp with time zone DEFAULT now(),
  "order"             integer DEFAULT 0,
  CONSTRAINT lesson_content_pkey PRIMARY KEY (id),
  CONSTRAINT lesson_content_curriculum_topic_id_fkey FOREIGN KEY (curriculum_topic_id) REFERENCES public.curriculum_topics(id)
);

-- library_folders must be created before library_files (FK dependency)
CREATE TABLE public.library_folders (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  name       character varying NOT NULL,
  color      character varying DEFAULT 'bg-blue-500'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT library_folders_pkey PRIMARY KEY (id)
);

CREATE TABLE public.library_files (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  type         text NOT NULL CHECK (type = ANY (ARRAY['pdf'::text, 'image'::text, 'audio'::text, 'video'::text, 'document'::text])),
  category     text,
  size         integer,
  url          text NOT NULL,
  storage_path text,
  is_pinned    boolean DEFAULT false,
  created_at   timestamp with time zone DEFAULT now(),
  updated_at   timestamp with time zone DEFAULT now(),
  folder_id    uuid,
  CONSTRAINT library_files_pkey PRIMARY KEY (id),
  CONSTRAINT library_files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.library_folders(id)
);

CREATE TABLE public.student_homework (
  id                uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL,
  title             text NOT NULL,
  description       text,
  type              text NOT NULL CHECK (type = ANY (ARRAY['file'::text, 'lesson'::text])),
  file_url          text,
  file_name         text,
  file_type         text,
  lesson_content_id uuid,
  due_date          date,
  created_at        timestamp with time zone DEFAULT now(),
  teacher_files     jsonb DEFAULT '[]'::jsonb,
  student_files     jsonb DEFAULT '[]'::jsonb,
  status            text DEFAULT 'pending'::text,
  grade             text,
  submitted_at      timestamp with time zone,
  student_note      text,
  teacher_links     jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT student_homework_pkey PRIMARY KEY (id),
  CONSTRAINT student_homework_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
  CONSTRAINT student_homework_lesson_content_id_fkey FOREIGN KEY (lesson_content_id) REFERENCES public.lesson_content(id)
);

CREATE TABLE public.shared_lessons (
  id                uuid NOT NULL DEFAULT gen_random_uuid(),
  lesson_content_id uuid NOT NULL,
  student_id        uuid NOT NULL,
  shared_at         timestamp with time zone DEFAULT now(),
  CONSTRAINT shared_lessons_pkey PRIMARY KEY (id),
  CONSTRAINT shared_lessons_lesson_content_id_fkey FOREIGN KEY (lesson_content_id) REFERENCES public.lesson_content(id),
  CONSTRAINT shared_lessons_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

CREATE TABLE public.live_sessions (
  id                  uuid NOT NULL DEFAULT gen_random_uuid(),
  lesson_id           text NOT NULL,
  lesson_title        text,
  invited_student_ids text[] NOT NULL DEFAULT '{}'::text[],
  active              boolean DEFAULT true,
  created_at          timestamp with time zone DEFAULT now(),
  CONSTRAINT live_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.messages (
  id         uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  sender     text NOT NULL CHECK (sender = ANY (ARRAY['student'::text, 'teacher'::text])),
  text       text,
  image_url  text,
  audio_url  text,
  read_at    timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

CREATE TABLE public.payment_reminders (
  id           uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id   uuid,
  sent_at      timestamp with time zone DEFAULT now(),
  dismissed_at timestamp with time zone,
  language     text DEFAULT 'uk'::text,
  is_auto      boolean DEFAULT false,
  CONSTRAINT payment_reminders_pkey PRIMARY KEY (id),
  CONSTRAINT payment_reminders_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

CREATE TABLE public.payment_reminder_schedules (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id      uuid UNIQUE,
  day_of_month    integer NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 28),
  language        text DEFAULT 'uk'::text,
  active          boolean DEFAULT true,
  last_sent_month text,
  CONSTRAINT payment_reminder_schedules_pkey PRIMARY KEY (id),
  CONSTRAINT payment_reminder_schedules_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

CREATE TABLE public.app_settings (
  key   text NOT NULL,
  value text NOT NULL,
  CONSTRAINT app_settings_pkey PRIMARY KEY (key)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_students_group_id         ON public.students(group_id);
CREATE INDEX idx_students_status           ON public.students(status);
CREATE INDEX idx_students_user_id          ON public.students(user_id);
CREATE INDEX idx_lessons_student_id        ON public.lessons(student_id);
CREATE INDEX idx_lessons_group_id          ON public.lessons(group_id);
CREATE INDEX idx_lessons_date              ON public.lessons(date);
CREATE INDEX idx_lessons_completed         ON public.lessons(completed);
CREATE INDEX idx_lesson_history_student_id ON public.lesson_history(student_id);
CREATE INDEX idx_lesson_history_group_id   ON public.lesson_history(group_id);
CREATE INDEX idx_lesson_history_date       ON public.lesson_history(date);
CREATE INDEX idx_curriculum_topics_level   ON public.curriculum_topics(level);
CREATE INDEX idx_lesson_content_level      ON public.lesson_content(level);
CREATE INDEX idx_lesson_content_status     ON public.lesson_content(status);
CREATE INDEX idx_library_files_folder_id   ON public.library_files(folder_id);
CREATE INDEX idx_student_homework_student  ON public.student_homework(student_id);
CREATE INDEX idx_shared_lessons_student    ON public.shared_lessons(student_id);
CREATE INDEX idx_messages_student_id       ON public.messages(student_id);
CREATE INDEX idx_payment_reminders_student ON public.payment_reminders(student_id);
CREATE INDEX idx_payment_schedules_student ON public.payment_reminder_schedules(student_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_students_updated_at          BEFORE UPDATE ON public.students          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at            BEFORE UPDATE ON public.groups            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_curriculum_topics_updated_at BEFORE UPDATE ON public.curriculum_topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lessons_updated_at           BEFORE UPDATE ON public.lessons           FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lesson_content_updated_at    BEFORE UPDATE ON public.lesson_content    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_library_files_updated_at     BEFORE UPDATE ON public.library_files     FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_library_folders_updated_at   BEFORE UPDATE ON public.library_folders   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.students                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_topics          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_history             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_content             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_files              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_folders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_homework           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_lessons             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminder_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings               ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access" ON public.students                   FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.groups                     FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.curriculum_topics          FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.lessons                    FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.lesson_history             FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.lesson_content             FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.library_files              FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.library_folders            FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.student_homework           FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.shared_lessons             FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.live_sessions              FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.messages                   FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.payment_reminders          FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.payment_reminder_schedules FOR ALL USING (true);
CREATE POLICY "Enable all access" ON public.app_settings               FOR ALL USING (true);
