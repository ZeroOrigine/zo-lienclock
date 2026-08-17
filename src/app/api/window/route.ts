import { NextResponse } from 'next/server';

// #196 THE BIRTH WINDOW feed. One endpoint (the pipeline's /window/status)
// feeds both the machine's decision and this display; the site NEVER computes
// a condition itself (the /status-vs-/costs drift lesson). Fail-soft: if the
// pipeline is unreachable, every row renders UNREADABLE amber, never green.
export const revalidate = 60;

const WINDOW_URL = 'https://zo-langgraph-production-3c96.up.railway.app/window/status';

const UNREADABLE_PAYLOAD = {
  state: 'counting',
  next_window_at: null,
  enabled: false,
  conditions: ['treasury', 'gates', 'line_clear', 'idea', 'pulse'].map((n) => ({
    name: n, value: null, threshold: null, pass: false, unreadable: true,
  })),
  last_window: null,
  in_flight: [],
  stats: {},
  unreachable: true,
};

export async function GET() {
  try {
    const r = await fetch(WINDOW_URL, { next: { revalidate: 60 } });
    if (!r.ok) throw new Error(`window status ${r.status}`);
    const data = await r.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  } catch {
    return NextResponse.json(UNREADABLE_PAYLOAD, {
      headers: { 'Cache-Control': 'public, max-age=30' },
    });
  }
}
