"use client";
import { useState, useRef } from "react";

const coords: Record<number, { x: number; y: number }> = {
  1: { x: 25, y: 25 }, 2: { x: 75, y: 25 }, 3: { x: 125, y: 25 },
  4: { x: 25, y: 75 }, 5: { x: 75, y: 75 }, 6: { x: 125, y: 75 },
  7: { x: 25, y: 125 }, 8: { x: 75, y: 125 }, 9: { x: 125, y: 125 }
};

interface Props {
  pattern: number[];
  onChange?: (p: number[]) => void;
  readOnly?: boolean;
  size?: number;
}

export default function PatternLock({ pattern = [], onChange, readOnly = false, size = 150 }: Props) {
  const [isDrawing, setIsDrawing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = size / 150;

  const getMatchedNode = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return null;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const hitRadius = 25 * scale;
    for (const [numStr, pos] of Object.entries(coords)) {
      const cx = pos.x * scale;
      const cy = pos.y * scale;
      if ((cx - x) ** 2 + (cy - y) ** 2 <= hitRadius ** 2) return parseInt(numStr);
    }
    return null;
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    const matched = getMatchedNode(e);
    if (matched !== null) { setIsDrawing(true); onChange?.([matched]); }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    if ("touches" in e) e.preventDefault();
    const matched = getMatchedNode(e);
    if (matched !== null && !pattern.includes(matched)) onChange?.([...pattern, matched]);
  };

  const handleEnd = () => { if (!readOnly) setIsDrawing(false); };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative", width: `${size}px`, height: `${size}px`,
        userSelect: "none", touchAction: "none",
        background: readOnly ? "rgba(0,0,0,0.02)" : "#fff",
        borderRadius: "8px", border: readOnly ? "1px dashed #ccc" : "1px solid #ccc",
        cursor: readOnly ? "default" : "crosshair"
      }}
      onTouchStart={handleStart} onMouseDown={handleStart}
      onTouchMove={handleMove} onMouseMove={handleMove}
      onTouchEnd={handleEnd} onMouseUp={handleEnd} onMouseLeave={handleEnd}
    >
      <svg width={size} height={size} style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
        {pattern.map((node, i) => {
          if (i === 0) return null;
          const prev = coords[pattern[i - 1]];
          const curr = coords[node];
          if (!prev || !curr) return null;
          return <line key={i} x1={prev.x * scale} y1={prev.y * scale} x2={curr.x * scale} y2={curr.y * scale} stroke="#4338CA" strokeWidth={5 * scale} strokeLinecap="round" />;
        })}
      </svg>
      {Object.entries(coords).map(([numStr, pos]) => {
        const num = parseInt(numStr);
        const isActive = pattern.includes(num);
        const isFirst = pattern[0] === num;
        return (
          <div key={num} style={{
            position: "absolute", width: `${24 * scale}px`, height: `${24 * scale}px`,
            left: `${(pos.x - 12) * scale}px`, top: `${(pos.y - 12) * scale}px`,
            borderRadius: "50%", backgroundColor: isActive ? (isFirst ? "#10B981" : "#4338CA") : "#CBD5E1",
            transition: "background-color 0.1s", pointerEvents: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: `${10 * scale}px`, fontWeight: "bold",
            boxShadow: isFirst ? "0 0 0 3px rgba(16, 185, 129, 0.3)" : "none"
          }}>
            {isFirst && "I"}
          </div>
        );
      })}
    </div>
  );
}
