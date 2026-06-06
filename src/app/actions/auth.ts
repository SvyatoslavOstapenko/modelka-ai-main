"use server";

import { signIn, auth } from "@/auth";
import { sendOtpSchema, verifyOtpSchema, type SendOtpInput } from "@/lib/validators/auth";
import { generateOtpToken, getVerificationTokenByToken } from "@/lib/tokens";
import { sendOtpEmail } from "@/lib/mail";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { otpSendLimiter, otpVerifyLimiter, checkRateLimit } from "@/lib/rate-limit";
import { skipCaptchaInDev } from "@/lib/dev-utils";

/**
 * Send OTP code to user's email
 */
export async function sendOtpAction(data: SendOtpInput) {
  const validatedFields = sendOtpSchema.safeParse(data);

  if (!validatedFields.success) {
    return { error: "Некорректный email адрес" };
  }

  const { email, turnstileToken } = validatedFields.data;

  // Verify CAPTCHA if token provided (skip in dev if configured)
  if (!skipCaptchaInDev) {
    if (turnstileToken) {
      const { verifyTurnstileToken } = await import("@/lib/turnstile");
      const isValidCaptcha = await verifyTurnstileToken(turnstileToken);

      if (!isValidCaptcha) {
        return { error: "Проверка CAPTCHA не пройдена. Пожалуйста, попробуйте снова." };
      }
    }
  } else {
    // In dev mode, skip CAPTCHA verification
    console.log("⚠️  DEV MODE: Skipping CAPTCHA verification for", email);
  }

  // Check rate limit: 3 requests per 15 minutes per email
  const rateLimitCheck = await checkRateLimit(otpSendLimiter, email);
  if (!rateLimitCheck.success) {
    return { error: rateLimitCheck.error };
  }

  try {
    // Generate OTP code
    const code = await generateOtpToken(email);

    // Send email
    const result = await sendOtpEmail(email, code);

    if (result.error) {
      return { error: "Не удалось отправить код. Попробуйте еще раз." };
    }

    return { success: "Код отправлен! Проверьте вашу почту." };
  } catch (error) {
    console.error("Send OTP error:", error);
    return { error: "Что-то пошло не так. Попробуйте еще раз." };
  }
}

/**
 * Verify OTP and sign in
 */
export async function verifyOtpAction(email: string, code: string) {
  const validatedFields = verifyOtpSchema.safeParse({ email, code });

  if (!validatedFields.success) {
    return { error: "Неверный формат кода" };
  }

  // Check rate limit: 5 attempts per 10 minutes per email
  const rateLimitCheck = await checkRateLimit(otpVerifyLimiter, email);
  if (!rateLimitCheck.success) {
    return { error: rateLimitCheck.error };
  }

  try {
    const result = await signIn("otp", {
      email,
      code,
      redirect: false,
    });

    if (result?.error) {
      console.error("OTP verification failed:", result.error);

      // Different messages for different error types
      if (result.error === "CredentialsSignin") {
        return { error: "Неверный или истекший код" };
      }
      return { error: "Ошибка авторизации. Попробуйте еще раз." };
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error in verifyOtpAction:", error);

    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Неверный или истекший код" };
        default:
          return { error: "Что-то пошло не так" };
      }
    }

    return { error: "Непредвиденная ошибка" };
  }
}

/**
 * Update user name (for first-time users)
 */
const updateNameSchema = z.object({
  name: z.string().min(2, "Имя должно быть не менее 2 символов").max(50, "Имя слишком длинное"),
});

export async function updateUserNameAction(name: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Вы не авторизованы" };
  }

  const validatedFields = updateNameSchema.safeParse({ name });

  if (!validatedFields.success) {
    return { error: "Некорректное имя" };
  }

  try {
    await db
      .update(users)
      .set({ name: validatedFields.data.name })
      .where(eq(users.id, session.user.id));

    return { success: true };
  } catch (error) {
    console.error("Update name error:", error);
    return { error: "Не удалось обновить имя" };
  }
}

export const newVerification = async (token: string) => {
  const existingToken = await getVerificationTokenByToken(token);

  if (!existingToken) {
    return { error: "Токен не существует!" };
  }

  const hasExpired = new Date(existingToken.expires) < new Date();

  if (hasExpired) {
    return { error: "Срок действия токена истек!" };
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, existingToken.identifier),
  });

  if (!existingUser) {
    return { error: "Email не существует!" };
  }

  await db.update(users).set({
    emailVerified: new Date(),
    email: existingToken.identifier,
  })
    .where(eq(users.id, existingUser.id));

  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, existingToken.identifier));

  return { success: "Email успешно подтвержден!" };
};
