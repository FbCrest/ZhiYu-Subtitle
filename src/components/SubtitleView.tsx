/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { SubtitleItem, AppLanguage } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Languages, Download, Trash2 } from 'lucide-react';
import { translations } from '../i18n';
import { Tooltip } from './ui/Tooltip';
import { toast } from 'sonner';
import { VariableSizeList as List } from 'react-window';

interface SubtitleViewProps {
  subtitles: SubtitleItem[];
  currentTime: number;
  onSeek: (time: number) => void;
  onUpdateSubtitle: (id: string, updates: Partial<SubtitleItem>) => void;
  onDeleteSubtitle: (id: string) => void;
  onAddSubtitle: (time: number) => void;
  onSplitSubtitle: (id: string, time: number) => void;
  isTranslating: boolean;
  language: AppLanguage;
}

interface ListData {
  subtitles: SubtitleItem[];
  activeIndex: number;
  editingId: string | null;
  editingTime: { id: string; field: 'start' | 'end' } | null;
  onSeek: (time: number) => void;
  onUpdateSubtitle: (id: string, updates: Partial<SubtitleItem>) => void;
  onDeleteSubtitle: (id: string) => void;
  onSplitSubtitleWithCurrentTime: (id: string) => void;
  setEditingId: (id: string | null) => void;
  setEditingTime: (val: { id: string; field: 'start' | 'end' } | null) => void;
  handleTimeEdit: (id: string, field: 'start' | 'end', value: string) => void;
}

const SubtitleRow = React.memo(({ 
  sub, 
  index, 
  isActive, 
  isEditing, 
  onSeek, 
  onUpdateSubtitle, 
  onDeleteSubtitle, 
  onSplitSubtitleWithCurrentTime,
  setEditingId,
  editingTime,
  setEditingTime,
  handleTimeEdit,
  style
}: {
  sub: SubtitleItem;
  index: number;
  isActive: boolean;
  isEditing: boolean;
  onSeek: (time: number) => void;
  onUpdateSubtitle: (id: string, updates: Partial<SubtitleItem>) => void;
  onDeleteSubtitle: (id: string) => void;
  onSplitSubtitleWithCurrentTime: (id: string) => void;
  setEditingId: (id: string | null) => void;
  editingTime: { id: string; field: 'start' | 'end' } | null;
  setEditingTime: (val: { id: string; field: 'start' | 'end' } | null) => void;
  handleTimeEdit: (id: string, field: 'start' | 'end', value: string) => void;
  style?: React.CSSProperties;
}) => {
  return (
    <div style={style} className="px-3 py-1">
      <div
        id={`subtitle-${sub.id}`}
        className={`p-1.5 rounded-xl border transition-all group relative h-full
          ${isActive 
            ? 'bg-blue-600/15 border-blue-500/50 ring-1 ring-blue-500/20 shadow-lg shadow-blue-900/10' 
            : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-800/50 hover:border-zinc-700/80'}
          ${isEditing ? 'ring-2 ring-blue-500 bg-zinc-900/90 shadow-2xl z-10' : ''}
        `}
      >
        <div className="flex items-center justify-between mb-1 shrink-0">
          <div className="flex items-center gap-2">
            <div className="text-[10px] font-black text-zinc-600 min-w-[1.5rem] text-center">
              {index + 1}
            </div>
            {editingTime?.id === sub.id && editingTime?.field === 'start' ? (
              <input
                autoFocus
                type="text"
                defaultValue={formatTime(sub.startTime)}
                onBlur={(e) => {
                  handleTimeEdit(sub.id, 'start', e.target.value);
                  setEditingTime(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTimeEdit(sub.id, 'start', e.currentTarget.value);
                    setEditingTime(null);
                  }
                }}
                className="w-20 px-1 py-0.5 rounded bg-zinc-950 border border-blue-500 text-[10px] font-mono text-white text-center focus:outline-none"
              />
            ) : (
              <div 
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-all duration-300 ${
                  isActive 
                    ? 'bg-blue-900/40 text-blue-300' 
                    : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
                onClick={(e) => {
                  if (e.detail === 2) setEditingTime({ id: sub.id, field: 'start' });
                  else onSeek(sub.startTime);
                }}
              >
                {formatTime(sub.startTime)}
              </div>
            )}
            
            <span className="text-zinc-600 font-black">—</span>

            {editingTime?.id === sub.id && editingTime?.field === 'end' ? (
              <input
                autoFocus
                type="text"
                defaultValue={formatTime(sub.endTime)}
                onBlur={(e) => {
                  handleTimeEdit(sub.id, 'end', e.target.value);
                  setEditingTime(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleTimeEdit(sub.id, 'end', e.currentTarget.value);
                    setEditingTime(null);
                  }
                }}
                className="w-20 px-1 py-0.5 rounded bg-zinc-950 border border-blue-500 text-[10px] font-mono text-white text-center focus:outline-none"
              />
            ) : (
              <div 
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold cursor-pointer transition-all duration-300 ${
                  isActive 
                    ? 'bg-zinc-700/50 text-zinc-300' 
                    : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                }`}
                onClick={(e) => {
                  if (e.detail === 2) setEditingTime({ id: sub.id, field: 'end' });
                  else onSeek(sub.endTime);
                }}
              >
                {formatTime(sub.endTime)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onSplitSubtitleWithCurrentTime(sub.id)}
              className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteSubtitle(sub.id)}
              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-2 overflow-hidden">
          <div 
            className="relative cursor-pointer"
            onClick={() => setEditingId(sub.id)}
          >
            {isEditing ? (
              <textarea
                autoFocus
                value={sub.chinese}
                onChange={(e) => onUpdateSubtitle(sub.id, { chinese: e.target.value })}
                onBlur={() => setEditingId(null)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none min-h-[40px]"
              />
            ) : (
              <p 
                className={`text-sm leading-tight cursor-text ${isActive ? 'text-white' : 'text-zinc-200'} ${!sub.chinese ? 'italic text-zinc-500' : ''}`}
              >
                {sub.chinese || "Nhấp để chỉnh sửa nội dung gốc..."}
              </p>
            )}
          </div>

          <div className="cursor-pointer" onClick={() => setEditingId(sub.id)}>
            {isEditing ? (
              <textarea
                value={sub.vietnamese || ""}
                onChange={(e) => onUpdateSubtitle(sub.id, { vietnamese: e.target.value })}
                onBlur={() => setEditingId(null)}
                placeholder="Bản dịch..."
                className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg p-2 text-sm text-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none min-h-[30px] italic"
              />
            ) : (
              sub.vietnamese && (
                <p className={`text-xs font-medium italic border-t border-white/5 pt-1.5 mt-1 ${isActive ? 'text-blue-400' : 'text-blue-300'}`}>
                  {sub.vietnamese}
                </p>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  // Only re-render if the core data changes or active/editing state changes
  // We ignore small currentTime changes to stop flickering
  return (
    prev.sub.id === next.sub.id &&
    prev.sub.startTime === next.sub.startTime &&
    prev.sub.endTime === next.sub.endTime &&
    prev.sub.chinese === next.sub.chinese &&
    prev.sub.vietnamese === next.sub.vietnamese &&
    prev.isActive === next.isActive &&
    prev.isEditing === next.isEditing &&
    prev.editingTime === next.editingTime &&
    prev.style?.top === next.style?.top
  );
});

SubtitleRow.displayName = "SubtitleRow";

const Row = React.memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: ListData }) => {
  const { 
    subtitles, activeIndex, editingId, editingTime, onSeek, 
    onUpdateSubtitle, onDeleteSubtitle, onSplitSubtitleWithCurrentTime, 
    setEditingId, setEditingTime, handleTimeEdit 
  } = data;
  
  const sub = subtitles[index];
  if (!sub) return null;

  return (
    <SubtitleRow
      sub={sub}
      index={index}
      isActive={index === activeIndex}
      isEditing={editingId === sub.id}
      onSeek={onSeek}
      onUpdateSubtitle={onUpdateSubtitle}
      onDeleteSubtitle={onDeleteSubtitle}
      onSplitSubtitleWithCurrentTime={onSplitSubtitleWithCurrentTime}
      setEditingId={setEditingId}
      editingTime={editingTime}
      setEditingTime={setEditingTime}
      handleTimeEdit={handleTimeEdit}
      style={style}
    />
  );
});

Row.displayName = "Row";

export const SubtitleView: React.FC<SubtitleViewProps> = React.memo(({ 
  subtitles, 
  currentTime, 
  onSeek, 
  onUpdateSubtitle,
  onDeleteSubtitle,
  onAddSubtitle,
  onSplitSubtitle,
  language 
}) => {
  const t = translations[language];
  const listRef = useRef<List>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTime, setEditingTime] = useState<{ id: string; field: 'start' | 'end' } | null>(null);
  const [lastActiveId, setLastActiveId] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState(600);

  useEffect(() => {
    const handleResize = () => {
      if (scrollContainerRef.current) {
        setContainerHeight(scrollContainerRef.current.offsetHeight);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTimeEdit = useCallback((id: string, field: 'start' | 'end', value: string) => {
    const parts = value.split(/[:.]/);
    if (parts.length >= 2) {
      const mins = parseInt(parts[0]) || 0;
      const secs = parseInt(parts[1]) || 0;
      const ms = parts[2] ? parseInt(parts[2].padEnd(2, '0').slice(0, 2)) : 0;
      const totalSeconds = mins * 60 + secs + ms / 100;
      
      if (!isNaN(totalSeconds)) {
        onUpdateSubtitle(id, { [field === 'start' ? 'startTime' : 'endTime']: totalSeconds });
      }
    }
  }, [onUpdateSubtitle]);

  // Sync scroll to active item
  useEffect(() => {
    const activeIndex = subtitles.findIndex(s => currentTime >= s.startTime && currentTime <= s.endTime);
    if (activeIndex !== -1) {
      const activeId = subtitles[activeIndex].id;
      if (activeId !== lastActiveId && !editingId && !editingTime) {
        setLastActiveId(activeId);
        listRef.current?.scrollToItem(activeIndex, 'center');
      }
    } else if (lastActiveId) {
      setLastActiveId(null);
    }
  }, [currentTime, subtitles, lastActiveId, editingId, editingTime]);

  // Handle dynamic row heights
  const getItemSize = useCallback((index: number) => {
    const sub = subtitles[index];
    if (!sub) return 80;
    
    let baseHeight = 60; // Header + padding reduced
    const chineseLines = Math.ceil((sub.chinese?.length || 0) / 60) || 1;
    const vietLines = sub.vietnamese ? Math.ceil(sub.vietnamese.length / 65) || 1 : 0;
    
    return baseHeight + (chineseLines * 20) + (vietLines * 18);
  }, [subtitles]);

  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [subtitles]);

  const downloadSRT = (type: 'original' | 'translated') => {
    if (subtitles.length === 0) return;

    const content = subtitles.map((sub, index) => {
      const start = formatSRTTime(sub.startTime);
      const end = formatSRTTime(sub.endTime);
      const text = type === 'original' ? sub.chinese : (sub.vietnamese || '');
      return `${index + 1}\n${start} --> ${end}\n${text}\n`;
    }).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subtitle_${type}.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Đã xuất phụ đề ${type === 'original' ? 'gốc' : 'dịch'}`);
  };

  const currentTimeRef = useRef(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const onSplitSubtitleWithCurrentTime = useCallback((id: string) => {
    onSplitSubtitle(id, currentTimeRef.current);
  }, [onSplitSubtitle]);

  const activeIndex = useMemo(() => 
    subtitles.findIndex(s => currentTime >= s.startTime && currentTime <= s.endTime),
    [subtitles, currentTime]
  );

  const itemData: ListData = useMemo(() => ({
    subtitles,
    activeIndex,
    editingId,
    editingTime,
    onSeek,
    onUpdateSubtitle,
    onDeleteSubtitle,
    onSplitSubtitleWithCurrentTime,
    setEditingId,
    setEditingTime,
    handleTimeEdit
  }), [subtitles, activeIndex, editingId, editingTime, onSeek, onUpdateSubtitle, onDeleteSubtitle, onSplitSubtitleWithCurrentTime, setEditingId, setEditingTime, handleTimeEdit]);

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden bg-zinc-950/40 border border-zinc-800/50">
      <div className="p-4 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-900/30 shrink-0">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-mono uppercase tracking-widest text-zinc-500 flex items-center gap-2">
            <Clock className="w-4 h-4" /> {t.timeline}
          </h3>
          {subtitles.length > 0 && (
            <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-xs font-black rounded-lg border border-blue-500/20 tracking-tighter shadow-xl">
              {subtitles.length} dòng phụ đề
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {subtitles.length > 0 && (
            <div className="flex items-center gap-2 mr-4 bg-zinc-900/50 p-1 rounded-xl border border-white/5">
              <Tooltip content="Tải phụ đề gốc (.srt)">
                <button
                  onClick={() => downloadSRT('original')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-black transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Tải phụ đề gốc
                </button>
              </Tooltip>
              <Tooltip content="Tải phụ đề đã dịch (.srt)">
                <button
                  onClick={() => downloadSRT('translated')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-black transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Tải phụ đề đã dịch
                </button>
              </Tooltip>
            </div>
          )}
          
          <Tooltip content="Thêm dòng phụ đề mới">
            <button
              onClick={() => onAddSubtitle(currentTime)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all"
            >
              + THÊM
            </button>
          </Tooltip>
        </div>
      </div>
      
      <div ref={scrollContainerRef} className="flex-1 min-h-0 relative">
        {subtitles.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-zinc-600 p-8 text-center italic">
            <p>{t.noSubtitles}</p>
          </div>
        ) : (
          <List
            ref={listRef}
            height={containerHeight}
            itemCount={subtitles.length}
            itemSize={getItemSize}
            itemData={itemData}
            width="100%"
            className="custom-scrollbar"
          >
            {Row}
          </List>
        )}
      </div>
    </div>
  );
});

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}
