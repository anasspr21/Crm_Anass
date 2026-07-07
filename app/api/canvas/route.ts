import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = request.nextUrl;
  const division = searchParams.get('division');
  let q = supabase.from('canvases').select('id,division,name,thumbnail_url,updated_at,created_at').order('updated_at', { ascending: false });
  if (division) q = q.eq('division', division);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const body = await request.json();
  const { data, error } = await supabase.from('canvases').insert({ ...body, canvas_json: body.canvas_json ?? {} }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const body = await request.json();
  const { id, ...rest } = body;
  const { data, error } = await supabase.from('canvases').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { id } = await request.json();
  const { error } = await supabase.from('canvases').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
