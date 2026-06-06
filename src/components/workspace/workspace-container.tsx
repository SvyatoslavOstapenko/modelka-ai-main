'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { AuthModal } from '@/components/auth/auth-modal';
import { toast } from 'sonner';
import {
  Sparkles,
  Upload,
  User,
  Shirt,
  CircleDashed,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Hand,
  Footprints,
  ImageIcon,
  Download,
  Heart,
  ArrowLeftRight,
  Loader2,
  Coins,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoIcon } from '@/components/logo';

// ============================================
// TYPES
// ============================================

type GarmentCategory = 'tops' | 'bottoms' | 'one-pieces';
type GarmentPhotoType = 'mannequin' | 'on-person';
type AppState = 'idle' | 'uploading' | 'processing' | 'result' | 'error';

interface UploadedImage {
  file: File;
  preview: string;
  hasSmallFace?: boolean;
  noFaceDetected?: boolean;
  lowResolution?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const PROGRESS_MESSAGES = [
  { icon: '📤', text: 'Загружаем изображения в высоком разрешении...' },
  { icon: '🧠', text: 'AI анализирует позу тела...' },
  { icon: '🧵', text: 'Подгоняем геометрию одежды...' },
  { icon: '✨', text: 'Рендерим финальное освещение...' },
];

const TIPS = [
  'Совет: Высококонтрастное освещение даёт лучшие результаты',
  'Совет: Фото модели в полный рост работают лучше всего',
  'Совет: Убедитесь, что одежда хорошо видна на фото',
  'Совет: Используйте фото с нейтральным фоном для лучших результатов',
];

const GARMENT_CATEGORIES: { id: GarmentCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'tops', label: 'Верх', icon: <Shirt className="w-5 h-5" /> },
  { id: 'bottoms', label: 'Низ', icon: <CircleDashed className="w-5 h-5" /> },
  { id: 'one-pieces', label: 'Платье', icon: <User className="w-5 h-5" /> },
];

// ============================================
// SMART UPLOADER COMPONENT
// ============================================

interface SmartUploaderProps {
  type: 'model' | 'garment';
  image: UploadedImage | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isUploading?: boolean;
  disabled?: boolean;
  garmentCategory?: GarmentCategory;
  onCategoryChange?: (category: GarmentCategory) => void;
  garmentPhotoType?: GarmentPhotoType;
  onPhotoTypeChange?: (type: GarmentPhotoType) => void;
}

function SmartUploader({
  type,
  image,
  onUpload,
  onRemove,
  isUploading = false,
  disabled = false,
  garmentCategory,
  onCategoryChange,
  garmentPhotoType,
  onPhotoTypeChange,
}: SmartUploaderProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    disabled: disabled || isUploading,
  });

  const isModel = type === 'model';
  const label = isModel ? 'Фото модели' : 'Фото одежды';
  const description = isModel
    ? 'Загрузите фото человека (анфас, по пояс или полный рост)'
    : 'Загрузите фото одежды';

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isModel ? (
              <User className="w-5 h-5 text-primary" />
            ) : (
              <Shirt className="w-5 h-5 text-primary" />
            )}
            <h3 className="font-semibold font-heading">{label}</h3>
          </div>
          {image && (
            <Button variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
              Удалить
            </Button>
          )}
        </div>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          'relative aspect-[3/4] transition-all duration-300 cursor-pointer overflow-hidden',
          isDragActive && 'ring-2 ring-primary ring-inset bg-primary/5',
          !image && !isDragActive && 'hover:bg-muted/50',
          (disabled || isUploading) && 'opacity-60 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
            >
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Загрузка...</p>
            </motion.div>
          ) : image ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full h-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.preview}
                alt={label}
                className="w-full h-full object-cover"
              />

              {/* Validation Badges */}
              <div className="absolute top-3 left-3 right-3 flex flex-col gap-2">
                {image.lowResolution && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Низкое разрешение
                    </Badge>
                  </motion.div>
                )}
                {image.noFaceDetected && isModel && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <Badge variant="outline" className="bg-red-50 border-red-200 text-red-700 gap-1.5">
                      <XCircle className="w-3.5 h-3.5" />
                      Лицо не обнаружено
                    </Badge>
                  </motion.div>
                )}
                {image.hasSmallFace && isModel && !image.noFaceDetected && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Маленькое лицо - результат может варьироваться
                    </Badge>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-muted-foreground/25 m-4 rounded-xl"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                {isModel ? (
                  <User className="w-8 h-8 text-muted-foreground" />
                ) : (
                  <Shirt className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                {isDragActive ? 'Отпустите изображение' : 'Перетащите или нажмите'}
              </p>
              <p className="text-xs text-muted-foreground">{description}</p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Upload className="w-3.5 h-3.5" />
                <span>PNG, JPG, WebP до 10MB</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Garment-specific controls */}
      {type === 'garment' && (
        <div className="p-4 border-t space-y-4 bg-muted/20">
          {/* Category Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Категория
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GARMENT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => onCategoryChange?.(cat.id)}
                  disabled={disabled}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all',
                    garmentCategory === cat.id
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-transparent bg-background hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {cat.icon}
                  <span className="text-xs font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Photo Type Switcher */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Тип фото
            </label>
            <Tabs
              value={garmentPhotoType}
              onValueChange={(v) => onPhotoTypeChange?.(v as GarmentPhotoType)}
            >
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="mannequin">На манекене</TabsTrigger>
                <TabsTrigger value="on-person">На человеке</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}
    </Card>
  );
}

// ============================================
// ADVANCED CONTROLS COMPONENT
// ============================================

interface AdvancedControlsProps {
  adjustHands: boolean;
  onAdjustHandsChange: (value: boolean) => void;
  coverFeet: boolean;
  onCoverFeetChange: (value: boolean) => void;
  keepBackground: boolean;
  onKeepBackgroundChange: (value: boolean) => void;
  disabled?: boolean;
}

function AdvancedControls({
  adjustHands,
  onAdjustHandsChange,
  coverFeet,
  onCoverFeetChange,
  keepBackground,
  onKeepBackgroundChange,
  disabled = false,
}: AdvancedControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const controls = [
    {
      id: 'adjustHands',
      label: 'Коррекция рук',
      tooltip: 'Исправляет наложение рук на одежду',
      icon: Hand,
      value: adjustHands,
      onChange: onAdjustHandsChange,
    },
    {
      id: 'coverFeet',
      label: 'Закрыть ноги',
      tooltip: 'Для длинных платьев и юбок в пол',
      icon: Footprints,
      value: coverFeet,
      onChange: onCoverFeetChange,
    },
    {
      id: 'keepBackground',
      label: 'Сохранить фон',
      tooltip: 'Сохраняет оригинальный фон фотографии',
      icon: ImageIcon,
      value: keepBackground,
      onChange: onKeepBackgroundChange,
    },
  ];

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
        Дополнительные настройки
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <TooltipProvider>
              <div className="flex flex-wrap gap-2 pt-2">
                {controls.map((control) => {
                  const Icon = control.icon;
                  return (
                    <Tooltip key={control.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => control.onChange(!control.value)}
                          disabled={disabled}
                          className={cn(
                            'flex items-center gap-2 px-4 py-2.5 rounded-full border-2 transition-all',
                            control.value
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-muted bg-background hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{control.label}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{control.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// PROCESSING VIEW COMPONENT
// ============================================

interface ProcessingViewProps {
  progress: number;
  messageIndex: number;
  tipIndex: number;
}

function ProcessingView({ progress, messageIndex, tipIndex }: ProcessingViewProps) {
  const currentMessage = PROGRESS_MESSAGES[messageIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center justify-center py-16 px-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="mb-8"
      >
        <LogoIcon size="lg" className="w-24 h-24" />
      </motion.div>

      <h2 className="text-2xl font-bold font-heading mb-2 text-center">
        Создаём вашу примерку
      </h2>

      <div className="h-12 mb-6 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-muted-foreground text-center flex items-center gap-2"
          >
            <span className="text-xl">{currentMessage.icon}</span>
            {currentMessage.text}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-md space-y-3">
        <Progress value={progress} className="h-3" />
        <p className="text-sm text-muted-foreground text-center font-heading">
          {Math.round(progress)}% готово
        </p>
      </div>

      <Card className="mt-8 p-4 bg-muted/30 max-w-md">
        <AnimatePresence mode="wait">
          <motion.p
            key={tipIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-sm text-muted-foreground text-center"
          >
            💡 {TIPS[tipIndex]}
          </motion.p>
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ============================================
// COMPARE SLIDER COMPONENT
// ============================================

interface CompareSliderProps {
  beforeImage: string;
  afterImage: string;
}

function CompareSlider({ beforeImage, afterImage }: CompareSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = (x / rect.width) * 100;
    setSliderPosition(percent);
  }, []);

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-[3/4] rounded-xl overflow-hidden cursor-ew-resize select-none"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
    >
      {/* Before Image */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={beforeImage} alt="До" className="w-full h-full object-cover" />
      </div>

      {/* After Image (Clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={afterImage} alt="После" className="w-full h-full object-cover" />
      </div>

      {/* Slider Line */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center">
          <ArrowLeftRight className="w-6 h-6 text-slate-600" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm font-medium">
        Оригинал
      </div>
      <div className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-black/60 text-white text-sm font-medium">
        Результат
      </div>
    </div>
  );
}

// ============================================
// RESULT VIEW COMPONENT
// ============================================

interface ResultViewProps {
  originalGarment: string;
  resultImage: string;
  onDownload: () => void;
  onSaveToWardrobe: () => void;
  onNewGeneration: () => void;
}

function ResultView({
  originalGarment,
  resultImage,
  onDownload,
  onSaveToWardrobe,
  onNewGeneration,
}: ResultViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 flex items-center justify-center"
        >
          <Sparkles className="w-8 h-8 text-emerald-600" />
        </motion.div>
        <h2 className="text-2xl font-bold font-heading mb-2">Готово!</h2>
        <p className="text-muted-foreground">Сравните результат с оригиналом</p>
      </div>

      <CompareSlider beforeImage={originalGarment} afterImage={resultImage} />

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={onDownload} className="flex-1 h-12 gradient-primary" size="lg">
          <Download className="w-5 h-5 mr-2" />
          Скачать HD
        </Button>
        <Button onClick={onSaveToWardrobe} className="flex-1 h-12" variant="outline" size="lg">
          <Heart className="w-5 h-5 mr-2" />
          В гардероб
        </Button>
      </div>

      <div className="text-center">
        <Button onClick={onNewGeneration} variant="ghost">
          <RefreshCw className="w-4 h-4 mr-2" />
          Новая примерка
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================
// CREDIT REFUND ANIMATION
// ============================================

interface CreditRefundAnimationProps {
  onComplete: () => void;
}

function CreditRefundAnimation({ onComplete }: CreditRefundAnimationProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 pointer-events-none"
    >
      <motion.div
        initial={{ bottom: '50%', left: '50%', x: '-50%', y: '50%' }}
        animate={{ bottom: '100%', left: '50%', x: '-50%', y: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="absolute"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-white font-semibold shadow-lg">
          <Coins className="w-5 h-5" />
          +1 токен возвращён
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// MAIN WORKSPACE CONTAINER COMPONENT
// ============================================

export function WorkspaceContainer() {
  const { data: session, status } = useSession();

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);

  // App state
  const [appState, setAppState] = useState<AppState>('idle');
  const [credits, setCredits] = useState(15);

  // Upload state
  const [modelImage, setModelImage] = useState<UploadedImage | null>(null);
  const [garmentImage, setGarmentImage] = useState<UploadedImage | null>(null);
  const [isUploadingModel, setIsUploadingModel] = useState(false);
  const [isUploadingGarment, setIsUploadingGarment] = useState(false);

  // Garment settings
  const [garmentCategory, setGarmentCategory] = useState<GarmentCategory>('tops');
  const [garmentPhotoType, setGarmentPhotoType] = useState<GarmentPhotoType>('mannequin');

  // Advanced settings
  const [adjustHands, setAdjustHands] = useState(false);
  const [coverFeet, setCoverFeet] = useState(false);
  const [keepBackground, setKeepBackground] = useState(false);

  // Processing state
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  // Result state
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [showRefundAnimation, setShowRefundAnimation] = useState(false);

  // Auth check
  const handleAuthRequired = useCallback(() => {
    if (status === 'loading') return false;
    if (!session?.user) {
      setShowAuthModal(true);
      return false;
    }
    return true;
  }, [session, status]);

  // Mock upload with validation
  const handleModelUpload = useCallback(
    async (file: File) => {
      if (!handleAuthRequired()) return;

      setIsUploadingModel(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock validation
      const hasSmallFace = Math.random() < 0.15;
      const noFaceDetected = Math.random() < 0.1;
      const lowResolution = file.size < 100000; // Mock: small files = low res

      const preview = URL.createObjectURL(file);
      setModelImage({ file, preview, hasSmallFace, noFaceDetected, lowResolution });
      setIsUploadingModel(false);
    },
    [handleAuthRequired]
  );

  const handleGarmentUpload = useCallback(
    async (file: File) => {
      if (!handleAuthRequired()) return;

      setIsUploadingGarment(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const lowResolution = file.size < 100000;
      const preview = URL.createObjectURL(file);
      setGarmentImage({ file, preview, lowResolution });
      setIsUploadingGarment(false);
    },
    [handleAuthRequired]
  );

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!handleAuthRequired()) return;
    if (!modelImage || !garmentImage) {
      toast.error('Загрузите оба изображения');
      return;
    }
    if (modelImage.noFaceDetected) {
      toast.error('Невозможно продолжить без обнаруженного лица');
      return;
    }
    if (credits < 1) {
      toast.error('Недостаточно токенов', {
        description: 'Пополните баланс для продолжения',
      });
      return;
    }

    setAppState('processing');
    setProgress(0);
    setMessageIndex(0);
    setTipIndex(0);
    setCredits((prev) => prev - 1);

    // Progress simulation (25 seconds)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 0.4;
      });
    }, 100);

    // Message cycling
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 6000);

    // Tip cycling
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 8000);

    // Complete after 25 seconds
    setTimeout(() => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
      clearInterval(tipInterval);
      setProgress(100);
      setResultImage(modelImage.preview);
      setAppState('result');
    }, 25000);
  }, [modelImage, garmentImage, credits, handleAuthRequired]);

  // Error simulation
  const simulateError = useCallback(() => {
    setShowRefundAnimation(true);
    setCredits((prev) => prev + 1);
    toast.error('AI моргнул! Генерация не удалась.', {
      description: 'Токен автоматически возвращён.',
    });
    setAppState('idle');
  }, []);

  // Reset
  const handleNewGeneration = useCallback(() => {
    setAppState('idle');
    setModelImage(null);
    setGarmentImage(null);
    setResultImage(null);
    setProgress(0);
    setMessageIndex(0);
    setTipIndex(0);
  }, []);

  // Download handler
  const handleDownload = useCallback(() => {
    toast.success('Скачивание началось', {
      description: 'Ваше HD изображение готовится',
    });
  }, []);

  // Save to wardrobe
  const handleSaveToWardrobe = useCallback(() => {
    toast.success('Сохранено в гардероб', {
      description: 'Найдите это в вашей галерее',
    });
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (modelImage?.preview) URL.revokeObjectURL(modelImage.preview);
      if (garmentImage?.preview) URL.revokeObjectURL(garmentImage.preview);
    };
  }, [modelImage, garmentImage]);

  const canSubmit =
    modelImage &&
    garmentImage &&
    !modelImage.noFaceDetected &&
    !isUploadingModel &&
    !isUploadingGarment;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Main Content */}
      <main className="container max-w-5xl mx-auto py-8 px-4">
        <AnimatePresence mode="wait">
          {appState === 'processing' ? (
            <Card key="processing" className="p-8">
              <ProcessingView
                progress={progress}
                messageIndex={messageIndex}
                tipIndex={tipIndex}
              />
            </Card>
          ) : appState === 'result' && resultImage && garmentImage ? (
            <Card key="result" className="p-8">
              <ResultView
                originalGarment={garmentImage.preview}
                resultImage={resultImage}
                onDownload={handleDownload}
                onSaveToWardrobe={handleSaveToWardrobe}
                onNewGeneration={handleNewGeneration}
              />
            </Card>
          ) : (
            <motion.div
              key="workspace"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  Виртуальная примерка на основе AI
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-heading tracking-tight">
                  Примерьте одежду за секунды
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Загрузите фото модели и одежды- наш AI создаст реалистичную примерку
                </p>
              </div>

              {/* Upload Zones */}
              <div className="grid md:grid-cols-2 gap-6">
                <SmartUploader
                  type="model"
                  image={modelImage}
                  onUpload={handleModelUpload}
                  onRemove={() => setModelImage(null)}
                  isUploading={isUploadingModel}
                />
                <SmartUploader
                  type="garment"
                  image={garmentImage}
                  onUpload={handleGarmentUpload}
                  onRemove={() => setGarmentImage(null)}
                  isUploading={isUploadingGarment}
                  garmentCategory={garmentCategory}
                  onCategoryChange={setGarmentCategory}
                  garmentPhotoType={garmentPhotoType}
                  onPhotoTypeChange={setGarmentPhotoType}
                />
              </div>

              {/* Advanced Controls */}
              <Card className="p-4">
                <AdvancedControls
                  adjustHands={adjustHands}
                  onAdjustHandsChange={setAdjustHands}
                  coverFeet={coverFeet}
                  onCoverFeetChange={setCoverFeet}
                  keepBackground={keepBackground}
                  onKeepBackgroundChange={setKeepBackground}
                />
              </Card>

              {/* Action Button */}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full h-14 text-lg font-semibold gradient-primary hover:opacity-90 transition-opacity rounded-xl"
                size="lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Примерить одежду
                <Badge variant="secondary" className="ml-3 font-heading">
                  1 токен
                </Badge>
              </Button>

              {/* Debug: Error Simulation */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-center">
                  <Button onClick={simulateError} variant="ghost" size="sm" className="text-xs opacity-50">
                    (Debug: Симулировать ошибку)
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Sticky Button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t z-40">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || appState === 'processing'}
          className="w-full h-12 font-semibold gradient-primary rounded-xl"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Примерить
          <Badge variant="secondary" className="ml-2 font-heading text-xs">
            1 токен
          </Badge>
        </Button>
      </div>

      {/* Credit Refund Animation */}
      <AnimatePresence>
        {showRefundAnimation && (
          <CreditRefundAnimation onComplete={() => setShowRefundAnimation(false)} />
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
    </div>
  );
}
