import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getEmailWrapperHtml } from '@/lib/email-templates/html-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const subject = 'Welcome to Svarajya – Your Kingdom Awaits';
    const body = `<p>Hello ${name ? name : 'there'},</p><p>Your Svarajya account has been successfully created. You are now ready to secure your financial legacy.</p>`;
    const html = getEmailWrapperHtml(subject, body);

    const { data, error } = await resend.emails.send({
      from: 'Sva-Rajya <noreply@update.svarajya.com>',
      to: email,
      subject,
      html,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
