export function getEmailWrapperHtml(title: string, contentHtml: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #050b14;
            font-family: 'Georgia', 'Times New Roman', serif;
            -webkit-font-smoothing: antialiased;
          }
          table {
            border-spacing: 0;
            border-collapse: collapse;
          }
          td {
            padding: 0;
          }
          img {
            border: 0;
          }
          a {
            text-decoration: none;
          }
          .wrapper {
            width: 100%;
            table-layout: fixed;
            background-color: #050b14;
            padding-bottom: 60px;
          }
          .webkit {
            max-width: 600px;
            background-color: #0a1628;
            margin: 0 auto;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid rgba(251, 191, 36, 0.2);
          }
          .outer-table {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            border-spacing: 0;
            font-family: 'Georgia', 'Times New Roman', serif;
            color: #ffffff;
          }
          @media screen and (max-width: 600px) {
            .webkit {
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <center class="wrapper" style="width: 100%; table-layout: fixed; background-color: #050b14; padding-bottom: 60px; padding-top: 40px;">
          <div class="webkit" style="max-width: 600px; background-color: #0a1628; margin: 0 auto; border-radius: 12px; border: 1px solid rgba(251, 191, 36, 0.2);">
            <table class="outer-table" style="width: 100%; max-width: 600px; margin: 0 auto; border-spacing: 0; color: #ffffff;">
              
              <!-- Header -->
              <tr>
                <td style="padding: 30px 20px; text-align: center; background-color: #0a1628; border-bottom: 1px solid rgba(251, 191, 36, 0.1);">
                  <h1 style="margin: 0; color: #fbbf24; font-size: 28px; font-weight: normal; letter-spacing: 2px;">
                    <span style="font-size: 32px;">⚖️</span><br />
                    SVA-RAJYA
                  </h1>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  ${contentHtml}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 30px 20px; text-align: center; background-color: #070f1c; border-top: 1px solid rgba(251, 191, 36, 0.1);">
                  <p style="margin: 0 0 10px 0; font-size: 12px; color: #94a3b8; font-family: sans-serif;">
                    Sva-Rajya — Govern your sovereign financial realm.
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #64748b; font-family: sans-serif;">
                    &copy; ${new Date().getFullYear()} Sva-Rajya. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </div>
        </center>
      </body>
    </html>
  `;
}

export function getConfirmationEmailHtml(name: string, confirmationLink: string): string {
  const contentHtml = `
    <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #ffffff; font-weight: normal;">
      Verify Your Email Address
    </h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #e2e8f0; font-family: sans-serif;">
      Hi ${name},
    </p>
    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #e2e8f0; font-family: sans-serif;">
      Thank you for creating your financial kingdom. Please confirm your email address to begin governing your Sva-Rajya.
    </p>
    
    <table style="width: 100%; margin-bottom: 30px;">
      <tr>
        <td align="center">
          <a 
            href="${confirmationLink}" 
            style="background-color: #fbbf24; color: #000000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-family: sans-serif; font-size: 16px; display: inline-block; border: 1px solid #f59e0b;"
          >
            Confirm Email
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; font-family: sans-serif; text-align: center;">
      This link expires in 24 hours.
    </p>

    <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 30px 0;" />

    <p style="margin: 0; font-size: 12px; color: #64748b; font-family: sans-serif; text-align: center;">
      If you didn't create an account, please ignore this email.
    </p>
  `;

  return getEmailWrapperHtml("Welcome to Sva-Rajya — Confirm Your Kingdom", contentHtml);
}

export function getResetPasswordEmailHtml(name: string, resetLink: string): string {
  const contentHtml = `
    <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #ffffff; font-weight: normal;">
      Reset Your Password
    </h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #e2e8f0; font-family: sans-serif;">
      Hi ${name},
    </p>
    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #e2e8f0; font-family: sans-serif;">
      We received a request to reset your password. Click the button below to create a new password.
    </p>
    
    <table style="width: 100%; margin-bottom: 30px;">
      <tr>
        <td align="center">
          <a 
            href="${resetLink}" 
            style="background-color: #fbbf24; color: #000000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-family: sans-serif; font-size: 16px; display: inline-block; border: 1px solid #f59e0b;"
          >
            Reset Password
          </a>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; font-family: sans-serif; text-align: center;">
      This link expires in 1 hour for security.
    </p>

    <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 30px 0;" />

    <p style="margin: 0; font-size: 12px; color: #64748b; font-family: sans-serif; text-align: center;">
      If you didn't request this, please ignore this email or contact support.
    </p>
  `;

  return getEmailWrapperHtml("Sva-Rajya — Password Reset Request", contentHtml);
}

export function getEmergencyOtpEmailHtml(name: string, otpCode: string) {
  const contentHtml = `
    <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #ffffff; font-weight: normal;">
      Emergency Access Verification Code
    </h2>
    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #e2e8f0; font-family: sans-serif;">
      Hi ${name},
    </p>
    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #e2e8f0; font-family: sans-serif;">
      Use the code below to verify the emergency access settings in your Sva-Rajya account. It will expire in 10 minutes.
    </p>

    <table style="width: 100%; margin-bottom: 30px;">
      <tr>
        <td align="center">
          <div style="background: #111827; border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 16px; display: inline-block; padding: 24px 36px; letter-spacing: 0.2em; font-size: 32px; font-weight: bold; color: #fbbf24; font-family: 'Courier New', monospace;">
            ${otpCode}
          </div>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 20px 0; font-size: 14px; color: #94a3b8; font-family: sans-serif; text-align: center;">
      Do not share this code with anyone. If you did not request this verification, contact support immediately.
    </p>

    <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 30px 0;" />

    <p style="margin: 0; font-size: 12px; color: #64748b; font-family: sans-serif; text-align: center;">
      This code is valid for 10 minutes.
    </p>
  `;

  return getEmailWrapperHtml('Sva-Rajya — Emergency Access OTP', contentHtml);
}
