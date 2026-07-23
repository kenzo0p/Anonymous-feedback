import { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User.model';
import { ratelimit } from '@/lib/ratelimit';
import { generateUniqueUsername } from '@/lib/generateUsername';

const providers: NextAuthOptions['providers'] = [
  CredentialsProvider({
    id: 'credentials',
    name: 'Credentials',
    credentials: {
      identifier: { label: 'Email or Username', type: 'text' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(
      credentials: Record<string, string> | undefined
    ): Promise<User | null> {
      if (!credentials?.identifier || !credentials?.password) {
        throw new Error('Missing email/username or password');
      }
      // Throttle sign-in attempts per targeted account to blunt credential
      // stuffing / password brute force.
      const { success } = await ratelimit.auth.limit(
        `auth:${credentials.identifier.toLowerCase()}`
      );
      if (!success) {
        throw new Error('Too many attempts. Please try again in a minute.');
      }
      await dbConnect();
      try {
        const user = await UserModel.findOne({
          $or: [
            { email: credentials.identifier },
            { username: credentials.identifier },
          ],
        });
        if (!user) {
          throw new Error('No user found with this email');
        }
        if (!user.password) {
          throw new Error(
            'This account uses social sign-in. Continue with Google or GitHub.'
          );
        }
        if (!user.isVerified) {
          throw new Error('Please verify your account before logging in');
        }
        const isPasswordCorrect = await bcrypt.compare(
          credentials.password,
          user.password
        );
        if (!isPasswordCorrect) {
          throw new Error('Incorrect password');
        }
        return {
          id: user._id?.toString() ?? '',
          _id: user._id?.toString(),
          username: user.username,
          email: user.email,
          isVerified: user.isVerified,
          isAcceptingMessages: user.isAcceptingMessages,
        };
      } catch (err) {
        // Preserve the original error message instead of stringifying
        // the Error object (which produced "Error: Error: ...").
        throw new Error(
          err instanceof Error ? err.message : 'Authentication failed'
        );
      }
    },
  }),
];

// Only enable social providers that are actually configured.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    // On OAuth sign-in, upsert a Candor user keyed by verified email.
    async signIn({ user, account }) {
      if (!account || account.provider === 'credentials') return true;
      const email = user.email;
      if (!email) return false;
      await dbConnect();
      const existing = await UserModel.findOne({ email });
      if (!existing) {
        const username = await generateUniqueUsername(
          email.split('@')[0] || user.name || 'user'
        );
        await UserModel.create({
          email,
          username,
          isVerified: true,
          isAcceptingMessages: true,
        });
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        if (account && account.provider !== 'credentials') {
          // OAuth: hydrate from the DB record created in signIn().
          await dbConnect();
          const dbUser = await UserModel.findOne({ email: user.email });
          if (dbUser) {
            token._id = dbUser._id?.toString();
            token.username = dbUser.username;
            token.isVerified = dbUser.isVerified;
            token.isAcceptingMessages = dbUser.isAcceptingMessages;
            token.email = dbUser.email;
          }
        } else {
          // Credentials: `user` is already our shaped object.
          token._id = user._id?.toString();
          token.isVerified = user.isVerified;
          token.isAcceptingMessages = user.isAcceptingMessages;
          token.username = user.username;
          token.email = user.email;
        }
      }
      // Allow the client to refresh mutable fields (e.g. after a username
      // change) via `useSession().update({ username })`.
      if (trigger === 'update' && session) {
        if (typeof session.username === 'string') {
          token.username = session.username;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user._id = token._id;
        session.user.isVerified = token.isVerified;
        session.user.isAcceptingMessages = token.isAcceptingMessages;
        session.user.username = token.username;
        session.user.email = token.email;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/sign-in',
  },
};
