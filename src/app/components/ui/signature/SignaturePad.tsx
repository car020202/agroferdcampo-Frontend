import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  onSignatureChange: (signatureBase64: string | null) => void;
  className?: string;
}

export function SignaturePad({ onSignatureChange, className = '' }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  // Set up canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Make canvas sharp on high DPI displays
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
    }
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent scrolling when touching the canvas
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }
    
    const coords = getCoordinates(e);
    if (!coords) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      setIsDrawing(true);
      setIsEmpty(false);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }

    const coords = getCoordinates(e);
    if (!coords) return;

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.closePath();
    }
    setIsDrawing(false);
    
    // Save signature
    if (canvasRef.current) {
      onSignatureChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setIsEmpty(true);
      onSignatureChange(null);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="relative border-2 border-dashed border-[var(--border)] rounded-2xl bg-white overflow-hidden transition-colors hover:border-emerald-500/50" style={{ touchAction: 'none' }}>
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-medium pointer-events-none select-none">
            Firma del cliente aquí...
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="w-full h-40 cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex justify-end h-5">
        <button 
          type="button" 
          onClick={clearSignature}
          disabled={isEmpty}
          className="text-sm text-red-500 hover:text-red-600 font-bold disabled:opacity-0 transition-opacity"
        >
          Limpiar firma
        </button>
      </div>
    </div>
  );
}
