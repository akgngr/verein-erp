"use client";

import { Button } from "@heroui/react";
import { Eraser } from "lucide-react";
import { useEffect, useRef } from "react";

/** Parmak/fare ile imza; değişince PNG data URL (boşsa null) bildirir. */
export function SignaturePad({ onChange, clearLabel, ariaLabel }: { onChange: (value: string | null) => void; clearLabel: string; ariaLabel: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111827";
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    dirty.current = false;
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        aria-label={ariaLabel}
        className="h-40 w-full touch-none rounded-medium border-2 border-dashed border-default-300 bg-white"
        onPointerDown={(event) => {
          drawing.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          const ctx = event.currentTarget.getContext("2d")!;
          const { x, y } = point(event);
          ctx.beginPath();
          ctx.moveTo(x, y);
        }}
        onPointerMove={(event) => {
          if (!drawing.current) return;
          const ctx = event.currentTarget.getContext("2d")!;
          const { x, y } = point(event);
          ctx.lineTo(x, y);
          ctx.stroke();
          dirty.current = true;
        }}
        onPointerUp={(event) => {
          drawing.current = false;
          if (dirty.current) onChange(event.currentTarget.toDataURL("image/png"));
        }}
      />
      <Button size="sm" variant="light" className="self-end" startContent={<Eraser className="size-4" />} onPress={clear}>{clearLabel}</Button>
    </div>
  );
}
