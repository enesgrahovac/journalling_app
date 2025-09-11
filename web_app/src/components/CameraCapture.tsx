import React, { useRef, useState } from 'react';
import { Camera, Square, RotateCcw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageData: string, extractedText: string) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera on mobile
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

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      
      // Mock OCR text extraction - in real app this would call an OCR API
      const mockExtractedText = await simulateOCR();
      
      onCapture(imageData, mockExtractedText);
      stopCamera();
      setIsProcessing(false);
    }
  };

  const simulateOCR = (): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const sampleTexts = [
          "Today was a productive day. I managed to complete most of my tasks and felt energized throughout. The morning walk really helped clear my mind.",
          "Feeling grateful for the small moments today. Had coffee with a friend and we talked about our dreams for the future. Sometimes the best conversations happen unexpectedly.",
          "Struggling with some decisions lately. Need to trust my instincts more and stop overthinking everything. Progress over perfection.",
          "Beautiful sunset tonight. Reminded me to pause and appreciate the simple things in life. Nature has a way of putting things in perspective.",
          "Learning something new every day. Today I realized that being vulnerable with others actually creates deeper connections. Growth is uncomfortable but necessary."
        ];
        const randomText = sampleTexts[Math.floor(Math.random() * sampleTexts.length)];
        resolve(randomText);
      }, 2000); // Simulate processing time
    });
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

      <div className="flex space-x-4">
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
      </div>

      {isProcessing && (
        <div className="mt-4 p-4 border-2 border-black bg-muted">
          <p className="text-center font-mono text-sm">
            Extracting text from image...
          </p>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;