/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Type, Maximize, ArrowsUpFromLine, Palette, Contrast, Layers, Square, ListFilter, Bold, Italic, Underline, Strikethrough, ChevronDown, Check, ArrowUp, ArrowDown, Move, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SubtitleStyle, AppLanguage } from '../types';
import { translations } from '../i18n';

import { Tooltip } from './ui/Tooltip';

interface SubtitleStyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  style: SubtitleStyle;
  defaultStyle: SubtitleStyle;
  onSave: (style: SubtitleStyle) => void;
  onChange?: (style: SubtitleStyle) => void;
  language: AppLanguage;
  isDark: boolean;
  activeSubtitle?: { chinese: string; vietnamese?: string };
}

const FONT_OPTIONS = [
  // Nhóm System fonts (không cần load)
  { label: 'Sans Serif', value: 'sans-serif', weight: '400' },
  { label: 'Serif', value: 'serif', weight: '400' },
  { label: 'Monospace', value: 'monospace', weight: '400' },
  // Nhóm Google Fonts phổ biến cho subtitle
  { label: 'Be Vietnam Pro', value: "'Be Vietnam Pro', sans-serif", weight: '400' },
  { label: 'Be Vietnam Pro Bold', value: "'Be Vietnam Pro', sans-serif", weight: '700' },
  { label: 'Caveat', value: "'Caveat', cursive", weight: '400' },
  { label: 'Dancing Script', value: "'Dancing Script', cursive", weight: '400' },
  { label: 'Inter', value: "'Inter', sans-serif", weight: '400' },
  { label: 'Inter Bold', value: "'Inter', sans-serif", weight: '700' },
  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace", weight: '400' },
  { label: 'Lato', value: "'Lato', sans-serif", weight: '400' },
  { label: 'Lato Bold', value: "'Lato', sans-serif", weight: '700' },
  { label: 'Lexend', value: "'Lexend', sans-serif", weight: '400' },
  { label: 'Lexend Bold', value: "'Lexend', sans-serif", weight: '700' },
  { label: 'Montserrat', value: "'Montserrat', sans-serif", weight: '400' },
  { label: 'Montserrat Bold', value: "'Montserrat', sans-serif", weight: '700' },
  { label: 'Noto Sans', value: "'Noto Sans', sans-serif", weight: '400' },
  { label: 'Noto Sans Bold', value: "'Noto Sans', sans-serif", weight: '700' },
  { label: 'Noto Serif', value: "'Noto Serif', serif", weight: '400' },
  { label: 'Nunito Black', value: "'Nunito', sans-serif", weight: '900' },
  { label: 'Nunito Bold', value: "'Nunito', sans-serif", weight: '700' },
  { label: 'Nunito Regular', value: "'Nunito', sans-serif", weight: '400' },
  { label: 'Open Sans', value: "'Open Sans', sans-serif", weight: '400' },
  { label: 'Open Sans Bold', value: "'Open Sans', sans-serif", weight: '700' },
  { label: 'Oswald', value: "'Oswald', sans-serif", weight: '400' },
  { label: 'Pacifico', value: "'Pacifico', cursive", weight: '400' },
  { label: 'Playfair Display', value: "'Playfair Display', serif", weight: '400' },
  { label: 'Poppins', value: "'Poppins', sans-serif", weight: '400' },
  { label: 'Poppins Bold', value: "'Poppins', sans-serif", weight: '700' },
  { label: 'Quicksand', value: "'Quicksand', sans-serif", weight: '400' },
  { label: 'Raleway', value: "'Raleway', sans-serif", weight: '400' },
  { label: 'Roboto', value: "'Roboto', sans-serif", weight: '400' },
  { label: 'Roboto Bold', value: "'Roboto', sans-serif", weight: '700' },
  { label: 'Roboto Condensed', value: "'Roboto Condensed', sans-serif", weight: '400' },
  { label: 'Source Sans 3', value: "'Source Sans 3', sans-serif", weight: '400' },
  { label: 'Ubuntu', value: "'Ubuntu', sans-serif", weight: '400' },
  { label: 'Ubuntu Bold', value: "'Ubuntu', sans-serif", weight: '700' },
  { label: 'Varela Round', value: "'Varela Round', sans-serif", weight: '400' },
];

export const SubtitleStyleModal: React.FC<SubtitleStyleModalProps> = React.memo(({ isOpen, onClose, style, defaultStyle, onSave, onChange, language, isDark, activeSubtitle }) => {
  const [localStyle, setLocalStyle] = useState<SubtitleStyle>(style);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [isDraggingPosition, setIsDraggingPosition] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownDirection, setDropdownDirection] = useState<'up' | 'down'>('down');
  // Debounce ref để tránh gọi onChange quá nhiều khi kéo slider
  const onChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lazy load Google Fonts chỉ khi modal mở lần đầu
  useEffect(() => {
    if (!isOpen) return;
    const id = 'subtitle-google-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;700&family=Caveat&family=Dancing+Script&family=Inter:wght@400;700&family=JetBrains+Mono&family=Lato:wght@400;700&family=Lexend:wght@400;700&family=Montserrat:wght@400;700&family=Noto+Sans:wght@400;700&family=Noto+Serif&family=Nunito:wght@400;700;900&family=Open+Sans:wght@400;700&family=Oswald&family=Pacifico&family=Playfair+Display&family=Poppins:wght@400;700&family=Quicksand&family=Raleway&family=Roboto:wght@400;700&family=Roboto+Condensed&family=Source+Sans+3&family=Ubuntu:wght@400;700&family=Varela+Round&display=swap';
    document.head.appendChild(link);
  }, [isOpen]);

  const toggleDropdown = () => {
    if (!isFontDropdownOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - rect.bottom;
      setDropdownDirection(spaceBelow >= 250 ? 'down' : rect.top > spaceBelow ? 'up' : 'down');
    }
    setIsFontDropdownOpen(!isFontDropdownOpen);
  };

  // Group fonts alphabetically — memoized để không tính lại mỗi render
  const { groupedFonts, sortedLetters } = React.useMemo(() => {
    const grouped = FONT_OPTIONS.reduce((acc, font) => {
      const firstLetter = font.label[0].toUpperCase();
      if (!acc[firstLetter]) acc[firstLetter] = [];
      acc[firstLetter].push(font);
      return acc;
    }, {} as Record<string, typeof FONT_OPTIONS>);
    return { groupedFonts: grouped, sortedLetters: Object.keys(grouped).sort() };
  }, []);

  const handleReset = React.useCallback(() => {
    updateStyle(defaultStyle);
  }, [defaultStyle]);

  // Sync local style with prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalStyle(style);
    }
  }, [isOpen, style]);

  const updateStyle = React.useCallback((updates: Partial<SubtitleStyle>) => {
    setLocalStyle(prev => {
      const newStyle = { ...prev, ...updates };
      if (onChange && isOpen) {
        // Debounce onChange 16ms (~1 frame) để tránh re-render quá nhiều khi kéo slider
        if (onChangeTimerRef.current) clearTimeout(onChangeTimerRef.current);
        onChangeTimerRef.current = setTimeout(() => onChange(newStyle), 16);
      }
      return newStyle;
    });
  }, [onChange, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFontDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Cleanup debounce timer
      if (onChangeTimerRef.current) clearTimeout(onChangeTimerRef.current);
    };
  }, []);

  const t = translations[language] as any;

  const hexToRgba = (hex: string, opacity: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };

  const handleFontSelect = (font: (typeof FONT_OPTIONS)[0]) => {
    updateStyle({ fontFamily: font.value, fontWeight: font.weight });
    setIsFontDropdownOpen(false);
  };

  const getCurrentFontLabel = () => {
    const option = FONT_OPTIONS.find(opt => 
      opt.value === localStyle.fontFamily && opt.weight === localStyle.fontWeight
    );
    return option ? option.label : 'Select Font';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isDraggingPosition ? 0 : 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ 
              opacity: 1,
              scale: 1, 
              y: 0,
              backgroundColor: isDraggingPosition ? 'transparent' : 'rgb(9 9 11)',
              borderColor: isDraggingPosition ? 'transparent' : 'rgb(39 39 42)',
              boxShadow: isDraggingPosition ? 'none' : '0 25px 50px -12px rgb(0 0 0 / 0.5)',
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-7xl border rounded-2xl overflow-hidden text-left`}
          >
            <div className={`p-4 border-b flex items-center justify-between transition-all duration-300 border-zinc-800 ${isDraggingPosition ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex items-center gap-4">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Type className="w-5 h-5 text-blue-500" /> {t.subtitleSettings}
                </h2>
              </div>
              <Tooltip content="Đóng (Esc)">
                <button 
                  onClick={(e) => { e.stopPropagation(); onClose(); }} 
                  className="p-2 rounded-lg transition-colors hover:bg-zinc-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </Tooltip>
            </div>

            <div className="flex flex-col h-full max-h-[90vh]">
              {/* Settings Area (Top) */}
              <div className={`p-4 space-y-4 transition-colors duration-300 ${isDraggingPosition ? 'border-b border-transparent' : 'border-b border-zinc-800/50'}`}>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-5 gap-y-4 items-start">
                  
                  {/* (1) Phông chữ - Hàng trên, Cột 1 */}
                  <div className={`space-y-2 relative z-[100] transition-opacity duration-300 ${isDraggingPosition ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} ref={dropdownRef}>
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-tight">
                       {t.font}
                    </label>
                    <div className="relative">
                      <button
                        ref={triggerRef}
                        onClick={toggleDropdown}
                        className="w-full p-2 rounded-lg border text-xs flex items-center justify-between transition-all bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                      >
                        <span className="truncate font-medium">{getCurrentFontLabel()}</span>
                        <ChevronDown className={`w-4 h-4 opacity-50 transition-transform ${isFontDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isFontDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: dropdownDirection === 'down' ? -5 : 5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: dropdownDirection === 'down' ? -5 : 5 }}
                            className={`absolute left-0 right-0 z-[110] mt-1 mb-1 max-h-60 overflow-y-auto rounded-xl border shadow-2xl py-1 custom-scrollbar bg-zinc-900 border-zinc-800 ${dropdownDirection === 'down' ? 'top-full' : 'bottom-full'}`}
                          >
                            <div className="py-1">
                              {sortedLetters.map((letter) => (
                                <div key={letter}>
                                  <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-500/50 bg-zinc-800/30">
                                    {letter}
                                  </div>
                                  {groupedFonts[letter].map((option) => (
                                    <button
                                      key={`${option.value}-${option.weight}`}
                                      onClick={() => {
                                        handleFontSelect(option);
                                        setIsFontDropdownOpen(false);
                                      }}
                                      style={{ fontFamily: option.value, fontWeight: option.weight }}
                                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors
                                        hover:bg-zinc-800
                                        ${localStyle.fontFamily === option.value && localStyle.fontWeight === option.weight ? 'text-blue-500' : ''}
                                      `}
                                    >
                                      <span className="truncate">{option.label}</span>
                                      {localStyle.fontFamily === option.value && localStyle.fontWeight === option.weight && (
                                        <Check className="w-4 h-4" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* (2) Định dạng - Hàng trên, Cột 2 */}
                  <div className={`space-y-2 transition-opacity duration-300 ${isDraggingPosition ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-tight">
                      {t.format}
                    </label>
                    <div className="flex gap-2">
                      {[
                        { icon: Bold, title: t.bold, active: parseInt(localStyle.fontWeight) >= 700, action: () => updateStyle({ fontWeight: parseInt(localStyle.fontWeight) >= 700 ? '400' : '700' }) },
                        { icon: Italic, title: t.italic, active: localStyle.fontStyle === 'italic', action: () => updateStyle({ fontStyle: localStyle.fontStyle === 'italic' ? 'normal' : 'italic' }) },
                        { icon: Underline, title: t.underline, active: localStyle.textDecoration === 'underline', action: () => updateStyle({ textDecoration: localStyle.textDecoration === 'underline' ? 'none' : 'underline' }) },
                      ].map((item, idx) => (
                        <Tooltip key={idx} content={item.title}>
                          <button
                            type="button"
                            onClick={item.action}
                            className={`p-2 rounded-lg border flex-1 flex items-center justify-center transition-all ${item.active ? 'bg-blue-600 border-blue-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}
                          >
                            <item.icon className="w-4 h-4" />
                          </button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>

                  {/* (3) Màu chữ - Hàng trên, Cột 3 */}
                  <div className={`space-y-2 transition-opacity duration-300 ${isDraggingPosition ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-tight">
                      <Palette className="w-4 h-4" /> {t.textColor}
                    </label>
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-shrink-0">
                        <input 
                          type="color"
                          value={localStyle.textColor}
                          onChange={(e) => updateStyle({ textColor: e.target.value })}
                          className="w-8 h-8 rounded-md overflow-hidden border-0 cursor-pointer shadow-sm p-0 absolute opacity-0 z-10"
                        />
                        <div 
                          className="w-8 h-8 rounded-md border shadow-sm"
                          style={{ backgroundColor: localStyle.textColor, borderColor: 'rgba(255,255,255,0.1)' }}
                        />
                      </div>
                      <input 
                        type="text"
                        value={localStyle.textColor}
                        onChange={(e) => updateStyle({ textColor: e.target.value })}
                        className="flex-1 min-w-0 px-2 py-1.5 rounded-md border text-xs font-mono font-medium bg-zinc-900 border-zinc-800"
                      />
                    </div>
                  </div>

                  {/* (4) Cỡ chữ - Hàng trên, Cột 4 */}
                  <div className={`space-y-2 transition-opacity duration-300 ${isDraggingPosition ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-tight">
                      <Maximize className="w-4 h-4" /> {t.fontSize} ({localStyle.fontSize}px)
                    </label>
                    <input 
                      type="range" min={12} max={48} step={1}
                      value={localStyle.fontSize}
                      onChange={(e) => updateStyle({ fontSize: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-blue-600/20 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* (5) Viền chữ - Hàng trên, Cột 5 */}
                  <div className={`space-y-2 transition-opacity duration-300 ${isDraggingPosition ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-tight">
                      <Square className="w-4 h-4" /> {t.strokeWidth} ({localStyle.strokeWidth}px)
                    </label>
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-shrink-0">
                        <input 
                          type="color"
                          value={localStyle.strokeColor}
                          onChange={(e) => updateStyle({ strokeColor: e.target.value })}
                          className="w-8 h-8 rounded-md overflow-hidden border-0 cursor-pointer shadow-sm p-0 absolute opacity-0 z-10"
                        />
                        <div 
                          className="w-8 h-8 rounded-md border shadow-sm"
                          style={{ backgroundColor: localStyle.strokeColor, borderColor: 'rgba(255,255,255,0.1)' }}
                        />
                      </div>
                      <input 
                        type="range" min={0} max={4} step={0.5}
                        value={localStyle.strokeWidth}
                        onChange={(e) => updateStyle({ strokeWidth: parseFloat(e.target.value) })}
                        className="flex-1 h-1.5 self-center bg-blue-600/20 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>

                  {/* (6) Màu nền - Hàng dưới, Cột 1 */}
                  <div className={`space-y-2 transition-opacity duration-300 ${isDraggingPosition ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-tight">
                      <Contrast className="w-4 h-4" /> {t.bgColor} ({Math.round(localStyle.backgroundOpacity * 100)}%)
                    </label>
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-shrink-0 transition-opacity duration-300" style={{ opacity: localStyle.backgroundOpacity === 0 ? 0.3 : 1 }}>
                        <input 
                          type="color"
                          value={localStyle.backgroundColor}
                          onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                          className="w-8 h-8 rounded-md border shadow-sm p-0 absolute opacity-0 z-10 cursor-pointer"
                        />
                        <div 
                          className="w-8 h-8 rounded-md border shadow-sm"
                          style={{ backgroundColor: localStyle.backgroundColor, borderColor: 'rgba(255,255,255,0.1)' }}
                        />
                      </div>
                      <input 
                        type="range" min={0} max={1} step={0.1}
                        value={localStyle.backgroundOpacity}
                        onChange={(e) => updateStyle({ backgroundOpacity: parseFloat(e.target.value) })}
                        className="flex-1 h-1.5 self-center bg-blue-600/20 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>

                  {/* (7) Đổ bóng - Hàng dưới, Cột 2 */}
                  <div className={`space-y-2 transition-opacity duration-300 ${isDraggingPosition ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-tight">
                      <Layers className="w-4 h-4" /> {t.shadow} ({localStyle.shadowBlur}px)
                    </label>
                    <div className="flex gap-2 items-center">
                      <div className="relative flex-shrink-0">
                        <input 
                          type="color"
                          value={localStyle.shadowColor}
                          onChange={(e) => updateStyle({ shadowColor: e.target.value })}
                          className="w-8 h-8 rounded-md overflow-hidden border-0 cursor-pointer shadow-sm p-0 absolute opacity-0 z-10"
                        />
                        <div 
                          className="w-8 h-8 rounded-md border shadow-sm"
                          style={{ backgroundColor: localStyle.shadowColor, borderColor: 'rgba(255,255,255,0.1)' }}
                        />
                      </div>
                      <input 
                        type="range" min={0} max={10} step={1}
                        value={localStyle.shadowBlur}
                        onChange={(e) => updateStyle({ shadowBlur: parseFloat(e.target.value) })}
                        className="flex-1 h-1.5 self-center bg-blue-600/20 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  </div>

                  {/* (8) Giãn cách chữ - Hàng dưới, Cột 3 */}
                  <div className={`space-y-2 transition-opacity duration-300 ${isDraggingPosition ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-tight">
                      <ListFilter className="w-4 h-4" /> {t.letterSpacing} ({localStyle.letterSpacing}px)
                    </label>
                    <input 
                      type="range" min={-2} max={10} step={0.5}
                      value={localStyle.letterSpacing}
                      onChange={(e) => updateStyle({ letterSpacing: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-blue-600/20 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* (9) Giãn cách dòng - Hàng dưới, Cột 4 */}
                  <div className={`space-y-2 transition-opacity duration-300 ${isDraggingPosition ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-tight">
                      <ArrowsUpFromLine className="w-4 h-4" /> {t.lineHeight} ({localStyle.lineHeight})
                    </label>
                    <input 
                      type="range" min={1} max={3} step={0.1}
                      value={localStyle.lineHeight}
                      onChange={(e) => updateStyle({ lineHeight: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-blue-600/20 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* (10) Padding X - Mới */}
                  <div className={`space-y-2 transition-opacity duration-300 ${isDraggingPosition ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-tight">
                      <Move className="w-4 h-4 rotate-90" /> {t.bgGlow} ({localStyle.backgroundPaddingX}px)
                    </label>
                    <input 
                      type="range" min={0} max={100} step={1}
                      value={localStyle.backgroundPaddingX}
                      onChange={(e) => updateStyle({ backgroundPaddingX: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-blue-600/20 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                   {/* (11) Padding Y - Mới */}
                   <div className={`space-y-2 transition-opacity duration-300 ${isDraggingPosition ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-tight">
                      <Move className="w-4 h-4" /> {t.bgHeight} ({localStyle.backgroundPaddingY}px)
                    </label>
                    <input 
                      type="range" min={0} max={60} step={1}
                      value={localStyle.backgroundPaddingY}
                      onChange={(e) => updateStyle({ backgroundPaddingY: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-blue-600/20 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* (12) Bo viền nền - Mới */}
                  <div className={`space-y-2 transition-opacity duration-300 ${isDraggingPosition ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                    <label className="text-xs font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-tight">
                      <Square className="w-4 h-4" /> {t.bgRadius} ({localStyle.backgroundBorderRadius}px)
                    </label>
                    <input 
                      type="range" min={0} max={50} step={1}
                      value={localStyle.backgroundBorderRadius}
                      onChange={(e) => updateStyle({ backgroundBorderRadius: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-blue-600/20 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>

                  {/* (13) Vị trí - Hàng dưới, Cột 5 */}
                  <div className={`relative transition-all duration-200 
                    ${isDraggingPosition ? 'z-50 px-4 py-3 rounded-xl bg-black/50 backdrop-blur-md shadow-xl shadow-black/40 -mx-4' : 'space-y-2'}
                  `}>
                    <label className={`text-xs font-bold flex items-center gap-2 uppercase tracking-tight transition-colors ${isDraggingPosition ? 'text-blue-400 mb-3' : 'text-zinc-500'}`}>
                      <Move className="w-4 h-4" /> {t.position} ({localStyle.verticalPosition}%)
                    </label>
                    <input 
                      type="range" min="5" max="95" step="1"
                      value={localStyle.verticalPosition}
                      onMouseDown={() => setIsDraggingPosition(true)}
                      onMouseUp={() => setIsDraggingPosition(false)}
                      onTouchStart={() => setIsDraggingPosition(true)}
                      onTouchEnd={() => setIsDraggingPosition(false)}
                      onChange={(e) => updateStyle({ verticalPosition: parseInt(e.target.value) })}
                      className="w-full h-1.5 bg-blue-600/20 rounded-lg appearance-none cursor-pointer accent-blue-600 relative z-[60]"
                    />
                  </div>
                </div>
              </div>

              {/* Preview Area (Bottom) - hide during drag */}
              <div className={`p-6 min-h-[200px] flex-1 flex flex-col transition-opacity duration-300 relative overflow-hidden
                bg-zinc-900
                justify-center
                ${isDraggingPosition ? 'opacity-0 pointer-events-none' : 'opacity-100'}
              `}>
                {/* Fixed Preview Label */}
                <div className="absolute top-4 left-0 right-0 text-center pointer-events-none">
                  <span className="text-[11px] font-bold text-zinc-200 uppercase tracking-[0.4em] drop-shadow-md">{t.previewArea}</span>
                </div>

                {/* Background Simulation */}
                <div className="absolute inset-0 z-0 opacity-20 pointer-events-none overflow-hidden">
                   <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] animate-pulse" />
                   <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] animate-bounce" style={{ animationDuration: '8s' }} />
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-zinc-950/20" />
                </div>
                
                <div 
                  className="w-full z-10 transition-none absolute left-0 right-0 px-8 flex flex-col items-center gap-2"
                  style={{ top: '50%', transform: 'translateY(-50%)' }}
                >
                  <div className="text-center flex flex-col items-center gap-2">
                    {activeSubtitle ? (
                      <>
                        <div
                          style={localStyle.backgroundOpacity > 0 ? {
                            backgroundColor: hexToRgba(localStyle.backgroundColor, localStyle.backgroundOpacity),
                            borderRadius: `${localStyle.backgroundBorderRadius}px`,
                            padding: `${localStyle.backgroundPaddingY}px ${localStyle.backgroundPaddingX}px`,
                          } : {}}
                          className={localStyle.backgroundOpacity > 0 ? "backdrop-blur-2xl [backdrop-filter:blur(24px)_saturate(180%)] text-center shadow-2xl border border-white/20 flex items-center justify-center" : "text-center"}
                        >
                          <p 
                            style={{
                              fontSize: `${localStyle.fontSize}px`,
                              letterSpacing: `${localStyle.letterSpacing}px`,
                              lineHeight: 1, // Fix background height dependency
                              color: localStyle.textColor,
                              fontFamily: localStyle.fontFamily,
                              fontWeight: localStyle.fontWeight,
                              fontStyle: localStyle.fontStyle,
                              textDecoration: localStyle.textDecoration,
                              textShadow: `0 0 ${localStyle.shadowBlur}px ${localStyle.shadowColor}`,
                              WebkitTextStroke: `${localStyle.strokeWidth}px ${localStyle.strokeColor}`,
                              paintOrder: 'stroke fill',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {activeSubtitle.chinese}
                          </p>
                        </div>
                        {activeSubtitle.vietnamese && (
                          <div
                            style={localStyle.backgroundOpacity > 0 ? {
                              backgroundColor: hexToRgba(localStyle.backgroundColor, localStyle.backgroundOpacity),
                              borderRadius: `${localStyle.backgroundBorderRadius}px`,
                              padding: `${localStyle.backgroundPaddingY}px ${localStyle.backgroundPaddingX}px`,
                            } : {}}
                            className={localStyle.backgroundOpacity > 0 ? "backdrop-blur-2xl [backdrop-filter:blur(24px)_saturate(180%)] text-center shadow-2xl border border-white/20 flex items-center justify-center" : "text-center"}
                          >
                            <p 
                              style={{
                                fontSize: `${localStyle.fontSize * 0.8}px`,
                                letterSpacing: `${localStyle.letterSpacing}px`,
                                lineHeight: 1, // Fix background height dependency
                                color: localStyle.textColor,
                                fontFamily: localStyle.fontFamily,
                                fontWeight: localStyle.fontWeight,
                                fontStyle: localStyle.fontStyle === 'normal' ? 'italic' : localStyle.fontStyle,
                                textDecoration: localStyle.textDecoration,
                                textShadow: `0 0 ${localStyle.shadowBlur}px ${localStyle.shadowColor}`,
                                WebkitTextStroke: `${localStyle.strokeWidth * 0.8}px ${localStyle.strokeColor}`,
                                paintOrder: 'stroke fill',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {activeSubtitle.vietnamese}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div
                          style={localStyle.backgroundOpacity > 0 ? {
                            backgroundColor: hexToRgba(localStyle.backgroundColor, localStyle.backgroundOpacity),
                            borderRadius: `${localStyle.backgroundBorderRadius}px`,
                            padding: `${localStyle.backgroundPaddingY}px ${localStyle.backgroundPaddingX}px`,
                          } : {}}
                          className={localStyle.backgroundOpacity > 0 ? "backdrop-blur-2xl [backdrop-filter:blur(24px)_saturate(180%)] text-center shadow-2xl border border-white/20 flex items-center justify-center" : "text-center"}
                        >
                          <p 
                            style={{
                              fontSize: `${localStyle.fontSize}px`,
                              letterSpacing: `${localStyle.letterSpacing}px`,
                              lineHeight: 1,
                              color: localStyle.textColor,
                              fontFamily: localStyle.fontFamily,
                              fontWeight: localStyle.fontWeight,
                              fontStyle: localStyle.fontStyle,
                              textDecoration: localStyle.textDecoration,
                              textShadow: `0 0 ${localStyle.shadowBlur}px ${localStyle.shadowColor}`,
                              WebkitTextStroke: `${localStyle.strokeWidth}px ${localStyle.strokeColor}`,
                              paintOrder: 'stroke fill',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {t.previewOriginal}
                          </p>
                        </div>
                        <div
                          style={localStyle.backgroundOpacity > 0 ? {
                            backgroundColor: hexToRgba(localStyle.backgroundColor, localStyle.backgroundOpacity),
                            borderRadius: `${localStyle.backgroundBorderRadius}px`,
                            padding: `${localStyle.backgroundPaddingY}px ${localStyle.backgroundPaddingX}px`,
                          } : {}}
                          className={localStyle.backgroundOpacity > 0 ? "backdrop-blur-2xl [backdrop-filter:blur(24px)_saturate(180%)] text-center shadow-2xl border border-white/20 flex items-center justify-center" : "text-center"}
                        >
                          <p 
                            style={{
                              fontSize: `${localStyle.fontSize * 0.8}px`,
                              letterSpacing: `${localStyle.letterSpacing}px`,
                              lineHeight: 1,
                              color: localStyle.textColor,
                              fontFamily: localStyle.fontFamily,
                              fontWeight: localStyle.fontWeight,
                              fontStyle: 'italic',
                              textDecoration: localStyle.textDecoration,
                              textShadow: `0 0 ${localStyle.shadowBlur}px ${localStyle.shadowColor}`,
                              WebkitTextStroke: `${localStyle.strokeWidth * 0.8}px ${localStyle.strokeColor}`,
                              paintOrder: 'stroke fill',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {t.previewTranslated}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

              {/* Footer Area - hide during drag */}
              <div className={`px-6 py-3 border-t flex gap-3 items-center justify-between transition-opacity duration-300 bg-zinc-950 border-zinc-800 ${isDraggingPosition ? 'opacity-0 pointer-events-none border-transparent' : 'opacity-100'}`}>
                <Tooltip content={t.restoreDefault}>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all border border-red-500/30 text-red-500 hover:bg-red-500/10"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> {t.restore}
                  </button>
                </Tooltip>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="px-5 py-2 border rounded-lg text-sm font-medium transition-all border-zinc-800 hover:bg-zinc-900"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSave(localStyle);
                      onClose();
                    }}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-900/40"
                  >
                    {t.save}
                  </button>
                </div>
              </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
