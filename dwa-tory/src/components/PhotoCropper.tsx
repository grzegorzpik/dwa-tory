// Przeciąganie + zoom, zapis przez <canvas> (spec §5.1/§5.7). Port z
// docs/makiety/onboarding.tsx.

import { useRef, useState, type PointerEvent } from 'react';
import { C } from '../theme';

export interface CropResult {
  src: string;
  scale: number;
  x: number;
  y: number;
}

export function PhotoCropper({
  src,
  initial,
  onConfirm,
  onCancel,
}: {
  src: string;
  initial?: { scale?: number; x?: number; y?: number };
  onConfirm: (result: CropResult) => void;
  onCancel: () => void;
}) {
  const [scale, setScale] = useState(initial?.scale ?? 1.3);
  const [pos, setPos] = useState({ x: initial?.x ?? 0, y: initial?.y ?? 0 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <div className="rise flex flex-col items-center">
      <div
        className="relative rounded-full overflow-hidden mb-4 cursor-grab"
        style={{ width: 180, height: 180, border: `2px solid ${C.gold}`, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
      </div>
      <div className="w-full flex items-center gap-3 mb-4">
        <span className="font-body text-[10px]" style={{ color: C.muted }}>Zoom</span>
        <input
          type="range"
          min="1"
          max="3"
          step="0.05"
          value={scale}
          onChange={(e) => setScale(parseFloat(e.target.value))}
          className="flex-1"
          style={{ accentColor: C.gold }}
        />
      </div>
      <div className="font-body text-[10px] mb-4" style={{ color: C.muted }}>Przeciągnij zdjęcie, żeby ustawić kadr.</div>
      <div className="flex gap-2 w-full">
        <button onClick={onCancel} className="flex-1 font-body text-xs py-2.5 rounded-xl bg-transparent cursor-pointer" style={{ border: `1px solid ${C.line}`, color: C.muted }}>
          Anuluj
        </button>
        <button
          onClick={() => onConfirm({ src, scale, x: pos.x, y: pos.y })}
          className="flex-1 font-body text-xs font-semibold py-2.5 rounded-xl cursor-pointer border-0"
          style={{ background: C.gold, color: '#15241F' }}
        >
          Zatwierdź
        </button>
      </div>
    </div>
  );
}
