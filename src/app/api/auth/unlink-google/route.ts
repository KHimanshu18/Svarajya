import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAuth, getAuthContext, AuthLevel } from '@/lib/middleware/auth.middleware';

async function postHandler(request: NextRequest) {
    const authContext = getAuthContext(request);
    if (!authContext) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.user.update({
        where: { id: authContext.userId },
        data: {
            googleLinked: false,
            googleAccessToken: null,
            googleRefreshToken: null,
            googleTokenExpiry: null,
        },
    });

    return NextResponse.json({ success: true });
}

export const POST = withAuth(postHandler, AuthLevel.AUTHENTICATED);
