import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "./db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "database" },
  trustHost: true,
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
})
