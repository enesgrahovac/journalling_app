import React, { useRef, useState } from 'react';
import { Camera, Square, RotateCcw, Images, Upload, ChevronUp, ChevronDown, Trash2, Check } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (mediaIds: string[], extractedText: string) => void;
}

const MAX_IMAGE_SIDE_PX = 2000;
const JPEG_QUALITIES = [0.8, 0.7, 0.6, 0.5];
const MAX_UPLOAD_BYTES = 9.5 * 1024 * 1024; // Keep under model 10MB limit with buffer

async function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

async function downscaleAndCompressToJpeg(
  sourceBlob: Blob,
  options: { maxSide?: number; grayscale?: boolean }
): Promise<Blob> {
  const { maxSide = MAX_IMAGE_SIDE_PX, grayscale = false } = options;
  const img = await loadImageFromBlob(sourceBlob);

  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const targetW = Math.max(1, Math.round(img.width * scale));
  const targetH = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.drawImage(img, 0, 0, targetW, targetH);

  if (grayscale) {
    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = data[i + 1] = data[i + 2] = y;
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // Try multiple qualities to get under limit
  for (const q of JPEG_QUALITIES) {
    const out: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', q);
    });
    if (out.size <= MAX_UPLOAD_BYTES) return out;
  }

  // If still large, return the last try
  const last: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', JPEG_QUALITIES[JPEG_QUALITIES.length - 1]);
  });
  return last;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [staged, setStaged] = useState<Array<{ preview: string; mediaId: string }>>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      alert('Could not access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  const uploadBlobToMedia = async (blob: Blob, filename: string, mime: string) => {
    const form = new FormData();
    form.append('file', new File([blob], filename, { type: mime }));
    const uploadRes = await fetch('/api/upload-url', { method: 'POST', body: form });
    if (!uploadRes.ok) throw new Error('Upload failed');
    const { mediaId, url } = await uploadRes.json();
    return { mediaId, url } as { mediaId: string; url: string };
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const originalBlob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/jpeg', 0.9)
    );

    try {
      const processed = await downscaleAndCompressToJpeg(originalBlob, { grayscale: true });
      const localPreview = URL.createObjectURL(processed);
      const { mediaId } = await uploadBlobToMedia(processed, 'capture.jpg', 'image/jpeg');
      setStaged((prev) => [...prev, { preview: localPreview, mediaId }]);
    } catch (e) {
      console.error(e);
      alert('Failed to upload captured image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files) return;
    const maxCount = 10;
    for (const file of Array.from(files).slice(0, maxCount)) {
      let workingBlob: Blob = file;
      let workingName = file.name || 'upload';

      // HEIC/HEIF detection via MIME or extension
      const targetMime = file.type || 'application/octet-stream';
      const isHeicMime = /heic|heif/i.test(targetMime);
      const isHeicExt = /\.(heic|heif)$/i.test(workingName);

      if (!targetMime.startsWith('image/') && !isHeicExt) {
        alert(`Unsupported file type: ${file.name}`);
        continue;
      }

      try {
        setIsProcessing(true);

        if (isHeicMime || isHeicExt) {
          try {
            const heic2any = (await import('heic2any')).default as unknown as (opts: { blob: Blob; toType: string; quality?: number }) => Promise<Blob | Blob[]>;
            const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
            workingBlob = Array.isArray(converted) ? converted[0] : converted;
            workingName = workingName.replace(/\.(heic|heif)$/i, '.jpg');
          } catch (convErr) {
            console.error('HEIC conversion failed', convErr);
            alert('HEIC not supported. Failed to convert. Please upload a JPG/PNG.');
            continue;
          }
        }

        const processed = await downscaleAndCompressToJpeg(workingBlob, { grayscale: true });
        const localPreview = URL.createObjectURL(processed);
        const { mediaId } = await uploadBlobToMedia(processed, workingName.replace(/\.(png)$/i, '.jpg'), 'image/jpeg');
        setStaged((prev) => [...prev, { preview: localPreview, mediaId }]);
      } catch (e) {
        console.error(e);
        alert(`Failed to upload ${file.name}`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    setStaged((prev) => {
      const next = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= next.length) return prev;
      const [item] = next.splice(index, 1);
      next.splice(newIndex, 0, item);
      return next;
    });
  };

  const removeItem = (index: number) => {
    const toRevoke = staged[index]?.preview;
    if (toRevoke) URL.revokeObjectURL(toRevoke);
    setStaged((prev) => prev.filter((_, i) => i !== index));
  };

  const clearStaged = () => {
    staged.forEach((s) => URL.revokeObjectURL(s.preview));
    setStaged([]);
  };

  const finalizeAndOcr = async () => {
    if (staged.length === 0) return;
    setIsFinalizing(true);
    try {
      const mediaIds = staged.map((s) => s.mediaId);
      const ocrRes = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaIds }),
      });
      if (!ocrRes.ok) throw new Error('OCR failed');
      const ocrJson = await ocrRes.json();
      const results: Array<{ mediaId: string; text: string }> = (ocrJson.results || []).map((r: any) => ({ mediaId: r.mediaId, text: r.text }));
      const byOrder = mediaIds.map((id) => results.find((r) => r.mediaId === id)?.text || '').map((t, i) => `--- Page ${i + 1} ---\n\n${t}`);
      const combined = byOrder.join('\n\n');

      onCapture(mediaIds, combined);
      clearStaged();
      stopCamera();
    } catch (e) {
      console.error(e);
      alert('Failed to process OCR for staged images.');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4 border-2 border-black bg-white">
      {/* Retro window title bar */}
      <div className="w-full border-b-2 border-black pb-2 mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-black bg-white"></div>
          <span className="text-sm font-mono">Camera.app</span>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full border-2 border-black ${!isStreaming ? 'hidden' : ''}`}
          style={{ aspectRatio: '4/3' }}
        />
        {!isStreaming && (
          <div className="w-full aspect-[4/3] border-2 border-black bg-muted flex items-center justify-center">
            <Camera className="w-16 h-16" />
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-center">
        {!isStreaming ? (
          <button
            onClick={startCamera}
            className="px-6 py-2 border-2 border-black bg-white hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 transition-all"
            style={{ boxShadow: '3px 3px 0px #000000' }}
          >
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4" />
              <span>Start Camera</span>
            </div>
          </button>
        ) : (
          <>
            <button
              onClick={capturePhoto}
              disabled={isProcessing}
              className="px-6 py-2 border-2 border-black bg-white hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50"
              style={{ boxShadow: '3px 3px 0px #000000' }}
            >
              <div className="flex items-center space-x-2">
                <Square className="w-4 h-4" />
                <span>{isProcessing ? 'Processing...' : 'Capture'}</span>
              </div>
            </button>
            <button
              onClick={stopCamera}
              disabled={isProcessing}
              className="px-6 py-2 border-2 border-black bg-white hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50"
              style={{ boxShadow: '3px 3px 0px #000000' }}
            >
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-4 h-4" />
                <span>Cancel</span>
              </div>
            </button>
          </>
        )}

        <label className="px-6 py-2 border-2 border-black bg-white hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer" style={{ boxShadow: '3px 3px 0px #000000' }}>
          <div className="flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Upload images</span>
          </div>
          <input
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />
        </label>
      </div>

      {staged.length > 0 && (
        <div className="w-full max-w-md border-2 border-black p-3 bg-muted">
          <div className="flex items-center space-x-2 mb-2">
            <Images className="w-4 h-4" />
            <span className="font-mono text-sm">Staged images ({staged.length})</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {staged.map((item, idx) => (
              <div key={item.mediaId} className="relative border border-black bg-white">
                <img src={item.preview} alt="" className="w-full h-24 object-cover" />
                <div className="absolute top-1 right-1 flex flex-col space-y-1">
                  <button onClick={() => moveItem(idx, -1)} className="w-6 h-6 border border-black bg-white hover:bg-accent flex items-center justify-center">
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => moveItem(idx, 1)} className="w-6 h-6 border border-black bg-white hover:bg-accent flex items-center justify-center">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button onClick={() => removeItem(idx)} className="w-6 h-6 border border-black bg-white hover:bg-accent flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={clearStaged}
              className="px-4 py-2 border-2 border-black bg-white hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 transition-all"
              style={{ boxShadow: '2px 2px 0px #000000' }}
            >
              Clear
            </button>
            <button
              onClick={finalizeAndOcr}
              disabled={isProcessing || isFinalizing}
              className="px-4 py-2 border-2 border-black bg-white hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 transition-all disabled:opacity-50"
              style={{ boxShadow: '2px 2px 0px #000000' }}
            >
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4" />
                <span>{isFinalizing ? 'Finishing...' : 'Finish & OCR'}</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {(isProcessing || isFinalizing) && (
        <div className="mt-2 p-3 border-2 border-black bg-muted">
          <p className="text-center font-mono text-sm">
            {isFinalizing ? 'Extracting text from images...' : 'Uploading/processing image...'}
          </p>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;