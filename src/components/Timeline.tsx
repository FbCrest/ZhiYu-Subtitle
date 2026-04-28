import React, { useRef, useEffect, useState, useMemo } from "react";
import { SubtitleItem } from "../types";
import { motion } from "motion/react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Tooltip } from "./ui/Tooltip";

interface TimelineProps {
  subtitles: SubtitleItem[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateSubtitle?: (id: string, updates: Partial<SubtitleItem>) => void;
  isDark?: boolean;
}

const SubtitleSegment = React.memo(({ 
  sub, 
  idx, 
  pixelsPerSecond, 
  isActive, 
  onSeek, 
  onUpdateSubtitle, 
  duration,
  allSubtitles,
  currentTime
}: { 
  sub: SubtitleItem; 
  idx: number; 
  pixelsPerSecond: number; 
  isActive: boolean;
  onSeek: (time: number) => void;
  onUpdateSubtitle?: (id: string, updates: Partial<SubtitleItem>) => void;
  duration: number;
  allSubtitles: SubtitleItem[];
  currentTime: number;
}) => {
  const [localTimes, setLocalTimes] = useState({ start: sub.startTime, end: sub.endTime });
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapped, setIsSnapped] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  // Sync with prop updates only when NOT dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalTimes({ start: sub.startTime, end: sub.endTime });
    }
  }, [sub.startTime, sub.endTime, isDragging]);

  const colors = [
    'bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 
    'bg-amber-600', 'bg-rose-600', 'bg-indigo-600', 'bg-cyan-600'
  ];
  const colorClass = colors[idx % colors.length];

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!onUpdateSubtitle || !elementRef.current) return;
    
    const target = elementRef.current;
    target.setPointerCapture(e.pointerId);
    e.stopPropagation();
    
    setIsDragging(true);
    const startX = e.clientX;
    const initialStart = localTimes.start;
    const initialEnd = localTimes.end;
    const rect = target.getBoundingClientRect();
    const isLeftEdge = (e.clientX - rect.left) < 12;
    const isRightEdge = (rect.right - e.clientX) < 12;

    const SNAP_THRESHOLD_PX = 8;
    const snapThreshold = SNAP_THRESHOLD_PX / pixelsPerSecond;
    const snapPoints = Array.from(new Set([
      0,
      duration,
      currentTime,
      ...allSubtitles
        .filter(s => s.id !== sub.id)
        .flatMap(s => [s.startTime, s.endTime])
    ]));

    // Track current values to commit later
    let finalStart = initialStart;
    let finalEnd = initialEnd;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / pixelsPerSecond;
      let snapped = false;

      if (isLeftEdge) {
        let targetStart = Math.max(0, Math.min(initialEnd - 0.1, initialStart + deltaTime));
        // Snapping for start edge
        for (const point of snapPoints) {
          if (Math.abs(targetStart - point) < snapThreshold) {
            targetStart = point;
            snapped = true;
            break;
          }
        }
        finalStart = targetStart;
      } else if (isRightEdge) {
        let targetEnd = Math.max(initialStart + 0.1, Math.min(duration, initialEnd + deltaTime));
        // Snapping for end edge
        for (const point of snapPoints) {
          if (Math.abs(targetEnd - point) < snapThreshold) {
            targetEnd = point;
            snapped = true;
            break;
          }
        }
        finalEnd = targetEnd;
      } else {
        const segmentDuration = initialEnd - initialStart;
        let targetStart = initialStart + deltaTime;
        let targetEnd = targetStart + segmentDuration;

        // Snapping for whole segment (either start or end can snap)
        let bestSnapDelta = Infinity;
        let bestSnapTime = targetStart;

        for (const point of snapPoints) {
          const startDelta = Math.abs(targetStart - point);
          const endDelta = Math.abs(targetEnd - point);

          if (startDelta < snapThreshold && startDelta < bestSnapDelta) {
            bestSnapDelta = startDelta;
            bestSnapTime = point;
            snapped = true;
          }
          if (endDelta < snapThreshold && endDelta < bestSnapDelta) {
            bestSnapDelta = endDelta;
            bestSnapTime = point - segmentDuration;
            snapped = true;
          }
        }

        finalStart = Math.max(0, Math.min(duration - segmentDuration, snapped ? bestSnapTime : targetStart));
        finalEnd = finalStart + segmentDuration;
      }

      setIsSnapped(snapped);

      // Update DOM directly for zero-latency feedback
      if (elementRef.current) {
        elementRef.current.style.left = `${finalStart * pixelsPerSecond}px`;
        elementRef.current.style.width = `${(finalEnd - finalStart) * pixelsPerSecond}px`;
      }
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      target.releasePointerCapture(upEvent.pointerId);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      
      // Update state once at the end
      setLocalTimes({ start: finalStart, end: finalEnd });
      onUpdateSubtitle(sub.id, { startTime: finalStart, endTime: finalEnd });
      setIsDragging(false);
      setIsSnapped(false);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div
      ref={elementRef}
      className={`absolute h-full rounded-md border flex flex-col justify-center px-1.5 overflow-hidden cursor-move group/segment select-none
        ${isActive ? 'ring-2 ring-white z-10 scale-y-105 shadow-xl' : 'opacity-80'}
        ${isDragging ? `z-50 ring-2 opacity-100 shadow-2xl scale-y-110 !transition-none ${isSnapped ? 'ring-white' : 'ring-yellow-400'}` : 'transition-all duration-150'}
        ${colorClass} border-white/10
      `}
      style={{ 
        left: localTimes.start * pixelsPerSecond, 
        width: Math.max((localTimes.end - localTimes.start) * pixelsPerSecond, 4) 
      }}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation();
          onSeek(sub.startTime);
        }
      }}
      onPointerDown={handlePointerDown}
    >
      <div className="absolute left-0 top-0 bottom-0 w-2.5 hover:bg-white/30 cursor-ew-resize z-20" />
      <span className="text-[9px] font-black text-white truncate drop-shadow-md pointer-events-none uppercase leading-tight">
        {sub.chinese}
      </span>
      {sub.vietnamese && (
        <span className="text-[7.5px] text-white/90 truncate italic pointer-events-none font-medium leading-tight">
          {sub.vietnamese}
        </span>
      )}
      <div className="absolute right-0 top-0 bottom-0 w-2.5 hover:bg-white/30 cursor-ew-resize z-20" />
    </div>
  );
});

SubtitleSegment.displayName = "SubtitleSegment";

export const Timeline: React.FC<TimelineProps> = React.memo(({
  subtitles,
  duration,
  currentTime,
  onSeek,
  onUpdateSubtitle,
  isDark = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const minZoom = 0.5;
  const maxZoom = 20;

  const pixelsPerSecond = 20 * zoom;
  const totalWidth = duration * pixelsPerSecond;

  const activeSubId = useMemo(() => {
    const active = subtitles.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
    return active?.id;
  }, [subtitles, currentTime]);

  const [isSeeking, setIsSeeking] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const timeTooltipRef = useRef<HTMLDivElement>(null);
  const hoverTooltipRef = useRef<HTMLDivElement>(null);

  // Sync playhead when currentTime changes from outside (like video playing)
  useEffect(() => {
    if (playheadRef.current && !isSeeking) {
      playheadRef.current.style.left = `${currentTime * pixelsPerSecond}px`;
    }
  }, [currentTime, pixelsPerSecond, isSeeking]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current || isSeeking) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / pixelsPerSecond;
    const clampedTime = Math.max(0, Math.min(duration, time));
    setHoverTime(clampedTime);
    
    if (hoverTooltipRef.current) {
      hoverTooltipRef.current.style.left = `${x}px`;
    }
  };

  const markers = useMemo(() => {
    const items = [];
    const step = zoom > 5 ? 1 : zoom > 2 ? 5 : 10;
    
    for (let i = 0; i <= duration; i += step) {
      items.push(
        <div
          key={i}
          className="absolute top-0 bottom-0 border-l border-zinc-500/20 flex flex-col justify-between"
          style={{ left: i * pixelsPerSecond }}
        >
          <span className="text-[8px] font-mono text-zinc-500 -ml-1 mt-1">
            {formatTimeShort(i)}
          </span>
        </div>
      );
    }
    return items;
  }, [duration, pixelsPerSecond, zoom]);

  return (
    <div className={`flex flex-col rounded-2xl overflow-hidden border ${isDark ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-200"}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/50 bg-zinc-900/10">
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Phụ đề Timeline</span>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content="Thu nhỏ">
            <button 
              onClick={() => setZoom(Math.max(minZoom, zoom * 0.8))}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
            >
              <ZoomIn className="w-4 h-4 rotate-180" />
            </button>
          </Tooltip>
          
          <div className="w-24 group relative flex items-center">
            <input 
              type="range"
              min={minZoom}
              max={maxZoom}
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500"
              style={{
                background: `linear-gradient(to right, #2563eb ${((zoom - minZoom) / (maxZoom - minZoom)) * 100}%, #27272a 0%)`
              }}
            />
          </div>

          <Tooltip content="Phóng to">
            <button 
              onClick={() => setZoom(Math.min(maxZoom, zoom * 1.2))}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="h-22 overflow-x-auto overflow-y-hidden custom-scrollbar relative bg-zinc-950/20"
      >
        <div 
          ref={containerRef}
          className="relative h-full select-none cursor-pointer" 
          style={{ width: Math.max(totalWidth, 1000) }}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverTime(null)}
          onPointerDown={(e) => {
            const container = containerRef.current;
            if (!container) return;
            
            container.setPointerCapture(e.pointerId);
            setIsSeeking(true);
            setHoverTime(null); // Hide hover tooltip while seeking
            
            const snapPoints = subtitles.flatMap(s => [s.startTime, s.endTime]);
            const snapThreshold = 8 / pixelsPerSecond;

            const handleSeek = (moveEvent: PointerEvent) => {
              const rect = container.getBoundingClientRect();
              const x = moveEvent.clientX - rect.left;
              let time = x / pixelsPerSecond;

              // Snapping for playhead
              for (const pt of snapPoints) {
                if (Math.abs(time - pt) < snapThreshold) {
                  time = pt;
                  break;
                }
              }

              const clampedTime = Math.max(0, Math.min(duration, time));
              
              // Direct DOM update for immediate feedback
              if (playheadRef.current) {
                playheadRef.current.style.left = `${clampedTime * pixelsPerSecond}px`;
              }
              if (timeTooltipRef.current) {
                timeTooltipRef.current.textContent = formatTimeSeconds(clampedTime);
              }
              
              onSeek(clampedTime);
            };

            // Initial seek on click/touch
            handleSeek(e.nativeEvent as PointerEvent);

            const handleUp = (upEvent: PointerEvent) => {
              container.releasePointerCapture(upEvent.pointerId);
              setIsSeeking(false);
              window.removeEventListener('pointermove', handleSeek);
              window.removeEventListener('pointerup', handleUp);
            };

            window.addEventListener('pointermove', handleSeek);
            window.addEventListener('pointerup', handleUp);
          }}
        >
          <div className="absolute inset-x-0 top-0 h-full pointer-events-none z-50">
            <div 
              ref={hoverTooltipRef}
              className={`absolute top-0 h-full border-l border-white/20 transition-opacity duration-200 ${hoverTime !== null ? "opacity-100" : "opacity-0"}`}
            >
              <div className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-[10px] font-mono text-zinc-300 whitespace-nowrap shadow-xl">
                {hoverTime !== null ? formatTimeSeconds(hoverTime) : ""}
              </div>
            </div>
          </div>
          <div className="absolute inset-0 h-4">
             {markers}
          </div>

          <div className="absolute inset-x-0 top-7 bottom-3">
            {subtitles.map((sub, idx) => {
              // Simple viewport check to avoid rendering off-screen segments
              // This is a basic form of virtualization
              const x = sub.startTime * pixelsPerSecond;
              const w = (sub.endTime - sub.startTime) * pixelsPerSecond;
              const scrollLeft = scrollRef.current?.scrollLeft || 0;
              const viewportWidth = scrollRef.current?.clientWidth || 2000;
              
              if (x + w < scrollLeft - 500 || x > scrollLeft + viewportWidth + 500) {
                return null;
              }

              return (
                <SubtitleSegment
                  key={sub.id}
                  sub={sub}
                  idx={idx}
                  pixelsPerSecond={pixelsPerSecond}
                  isActive={sub.id === activeSubId}
                  onSeek={onSeek}
                  onUpdateSubtitle={onUpdateSubtitle}
                  duration={duration}
                  allSubtitles={subtitles}
                  currentTime={currentTime}
                />
              );
            })}
          </div>

          {/* Playhead */}
          <div 
            ref={playheadRef}
            className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-40 pointer-events-none"
            style={{ left: currentTime * pixelsPerSecond }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-600 rounded-sm rotate-45 shadow-lg" />
            
            {/* Time Tooltip */}
            <div 
              ref={timeTooltipRef}
              className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-[10px] font-mono text-white whitespace-nowrap shadow-xl transition-opacity pointer-events-none ${isSeeking ? 'opacity-100' : 'opacity-0 animate-out fade-out duration-300'}`}
            >
              {formatTimeSeconds(currentTime)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

function formatTimeShort(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatTimeSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
