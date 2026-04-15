/**
 * Image compression utility for OCR and database storage
 * Target size: 250KB - 350KB
 */

export async function compressImage(
  imageSrc: string,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions (if needed)
      if (width > maxWidth || height > maxHeight) {
        if (width > height) {
          height *= maxWidth / width;
          width = maxWidth;
        } else {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return reject(new Error("Could not get canvas context"));
      }

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      
      // Use image/jpeg for better compression of photos/invoices
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      
      console.log(`[ImageCompression] Original dimensions: ${img.width}x${img.height}`);
      console.log(`[ImageCompression] New dimensions: ${width}x${height}`);
      console.log(`[ImageCompression] Final size: ${(compressedDataUrl.length / 1024).toFixed(2)} KB`);
      
      resolve(compressedDataUrl);
    };
    img.onerror = (err) => reject(err);
    img.src = imageSrc;
  });
}
