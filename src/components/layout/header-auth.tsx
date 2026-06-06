"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthModal } from "@/components/auth/auth-modal";
import { LogOut, User } from "lucide-react";

export function HeaderAuth() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const user = session?.user;

    const handleSignOut = async () => {
        try {
            await signOut({ callbackUrl: "/" });
            toast.success("Вы успешно вышли из аккаунта");
        } catch (error) {
            console.error("Sign out error:", error);
            toast.error("Ошибка при выходе. Попробуйте еще раз.");
        }
    };

    const handleSignInClick = () => {
        // If user is already authenticated, redirect to /app
        if (user) {
            router.push("/app");
        }
        // Otherwise, the modal will open naturally
    };

    if (status === "loading") {
        return (
            <Button variant="ghost" className="relative h-8 w-8 rounded-full" disabled>
                <Avatar className="h-8 w-8">
                    <AvatarFallback>...</AvatarFallback>
                </Avatar>
            </Button>
        );
    }

    if (user) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user.image || ""} alt={user.name || ""} />
                            <AvatarFallback>{user.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                        </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {user.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        {/* FUTURE: Link to profile/settings */}
                        <div className="flex items-center cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    return (
        <AuthModal
            trigger={
                <Button onClick={handleSignInClick}>
                    Sign In
                </Button>
            }
        />
    );
}
