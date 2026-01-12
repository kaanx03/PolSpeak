import { supabase } from './supabase';

interface DeviceInfo {
  deviceName: string;
  browser: string;
  os: string;
  userAgent: string;
}

function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;

  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  // Detect OS
  let os = 'Unknown';
  if (ua.includes('Win')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Create device name
  const deviceName = `${os} - ${browser}`;

  return {
    deviceName,
    browser,
    os,
    userAgent: ua,
  };
}

export async function trackUserSession(sessionToken: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('No user found for session tracking');
      return;
    }

    const deviceInfo = getDeviceInfo();

    // Check if this session already exists
    const { data: existingSessions } = await supabase
      .from('user_sessions')
      .select('id')
      .eq('session_token', sessionToken)
      .single();

    if (existingSessions) {
      // Update last_active
      await supabase
        .from('user_sessions')
        .update({ last_active: new Date().toISOString() })
        .eq('session_token', sessionToken);
    } else {
      // Insert new session
      await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_token: sessionToken,
          device_name: deviceInfo.deviceName,
          browser: deviceInfo.browser,
          os: deviceInfo.os,
          user_agent: deviceInfo.userAgent,
          is_active: true,
        });
    }
  } catch (error) {
    console.error('Error tracking session:', error);
  }
}

export async function removeUserSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error('Error removing session:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error removing session:', error);
    return false;
  }
}

export async function getUserSessions() {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('last_active', { ascending: false });

    if (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

export async function markSessionInactive(sessionToken: string): Promise<void> {
  try {
    await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('session_token', sessionToken);
  } catch (error) {
    console.error('Error marking session inactive:', error);
  }
}
