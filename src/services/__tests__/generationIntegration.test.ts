/**
 * Integration Tests for Generation Service
 * 
 * Tests the full lifecycle of a generation:
 * 1. Creation (Atomic Transaction)
 * 2. Submission to Fashn API (Mocked)
 * 3. Finalization (Mocked Result)
 * 
 * Uses the local database but mocks external APIs
 */

import 'dotenv/config'; // Load environment variables
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { db } from '@/db';
import { users, generations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
    createGenerationAtomic,
    submitToFashn,
    finalizeResult,
    checkEntitlements
} from '../generationService';
import type { FashnInput } from '@/lib/fashn';
import crypto from 'crypto';

// Update timeout for integration tests
vi.setConfig({ testTimeout: 30000 });

// Mock Fashn Library
vi.mock('@/lib/fashn', async () => {
    return {
        runGeneration: vi.fn().mockResolvedValue({ id: 'mock-task-id-123' }),
        calculateGenerationCost: vi.fn().mockReturnValue(10),
    };
});

// Mock Storage
vi.mock('@/lib/storage', async () => {
    return {
        fetchAndStore: vi.fn().mockResolvedValue({
            url: 'https://mock-storage.com/result.png',
            key: 'mock-key',
            bucket: 'mock-bucket',
            mimeType: 'image/png',
            size: 1024
        }),
        generateResultKey: vi.fn().mockReturnValue('mock-key'),
    }
});

describe('Generation Integration Flow', () => {
    const testEmail = `integration-test-${crypto.randomUUID()}@example.com`;
    let userId: string;
    let modelAssetId: string;
    let garmentAssetId: string;
    let generationId: string;

    beforeAll(async () => {
        // 1. Create Test User
        const [user] = await db.insert(users).values({
            email: testEmail,
            name: 'Integration Test User',
            planCode: 'test',
            credits: 100,
            emailVerified: new Date(),
        }).returning();
        userId = user.id;

        // 2. No need to create test assets - we use s3Keys directly now
        // Uploads are stored only in S3 (tmp/ folder), not in DB
        modelAssetId = `tmp/${userId}/model.jpg`; // s3Key format
        garmentAssetId = `tmp/${userId}/garment.jpg`; // s3Key format
    });

    afterAll(async () => {
        // Cleanup
        if (userId) {
            await db.delete(users).where(eq(users.id, userId));
        }
    });

    it('1. Should check entitlements correctly', async () => {
        const result = await checkEntitlements(userId, 'product_to_model', {});
        expect(result.allowed).toBe(true);
        expect(result.user.credits).toBe(100);
    });

    it('2. Should create generation atomically (deduct credits, create tx)', async () => {
        const result = await createGenerationAtomic(
            {
                userId,
                type: 'product_to_model',
                inputs: [
                    { s3Key: modelAssetId, role: 'model_image', mimeType: 'image/jpeg' },
                    { s3Key: garmentAssetId, role: 'garment_image', mimeType: 'image/jpeg' }
                ],
                params: { mode: 'performance' }
            },
            {} as FashnInput, // Fashn params (mocked inside)
            10 // Cost
        );

        generationId = result.generationId;

        expect(result.status).toBe('PENDING');
        expect(result.cost).toBe(10);

        // Verify DB state
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId)
        });
        expect(user?.credits).toBe(90); // 100 - 10

        const gen = await db.query.generations.findFirst({
            where: eq(generations.id, generationId),
            with: {
                transactions: true,
                generationAssets: true
            }
        });

        expect(gen).toBeDefined();
        expect(gen?.status).toBe('PENDING');
        expect(gen?.transactions.length).toBe(1);
        expect(gen?.transactions[0].type).toBe('SPEND');
        expect(gen?.generationAssets.length).toBe(2);
    });

    it('3. Should submit to Fashn (Mocked)', async () => {
        const gen = await db.query.generations.findFirst({
            where: eq(generations.id, generationId)
        });
        if (!gen) throw new Error('Generation not found');

        const result = await submitToFashn(
            generationId,
            'product_to_model',
            {} as FashnInput,
            gen.webhookToken // Pass the real token
        );

        expect(result.providerTaskId).toBe('mock-task-id-123');

        // Verify Status Update
        const updatedGen = await db.query.generations.findFirst({
            where: eq(generations.id, generationId)
        });
        expect(updatedGen?.status).toBe('QUEUED');
        expect(updatedGen?.providerTaskId).toBe('mock-task-id-123');
    });

    it('4. Should finalize result (Simulate Webhook Success)', async () => {
        // Simulate that we got results from Fashn
        const mockOutputUrls = ['https://cdn.fashn.ai/out1.png'];

        await finalizeResult(generationId, mockOutputUrls);

        // Verify Completed State
        const finalGen = await db.query.generations.findFirst({
            where: eq(generations.id, generationId),
            with: {
                generationAssets: {
                    where: (ga, { eq }) => eq(ga.direction, 'output'),
                    with: { asset: true }
                }
            }
        });

        expect(finalGen?.status).toBe('COMPLETED');
        expect(finalGen?.completedAt).not.toBeNull();
        expect(finalGen?.durationMs).toBeGreaterThan(0);

        expect(finalGen?.generationAssets.length).toBe(1);
        expect(finalGen?.generationAssets[0].asset.url).toBe('https://mock-storage.com/result.png');
        expect(finalGen?.generationAssets[0].role).toBe('output_image');
    });
});
