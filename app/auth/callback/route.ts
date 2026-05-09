import { NextResponse } from 'next/server'
// The client you created in Step 2
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.user) {
      const user = data.user
      
      // Check if user profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // Create profile if it doesn't exist (No Webhook approach)
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          credits: 300,
        })
      }

      // Never force https:// for localhost — the Next.js dev server is HTTP-only (ERR_SSL_PROTOCOL_ERROR).
      // NODE_VERSION is not a reliable "local dev" signal (often unset); use the host instead.
      const forwardedHost = request.headers.get('x-forwarded-host')
      const hostOnly = forwardedHost?.split(':')[0]?.toLowerCase() ?? ''
      const isLocalHost =
        hostOnly === 'localhost' ||
        hostOnly === '127.0.0.1' ||
        hostOnly === '[::1]' ||
        hostOnly.endsWith('.local')

      if (forwardedHost && !isLocalHost) {
        const proto = request.headers.get('x-forwarded-proto') ?? 'https'
        return NextResponse.redirect(`${proto}://${forwardedHost}${next}`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
