"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateUserNameAction } from "@/app/actions/auth";

interface NameModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const nameSchema = z.object({
    name: z.string().min(2, "Имя должно быть не менее 2 символов").max(50, "Имя слишком длинное"),
});

type NameInput = z.infer<typeof nameSchema>;

export function NameModal({ open, onOpenChange }: NameModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { update } = useSession();

    const form = useForm<NameInput>({
        resolver: zodResolver(nameSchema),
        defaultValues: { name: "" },
    });

    async function onSubmit(data: NameInput) {
        setIsLoading(true);
        try {
            const result = await updateUserNameAction(data.name);
            if (result?.error) {
                toast.error(result.error);
                return;
            }

            // Update session with new name
            await update({
                user: {
                    name: data.name,
                },
            });

            toast.success("Профиль обновлен!");
            onOpenChange(false);
            router.refresh();
        } catch {
            toast.error("Что-то пошло не так");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px] p-0 bg-slate-900 border-slate-800">
                <div className="px-6 pt-6 pb-4">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-2xl font-bold text-white">
                            Добро пожаловать! Как вас зовут?
                        </DialogTitle>
                        <DialogDescription className="text-base text-slate-400">
                            Помогите нам персонализировать ваш опыт
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="px-6 pb-6">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-slate-300">Ваше Имя</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                                                <Input
                                                    placeholder="Иван Иванов"
                                                    {...field}
                                                    className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                                    disabled={isLoading}
                                                    autoFocus
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="submit"
                                className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold"
                                disabled={isLoading}
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Продолжить
                            </Button>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
