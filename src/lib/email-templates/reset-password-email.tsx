import React from 'react';
import { EmailWrapper } from './EmailWrapper';

interface ResetPasswordEmailProps {
  name: string;
  resetLink: string;
}

export function ResetPasswordEmail({ name, resetLink }: ResetPasswordEmailProps) {
  return (
    <EmailWrapper title="Sva-Rajya — Password Reset Request">
      <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#ffffff', fontWeight: 'normal' }}>
        Reset Your Password
      </h2>
      <p style={{ margin: '0 0 20px 0', fontSize: '16px', lineHeight: '1.6', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
        Hi {name},
      </p>
      <p style={{ margin: '0 0 30px 0', fontSize: '16px', lineHeight: '1.6', color: '#e2e8f0', fontFamily: 'sans-serif' }}>
        We received a request to reset your password. Click the button below to create a new password.
      </p>
      
      <table style={{ width: '100%', marginBottom: '30px' }}>
        <tr>
          <td align="center">
            <a 
              href={resetLink} 
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
              Reset Password
            </a>
          </td>
        </tr>
      </table>

      <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#94a3b8', fontFamily: 'sans-serif', textAlign: 'center' }}>
        This link expires in 1 hour for security.
      </p>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '30px 0' }} />

      <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontFamily: 'sans-serif', textAlign: 'center' }}>
        If you didn't request this, please ignore this email or contact support.
      </p>
    </EmailWrapper>
  );
}
