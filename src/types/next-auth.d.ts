import { DefaultSession } from "next-auth"
import { AdapterUser as BaseAdapterUser } from "@auth/core/adapters"

declare module "next-auth" {
    /**
     * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
     */
    interface Session {
        user: {
            id: string
            role: "user" | "admin"
            credits: number
        } & DefaultSession["user"]
    }

    interface User {
        role?: "user" | "admin"
        isVerified?: boolean
        credits?: number
    }
}

declare module "next-auth/jwt" {
    /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
    interface JWT {
        role?: "user" | "admin"
        credits?: number
    }
}

declare module "@auth/core/adapters" {
    interface AdapterUser extends BaseAdapterUser {
        role?: "user" | "admin";
        isVerified?: boolean;
        credits?: number;
    }
}
