import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function signOutAndRedirect(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const { origin } = new URL(request.url)

  const forwardedHost = request.headers.get('x-forwarded-host')
  const hostOnly = forwardedHost?.split(':')[0]?.toLowerCase() ?? ''
  const isLocalHost =
    hostOnly === 'localhost' ||
    hostOnly === '127.0.0.1' ||
    hostOnly === '[::1]' ||
    hostOnly.endsWith('.local')

  if (forwardedHost && !isLocalHost) {
    const proto = request.headers.get('x-forwarded-proto') ?? 'https'
    return NextResponse.redirect(`${proto}://${forwardedHost}/`)
  }

  return NextResponse.redirect(`${origin}/`)
}

export async function POST(request: Request) {
  return signOutAndRedirect(request)
}

export async function GET(request: Request) {
  return signOutAndRedirect(request)
}
