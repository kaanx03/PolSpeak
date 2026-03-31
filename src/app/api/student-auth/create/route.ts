import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verifyTeacher(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return false;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return false;
  // Students must not be able to call this endpoint
  if (user.user_metadata?.role === 'student') return false;
  return true;
}

async function createUserWithUniqueEmail(
  baseEmail: string,
  password: string,
  metadata: Record<string, unknown>
): Promise<{ data: { user: { id: string } } | null; email: string; error?: string }> {
  const atIndex = baseEmail.lastIndexOf('@');
  const localPart = baseEmail.slice(0, atIndex);
  const domain = baseEmail.slice(atIndex + 1);

  let email = baseEmail;
  let counter = 2;

  while (counter <= 100) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: metadata,
      email_confirm: true,
    });

    if (!error && data.user) return { data: { user: { id: data.user.id } }, email };

    const isEmailConflict =
      error?.message?.toLowerCase().includes('already registered') ||
      error?.message?.toLowerCase().includes('already been registered') ||
      error?.message?.toLowerCase().includes('already exists') ||
      error?.message?.toLowerCase().includes('duplicate');

    if (isEmailConflict) {
      email = `${localPart}${counter}@${domain}`;
      counter++;
      continue;
    }

    return { data: null, email, error: error?.message || 'Unknown error' };
  }

  return { data: null, email, error: 'Could not find a unique email after 100 attempts' };
}

export async function POST(req: NextRequest) {
  if (!(await verifyTeacher(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { email, password, studentId, studentName } = await req.json();

    if (!email || !password || !studentId) {
      return NextResponse.json(
        { error: 'email, password and studentId are required' },
        { status: 400 }
      );
    }

    const { data, email: finalEmail, error: createError } = await createUserWithUniqueEmail(
      email,
      password,
      {
        role: 'student',
        student_id: studentId,
        name: studentName || '',
      }
    );

    if (createError || !data) {
      return NextResponse.json({ error: createError || 'Failed to create user' }, { status: 400 });
    }

    // Link auth user to student record and update email if it changed
    await supabaseAdmin
      .from('students')
      .update({ user_id: data.user.id, email: finalEmail })
      .eq('id', studentId);

    return NextResponse.json({ success: true, userId: data.user.id, email: finalEmail });
  } catch (err) {
    console.error('Error creating student auth:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await verifyTeacher(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId, email } = await req.json();

    let targetUserId = userId;

    // If no userId provided, look up by email
    if (!targetUserId && email) {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        return NextResponse.json({ error: listError.message }, { status: 400 });
      }
      const found = users.find((u) => u.email === email);
      if (found) {
        targetUserId = found.id;
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting student auth:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
