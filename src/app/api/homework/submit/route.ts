import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  // Verify auth
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { homeworkId, files, existingFiles, note } = await req.json();

    if (!homeworkId) {
      return NextResponse.json({ error: 'homeworkId is required' }, { status: 400 });
    }

    // Verify the homework belongs to this user's student record
    const { data: studentRecord } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!studentRecord) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 403 });
    }

    const { data: hwRecord } = await supabaseAdmin
      .from('student_homework')
      .select('student_id')
      .eq('id', homeworkId)
      .single();

    if (!hwRecord || hwRecord.student_id !== studentRecord.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allFiles = [...(existingFiles || []), ...(files || [])];

    const updatePayload: Record<string, unknown> = {
      student_files: allFiles,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    };
    if (note !== undefined) updatePayload.student_note = note;

    const { data, error } = await supabaseAdmin
      .from('student_homework')
      .update(updatePayload)
      .eq('id', homeworkId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Error submitting homework:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
