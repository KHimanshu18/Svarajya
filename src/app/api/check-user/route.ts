import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ exists: false, error: 'Email required' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        authProvider: true,
      },
    });

    return NextResponse.json({ exists: !!user, provider: user?.authProvider ?? null });
  } catch (error) {
    console.error('[CheckUser API] Error:', error);
    return NextResponse.json({ exists: false, error: 'Internal server error' }, { status: 500 });
  }
}
