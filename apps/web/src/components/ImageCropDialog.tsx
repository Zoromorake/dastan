import { useCallback, useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  centerCropTransform,
  getCoverScale,
  loadImageElement,
  renderCroppedImageDataUrl,
  type CropTransform,
} from '../utils/image-crop';

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string | null;
  title: string;
  description?: string;
  aspectRatio: number;
  cropWidth: number;
  cropHeight: number;
  outputWidth: number;
  outputHeight: number;
  previewClassName?: string;
  onClose: () => void;
  onComplete: (dataUrl: string) => void;
}

export function ImageCropDialog({
  open,
  imageSrc,
  title,
  description,
  aspectRatio,
  cropWidth,
  cropHeight,
  outputWidth,
  outputHeight,
  previewClassName,
  onClose,
  onComplete,
}: ImageCropDialogProps) {
  const [transform, setTransform] = useState<CropTransform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [minScale, setMinScale] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const imageSizeRef = useRef({ width: 0, height: 0 });

  const resetTransform = useCallback(async (src: string) => {
    const image = await loadImageElement(src);
    imageSizeRef.current = { width: image.width, height: image.height };
    const coverScale = getCoverScale(image.width, image.height, cropWidth, cropHeight);
    setMinScale(coverScale);
    setTransform(centerCropTransform(image.width, image.height, cropWidth, cropHeight, coverScale));
  }, [cropHeight, cropWidth]);

  useEffect(() => {
    if (!open || !imageSrc) {
      return;
    }

    void resetTransform(imageSrc);
  }, [imageSrc, open, resetTransform]);

  const clampTransform = useCallback(
    (next: CropTransform): CropTransform => {
      const { width, height } = imageSizeRef.current;
      const displayWidth = width * next.scale;
      const displayHeight = height * next.scale;

      const minOffsetX = Math.min(0, cropWidth - displayWidth);
      const minOffsetY = Math.min(0, cropHeight - displayHeight);

      return {
        scale: next.scale,
        offsetX: Math.min(0, Math.max(minOffsetX, next.offsetX)),
        offsetY: Math.min(0, Math.max(minOffsetY, next.offsetY)),
      };
    },
    [cropHeight, cropWidth],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.offsetX,
      originY: transform.offsetY,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current) {
      return;
    }

    const deltaX = event.clientX - dragStateRef.current.startX;
    const deltaY = event.clientY - dragStateRef.current.startY;

    setTransform((current) =>
      clampTransform({
        ...current,
        offsetX: dragStateRef.current!.originX + deltaX,
        offsetY: dragStateRef.current!.originY + deltaY,
      }),
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      dragStateRef.current = null;
    }
  };

  const handleZoomChange = (scale: number) => {
    const { width, height } = imageSizeRef.current;

    if (!width || !height) {
      return;
    }

    setTransform((current) => {
      const centerX = cropWidth / 2;
      const centerY = cropHeight / 2;
      const imageCenterX = (centerX - current.offsetX) / current.scale;
      const imageCenterY = (centerY - current.offsetY) / current.scale;
      const nextOffsetX = centerX - imageCenterX * scale;
      const nextOffsetY = centerY - imageCenterY * scale;

      return clampTransform({
        scale,
        offsetX: nextOffsetX,
        offsetY: nextOffsetY,
      });
    });
  };

  const handleApply = async () => {
    if (!imageSrc) {
      return;
    }

    setIsSaving(true);

    try {
      const dataUrl = await renderCroppedImageDataUrl(
        imageSrc,
        transform,
        cropWidth,
        cropHeight,
        outputWidth,
        outputHeight,
      );
      onComplete(dataUrl);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!imageSrc) {
    return null;
  }

  const { width, height } = imageSizeRef.current;
  const displayWidth = width * transform.scale;
  const displayHeight = height * transform.scale;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={`relative mx-auto overflow-hidden bg-muted ${previewClassName ?? 'rounded-xl'}`}
            style={{ width: cropWidth, height: cropHeight, aspectRatio }}
          >
            <div
              className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <img
                alt=""
                className="absolute max-w-none select-none"
                draggable={false}
                src={imageSrc}
                style={{
                  width: displayWidth || '100%',
                  height: displayHeight || '100%',
                  transform: `translate(${transform.offsetX}px, ${transform.offsetY}px)`,
                }}
              />
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/20" />
          </div>

          <div className="flex items-center gap-3">
            <ZoomOut aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <input
              aria-label="Zoom"
              className="w-full accent-primary"
              max={minScale * 3}
              min={minScale}
              step={0.01}
              type="range"
              value={transform.scale}
              onChange={(event) => handleZoomChange(Number(event.target.value))}
            />
            <ZoomIn aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </div>
          <p className="text-center text-xs text-muted-foreground">Drag to reposition · use the slider to zoom</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={isSaving} type="button" onClick={() => void handleApply()}>
            {isSaving ? 'Applying…' : 'Apply crop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
