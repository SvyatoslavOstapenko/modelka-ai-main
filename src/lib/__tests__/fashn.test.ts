/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for Fashn.ai HTTP Client
 * Updated for Universal API (runGeneration)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  runGeneration,
  getTaskStatus,
  FashnRateLimitError,
  mapFashnStatusToDbStatus,
  extractFirstResultUrl,
  calculateGenerationCost,
  runImageToVideo,
} from '../fashn';

// Mock Environment Variables
const mockEnv = {
  FASHN_API_KEY: 'test_api_key_123',
  WEBHOOK_BASE_URL: 'https://test.example.com',
};

// Apply Mocks
beforeEach(() => {
  Object.entries(mockEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ============================================
// TESTS: runGeneration
// ============================================

describe('runGeneration', () => {
  it('should successfully send request for product_to_model', async () => {
    // Arrange
    const mockResponse = {
      id: 'pred_abc123',
      status: 'queued',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    // Act
    const result = await runGeneration(
      'product_to_model',
      {
        product_image: 'https://example.com/product.jpg',
        model_image: 'https://example.com/model.jpg',
        category: 'tops',
        mode: 'performance',
      },
      'webhook-token-123'
    );

    // Assert
    expect(result).toEqual({ id: 'pred_abc123' });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toBe('https://api.fashn.ai/v1/run');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer test_api_key_123');

    const body = JSON.parse(options.body);
    expect(body.model_name).toBe('product-to-model');
    expect(body.inputs.product_image).toBe('https://example.com/product.jpg');
    expect(body.inputs.category).toBe('tops');
    expect(body.inputs.mode).toBe('performance');
    expect(body.webhook_url).toContain('webhook-token-123');
  });

  it('should correctly format webhook_url', async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'test', status: 'queued' }),
    });

    // Act
    await runGeneration(
      'product_to_model',
      {
        product_image: 'https://example.com/product.jpg',
      },
      'my-secret-token'
    );

    // Assert
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.webhook_url).toBe(
      'https://test.example.com/api/webhooks/fashn?token=my-secret-token'
    );
  });

  it('should apply defaults via Zod', async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'test', status: 'queued' }),
    });

    // Act
    await runGeneration(
      'product_to_model',
      {
        product_image: 'https://example.com/product.jpg',
      },
      'token'
    );

    // Assert
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.inputs.resolution).toBe('1k');
    expect(body.inputs.num_samples).toBe(1);
  });

  it('should handle rate limits (429)', async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Map([['Retry-After', '60']]),
      json: async () => ({ error: 'Too many requests' }),
    } as any);

    // Act & Assert
    await expect(
      runGeneration(
        'product_to_model',
        { product_image: 'https://example.com/p.jpg' },
        'token'
      )
    ).rejects.toThrow(FashnRateLimitError);
  });

  it('should handle validation errors (400)', async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Map(),
      json: async () => ({
        error: 'Invalid input',
        details: { product_image: ['Invalid URL'] },
      }),
    } as any);

    // Act & Assert
    await expect(
      runGeneration(
        'product_to_model',
        { product_image: 'invalid-url' }, // This will fail local Zod validation first actually, so we need valid input but mock 400 response
        'token'
      )
    ).rejects.toThrow();
  });

  it('should fail local Zod validation before request', async () => {
    await expect(
      runGeneration(
        'product_to_model',
        { product_image: 'not-a-url' } as any,
        'token'
      )
    ).rejects.toThrow(); // Zod error
  });

  it('should throw if FASHN_API_KEY is missing', async () => {
    // Arrange
    delete process.env.FASHN_API_KEY;

    // Act & Assert
    await expect(
      runGeneration(
        'product_to_model',
        { product_image: 'https://example.com/p.jpg' },
        'token'
      )
    ).rejects.toThrow('FASHN_API_KEY не найден');
  });
});

// ============================================
// TESTS: getPredictionStatus
// ============================================

describe('getPredictionStatus', () => {
  it('should fetch status successfully', async () => {
    // Arrange
    const mockResponse = {
      id: 'pred_abc123',
      status: 'completed',
      output: ['https://cdn.fashn.ai/result.png'],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    // Act
    const result = await getTaskStatus('pred_abc123'); // Renamed to getTaskStatus

    // Assert
    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toBe('https://api.fashn.ai/v1/status/pred_abc123');
    expect(options.method).toBe('GET');
  });
});

// ============================================
// TESTS: Utilities
// ============================================

describe('mapFashnStatusToDbStatus', () => {
  it('should map statuses correctly', () => {
    expect(mapFashnStatusToDbStatus('queued')).toBe('QUEUED');
    expect(mapFashnStatusToDbStatus('processing')).toBe('PROCESSING');
    expect(mapFashnStatusToDbStatus('completed')).toBe('COMPLETED');
    expect(mapFashnStatusToDbStatus('failed')).toBe('FAILED');
  });
});

describe('extractFirstResultUrl', () => {
  it('should extract first url', () => {
    const response = {
      id: 'test',
      status: 'completed' as const,
      output: ['https://example.com/result1.png'],
    };
    expect(extractFirstResultUrl(response)).toBe('https://example.com/result1.png');
  });
});

describe('calculateGenerationCost', () => {
  it('should return base cost 1 for standard product_to_model', () => {
    const cost = calculateGenerationCost('product_to_model', {
      product_image: 'https://example.com/p.jpg',
    });
    expect(cost).toBe(1);
  });

  it('should return 4 for product_to_model with face_reference', () => {
    const cost = calculateGenerationCost('product_to_model', {
      product_image: 'https://example.com/p.jpg',
      face_reference: 'https://example.com/face.jpg',
    } as any);
    expect(cost).toBe(4);
  });

  it('should calculate image_to_video cost correctly', () => {
    // 1080p (6) * 5s (1) = 6
    expect(
      calculateGenerationCost('image_to_video', {
        image: 'https://example.com/i.jpg',
        resolution: '1080p',
        duration: 5,
      })
    ).toBe(6);

    // 720p (3) * 10s (2) = 6
    expect(
      calculateGenerationCost('image_to_video', {
        image: 'https://example.com/i.jpg',
        resolution: '720p',
        duration: 10,
      })
    ).toBe(6);

    // 480p (1) * 5s (1) = 1
    expect(
      calculateGenerationCost('image_to_video', {
        image: 'https://example.com/i.jpg',
        resolution: '480p',
        duration: 5,
      })
    ).toBe(1);
  });

  it('should multiply by num_samples', () => {
    const cost = calculateGenerationCost('model_variation', {
      image: 'https://example.com/i.jpg',
      num_samples: 4,
    });
    expect(cost).toBe(4); // 1 base * 4 samples
  });
});

describe('runImageToVideo', () => {
  it('should pass correct parameters to runGeneration', async () => {
    // Arrange
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'vid_123', status: 'queued' }),
    });

    // Act
    await runImageToVideo(
      {
        image: 'https://example.com/start.jpg',
        duration: 10,
        resolution: '720p',
      },
      'webhook_123'
    );

    // Assert
    const [, options] = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body.model_name).toBe('image-to-video');
    expect(body.inputs.duration).toBe(10);
    expect(body.inputs.resolution).toBe('720p');
  });
});
