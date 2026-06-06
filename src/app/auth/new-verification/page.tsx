'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { newVerification } from '@/app/actions/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function NewVerificationForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  useEffect(() => {
    // Пропустить если уже есть результат
    if (success || error) return;

    // Проверить наличие токена
    if (!token) {
      setError('Missing token!');
      return;
    }

    // Выполнить верификацию
    const verify = async () => {
      try {
        const data = await newVerification(token);

        if (data.error) {
          setError(data.error);
        }

        if (data.success) {
          setSuccess(data.success);
        }
      } catch {
        setError('Something went wrong!');
      }
    };

    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // Зависим только от token

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Подтверждение Email</CardTitle>
          <CardDescription>
            {!success && !error && 'Подтверждение email адреса...'}
            {success && 'Email успешно подтвержден!'}
            {error && 'Ошибка подтверждения'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!success && !error && (
            <div className="flex items-center justify-center py-8">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
            </div>
          )}

          {success && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-sm text-green-700">{success}</p>
              <p className="text-sm text-muted-foreground">
                Теперь вы можете войти в свой аккаунт.
              </p>
              <Button asChild className="w-full">
                <Link href="/">Войти</Link>
              </Button>
            </div>
          )}

          {error && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-sm text-red-700">{error}</p>
              <p className="text-sm text-muted-foreground">
                Ссылка подтверждения истекла или недействительна.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">На главную</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Подтверждение Email</CardTitle>
              <CardDescription>Загрузка...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <NewVerificationForm />
    </Suspense>
  );
}
