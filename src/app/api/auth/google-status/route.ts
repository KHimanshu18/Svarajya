import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ linked: false }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { googleLinked: true },
    });

    return NextResponse.json({ linked: !!user?.googleLinked });
  } catch (err) {
    return NextResponse.json({ linked: false }, { status: 500 });
  }
}
