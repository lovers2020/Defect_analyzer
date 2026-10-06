import { useRef } from "react";

export function ColumnResizeHandle({ label, width, onResize, onReset }: {
  label: string;
  width: number;
  onResize: (width: number) => void;
  onReset: () => void;
}) {
  const drag = useRef<{ startX: number; width: number } | null>(null);
  const resize = (value: number) => onResize(Math.max(64, Math.min(640, value)));

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={`${label.replace(/\s+/g, " ")} 열 너비 조절`}
      aria-orientation="vertical"
      aria-valuemin={64}
      aria-valuemax={640}
      aria-valuenow={width}
      title="드래그 또는 방향키로 너비 조절 · 더블클릭으로 자동 너비 복원"
      className="absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none select-none hover:bg-amber-300 focus:bg-amber-300 focus:outline-none"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        drag.current = { startX: event.clientX, width };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (drag.current) resize(drag.current.width + event.clientX - drag.current.startX);
      }}
      onPointerUp={(event) => {
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onLostPointerCapture={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onDoubleClick={onReset}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          resize(width + (event.key === "ArrowRight" ? 1 : -1) * (event.shiftKey ? 50 : 10));
        } else if (event.key === "Home") {
          event.preventDefault();
          onReset();
        }
      }}
    />
  );
}
