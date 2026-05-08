import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');

    if (!phone) {
        return NextResponse.json({ exists: false });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { phone: phone },
            select: { id: true }
        });

        return NextResponse.json({ exists: !!user });
    } catch (error) {
        console.error('Error checking phone:', error);
        return NextResponse.json({ exists: false });
    }
}