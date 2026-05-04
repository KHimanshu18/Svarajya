import React from 'react';

interface EmailWrapperProps {
  children: React.ReactNode;
  title: string;
}

export function EmailWrapper({ children, title }: EmailWrapperProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <style dangerouslySetInnerHTML={{ __html: `
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
            border: 1px solid #fbbf2433;
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
        `}} />
      </head>
      <body>
        <center className="wrapper" style={{ width: '100%', tableLayout: 'fixed', backgroundColor: '#050b14', paddingBottom: '60px', paddingTop: '40px' }}>
          <div className="webkit" style={{ maxWidth: '600px', backgroundColor: '#0a1628', margin: '0 auto', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.2)' }}>
            <table className="outer-table" style={{ width: '100%', maxWidth: '600px', margin: '0 auto', borderSpacing: 0, color: '#ffffff' }}>
              
              {/* Header */}
              <tr>
                <td style={{ padding: '30px 20px', textAlign: 'center', backgroundColor: '#0a1628', borderBottom: '1px solid rgba(251, 191, 36, 0.1)' }}>
                  <h1 style={{ margin: 0, color: '#fbbf24', fontSize: '28px', fontWeight: 'normal', letterSpacing: '2px' }}>
                    <span style={{ fontSize: '32px' }}>⚖️</span><br />
                    SVA-RAJYA
                  </h1>
                </td>
              </tr>

              {/* Main Content */}
              <tr>
                <td style={{ padding: '40px 30px' }}>
                  {children}
                </td>
              </tr>

              {/* Footer */}
              <tr>
                <td style={{ padding: '30px 20px', textAlign: 'center', backgroundColor: '#070f1c', borderTop: '1px solid rgba(251, 191, 36, 0.1)' }}>
                  <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#94a3b8', fontFamily: 'sans-serif' }}>
                    Sva-Rajya — Govern your sovereign financial realm.
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontFamily: 'sans-serif' }}>
                    &copy; {new Date().getFullYear()} Sva-Rajya. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </div>
        </center>
      </body>
    </html>
  );
}
