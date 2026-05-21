import React from 'react';

export default function Page({ searchParams }: { searchParams?: { link?: string } }) {
  const encoded = searchParams?.link;
  let actionLink: string | null = null;

  try {
    if (encoded) {
      actionLink = Buffer.from(encoded, 'base64').toString('utf-8');
    }
  } catch (e) {
    actionLink = null;
  }

  const primaryHref = actionLink || '/login';
  const primaryLabel = actionLink ? 'Go to Rajya' : 'Proceed to Login';

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: 24 }}>
        <h1>Account created successfully!</h1>
        <p>Your Google sign-in completed. Click below to continue.</p>
        <div style={{ marginTop: 20 }}>
          <a href={primaryHref} style={{ background: '#fbbf24', color: '#000', padding: '12px 20px', borderRadius: 8, fontWeight: 700, textDecoration: 'none', border: '1px solid #f59e0b' }}>
            {primaryLabel}
          </a>
        </div>
        {actionLink && (
          <div style={{ marginTop: 12 }}>
            <a href="/login" style={{ color: '#94a3b8', textDecoration: 'underline' }}>Proceed to Login</a>
          </div>
        )}
      </div>
    </div>
  );
}
