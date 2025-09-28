import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import User from "../../../models/Users"; 
import connectDB from "../../../utlis/dbConn"; 
import jwt from "jsonwebtoken";

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt", // use JWT instead of database sessions
  },
  pages: {
    signIn: "/", 
  },
  callbacks: {
    async signIn({ user }) {
      try {
        if (!user?.email) {
          console.error("No email found in user object:", user);
          return false; // must have email to proceed
        }

        await connectDB();
        const existingUser = await User.findOne({ email: user.email });

        if (!existingUser) {
          await User.create({
            email: user.email,
            username: user.name || user.email.split("@")[0],
            freechats: 3,
            paidacc: false,
          });
        }

        return true;
      } catch (err) {
        console.error("Error in signIn callback:", err);
        return false;
      }
    },

    // 🔑 Add JWT callback
    async jwt({ token, user }) {
      // First time JWT callback is run, `user` is available
      if (user) {
        token.id = (user as any).id || user.email;
      }
      return token;
    },

    // 🔑 Add token to session
    // async session({ session, token }) {
    //   if (session.user) {
    //     (session.user as any).id = token.id;
    //   }
    //   // Expose the JWT to the client (so you can send it to backend)
    //   (session as any).accessToken = token;
    //   return session;
    // },

    

async session({ session, token }) {
  if (session.user) {
    (session.user as any).id = token.id;
    (session.user as any).name = token.name; // optional
  }

  // Signed JWT string to send to backend
  (session as any).verifyToken = jwt.sign(
    { id: token.id, email: token.email }, // only essential fields
    process.env.NEXTAUTH_SECRET as string,
    { expiresIn: "7d" }
  );

  // Store minimal token info for frontend reference
  (session as any).accessToken = {
    id: token.id,
    email: token.email,
    name: token.name,
  };

  return session;
}



  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
