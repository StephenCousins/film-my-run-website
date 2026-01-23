import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db';
import { PrismaAdapterWithIntIds } from './prisma-adapter-int';

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      accessTier: 'FREE' | 'PREMIUM' | 'PRO';
    };
  }

  interface User {
    accessTier: 'FREE' | 'PREMIUM' | 'PRO';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    accessTier: 'FREE' | 'PREMIUM' | 'PRO';
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapterWithIntIds(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter your email and password');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          throw new Error('No account found with this email');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error('Incorrect password');
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          accessTier: user.accessTier,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    newUser: '/register',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.accessTier = user.accessTier || 'FREE';
      }

      // For OAuth users, fetch the access tier from DB
      if (account?.provider === 'google' && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, accessTier: true },
        });
        if (dbUser) {
          token.id = dbUser.id.toString();
          token.accessTier = dbUser.accessTier;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.accessTier = token.accessTier;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // New users get FREE tier by default
      // This is handled by the Prisma schema default
      console.log('New user created:', user.email);
    },
  },
};

// Helper function to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Helper function to check access tier
export function hasAccess(
  userTier: 'FREE' | 'PREMIUM' | 'PRO' | undefined,
  requiredTier: 'FREE' | 'PREMIUM' | 'PRO'
): boolean {
  if (!userTier) return false;

  const tierHierarchy = {
    FREE: 1,
    PREMIUM: 2,
    PRO: 3,
  };

  return tierHierarchy[userTier] >= tierHierarchy[requiredTier];
}
