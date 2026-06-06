'use server';

import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get current user credits
 * Used to refresh credits display after generation
 */
export async function getUserCreditsAction(): Promise<{ success: true; credits: number } | { success: false; error: string }> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { success: false, error: 'Not authenticated' };
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, session.user.id),
            columns: { credits: true },
        });

        return { success: true, credits: user?.credits ?? 0 };
    } catch (error) {
        console.error('Error getting user credits:', error);
        return { success: false, error: 'Failed to get credits' };
    }
}
