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

    // Create auth user with student role
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        role: 'student',
        student_id: studentId,
        name: studentName || '',
      },
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Link auth user to student record
    await supabaseAdmin
      .from('students')
      .update({ user_id: data.user.id })
      .eq('id', studentId);

    return NextResponse.json({ success: true, userId: data.user.id, email });
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
