/**
 * Custom Prisma Adapter for NextAuth that handles Int IDs
 *
 * The default PrismaAdapter expects String IDs (UUID/CUID), but this project
 * uses Int IDs with autoincrement. This adapter wraps Prisma calls to convert
 * between String (NextAuth) and Int (Prisma) ID types.
 */

import type { Adapter, AdapterAccount, AdapterUser, AdapterSession, VerificationToken } from 'next-auth/adapters';
import type { PrismaClient } from '@prisma/client';

type CreateUserData = {
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
};

type UpdateUserData = {
  id: string;
  email?: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
};

type LinkAccountData = {
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token?: string | null;
  access_token?: string | null;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  session_state?: string | null;
};

type CreateSessionData = {
  userId: string;
  sessionToken: string;
  expires: Date;
};

type UpdateSessionData = {
  sessionToken: string;
  expires?: Date;
};

type CreateVerificationTokenData = {
  identifier: string;
  token: string;
  expires: Date;
};

export function PrismaAdapterWithIntIds(prisma: PrismaClient): Adapter {
  return {
    async createUser(data: CreateUserData): Promise<AdapterUser> {
      const user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name,
          image: data.image,
          emailVerified: data.emailVerified,
        },
      });
      return {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
        accessTier: user.accessTier,
      } as AdapterUser;
    },

    async getUser(id: string): Promise<AdapterUser | null> {
      const userId = parseInt(id, 10);
      if (isNaN(userId)) return null;

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) return null;

      return {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
        accessTier: user.accessTier,
      } as AdapterUser;
    },

    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      const user = await prisma.user.findUnique({
        where: { email },
      });
      if (!user) return null;

      return {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
        accessTier: user.accessTier,
      } as AdapterUser;
    },

    async getUserByAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }): Promise<AdapterUser | null> {
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
        include: { user: true },
      });
      if (!account?.user) return null;

      return {
        id: account.user.id.toString(),
        email: account.user.email,
        name: account.user.name,
        image: account.user.image,
        emailVerified: account.user.emailVerified,
        accessTier: account.user.accessTier,
      } as AdapterUser;
    },

    async updateUser(data: UpdateUserData): Promise<AdapterUser> {
      const userId = parseInt(data.id, 10);
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          email: data.email,
          image: data.image,
          emailVerified: data.emailVerified,
        },
      });

      return {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
        accessTier: user.accessTier,
      } as AdapterUser;
    },

    async deleteUser(id: string): Promise<void> {
      const userId = parseInt(id, 10);
      await prisma.user.delete({
        where: { id: userId },
      });
    },

    async linkAccount(data: LinkAccountData): Promise<AdapterAccount> {
      const userId = parseInt(data.userId, 10);
      await prisma.account.create({
        data: {
          userId,
          type: data.type,
          provider: data.provider,
          providerAccountId: data.providerAccountId,
          refresh_token: data.refresh_token,
          access_token: data.access_token,
          expires_at: data.expires_at,
          token_type: data.token_type,
          scope: data.scope,
          id_token: data.id_token,
          session_state: data.session_state,
        },
      });
      return data as AdapterAccount;
    },

    async unlinkAccount({ provider, providerAccountId }: { provider: string; providerAccountId: string }): Promise<void> {
      await prisma.account.delete({
        where: {
          provider_providerAccountId: {
            provider,
            providerAccountId,
          },
        },
      });
    },

    async createSession(data: CreateSessionData): Promise<AdapterSession> {
      const userId = parseInt(data.userId, 10);
      const session = await prisma.session.create({
        data: {
          userId,
          sessionToken: data.sessionToken,
          expires: data.expires,
        },
      });

      return {
        id: session.id.toString(),
        userId: session.userId.toString(),
        sessionToken: session.sessionToken,
        expires: session.expires,
      } as AdapterSession;
    },

    async getSessionAndUser(sessionToken: string): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      const session = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });
      if (!session) return null;

      return {
        session: {
          id: session.id.toString(),
          userId: session.userId.toString(),
          sessionToken: session.sessionToken,
          expires: session.expires,
        } as AdapterSession,
        user: {
          id: session.user.id.toString(),
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
          emailVerified: session.user.emailVerified,
          accessTier: session.user.accessTier,
        } as AdapterUser,
      };
    },

    async updateSession(data: UpdateSessionData): Promise<AdapterSession | null> {
      const session = await prisma.session.update({
        where: { sessionToken: data.sessionToken },
        data: {
          expires: data.expires,
        },
      });

      return {
        id: session.id.toString(),
        userId: session.userId.toString(),
        sessionToken: session.sessionToken,
        expires: session.expires,
      } as AdapterSession;
    },

    async deleteSession(sessionToken: string): Promise<void> {
      await prisma.session.delete({
        where: { sessionToken },
      });
    },

    async createVerificationToken(data: CreateVerificationTokenData): Promise<VerificationToken> {
      const token = await prisma.verificationToken.create({
        data: {
          identifier: data.identifier,
          token: data.token,
          expires: data.expires,
        },
      });
      return token;
    },

    async useVerificationToken({ identifier, token }: { identifier: string; token: string }): Promise<VerificationToken | null> {
      try {
        const verificationToken = await prisma.verificationToken.delete({
          where: {
            identifier_token: {
              identifier,
              token,
            },
          },
        });
        return verificationToken;
      } catch {
        return null;
      }
    },
  };
}
