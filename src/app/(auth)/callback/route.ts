import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const type = requestUrl.searchParams.get('type')
  const error = requestUrl.searchParams.get('error')

  // If token is expired or invalid, redirect to verify-email with expired flag
  if (error === 'link_expired') {
    return NextResponse.redirect(
      new URL('/verify-email?error=link_expired', requestUrl.origin)
    )
  }

  // Password reset flow → preserve the hash fragment (contains access_token)
  if (type === 'recovery') {
    // Preserve the entire hash when redirecting
    const hash = requestUrl.hash || '';
    console.log("Recovery hash:", hash);
    return NextResponse.redirect(new URL('/reset-password' + hash, requestUrl.origin))
  }

  // Email verification / signup confirmation → redirect to login page
  if (type === 'signup' || type === 'email_change') {
    return NextResponse.redirect(new URL('/login?verification_success=true', requestUrl.origin))
  }

  // Default redirect to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}