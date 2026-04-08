import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  "mailto:admin@nastyknowledge.online",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  const { targetUserType, studentId, title, body, url } = await req.json();

  // Fetch matching subscriptions
  let query = supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_type", targetUserType);

  if (targetUserType === "student" && studentId) {
    query = query.eq("student_id", studentId);
  }

  const { data: subs, error } = await query;
  if (error || !subs?.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const payload = JSON.stringify({ title, body, url: url || "/" });

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        );
      } catch (err: any) {
        // Subscription expired — delete it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    })
  );

  return NextResponse.json({ ok: true, sent: subs.length });
}
