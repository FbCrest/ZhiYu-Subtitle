/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Key, Languages, Moon, Sun, Plus, Check, Eye, EyeOff, RotateCcw, HelpCircle, HardDrive, Cpu, MessageSquare, Info, ShieldCheck, AlertCircle, Mic, Gamepad2, FileText, Layers, Music, Video, BookOpen, Users, Globe, ExternalLink, User, Youtube, Mail, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSettings, AppLanguage, AppTheme, GeminiKeyRecord, PromptTemplate } from '../types';
import { translations } from '../i18n';
import { DEFAULT_SETTINGS } from '../App';
import { SYSTEM_PROMPTS, AI_MODELS } from '../constants';

import { Tooltip } from './ui/Tooltip';

const ICON_MAP: Record<string, any> = {
  Mic, Gamepad2, FileText, Layers, Music, Video, BookOpen, Users, Globe
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

type TabType = 'api' | 'video' | 'model' | 'prompt' | 'about';

export const SettingsModal: React.FC<SettingsModalProps> = React.memo(({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<TabType>('api');
  const [isViewingDetails, setIsViewingDetails] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [showKeyIndices, setShowKeyIndices] = useState<Set<string>>(new Set());
  const [showGeniusKey, setShowGeniusKey] = useState(false);
  
  useEffect(() => {
    if (isOpen) setLocalSettings(settings);
  }, [isOpen, settings]);

  const t = translations[localSettings.language];
  const isDark = true;

  const viewingPrompt = SYSTEM_PROMPTS.find(p => p.id === isViewingDetails);

  if (!isOpen) return null;

  const handleAddKey = () => {
    if (!newKey.trim()) return;
    const keyData: GeminiKeyRecord = {
      id: Math.random().toString(36).substr(2, 9),
      key: newKey.trim(),
      status: 'active',
      tier: 'free',
      hasQuota: true,
      errorCount: 0
    };
    setLocalSettings(prev => ({
      ...prev,
      apiKeys: [...prev.apiKeys, keyData],
      activeKeyId: prev.activeKeyId || keyData.id
    }));
    setNewKey('');
  };

  const toggleTier = (id: string) => {
    setLocalSettings(prev => ({
      ...prev,
      apiKeys: prev.apiKeys.map(k => k.id === id ? { ...k, tier: k.tier === 'free' ? 'paid' : 'free' } : k)
    }));
  };

  const toggleQuota = (id: string) => {
    setLocalSettings(prev => ({
      ...prev,
      apiKeys: prev.apiKeys.map(k => k.id === id ? { ...k, hasQuota: !k.hasQuota } : k)
    }));
  };

  const handleRemoveKey = (id: string) => {
    setLocalSettings(prev => {
      const filtered = prev.apiKeys.filter(k => k.id !== id);
      return {
        ...prev,
        apiKeys: filtered,
        activeKeyId: prev.activeKeyId === id ? (filtered[0]?.id || null) : prev.activeKeyId
      };
    });
  };

  const toggleShowKey = (id: string) => {
    const next = new Set(showKeyIndices);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setShowKeyIndices(next);
  };

  const maskKey = (key: string) => {
    if (key.length < 8) return '********';
    return `${key.slice(0, 4)}••••••${key.slice(-4)}`;
  };

  const tabs = [
    { id: 'api' as TabType, label: t.apiKeysTitle || 'Khóa API', icon: Key, color: 'text-blue-400', activeBg: 'bg-blue-400/10' },
    { id: 'video' as TabType, label: 'Xử lý video', icon: HardDrive, color: 'text-green-400', activeBg: 'bg-green-400/10' },
    { id: 'model' as TabType, label: 'Mô hình Gemini', icon: Cpu, color: 'text-purple-400', activeBg: 'bg-purple-400/10' },
    { id: 'prompt' as TabType, label: 'Prompt', icon: MessageSquare, color: 'text-orange-400', activeBg: 'bg-orange-400/10' },
    { id: 'about' as TabType, label: 'Giới thiệu', icon: Info, color: 'text-cyan-400', activeBg: 'bg-cyan-400/10' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-[90vw] border rounded-[40px] shadow-2xl overflow-hidden transition-colors duration-300 bg-zinc-950 border-zinc-800 text-white"
        >
          {/* Prompt Detail Overlay */}
          <AnimatePresence>
            {isViewingDetails && viewingPrompt && (
              <motion.div 
                initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
                exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                className="absolute inset-0 z-[120] flex items-center justify-center p-8 bg-black/40"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-2xl rounded-[32px] p-8 shadow-2xl border bg-zinc-900 border-zinc-800"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl bg-zinc-800 text-purple-400`}>
                        {React.createElement(ICON_MAP[viewingPrompt.icon] || Info, { className: "w-6 h-6" })}
                      </div>
                      <h4 className="text-xl font-bold text-white">{viewingPrompt.title}</h4>
                    </div>
                    <Tooltip content="Đóng cài đặt">
                      <button 
                        onClick={() => setIsViewingDetails(null)}
                        className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 hover:text-white"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </Tooltip>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">Mô tả</h5>
                      <p className="text-zinc-400 leading-relaxed text-sm">{viewingPrompt.description}</p>
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">Nội dung Prompt</h5>
                      <div className="p-4 rounded-xl bg-black/50 border border-zinc-800/50 font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                        {viewingPrompt.content}
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={() => {
                        setLocalSettings(prev => ({ 
                          ...prev, 
                          selectedPromptId: viewingPrompt.id,
                          transcriptionPrompt: viewingPrompt.content
                        }));
                        setIsViewingDetails(null);
                      }}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl transition-all shadow-lg text-sm"
                    >
                      Sử dụng Prompt này
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Header */}
          <div className="p-6 flex items-center justify-between border-b border-zinc-900/50">
            <div className="w-48 flex items-center">
              <h2 className="text-2xl font-black tracking-tight">{t.settings}</h2>
            </div>
            
            <div className="flex-1 flex justify-center">
              <div className="flex p-1.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 group
                      ${activeTab === tab.id 
                        ? tab.color
                        : 'text-zinc-500 hover:text-zinc-200'}
                    `}
                  >
                    {activeTab === tab.id && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className={`absolute inset-0 rounded-xl z-0 ${tab.activeBg}`}
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <tab.icon className={`relative w-4 h-4 z-10 transition-all duration-300 
                      ${activeTab === tab.id ? 'scale-110 opacity-100' : 'opacity-40 group-hover:opacity-100 group-hover:scale-105'}
                    `} />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="w-48 flex justify-end">
              <Tooltip content="Đóng (Esc)">
                <button 
                  onClick={onClose} 
                  className="p-2 rounded-xl transition-colors hover:bg-zinc-900 text-zinc-500 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </Tooltip>
            </div>
          </div>

          <div className="p-8 h-[70vh] overflow-y-auto scrollbar-thin overflow-x-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {activeTab === 'api' && (
                  <div className="space-y-12">
                {/* Gemini Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h3 className="text-2xl font-bold text-blue-400">Các Khóa API Gemini</h3>
                      <span className="px-4 py-1.5 bg-blue-600/10 text-blue-400 text-sm font-bold rounded-full border border-blue-600/20">
                        {localSettings.apiKeys.length} khóa
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {localSettings.apiKeys.map(keyRecord => (
                      <div 
                        key={keyRecord.id}
                        className={`flex items-center gap-6 p-4 rounded-2xl border transition-all
                          ${localSettings.activeKeyId === keyRecord.id 
                            ? 'bg-blue-600/5 border-blue-600/30 shadow-lg shadow-blue-900/10'
                            : 'bg-zinc-900 border-zinc-800'}
                        `}
                      >
                        <div className="flex-1 font-mono text-base tracking-tight break-all">
                          {showKeyIndices.has(keyRecord.id) ? keyRecord.key : maskKey(keyRecord.key)}
                        </div>
                        
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Tier Badge */}
                          <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                            <Tooltip content="Đổi sang bậc trả phí (Paid Tier)">
                              <button 
                                onClick={() => toggleTier(keyRecord.id)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all
                                  ${keyRecord.tier === 'paid' 
                                    ? 'bg-purple-600 text-white shadow-lg' 
                                    : 'text-zinc-500 hover:text-zinc-300'}
                                `}
                              >
                                Paid
                              </button>
                            </Tooltip>
                            <Tooltip content="Đổi sang bậc miễn phí (Free Tier)">
                              <button 
                                onClick={() => toggleTier(keyRecord.id)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all
                                  ${keyRecord.tier === 'free' 
                                    ? 'bg-zinc-700 text-white shadow-lg' 
                                    : 'text-zinc-500 hover:text-zinc-300'}
                                `}
                              >
                                Free
                              </button>
                            </Tooltip>
                          </div>

                          {/* Quota Badge */}
                          <Tooltip content={keyRecord.hasQuota ? "Đánh dấu là đã hết Quota" : "Đánh dấu là còn Quota"}>
                            <button 
                              onClick={() => toggleQuota(keyRecord.id)}
                              className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-2
                                ${keyRecord.hasQuota 
                                  ? 'bg-green-600/10 text-green-400 border border-green-600/30' 
                                  : 'bg-red-600/10 text-red-400 border border-red-600/30'}
                              `}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full ${keyRecord.hasQuota ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
                              {keyRecord.hasQuota ? 'Còn Quota' : 'Hết Quota'}
                            </button>
                          </Tooltip>

                          <div className="h-4 w-px bg-zinc-800 mx-1" />

                          <div className="flex items-center gap-2">
                            <Tooltip content={showKeyIndices.has(keyRecord.id) ? "Ẩn khóa" : "Hiện khóa"}>
                              <button 
                                onClick={() => toggleShowKey(keyRecord.id)}
                                className="p-2.5 text-zinc-500 hover:text-zinc-300 transition-colors bg-black/20 rounded-xl hover:bg-black/40"
                              >
                                {showKeyIndices.has(keyRecord.id) ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </Tooltip>

                            <Tooltip content="Sử dụng khóa này làm mặc định">
                              <button 
                                onClick={() => setLocalSettings(prev => ({ ...prev, activeKeyId: keyRecord.id }))}
                                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                                  ${localSettings.activeKeyId === keyRecord.id 
                                    ? 'bg-blue-600 text-white shadow-xl scale-105' 
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}
                                `}
                              >
                                {localSettings.activeKeyId === keyRecord.id ? 'Đang dùng' : 'Sử dụng'}
                              </button>
                            </Tooltip>

                            <Tooltip content="Xoá khóa này">
                              <button 
                                onClick={() => handleRemoveKey(keyRecord.id)}
                                className="p-2.5 text-red-500/50 hover:text-red-500 transition-colors hover:bg-red-500/10 rounded-xl"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center gap-4 p-3 rounded-2xl border bg-black border-zinc-800">
                      <div className="p-3 bg-blue-600/10 text-blue-500 rounded-xl">
                        <Key className="w-5 h-5" />
                      </div>
                      <input
                        type="password"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        placeholder="Dán mã API Gemini mới của bạn vào đây..."
                        className="flex-1 bg-transparent border-0 px-2 py-2 text-base focus:ring-0 font-mono"
                      />
                      <button 
                        onClick={handleAddKey}
                        disabled={!newKey.trim()}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all"
                      >
                        Thêm Khóa
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 rounded-3xl border bg-zinc-900/30 border-zinc-800">
                        <h4 className="font-bold flex items-center gap-3 mb-6 text-blue-400 text-lg">
                          <ShieldCheck className="w-6 h-6" /> Hướng dẫn lấy khóa API Gemini
                        </h4>
                        <ul className="space-y-4 text-sm text-zinc-400">
                          <li className="flex gap-4">
                            <span className="w-7 h-7 flex-shrink-0 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm ring-4 ring-blue-600/10">1</span>
                            <span>Truy cập <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-500 hover:underline font-bold">Google AI Studio</a></span>
                          </li>
                          <li className="flex gap-4">
                            <span className="w-7 h-7 flex-shrink-0 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm ring-4 ring-blue-600/10">2</span>
                            <span>Nhấp vào nút <strong className="text-zinc-200">Create API Key</strong></span>
                          </li>
                          <li className="flex gap-4">
                            <span className="w-7 h-7 flex-shrink-0 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-sm ring-4 ring-blue-600/10">3</span>
                            <span>Sao chép mã API và dán vào ô nhập liệu bên trên</span>
                          </li>
                        </ul>
                      </div>

                      <div className="p-6 rounded-3xl border bg-zinc-900/30 border-zinc-800">
                        <h4 className="font-bold flex items-center gap-3 mb-6 text-orange-400 text-lg">
                          <RotateCcw className="w-6 h-6" /> Tự động luân chuyển khóa
                        </h4>
                        <p className="text-base text-zinc-400 leading-relaxed">
                          Hệ thống sẽ tự động chuyển sang khóa API tiếp theo nếu khóa hiện tại <strong className="text-zinc-200">hết giới hạn (Quota)</strong> hoặc gặp lỗi. 
                          Bạn nên thêm nhiều khóa để quá trình xử lý không bị gián đoạn.
                        </p>
                      </div>
                  </div>
                </div>

                {/* Genius Section */}
                <div className="pt-12 border-t border-zinc-900 space-y-6">
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-bold">Khóa API Genius (Tùy chọn)</h3>
                    <span className={`px-4 py-1.5 text-sm font-bold rounded-full border ${localSettings.geniusApiKey ? 'bg-green-600/10 text-green-400 border-green-600/20' : 'bg-zinc-600/10 text-zinc-400 border-zinc-600/20'}`}>
                      {localSettings.geniusApiKey ? 'Đã cài đặt' : 'Chưa cài đặt'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 p-3 rounded-2xl border bg-zinc-900 border-zinc-800">
                    <div className="p-3 bg-orange-600/10 text-orange-500 rounded-xl">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <input
                      type={showGeniusKey ? "text" : "password"}
                      value={localSettings.geniusApiKey}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, geniusApiKey: e.target.value }))}
                      placeholder="Nhập Access Token của Genius để lấy lời bài hát tự động..."
                      className="flex-1 bg-transparent border-0 px-2 py-2 text-base focus:ring-0 font-mono tracking-wider"
                    />
                    <button 
                      onClick={() => setShowGeniusKey(!showGeniusKey)}
                      className="p-3 text-zinc-500 hover:text-zinc-300 transition-colors bg-black/20 rounded-xl"
                    >
                      {showGeniusKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'video' && (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-6">
                <div className="w-24 h-24 rounded-full bg-green-400/10 flex items-center justify-center text-green-400 mb-2">
                  <HardDrive className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-green-400">Xử lý video</h3>
                <p className="text-zinc-400 text-lg">Tính năng xử lý video nâng cao đang được phát triển...</p>
              </div>
            )}

            {activeTab === 'model' && (
              <div className="space-y-8">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400">
                      <Cpu className="w-7 h-7" />
                    </div>
                    Chọn mô hình Gemini AI
                  </h3>
                  <p className="text-zinc-400 text-base max-w-4xl leading-relaxed">
                    Chọn mô hình Gemini AI sẽ sử dụng đồng thời cho quá trình Tạo sub tự động và Phân tích video. 
                    Chức năng Dịch phụ đề sẽ sử dụng Mô hình Gemini AI riêng trong mục cài đặt của nó.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {AI_MODELS.map((model) => {
                    const isSelected = localSettings.extractionModel === model.id;
                    const colorData: Record<string, { border: string, glow: string, bg: string, badge: string, accent: string, hoverBorder: string, checkBg: string, checkText: string, badgeShadow: string }> = {
                      amber: { 
                        border: 'border-amber-500', 
                        glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]', 
                        bg: 'bg-amber-500/5', 
                        badge: 'bg-amber-600',
                        accent: 'text-amber-400',
                        hoverBorder: 'hover:border-amber-500/40',
                        checkBg: 'bg-amber-500',
                        checkText: 'text-white',
                        badgeShadow: 'shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      },
                      emerald: { 
                        border: 'border-emerald-500', 
                        glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]', 
                        bg: 'bg-emerald-500/5', 
                        badge: 'bg-emerald-500',
                        accent: 'text-emerald-400',
                        hoverBorder: 'hover:border-emerald-500/40',
                        checkBg: 'bg-emerald-500',
                        checkText: 'text-white',
                        badgeShadow: 'shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                      },
                      blue: { 
                        border: 'border-sky-500', 
                        glow: 'shadow-[0_0_20px_rgba(14,165,233,0.2)]', 
                        bg: 'bg-sky-500/5', 
                        badge: 'bg-sky-500',
                        accent: 'text-sky-400',
                        hoverBorder: 'hover:border-sky-500/40',
                        checkBg: 'bg-sky-500',
                        checkText: 'text-white',
                        badgeShadow: 'shadow-[0_0_15px_rgba(14,165,233,0.4)]'
                      },
                      indigo: { 
                        border: 'border-indigo-500', 
                        glow: 'shadow-[0_0_20px_rgba(99,102,241,0.2)]', 
                        bg: 'bg-indigo-500/5', 
                        badge: 'bg-indigo-600',
                        accent: 'text-indigo-400',
                        hoverBorder: 'hover:border-indigo-500/40',
                        checkBg: 'bg-indigo-500',
                        checkText: 'text-white',
                        badgeShadow: 'shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                      },
                      zinc: { 
                        border: 'border-zinc-500', 
                        glow: 'shadow-[0_0_20px_rgba(161,161,170,0.2)]', 
                        bg: 'bg-zinc-500/5', 
                        badge: 'bg-zinc-600',
                        accent: 'text-zinc-400',
                        hoverBorder: 'hover:border-zinc-500/40',
                        checkBg: 'bg-zinc-500',
                        checkText: 'text-white',
                        badgeShadow: 'shadow-[0_0_15px_rgba(161,161,170,0.4)]'
                      }
                    };
                    const color = colorData[model.color];

                    return (
                      <div
                        key={model.id}
                        onClick={() => setLocalSettings(prev => ({ 
                          ...prev, 
                          extractionModel: model.id,
                          translationModel: model.id
                        }))}
                        className={`relative group flex flex-col p-6 rounded-[32px] border text-left h-full cursor-pointer overflow-visible outline-none
                          ${isSelected 
                            ? `${color.border} ${color.bg}` 
                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}
                        `}
                      >
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 z-30">
                            <div className={`w-8 h-8 ${color.checkBg} rounded-full flex items-center justify-center ${color.checkText} border border-zinc-950`}>
                              <Check className="w-5 h-5 stroke-[4]" />
                            </div>
                          </div>
                        )}

                        <div className="relative z-10 flex items-center justify-between mb-4">
                          <span className={`font-bold tracking-tight text-xl transition-colors ${color.accent}`}>{model.label}</span>
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black tracking-tighter ${color.badge} text-white`}>
                            {model.tag}
                          </span>
                        </div>
                        
                        <p className={`relative z-10 text-base mb-8 leading-relaxed flex-1 font-medium transition-colors ${isSelected ? 'text-zinc-100' : 'text-zinc-500'}`}>
                          {model.description}
                        </p>

                        <div className="relative z-10 space-y-3 mt-auto pt-4 border-t border-zinc-800/50">
                          <div className="flex items-center justify-between text-sm font-bold uppercase tracking-tight">
                            <span className="text-zinc-500 opacity-60">Tốc độ:</span>
                            <span className={`transition-colors ${isSelected ? 'text-white' : 'text-zinc-400'}`}>{model.speed}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm font-bold uppercase tracking-tight">
                            <span className="text-zinc-500 opacity-60">Độ chính xác:</span>
                            <span className={`transition-colors ${isSelected ? 'text-white' : 'text-zinc-400'}`}>{model.accuracy}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button className="flex flex-col items-center justify-center p-8 rounded-[32px] border border-dashed transition-all group duration-500 border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-zinc-600">
                    <div className="w-14 h-14 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4 group-hover:scale-110 group-hover:border-zinc-600 group-hover:text-zinc-400 transition-all">
                      <Plus className="w-7 h-7" />
                    </div>
                    <span className="font-black text-sm mb-1 text-zinc-400 group-hover:text-zinc-200 transition-colors">Thêm mô hình tùy chỉnh</span>
                    <span className="text-[10px] text-zinc-600 font-bold tracking-tighter">Thêm ID mô hình Gemini của riêng bạn</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'prompt' && (
              <div className="space-y-8 pb-12">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold">Mẫu Prompt</h3>
                  <p className="text-zinc-400 text-base leading-relaxed">
                    Chọn một mẫu để nhanh chóng sử dụng các loại Prompt phổ biến. Bạn cũng có thể tạo mẫu riêng của mình.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {SYSTEM_PROMPTS.map((template) => {
                    const Icon = ICON_MAP[template.icon] || Info;
                    const isSelected = localSettings.selectedPromptId === template.id;
                    
                    const colorData: Record<string, { bg: string, text: string, selectedBorder: string, selectedBg: string, check: string }> = {
                      'speech-recognition': { bg: 'bg-purple-500/10', text: 'text-purple-400', selectedBorder: 'border-purple-500', selectedBg: 'bg-purple-500/5', check: 'bg-purple-600' },
                      'game-recognition': { bg: 'bg-rose-500/10', text: 'text-rose-400', selectedBorder: 'border-rose-500', selectedBg: 'bg-rose-500/5', check: 'bg-rose-600' },
                      'hardsub-extraction': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', selectedBorder: 'border-emerald-500', selectedBg: 'bg-emerald-500/5', check: 'bg-emerald-500' },
                      'combined-subtitle': { bg: 'bg-orange-500/10', text: 'text-orange-400', selectedBorder: 'border-orange-500', selectedBg: 'bg-orange-500/5', check: 'bg-orange-500' },
                      'lyrics-extraction': { bg: 'bg-amber-500/10', text: 'text-amber-400', selectedBorder: 'border-amber-500', selectedBg: 'bg-amber-500/5', check: 'bg-amber-500' },
                      'video-description': { bg: 'bg-pink-500/10', text: 'text-pink-400', selectedBorder: 'border-pink-500', selectedBg: 'bg-pink-500/5', check: 'bg-pink-600' },
                      'chaptering': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', selectedBorder: 'border-indigo-500', selectedBg: 'bg-indigo-500/5', check: 'bg-indigo-600' },
                      'speaker-recognition': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', selectedBorder: 'border-yellow-500', selectedBg: 'bg-yellow-500/5', check: 'bg-yellow-500' },
                      'direct-translation': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', selectedBorder: 'border-cyan-500', selectedBg: 'bg-cyan-500/5', check: 'bg-cyan-500' },
                    };
                    
                    const colors = colorData[template.id] || { bg: 'bg-zinc-500/10', text: 'text-zinc-400', selectedBorder: 'border-zinc-500', selectedBg: 'bg-zinc-500/5', check: 'bg-zinc-500' };

                    return (
                      <div
                        key={template.id}
                        onClick={() => setLocalSettings(prev => ({ 
                          ...prev, 
                          selectedPromptId: template.id,
                          transcriptionPrompt: template.content
                        }))}
                        className={`relative group flex flex-col p-6 rounded-[32px] border text-left h-full cursor-pointer transition-colors duration-300 overflow-visible outline-none
                          ${isSelected 
                            ? `${colors.selectedBorder} ${colors.selectedBg}` 
                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'}
                        `}
                      >
                        <div className="flex items-center gap-4 mb-4">
                          <div className={`p-3 rounded-xl transition-all duration-300 ${isSelected ? `bg-white/10 ${colors.text}` : `${colors.bg} ${colors.text}`}`}>
                            <Icon className="w-7 h-7" />
                          </div>
                          <h4 className={`font-bold text-lg transition-colors duration-300 ${colors.text}`}>{template.title}</h4>
                        </div>

                        {isSelected && (
                          <div className="absolute -top-2 -right-2 z-30">
                            <div className={`w-8 h-8 ${colors.check} rounded-full flex items-center justify-center text-white border border-zinc-950`}>
                              <Check className="w-5 h-5 stroke-[4]" />
                            </div>
                          </div>
                        )}

                        <p className={`text-base leading-relaxed flex-1 mb-6 transition-colors duration-300 ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                          {template.description}
                        </p>

                        <div className="mt-auto pt-4 border-t border-zinc-800/20 flex justify-center">
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsViewingDetails(template.id);
                            }}
                            className={`text-sm font-bold transition-all duration-300 uppercase tracking-widest cursor-pointer 
                              ${isSelected 
                                ? 'text-zinc-300 hover:text-white' 
                                : `text-zinc-500 ${colors.text.replace('text-', 'hover:text-')}`}
                            `}
                          >
                            Xem chi tiết
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  <button className="flex flex-col items-center justify-center p-8 rounded-[32px] border border-dashed transition-all border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40">
                    <div className="w-10 h-10 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="font-bold text-xs text-zinc-500">Thêm mẫu mới</span>
                  </button>
                </div>

                <div className="space-y-6 pt-4 border-t border-zinc-800/50">
                  <h3 className="text-2xl font-bold">Prompt phiên âm</h3>
                  <p className="text-zinc-500 text-base leading-relaxed">
                    Tùy chỉnh Prompt gửi đến Gemini để phiên âm. Phần giữ chỗ {'{contentType}'} sẽ được thay thế bằng "video" hoặc "audio" tùy thuộc vào loại.
                  </p>
                  <div className="relative rounded-3xl border bg-zinc-900/50 border-zinc-800 p-6">
                    <textarea
                      value={localSettings.transcriptionPrompt}
                      onChange={(e) => setLocalSettings(prev => ({ ...prev, transcriptionPrompt: e.target.value }))}
                      className="w-full min-h-[200px] bg-transparent border-none focus:ring-0 text-base resize-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="space-y-12 max-w-4xl mx-auto py-8">
                <div className="text-center space-y-4">
                  <motion.h3 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 bg-clip-text text-transparent uppercase tracking-tighter"
                  >
                    One-click Subtitles Generator
                  </motion.h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Author Card */}
                  <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="p-8 rounded-[32px] border border-zinc-800 bg-zinc-900/40"
                  >
                    <div className="flex flex-col items-center gap-6">
                      <div className="flex items-center gap-3 text-purple-400 mb-2">
                        <User className="w-5 h-5" />
                        <h4 className="text-lg font-bold text-zinc-300">Thông tin tác giả</h4>
                      </div>
                      
                      <div className="w-full space-y-3">
                        {[
                          { label: 'Tác giả', value: 'Sú' },
                          { label: 'YouTube', value: 'https://www.youtube.com/@Ping...' },
                          { label: 'Email', value: 'Orion24kk@gmail.com' },
                          { label: 'Discord', value: 'Orion24k' },
                          { label: 'App dịch màn hình', value: 'Snipping Tool' },
                        ].map((info) => (
                          <div key={info.label} className="flex gap-2 text-base">
                            <span className="text-white font-bold whitespace-nowrap">{info.label}:</span>
                            <span className="text-zinc-400 truncate">{info.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>

                  {/* Support Card */}
                  <motion.div 
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="p-8 rounded-[32px] border border-zinc-800 bg-zinc-900/40 text-center"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center gap-3 text-rose-400 mb-2">
                        <Heart className="w-5 h-5 fill-current" />
                        <h4 className="text-lg font-bold text-zinc-300">Ủng hộ dự án</h4>
                      </div>
                      
                      <p className="text-zinc-400 text-base leading-relaxed mb-4">
                        Nếu bạn thấy dự án này hữu ích, hãy ủng hộ <br /> tôi một ly cà phê qua Momo nhé!
                      </p>

                      <div className="relative group/qr mb-2">
                        <div className="absolute -inset-4 bg-rose-500/10 blur-xl rounded-full opacity-0 group-hover/qr:opacity-100 transition-opacity" />
                        <div className="relative bg-white p-4 rounded-3xl shadow-xl">
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=Momo-Donation-QR" alt="QR" className="w-32 h-32" />
                        </div>
                      </div>
                      
                      <div className="bg-zinc-800/50 px-6 py-2 rounded-full">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Quét mã QR để ủng hộ</span>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="space-y-8 text-center"
                >
                  <div className="p-8 rounded-3xl bg-zinc-900/20 border border-zinc-800/50">
                    <p className="text-zinc-400 text-base leading-relaxed max-w-3xl mx-auto">
                      OSG là công cụ tải video, auto sub, chỉnh sửa sub, dịch phụ đề, tạo thuyết minh, render, tạo hình nền, tạo nhạc nền,... cho video của bạn.
                    </p>
                  </div>
                  
                  <p className="text-xs font-black text-zinc-600 uppercase tracking-[0.2em]">
                    Phiên bản hiện tại: v1.0.0 (Apr 24, 2026 07:00)
                  </p>
                </motion.div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

          {/* Footer */}
          <div className="p-6 border-t flex items-center justify-between bg-zinc-900/50 border-zinc-800">
            <button 
              onClick={() => {
                if (confirm('Bạn có chắc chắn muốn khôi phục cài đặt gốc?')) {
                  setLocalSettings(DEFAULT_SETTINGS);
                }
              }}
              className="px-6 py-3 border border-red-500/30 text-red-500 rounded-xl font-medium hover:bg-red-500/10 transition-all flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> {t.restore}
            </button>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-xl font-medium transition-all bg-zinc-800 hover:bg-zinc-700"
              >
                Hủy <span className="text-[10px] opacity-50 ml-2">(ESC)</span>
              </button>
              <button
                onClick={() => {
                  onSave(localSettings);
                  onClose();
                }}
                className="px-12 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/40"
              >
                Lưu
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});
