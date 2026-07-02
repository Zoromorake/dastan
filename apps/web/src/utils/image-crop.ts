export interface CropTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function getCoverScale(
  imageWidth: number,
  imageHeight: number,
  cropWidth: number,
  cropHeight: number,
): number {
  return Math.max(cropWidth / imageWidth, cropHeight / imageHeight);
}

export function centerCropTransform(
  imageWidth: number,
  imageHeight: number,
  cropWidth: number,
  cropHeight: number,
  scale: number,
): CropTransform {
  const displayWidth = imageWidth * scale;
  const displayHeight = imageHeight * scale;

  return {
    scale,
    offsetX: (cropWidth - displayWidth) / 2,
    offsetY: (cropHeight - displayHeight) / 2,
  };
}

export async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load image'));
    image.src = src;
  });
}

export async function renderCroppedImageDataUrl(
  imageSrc: string,
  transform: CropTransform,
  cropWidth: number,
  cropHeight: number,
  outputWidth: number,
  outputHeight: number,
): Promise<string> {
  const image = await loadImageElement(imageSrc);
  const { scale, offsetX, offsetY } = transform;

  const sourceLeft = Math.max(0, (0 - offsetX) / scale);
  const sourceTop = Math.max(0, (0 - offsetY) / scale);
  const sourceRight = Math.min(image.width, (cropWidth - offsetX) / scale);
  const sourceBottom = Math.min(image.height, (cropHeight - offsetY) / scale);

  const sourceWidth = Math.max(1, sourceRight - sourceLeft);
  const sourceHeight = Math.max(1, sourceBottom - sourceTop);

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not create canvas context');
  }

  context.drawImage(
    image,
    sourceLeft,
    sourceTop,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  return canvas.toDataURL('image/jpeg', 0.92);
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('Could not read file'));
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}
