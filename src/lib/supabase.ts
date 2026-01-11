import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export interface Student {
  id: string;
  name: string;
  initials: string;
  color: string;
  level: string;
  status: 'active' | 'paused';
  group_id?: string;
  email?: string;
  phone?: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  notes?: string;
  recurring_schedule?: {
    day: number;
    startTime: string;
    endTime: string;
    duration: number;
  };
  homework?: any[];
  topics_covered?: string[];
  custom_topics?: string[];
  payments?: any[];
  created_at?: string;
  updated_at?: string;
}

export interface Group {
  id: string;
  name: string;
  level: string;
  color: string;
  description?: string;
  recurring_schedule?: {
    day: number;
    startTime: string;
    endTime: string;
    duration: number;
  };
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CurriculumTopic {
  id: string;
  level: 'a1' | 'a2' | 'b1' | 'b2' | 'c1';
  category: string;
  title: string;
  description?: string;
  order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Lesson {
  id: string;
  student_id?: string;
  group_id?: string;
  student_name?: string;
  group_name?: string;
  group_color?: string;
  title: string;
  notes?: string;
  day: number;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  type: 'regular' | 'trial' | 'makeup';
  completed: boolean;
  is_recurring: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LessonHistory {
  id: string;
  student_id?: string;
  group_id?: string;
  lesson_id?: string;
  date: string;
  topic: string;
  time?: string;
  duration: number;
  notes?: string;
  created_at?: string;
}

export interface LessonContent {
  id: string;
  level: 'a1' | 'a2' | 'b1' | 'b2' | 'c1';
  title: string;
  status: 'draft' | 'published';
  curriculum_topic_id?: string;
  modules: any[];
  last_modified: string;
  created_at?: string;
  updated_at?: string;
}
