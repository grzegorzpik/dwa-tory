// Kadrowanie zdjęcia profilowego przez <canvas> (spec §8: nigdy nie
// zapisywać surowego pliku z aparatu). Port z docs/makiety/onboarding.tsx —
// logika 1:1, tylko dodane typy.

export interface CropParams {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function cropImageToDataUrl(src: string, scale: number, offsetX: number, offsetY: number, frameSize: number, outputSize = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context niedostępny'));
        return;
      }
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const ratio = outputSize / frameSize;
      const drawW = img.width * scale * ratio;
      const drawH = img.height * scale * ratio;
      const cx = outputSize / 2 + offsetX * ratio;
      const cy = outputSize / 2 + offsetY * ratio;
      ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Nie udało się wczytać obrazu'));
    img.src = src;
  });
}
