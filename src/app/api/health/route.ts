import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    // Проверка подключения к базе данных
    await db.execute(sql`SELECT 1`);

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error';

    return NextResponse.json(
      {
        status: 'error',
        message,
      },
      { status: 500 }
    );
  }
}
