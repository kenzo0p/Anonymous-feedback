import { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/dbConnect';
import UserModel from '@/model/User.model';
import { ratelimit } from '@/lib/ratelimit';

export const authOptions: NextAuthOptions = {
  providers: [
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
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token._id = user._id?.toString(); // Convert ObjectId to string
        token.isVerified = user.isVerified;
        token.isAcceptingMessages = user.isAcceptingMessages;
        token.username = user.username;
        token.email = user.email;
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