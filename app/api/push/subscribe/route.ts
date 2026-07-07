import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { subscription } = body;
  if (!subscription) return NextResponse.json({ error: 'Missing subscription' }, { status: 400 });

  // Upsert — one subscription per user session
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    subscription,
  }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
