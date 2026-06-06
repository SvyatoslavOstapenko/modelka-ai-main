import { z } from "zod";

// OTP Authentication Schemas
export const sendOtpSchema = z.object({
    email: z.string().email("Пожалуйста, введите корректный email адрес"),
    turnstileToken: z.string().optional(), // Optional for backwards compatibility
});

export const verifyOtpSchema = z.object({
    email: z.string().email("Пожалуйста, введите корректный email адрес"),
    code: z.string().length(6, "Код должен содержать 6 цифр").regex(/^\d{6}$/, "Код должен содержать только цифры"),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
