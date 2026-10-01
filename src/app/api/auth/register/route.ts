import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import { subscribe } from '@/lib/newsletter/consent';
import { liveNewsletterStore } from '@/lib/newsletter/store';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  // Lower-cased: emails are matched case-insensitively everywhere, so STEPHEN@ can't sit beside stephen@.
  email: z.string().trim().email('Invalid email address').transform((e) => e.toLowerCase()),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  // The form's unticked box, ticked: consent.
  newsletter: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password, newsletter } = result.data;

    // Check if user already exists — use generic message to prevent email enumeration
    const existingUser = await prisma.users.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'If this email is available, your account has been created. Check your email.' },
        { status: 200 }
      );
    }

    // Hash password and create user. Unverified: the password can't sign in until the
    // form's emailed code proves the address (verify with this password keeps it).
    const passwordHash = await hashPassword(password);

    await prisma.users.create({
      data: {
        name,
        email,
        password_hash: passwordHash,
        access_tier: 'FREE',
        updated_at: new Date(),
      },
    });

    // Only for a new account: an existing email gets the same answer and no subscription, so this
    // form can't be used to tell whether an address is registered, or to sign someone else up.
    if (newsletter === true) {
      await subscribe(liveNewsletterStore, email, 'consent', 'signup-web').catch((e) => console.error('Newsletter at registration failed:', e));
    }

    return NextResponse.json(
      { message: 'If this email is available, your account has been created. Check your email.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
