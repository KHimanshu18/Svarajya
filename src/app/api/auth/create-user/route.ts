import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/services/userService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email, name } = body as {
      id?: string;
      email?: string;
      name?: string;
    };

    if (!id || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: id and email are required.' },
        { status: 400 }
      );
    }

    const existing = await userService.findById(id);
    if (existing) {
      return NextResponse.json(
        { success: true, message: 'User already exists in Prisma.', data: { id: existing.id, email: existing.email, name: existing.name } },
        { status: 200 }
      );
    }

    const createdUser = await userService.create({
      id,
      email,
      name: name || '',
      profileType: 'INDIVIDUAL_SALARIED',
      authProvider: 'EMAIL',
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.name,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('[CreateUser] Error creating user in Prisma:', error);
    return NextResponse.json(
      { error: 'Unable to create user in Prisma.' },
      { status: 500 }
    );
  }
}
