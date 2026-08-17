// CANONICAL signout endpoint: header and menu forms POST here.
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// rate-limit-exempt: session-scoped idempotent action (signout); it only clears the caller's own cookies.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/', new URL(request.url).origin), { status: 303 })
}
