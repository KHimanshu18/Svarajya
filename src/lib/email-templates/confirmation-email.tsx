import React from 'react';
import { EmailWrapper } from './EmailWrapper';

interface ConfirmationEmailProps {
  name: string;
  confirmationLink: string;
}

export function ConfirmationEmail({ name, confirmationLink }: ConfirmationEmailProps) {
  return (
    <EmailWrapper title="Welcome to Sva-Rajya — Confirm Your Kingdom">
      <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#ffffff', fontWeight: 'normal' }}>
        Verify Your Email Address
      </h2>
      <p style={{ margin: '0 0 20px 0', fontSize: '16px', lineHeight: '1.6', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
        Hi {name},
      </p>
      <p style={{ margin: '0 0 30px 0', fontSize: '16px', lineHeight: '1.6', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
        Thank you for creating your financial kingdom. Please confirm your email address to begin governing your Sva-Rajya.
      </p>
      
      <table style={{ width: '100%', marginBottom: '30px' }}>
        <tr>
          <td align="center">
            <a 
              href={confirmationLink} 
              style={{
                backgroundColor: '#fbbf24',
                color: '#000000',
                padding: '14px 32px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontFamily: 'sans-serif',
                fontSize: '16px',
                display: 'inline-block',
                border: '1px solid #f59e0b'
              }}
            >
              Confirm Email
            </a>
          </td>
        </tr>
      </table>

      <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#94a3b8', fontFamily: 'sans-serif', textAlign: 'center' }}>
        This link expires in 24 hours.
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '30px 0' }} />

      <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontFamily: 'sans-serif', textAlign: 'center' }}>
        If you didn't create an account, please ignore this email.
      </p>
    </EmailWrapper>
  );
}
