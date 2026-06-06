/**
 * Shared constants for Product-to-Model workspace
 */

export const ASPECT_RATIOS = ['1:1', '3:4', '4:3', '9:16', '16:9', '21:9', '2:3', '3:2', '4:5', '5:4'] as const;

export const RESOLUTIONS = [
  {
    value: '1K',
    label: 'Точное 1K разрешение',
    description: 'Стабильные результаты с хорошим следованием инструкциям',
    locked: false
  },
  {
    value: '4K',
    label: 'Креативное 4K',
    description: 'UHD результаты с хорошей детализацией товара',
    locked: true
  }
] as const;

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
export const ACCEPTED_IMAGE_TYPES = { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] };
