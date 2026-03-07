import { supabase } from './supabase';

// ========================================
// STUDENTS
// ========================================

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
  homework: Homework[];
  topics_covered: string[];
  custom_topics: string[];
  payments: Payment[];
  created_at?: string;
  updated_at?: string;
}

export interface Homework {
  id: string;
  date: string;
  description: string;
  completed: boolean;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  currency: string;
  type: 'lesson' | 'package' | 'trial';
  status: 'paid' | 'pending' | 'overdue';
  notes?: string;
}

// Fetch all students
export async function fetchStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching students:', error);
    return [];
  }

  return data || [];
}

// Fetch single student by ID
export async function fetchStudentById(id: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching student:', error);
    return null;
  }

  return data;
}

// Create new student
export async function createStudent(student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('students')
    .insert([student])
    .select()
    .single();

  if (error) {
    console.error('Error creating student:', error);
    throw error;
  }

  return data;
}

// Update student
export async function updateStudent(id: string, updates: Partial<Student>) {
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating student:', error);
    throw error;
  }

  return data;
}

// Delete student
export async function deleteStudent(id: string) {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting student:', error);
    throw error;
  }

  return true;
}

// ========================================
// GROUPS
// ========================================

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

// Fetch all groups
export async function fetchGroups() {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching groups:', error);
    return [];
  }

  return data || [];
}

// Fetch single group by ID
export async function fetchGroupById(id: string) {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching group:', error);
    return null;
  }

  return data;
}

// Create new group
export async function createGroup(group: Omit<Group, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('groups')
    .insert([group])
    .select()
    .single();

  if (error) {
    console.error('Error creating group:', error);
    throw error;
  }

  return data;
}

// Update group
export async function updateGroup(id: string, updates: Partial<Group>) {
  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating group:', error);
    throw error;
  }

  return data;
}

// Delete group
export async function deleteGroup(id: string) {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting group:', error);
    throw error;
  }

  return true;
}

// ========================================
// LESSONS (SCHEDULE)
// ========================================

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

// Fetch all lessons
export async function fetchLessons() {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching lessons:', error);
    return [];
  }

  return data || [];
}

// Fetch single lesson by ID
export async function fetchLessonById(id: string) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching lesson:', error);
    return null;
  }

  return data;
}

// Create new lesson
export async function createLesson(lesson: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('lessons')
    .insert([lesson])
    .select()
    .single();

  if (error) {
    console.error('Error creating lesson:', error);
    throw error;
  }

  return data;
}

// Update lesson
export async function updateLesson(id: string, updates: Partial<Lesson>) {
  const { data, error } = await supabase
    .from('lessons')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating lesson:', error);
    throw error;
  }

  return data;
}

// Delete lesson (also removes related lesson history entries)
export async function deleteLesson(id: string) {
  // First, delete any related lesson history entries
  const { error: historyError } = await supabase
    .from('lesson_history')
    .delete()
    .eq('lesson_id', id);

  if (historyError) {
    console.error('Error deleting lesson history:', historyError);
    // Continue with lesson deletion even if history deletion fails
  }

  // Then delete the lesson itself
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting lesson:', error);
    throw error;
  }

  return true;
}

// ========================================
// LESSON HISTORY
// ========================================

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

// Fetch lesson history for a student
export async function fetchStudentLessonHistory(studentId: string) {
  const { data, error } = await supabase
    .from('lesson_history')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching lesson history:', error);
    return [];
  }

  return data || [];
}

// Fetch ALL lesson history in one query (prevents N+1 problem)
export async function fetchAllLessonHistory() {
  const { data, error } = await supabase
    .from('lesson_history')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching all lesson history:', error);
    return [];
  }

  return data || [];
}

// Fetch lesson history for a group
export async function fetchGroupLessonHistory(groupId: string) {
  const { data, error } = await supabase
    .from('lesson_history')
    .select('*')
    .eq('group_id', groupId)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching group lesson history:', error);
    return [];
  }

  return data || [];
}

// Create lesson history entry
export async function createLessonHistory(history: Omit<LessonHistory, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('lesson_history')
    .insert([history])
    .select()
    .single();

  if (error) {
    console.error('Error creating lesson history:', error);
    throw error;
  }

  return data;
}

// Delete lesson history entries by lesson_id
export async function deleteLessonHistoryByLessonId(lessonId: string) {
  const { error } = await supabase
    .from('lesson_history')
    .delete()
    .eq('lesson_id', lessonId);

  if (error) {
    console.error('Error deleting lesson history:', error);
    throw error;
  }

  return true;
}

// ========================================
// CURRICULUM TOPICS
// ========================================

export interface CurriculumTopic {
  id: string;
  level: 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2';
  category: string;
  title: string;
  description: string;
  order: number;
  created_at?: string;
  updated_at?: string;
}

// Fetch all curriculum topics
export async function fetchCurriculumTopics() {
  const { data, error } = await supabase
    .from('curriculum_topics')
    .select('*')
    .order('level', { ascending: true })
    .order('order', { ascending: true });

  if (error) {
    console.error('Error fetching curriculum topics:', error);
    return [];
  }

  return data || [];
}

// Fetch single curriculum topic by ID
export async function fetchCurriculumTopicById(id: string) {
  const { data, error } = await supabase
    .from('curriculum_topics')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching curriculum topic:', error);
    return null;
  }

  return data;
}

// Create new curriculum topic
export async function createCurriculumTopic(topic: Omit<CurriculumTopic, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('curriculum_topics')
    .insert([topic])
    .select()
    .single();

  if (error) {
    console.error('Error creating curriculum topic:', error);
    throw error;
  }

  return data;
}

// Update curriculum topic
export async function updateCurriculumTopic(id: string, updates: Partial<CurriculumTopic>) {
  const { data, error } = await supabase
    .from('curriculum_topics')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating curriculum topic:', error);
    throw error;
  }

  return data;
}

// Delete curriculum topic
export async function deleteCurriculumTopic(id: string) {
  const { error } = await supabase
    .from('curriculum_topics')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting curriculum topic:', error);
    throw error;
  }

  return true;
}

// ========================================
// LESSON CONTENT
// ========================================

export interface LessonContent {
  id: string;
  level: 'a1' | 'a2' | 'b1' | 'b2' | 'c1' | 'c2';
  title: string;
  status: 'draft' | 'published';
  curriculum_topic_id?: string;
  modules: any[];
  order?: number;
  last_modified?: string;
  created_at?: string;
  updated_at?: string;
}

// Fetch all lesson content
export async function fetchLessonContent() {
  const { data, error } = await supabase
    .from('lesson_content')
    .select('*')
    .order('level', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching lesson content:', error);
    return [];
  }

  return data || [];
}

// Fetch lesson content by level
export async function fetchLessonContentByLevel(level: string) {
  const { data, error } = await supabase
    .from('lesson_content')
    .select('*')
    .eq('level', level.toLowerCase())
    .order('order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching lesson content by level:', error);
    return [];
  }

  return data || [];
}

// Fetch single lesson content by ID
export async function fetchLessonContentById(id: string) {
  const { data, error } = await supabase
    .from('lesson_content')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching lesson content:', error);
    return null;
  }

  return data;
}

// Create new lesson content
export async function createLessonContent(lesson: Omit<LessonContent, 'id' | 'created_at' | 'updated_at' | 'last_modified'>) {
  const { data, error } = await supabase
    .from('lesson_content')
    .insert([{ ...lesson, last_modified: new Date().toISOString() }])
    .select()
    .single();

  if (error) {
    console.error('Error creating lesson content:', error);
    throw error;
  }

  return data;
}

// Update lesson content
export async function updateLessonContent(id: string, updates: Partial<LessonContent>) {
  const { data, error } = await supabase
    .from('lesson_content')
    .update({ ...updates, last_modified: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating lesson content:', error);
    throw error;
  }

  return data;
}

// Update lesson order (bulk update for drag-and-drop reordering)
export async function updateLessonsOrder(lessons: { id: string; order: number }[]) {
  const updates = lessons.map(lesson =>
    supabase
      .from('lesson_content')
      .update({ order: lesson.order })
      .eq('id', lesson.id)
  );

  const results = await Promise.all(updates);

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.error('Error updating lesson orders:', errors);
    throw new Error('Failed to update lesson order');
  }

  return true;
}

// Helper function to extract storage paths from R2 URLs
function extractStoragePathsFromModules(modules: any[]): string[] {
  const storagePaths: string[] = [];
  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://files.nastyknowledge.online';

  for (const module of modules) {
    if (!module.content) continue;

    // Check various content fields that might contain file URLs
    const urlFields = ['imageUrl', 'pdfUrl', 'audioUrl', 'videoUrl', 'url'];

    for (const field of urlFields) {
      const url = module.content[field];
      if (url && typeof url === 'string' && url.includes('files.nastyknowledge.online')) {
        // Extract storage path from URL: https://files.nastyknowledge.online/uploads/xxx -> uploads/xxx
        const storagePath = url.replace(`${r2PublicUrl}/`, '');
        if (storagePath && storagePath !== url) {
          storagePaths.push(storagePath);
        }
      }
    }

    // Check for audio items array
    if (module.content.audioItems && Array.isArray(module.content.audioItems)) {
      for (const item of module.content.audioItems) {
        if (item.audioUrl && item.audioUrl.includes('files.nastyknowledge.online')) {
          const storagePath = item.audioUrl.replace(`${r2PublicUrl}/`, '');
          if (storagePath && storagePath !== item.audioUrl) {
            storagePaths.push(storagePath);
          }
        }
      }
    }

    // Check storagePath field directly
    if (module.content.storagePath) {
      storagePaths.push(module.content.storagePath);
    }
  }

  return storagePaths;
}

// Delete lesson content (also deletes all associated files from storage)
export async function deleteLessonContent(id: string, level: string) {
  try {
    // First, get the lesson to know what files to delete
    const { data: lessonData } = await supabase
      .from('lesson_content')
      .select('*')
      .eq('id', id)
      .single();

    // Delete all files from R2 storage
    if (lessonData && lessonData.modules) {
      try {
        const storagePaths = extractStoragePathsFromModules(lessonData.modules);

        // Delete each file from R2
        for (const storagePath of storagePaths) {
          try {
            await deleteFile(storagePath);
            console.log(`Deleted file from R2: ${storagePath}`);
          } catch (err) {
            console.error(`Error deleting file ${storagePath} from R2:`, err);
            // Continue with other files even if one fails
          }
        }

        if (storagePaths.length > 0) {
          console.log(`Deleted ${storagePaths.length} files from R2 storage for lesson ${id}`);
        }
      } catch (storageError) {
        console.error('Error deleting lesson files from R2:', storageError);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('lesson_content')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting lesson content:', error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteLessonContent:', error);
    throw error;
  }
}

// ========================================
// STORAGE (File Upload/Download)
// ========================================

const STORAGE_BUCKET = 'lesson-files';

// Sanitize filename for Supabase Storage (remove special characters, spaces, etc.)
function sanitizeFileName(fileName: string): string {
  // Get file extension
  const lastDotIndex = fileName.lastIndexOf('.');
  const extension = lastDotIndex > 0 ? fileName.slice(lastDotIndex) : '';
  const nameWithoutExt = lastDotIndex > 0 ? fileName.slice(0, lastDotIndex) : fileName;

  // Replace special characters and spaces with safe alternatives
  const sanitized = nameWithoutExt
    // Replace Polish and other special characters with ASCII equivalents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ź/g, 'z')
    .replace(/ż/g, 'z')
    .replace(/Ą/g, 'A')
    .replace(/Ć/g, 'C')
    .replace(/Ę/g, 'E')
    .replace(/Ń/g, 'N')
    .replace(/Ó/g, 'O')
    .replace(/Ś/g, 'S')
    .replace(/Ź/g, 'Z')
    .replace(/Ż/g, 'Z')
    // Replace spaces with underscores
    .replace(/\s+/g, '_')
    // Remove any remaining non-alphanumeric characters except underscores and hyphens
    .replace(/[^a-zA-Z0-9_-]/g, '')
    // Collapse multiple underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '');

  return sanitized + extension.toLowerCase();
}

// Upload file to Cloudflare R2
export async function uploadFile(file: File, folder?: string): Promise<{ url: string; name: string; storagePath: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder || "uploads");

    const response = await fetch("/api/upload", {
      method: "POST",
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();

    return {
      url: data.url,
      name: file.name,
      storagePath: data.storagePath,
    };
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

// Delete file from Cloudflare R2
export async function deleteFile(storagePath: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch("/api/upload", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ storagePath }),
    });

    if (!response.ok) {
      throw new Error("Delete failed");
    }

    return true;
  } catch (error) {
    console.error('Delete failed:', error);
    throw error;
  }
}

// Extract file path from Storage URL (supports both Supabase and R2)
export function getFilePathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Check if it's an R2 URL (files.nastyknowledge.online)
    if (urlObj.hostname === 'files.nastyknowledge.online') {
      // R2 URL: https://files.nastyknowledge.online/lessons/a1/xxx/file.mp3
      // Return path without leading slash
      return urlObj.pathname.slice(1) || null;
    }

    // Supabase URL: extract path after bucket name
    const pathParts = urlObj.pathname.split(`/${STORAGE_BUCKET}/`);
    return pathParts[1] || null;
  } catch {
    return null;
  }
}

// ========================================
// LIBRARY FILES
// ========================================

export interface LibraryFile {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'audio' | 'video' | 'document';
  category: string;
  size: number;
  url: string;
  storage_path?: string;
  is_pinned: boolean;
  folder_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

// LIBRARY FOLDERS
// ========================================

export interface LibraryFolder {
  id: string;
  name: string;
  color: string;
  created_at?: string;
  updated_at?: string;
}

// Fetch all library folders
export async function fetchLibraryFolders(): Promise<LibraryFolder[]> {
  const { data, error } = await supabase
    .from('library_folders')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching library folders:', error);
    return [];
  }

  return data || [];
}

// Create library folder
export async function createLibraryFolder(folder: { name: string; color: string }): Promise<LibraryFolder> {
  const { data, error } = await supabase
    .from('library_folders')
    .insert([folder])
    .select()
    .single();

  if (error) {
    console.error('Error creating library folder:', error);
    throw error;
  }

  return data;
}

// Update library folder
export async function updateLibraryFolder(id: string, updates: Partial<LibraryFolder>): Promise<LibraryFolder> {
  const { data, error } = await supabase
    .from('library_folders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating library folder:', error);
    throw error;
  }

  return data;
}

// Delete library folder
export async function deleteLibraryFolder(id: string): Promise<boolean> {
  // First, remove folder_id from all files in this folder
  await supabase
    .from('library_files')
    .update({ folder_id: null })
    .eq('folder_id', id);

  const { error } = await supabase
    .from('library_folders')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting library folder:', error);
    throw error;
  }

  return true;
}

// Move file to folder
export async function moveFileToFolder(fileId: string, folderId: string | null): Promise<void> {
  const { error } = await supabase
    .from('library_files')
    .update({ folder_id: folderId })
    .eq('id', fileId);

  if (error) {
    console.error('Error moving file to folder:', error);
    throw error;
  }
}

// Fetch all library files
export async function fetchLibraryFiles() {
  const { data, error } = await supabase
    .from('library_files')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching library files:', error);
    return [];
  }

  return data || [];
}

// Create library file entry
export async function createLibraryFile(file: Omit<LibraryFile, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('library_files')
    .insert([file])
    .select()
    .single();

  if (error) {
    console.error('Error creating library file:', error);
    throw error;
  }

  return data;
}

// Update library file
export async function updateLibraryFile(id: string, updates: Partial<LibraryFile>) {
  const { data, error } = await supabase
    .from('library_files')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating library file:', error);
    throw error;
  }

  return data;
}

// Delete library file (also deletes from storage)
export async function deleteLibraryFile(id: string) {
  // First get the file to get storage_path
  const { data: fileData } = await supabase
    .from('library_files')
    .select('storage_path')
    .eq('id', id)
    .single();

  // Delete from storage if storage_path exists
  if (fileData?.storage_path) {
    try {
      await deleteFile(fileData.storage_path);
    } catch (err) {
      console.error('Error deleting file from storage:', err);
    }
  }

  // Delete from database
  const { error } = await supabase
    .from('library_files')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting library file:', error);
    throw error;
  }

  return true;
}

// Toggle pin status
export async function toggleLibraryFilePin(id: string, isPinned: boolean) {
  const { data, error } = await supabase
    .from('library_files')
    .update({ is_pinned: isPinned })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error toggling pin:', error);
    throw error;
  }

  return data;
}

// ========================================
// STUDENT HOMEWORK
// ========================================

export interface HomeworkFile {
  url: string;
  name: string;
  type: string;
  storagePath?: string;
}

export interface StudentHomework {
  id: string;
  student_id: string;
  title: string;
  description?: string;
  type: 'file' | 'lesson';
  // Legacy single-file fields (kept for backward compat)
  file_url?: string;
  file_name?: string;
  file_type?: string;
  // Multi-file fields
  teacher_files?: HomeworkFile[];
  student_files?: HomeworkFile[];
  student_note?: string;
  status?: 'pending' | 'submitted' | 'graded';
  grade?: string;
  submitted_at?: string;
  lesson_content_id?: string;
  due_date?: string;
  created_at?: string;
}

// Fetch all homework for a specific student (used in student panel)
export async function fetchStudentHomework(studentId: string): Promise<StudentHomework[]> {
  const { data, error } = await supabase
    .from('student_homework')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching student homework:', error);
    return [];
  }

  return data || [];
}

// Fetch all homework (teacher view - all students)
export async function fetchAllStudentHomework(): Promise<StudentHomework[]> {
  const { data, error } = await supabase
    .from('student_homework')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all homework:', error);
    return [];
  }

  return data || [];
}

// Create homework assignment
export async function createStudentHomework(
  hw: Omit<StudentHomework, 'id' | 'created_at'>
): Promise<StudentHomework> {
  const { data, error } = await supabase
    .from('student_homework')
    .insert([hw])
    .select()
    .single();

  if (error) {
    console.error('Error creating homework:', error);
    throw error;
  }

  return data;
}

// Update homework assignment
export async function updateStudentHomework(
  id: string,
  updates: Partial<Omit<StudentHomework, 'id' | 'created_at'>>
): Promise<StudentHomework> {
  const { data, error } = await supabase
    .from('student_homework')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating homework:', error);
    throw error;
  }

  return data;
}

// Submit homework (student submits files)
export async function submitHomework(id: string, files: HomeworkFile[]): Promise<StudentHomework> {
  const { data, error } = await supabase
    .from('student_homework')
    .update({
      student_files: files,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error submitting homework:', error);
    throw error;
  }

  return data;
}

// Grade homework (teacher grades)
export async function gradeHomework(id: string, grade: string): Promise<StudentHomework> {
  const { data, error } = await supabase
    .from('student_homework')
    .update({ grade, status: 'graded' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error grading homework:', error);
    throw error;
  }

  return data;
}

// Delete homework assignment
export async function deleteStudentHomework(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('student_homework')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting homework:', error);
    throw error;
  }

  return true;
}

// ========================================
// SHARED LESSONS
// ========================================

export interface SharedLesson {
  id: string;
  lesson_content_id: string;
  student_id: string;
  shared_at?: string;
}

// Fetch shared lessons for a student
export async function fetchSharedLessonsForStudent(studentId: string): Promise<SharedLesson[]> {
  const { data, error } = await supabase
    .from('shared_lessons')
    .select('*')
    .eq('student_id', studentId)
    .order('shared_at', { ascending: false });

  if (error) {
    console.error('Error fetching shared lessons:', error);
    return [];
  }

  return data || [];
}

// Fetch which students a lesson is shared with
export async function fetchStudentsForSharedLesson(lessonContentId: string): Promise<SharedLesson[]> {
  const { data, error } = await supabase
    .from('shared_lessons')
    .select('*')
    .eq('lesson_content_id', lessonContentId);

  if (error) {
    console.error('Error fetching shared lesson students:', error);
    return [];
  }

  return data || [];
}

// Share a lesson with a student
export async function shareLesson(lessonContentId: string, studentId: string): Promise<SharedLesson> {
  const { data, error } = await supabase
    .from('shared_lessons')
    .upsert(
      { lesson_content_id: lessonContentId, student_id: studentId },
      { onConflict: 'lesson_content_id,student_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Error sharing lesson:', error);
    throw error;
  }

  return data;
}

// Remove lesson share from a student
export async function unshareLesson(lessonContentId: string, studentId: string): Promise<boolean> {
  const { error } = await supabase
    .from('shared_lessons')
    .delete()
    .eq('lesson_content_id', lessonContentId)
    .eq('student_id', studentId);

  if (error) {
    console.error('Error unsharing lesson:', error);
    throw error;
  }

  return true;
}

// Fetch student by their auth user_id
export async function fetchStudentByUserId(userId: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching student by user_id:', error);
    return null;
  }

  return data;
}
