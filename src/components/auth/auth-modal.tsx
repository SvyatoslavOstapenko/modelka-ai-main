"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import Image from "next/image";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";

// Режим разработки: пропуск CAPTCHA если настроено
const SKIP_CAPTCHA = process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_SKIP_CAPTCHA === "true";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Separator } from "@/components/ui/separator";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { sendOtpAction } from "@/app/actions/auth";
import { sendOtpSchema, type SendOtpInput } from "@/lib/validators/auth";

// ============================================
// ТИПЫ
// ============================================

interface AuthModalProps {
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

type Step = "email" | "captcha" | "otp";

// Порядок шагов для анимации направления
const STEP_ORDER: Step[] = ["email", "captcha", "otp"];

// ============================================
// АНИМАЦИОННЫЕ ВАРИАНТЫ
// ============================================

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 300 : -300,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
    },
    exit: (direction: number) => ({
        x: direction < 0 ? 300 : -300,
        opacity: 0,
    }),
};

const successOverlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
};

const checkmarkVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
        scale: 1,
        opacity: 1,
        transition: {
            type: "spring" as const,
            stiffness: 200,
            damping: 15,
            delay: 0.1,
        },
    },
};

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ
// ============================================

export function AuthModal({ trigger, open, onOpenChange }: AuthModalProps) {
    const [step, setStep] = useState<Step>("email");
    const [direction, setDirection] = useState(0);
    const [email, setEmail] = useState("");
    const [otpValue, setOtpValue] = useState("");
    const [otpError, setOtpError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const [turnstileToken, setTurnstileToken] = useState<string>("");
    const [showSuccess, setShowSuccess] = useState(false);
    const [captchaReady, setCaptchaReady] = useState(false);
    const turnstileRef = useRef<TurnstileInstance>(null);

    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = open !== undefined;
    const finalOpen = isControlled ? open : internalOpen;
    const setFinalOpen = isControlled ? onOpenChange : setInternalOpen;

    const emailForm = useForm<SendOtpInput>({
        resolver: zodResolver(sendOtpSchema),
        defaultValues: { email: "", turnstileToken: "" },
    });

    // Навигация к шагу с направлением анимации
    const navigateToStep = useCallback((newStep: Step) => {
        const currentIndex = STEP_ORDER.indexOf(step);
        const newIndex = STEP_ORDER.indexOf(newStep);
        setDirection(newIndex > currentIndex ? 1 : -1);
        setStep(newStep);
    }, [step]);

    // Обратный отсчёт таймера повторной отправки
    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendTimer]);

    // Обработка отправки email формы
    async function onEmailSubmit(data: SendOtpInput) {
        const validEmail = sendOtpSchema.safeParse(data);
        if (!validEmail.success) {
            toast.error("Некорректный email адрес");
            return;
        }

        setEmail(data.email);

        if (SKIP_CAPTCHA) {
            // В режиме разработки пропускаем CAPTCHA
            setIsLoading(true);
            try {
                await onSendOtp(data.email);
            } catch (error) {
                console.error("Ошибка отправки OTP:", error);
                toast.error("Не удалось отправить код. Попробуйте ещё раз.");
            } finally {
                setIsLoading(false);
            }
        } else {
            // Переход к шагу проверки безопасности
            navigateToStep("captcha");
        }
    }

    // Отправка OTP кода на email
    async function onSendOtp(emailToSend?: string, captchaToken?: string) {
        const emailValue = emailToSend || email;
        const tokenToUse = captchaToken || turnstileToken;

        if (!tokenToUse && !SKIP_CAPTCHA) {
            toast.error("Пожалуйста, пройдите проверку безопасности");
            return;
        }

        setIsLoading(true);
        try {
            const result = await sendOtpAction({
                email: emailValue,
                turnstileToken: tokenToUse || undefined
            });
            if (result?.error) {
                toast.error(result.error);
                turnstileRef.current?.reset();
                setTurnstileToken("");
                setCaptchaReady(false);
                return;
            }
            navigateToStep("otp");
            setResendTimer(60);
            toast.success("Код отправлен! Проверьте вашу почту.");
        } catch {
            toast.error("Что-то пошло не так");
            turnstileRef.current?.reset();
            setTurnstileToken("");
            setCaptchaReady(false);
        } finally {
            setIsLoading(false);
        }
    }

    // Обработка отправки кода с шага CAPTCHA
    async function handleSendCode() {
        if (!turnstileToken && !SKIP_CAPTCHA) {
            toast.error("Пожалуйста, пройдите проверку безопасности");
            return;
        }
        await onSendOtp(undefined, turnstileToken);
    }

    // Проверка OTP кода
    const handleVerifyOtp = useCallback(async (codeValue?: string) => {
        const code = codeValue || otpValue;

        setOtpError(null);

        if (code.length !== 6) {
            setOtpError("Введите 6-значный код");
            return;
        }

        if (!/^\d{6}$/.test(code)) {
            setOtpError("Код должен содержать только цифры");
            setOtpValue("");
            return;
        }

        if (isLoading || isVerifying) return;

        setIsVerifying(true);
        setIsLoading(true);

        try {
            const result = await signIn("otp", {
                email,
                code,
                redirect: false,
            });

            if (result?.error) {
                if (result.error === "CredentialsSignin" || result.error === "Configuration") {
                    setOtpError("Неверный или истёкший код");
                } else {
                    setOtpError("Ошибка авторизации");
                }
                setOtpValue("");
            } else if (result?.ok && !result?.error) {
                // Успех! Показываем анимацию и перенаправляем
                setShowSuccess(true);
                setTimeout(() => {
                    setFinalOpen?.(false);
                    window.location.href = "/app";
                }, 1500);
            } else {
                setOtpError("Неизвестная ошибка");
            }
        } catch {
            setOtpError("Что-то пошло не так");
            setOtpValue("");
        } finally {
            setIsVerifying(false);
            setIsLoading(false);
        }
    }, [otpValue, isLoading, isVerifying, email, setFinalOpen]);

    // Повторная отправка кода
    async function handleResend() {
        if (resendTimer > 0) return;

        setIsLoading(true);
        try {
            const result = await sendOtpAction({ email });
            if (result?.error) {
                toast.error(result.error);
                return;
            }
            setResendTimer(60);
            setOtpValue("");
            toast.success("Код отправлен повторно!");
        } catch {
            toast.error("Что-то пошло не так");
        } finally {
            setIsLoading(false);
        }
    }

    // Вход через социальные сети
    const socialLogin = (provider: "google" | "yandex") => {
        setIsLoading(true);
        signIn(provider, { callbackUrl: "/app" });
    };

    // Возврат к шагу email
    function handleBack() {
        navigateToStep("email");
        setOtpValue("");
        setOtpError(null);
        setResendTimer(0);
        setTurnstileToken("");
        setCaptchaReady(false);
    }

    // Сброс состояния при закрытии модалки
    useEffect(() => {
        if (!finalOpen) {
            setStep("email");
            setDirection(0);
            setEmail("");
            setOtpValue("");
            setOtpError(null);
            setResendTimer(0);
            setTurnstileToken("");
            setShowSuccess(false);
            setCaptchaReady(false);
            emailForm.reset();
        }
    }, [finalOpen, emailForm]);

    // Сброс loading state при возврате с OAuth страницы
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isLoading && step === 'email') {
                // Пользователь вернулся на страницу после OAuth redirect
                setIsLoading(false);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isLoading, step]);

    return (
        <Dialog open={finalOpen} onOpenChange={setFinalOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[440px] p-0 bg-slate-950 border-slate-800 overflow-hidden">
                {/* Оверлей успеха */}
                <AnimatePresence>
                    {showSuccess && (
                        <motion.div
                            variants={successOverlayVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950"
                        >
                            <motion.div
                                variants={checkmarkVariants}
                                initial="hidden"
                                animate="visible"
                                className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4"
                            >
                                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                            </motion.div>
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-xl font-semibold text-slate-50"
                            >
                                Добро пожаловать!
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Заголовок */}
                <motion.div layout className="px-6 pt-6 pb-4">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-2xl font-bold text-slate-50 font-heading">
                            {step === "email" && "Вход в Modelka AI"}
                            {step === "captcha" && "Проверка безопасности"}
                            {step === "otp" && "Введите код из письма"}
                        </DialogTitle>
                        <DialogDescription className="text-base text-slate-400">
                            {step === "email" && "Войдите, чтобы создавать виртуальные примерки"}
                            {step === "captcha" && (
                                <>
                                    Подтвердите, что вы не робот, чтобы отправить код на{" "}
                                    <span className="text-indigo-400 font-medium">{email}</span>
                                </>
                            )}
                            {step === "otp" && (
                                <>
                                    Код отправлен на{" "}
                                    <span className="text-indigo-400 font-medium">{email}</span>
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                </motion.div>

                <motion.div layout className="px-6 pb-6 space-y-6 overflow-hidden">
                    {/* Кнопки OAuth - ТОЛЬКО на шаге email */}
                    <AnimatePresence mode="wait">
                        {step === "email" && (
                            <motion.div
                                key="oauth"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-6"
                            >
                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => socialLogin("google")}
                                        disabled={isLoading}
                                        className="w-full h-12 bg-slate-800 border-slate-700 hover:bg-slate-700 flex items-center justify-center"
                                    >
                                        <Image src="/icons/google-logo.svg" alt="Google" width={80} height={24} className="h-5 w-auto" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => socialLogin("yandex")}
                                        disabled={isLoading}
                                        className="w-full h-12 bg-slate-800 border-slate-700 hover:bg-slate-700 flex items-center justify-center"
                                    >
                                        <Image src="/icons/yandex-logo.svg" alt="Yandex" width={80} height={24} className="h-5 w-auto" />
                                    </Button>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <Separator className="bg-slate-800" />
                                    </div>
                                    <div className="relative flex justify-center text-xs">
                                        <span className="bg-slate-950 px-3 text-slate-500">
                                            или продолжить через
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Контент шагов с анимациями */}
                    <div className="relative">
                        <AnimatePresence initial={false} custom={direction} mode="wait">
                            {/* Шаг 1: Ввод Email */}
                            {step === "email" && (
                                <motion.div
                                    key="email-step"
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ type: "tween", duration: 0.3 }}
                                >
                                    <Form {...emailForm}>
                                        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                                            <FormField
                                                control={emailForm.control}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-slate-300">Email</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-slate-500" />
                                                                <Input
                                                                    placeholder="name@company.com"
                                                                    {...field}
                                                                    className="h-12 pl-11 bg-slate-900 border-slate-700 text-slate-50 placeholder:text-slate-500 focus:ring-indigo-500 focus:border-indigo-500"
                                                                    disabled={isLoading}
                                                                    autoComplete="email"
                                                                />
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <Button
                                                type="submit"
                                                className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold"
                                                disabled={isLoading}
                                            >
                                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Продолжить
                                            </Button>
                                        </form>
                                    </Form>
                                </motion.div>
                            )}

                            {/* Шаг 2: Проверка безопасности (CAPTCHA) */}
                            {step === "captcha" && (
                                <motion.div
                                    key="captcha-step"
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ type: "tween", duration: 0.3 }}
                                    className="space-y-6"
                                >
                                    <div className="flex justify-center">
                                        <Turnstile
                                            ref={turnstileRef}
                                            siteKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "0x4AAAAAACFdMaLcxLdzWGio"}
                                            onSuccess={(token) => {
                                                setTurnstileToken(token);
                                                setCaptchaReady(true);
                                            }}
                                            onError={() => {
                                                setTurnstileToken("");
                                                setCaptchaReady(false);
                                                toast.error("Ошибка проверки безопасности. Попробуйте обновить страницу.");
                                            }}
                                            onExpire={() => {
                                                setTurnstileToken("");
                                                setCaptchaReady(false);
                                                toast.warning("Проверка безопасности истекла. Пройдите её снова.");
                                            }}
                                            options={{
                                                theme: "dark",
                                                size: "normal",
                                            }}
                                        />
                                    </div>

                                    <Button
                                        type="button"
                                        onClick={handleSendCode}
                                        disabled={!captchaReady || isLoading}
                                        className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold disabled:bg-slate-700 disabled:text-slate-400"
                                    >
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Отправить код
                                    </Button>

                                    <div className="flex justify-center">
                                        <button
                                            type="button"
                                            onClick={handleBack}
                                            className="flex items-center gap-2 text-slate-400 hover:text-slate-50 transition-colors text-sm"
                                            disabled={isLoading}
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                            Назад
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Шаг 3: Ввод OTP кода */}
                            {step === "otp" && (
                                <motion.div
                                    key="otp-step"
                                    custom={direction}
                                    variants={slideVariants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ type: "tween", duration: 0.3 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-4">
                                        {/* Лейбл над OTP */}
                                        <p className="text-sm text-slate-300 text-center">
                                            Введите 6-значный код для входа
                                        </p>

                                        <div className="flex flex-col items-center gap-3">
                                            <InputOTP
                                                maxLength={6}
                                                value={otpValue}
                                                onChange={(value) => {
                                                    setOtpValue(value);
                                                    if (otpError) setOtpError(null);
                                                }}
                                                disabled={isLoading}
                                                pattern={REGEXP_ONLY_DIGITS}
                                            >
                                                <InputOTPGroup className="gap-2">
                                                    {[0, 1, 2, 3, 4, 5].map((index) => (
                                                        <InputOTPSlot
                                                            key={index}
                                                            index={index}
                                                            className={`w-11 h-14 text-xl bg-slate-900 text-slate-50 rounded-lg ${otpError
                                                                ? "border-red-500 border-2"
                                                                : "border-slate-700 focus:ring-indigo-500 focus:border-indigo-500"
                                                                }`}
                                                        />
                                                    ))}
                                                </InputOTPGroup>
                                            </InputOTP>

                                            {/* Сообщение об ошибке */}
                                            {otpError && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: -5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="text-red-500 text-sm text-center"
                                                >
                                                    {otpError}
                                                </motion.p>
                                            )}
                                        </div>

                                        {/* Кнопка Войти */}
                                        <Button
                                            type="button"
                                            onClick={() => handleVerifyOtp()}
                                            disabled={otpValue.length !== 6 || isLoading}
                                            className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold disabled:bg-slate-700 disabled:text-slate-400"
                                        >
                                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            {isLoading ? "Проверяем код..." : "Войти"}
                                        </Button>

                                        {/* Действия внизу */}
                                        <div className="flex items-center justify-between text-sm pt-2">
                                            <button
                                                type="button"
                                                onClick={handleBack}
                                                className="text-slate-400 hover:text-slate-50 transition-colors"
                                                disabled={isLoading}
                                            >
                                                Изменить почту
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleResend}
                                                disabled={resendTimer > 0 || isLoading}
                                                className="text-indigo-400 hover:text-indigo-300 transition-colors disabled:text-slate-600 disabled:cursor-not-allowed"
                                            >
                                                {resendTimer > 0
                                                    ? `Отправить код ещё раз через ${resendTimer} с`
                                                    : "Отправить снова"
                                                }
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
}
