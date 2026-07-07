import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import ical, { ICalCalendarMethod } from 'ical-generator';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (token !== process.env.ICAL_SECRET_TOKEN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: events } = await supabase.from('events').select('*').order('start_at');

  const cal = ical({ name: 'WorkOS — Calendrier', method: ICalCalendarMethod.PUBLISH });

  for (const ev of events ?? []) {
    cal.createEvent({
      id: ev.id,
      summary: ev.title,
      start: new Date(ev.start_at),
      end: new Date(ev.end_at),
      location: ev.location ?? undefined,
      description: [
        ev.notes,
        ev.participants?.length ? `Participants: ${ev.participants.join(', ')}` : null,
      ].filter(Boolean).join('\n\n') || undefined,
      categories: [{ name: ev.division }],
    });
  }

  return new NextResponse(cal.toString(), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="workos.ics"',
      'Cache-Control': 'no-cache, no-store',
    },
  });
}
