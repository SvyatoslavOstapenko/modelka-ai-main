'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Download,
  Eye,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  ImageIcon,
  User,
  Shirt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { GalleryItem } from '@/services/assets';

// ============================================
// TYPES
// ============================================

interface GalleryGridProps {
  items: GalleryItem[];
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================

function StatusBadge({ status }: { status: GalleryItem['status'] }) {
  const config: Record<
    GalleryItem['status'],
    { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string; pulse?: boolean }
  > = {
    COMPLETED: { variant: 'default', label: 'Completed' },
    PROCESSING: { variant: 'secondary', label: 'Processing', pulse: true },
    QUEUED: { variant: 'secondary', label: 'In Queue', pulse: true },
    PENDING: { variant: 'outline', label: 'Pending' },
    FAILED: { variant: 'destructive', label: 'Failed' },
    CANCELED: { variant: 'outline', label: 'Canceled' },
  };

  const statusConfig = config[status];

  return (
    <Badge
      variant={statusConfig.variant}
      className={cn(statusConfig.pulse && 'animate-pulse')}
    >
      {statusConfig.pulse && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
      {statusConfig.label}
    </Badge>
  );
}

// ============================================
// GALLERY CARD COMPONENT
// ============================================

interface GalleryCardProps {
  item: GalleryItem;
  onClick: () => void;
}

function GalleryCard({ item, onClick }: GalleryCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hasResult = item.status === 'COMPLETED' && item.resultAsset;
  const isFailed = item.status === 'FAILED';
  const isProcessing = item.status === 'PROCESSING' || item.status === 'QUEUED';

  // Determine which image to show as main
  const mainImage = hasResult
    ? item.resultAsset!.viewUrl
    : item.modelAsset.viewUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          'overflow-hidden cursor-pointer transition-all duration-300',
          'hover:shadow-lg hover:shadow-primary/5',
          isFailed && 'border-destructive/30'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        {/* Main Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-slate-100">
          <Image
            src={mainImage}
            alt="Try-on result"
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                <p className="text-sm font-medium">Processing...</p>
              </div>
            </div>
          )}

          {/* Failed Overlay */}
          {isFailed && (
            <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-sm font-medium text-destructive">Failed</p>
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <StatusBadge status={item.status} />
          </div>

          {/* Hover Overlay */}
          <motion.div
            initial={false}
            animate={{ opacity: isHovered && hasResult ? 1 : 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
          >
            {/* Action Buttons */}
            <div className="absolute bottom-4 left-4 right-4 flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 backdrop-blur-sm bg-white/90"
                onClick={(e) => {
                  e.stopPropagation();
                  toast.success('Download started');
                }}
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
              <Button
                size="sm"
                variant="secondary"
                className="backdrop-blur-sm bg-white/90"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </div>

            {/* Input Thumbnails */}
            <div className="absolute top-3 right-3 flex gap-1">
              <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white/50 shadow-sm">
                <Image
                  src={item.modelAsset.viewUrl}
                  alt="Model"
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              </div>
              <div className="w-10 h-10 rounded-lg overflow-hidden border-2 border-white/50 shadow-sm">
                <Image
                  src={item.garmentAsset.viewUrl}
                  alt="Garment"
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Card Footer */}
        <div className="p-3 space-y-2">
          {/* Date & Mode */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </div>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
              {item.mode}
            </Badge>
          </div>

          {/* Error Message */}
          {isFailed && item.errorReason && (
            <p className="text-xs text-destructive line-clamp-1">{item.errorReason}</p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

// ============================================
// DETAIL DIALOG COMPONENT
// ============================================

interface DetailDialogProps {
  item: GalleryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailDialog({ item, open, onOpenChange }: DetailDialogProps) {
  if (!item) return null;

  const hasResult = item.status === 'COMPLETED' && item.resultAsset;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-heading">Try-On Details</DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-4">
          {/* Images Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Model */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                Model
              </div>
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-100">
                <Image
                  src={item.modelAsset.viewUrl}
                  alt="Model"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Garment */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Shirt className="w-4 h-4" />
                Garment
              </div>
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-100">
                <Image
                  src={item.garmentAsset.viewUrl}
                  alt="Garment"
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Result */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ImageIcon className="w-4 h-4" />
                Result
              </div>
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-100">
                {hasResult ? (
                  <Image
                    src={item.resultAsset!.viewUrl}
                    alt="Result"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {item.status === 'FAILED' ? (
                      <AlertCircle className="w-8 h-8 text-destructive" />
                    ) : (
                      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <StatusBadge status={item.status} />
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {new Date(item.createdAt).toLocaleString()}
            </div>
            {item.completedAt && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-4 h-4" />
                Completed: {new Date(item.completedAt).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Error */}
          {item.status === 'FAILED' && item.errorReason && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">{item.errorReason}</p>
            </div>
          )}

          {/* Actions */}
          {hasResult && (
            <div className="flex gap-3 mt-6">
              <Button
                className="flex-1 gradient-primary hover:opacity-90"
                onClick={() => toast.success('Download started')}
              >
                <Download className="w-4 h-4 mr-2" />
                Download HD Result
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// GALLERY GRID COMPONENT
// ============================================

export function GalleryGrid({ items }: GalleryGridProps) {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleCardClick = (item: GalleryItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <GalleryCard item={item} onClick={() => handleCardClick(item)} />
          </motion.div>
        ))}
      </div>

      <DetailDialog
        item={selectedItem}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
