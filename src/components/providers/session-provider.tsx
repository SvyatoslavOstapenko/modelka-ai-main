"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      // Оптимизация частоты обновления session
      refetchInterval={5 * 60} // Обновлять каждые 5 минут вместо постоянно
      refetchOnWindowFocus={false} // Не обновлять при фокусе окна
    >
      {children}
    </SessionProvider>
  );
}
