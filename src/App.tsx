import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  RotateCcw,
  Languages,
  Eraser,
  Sparkles,
  Trash2,
  Loader2,
  Settings,
  SkipBack,
  SkipForward,
  FastForward,
  Gauge,
  FileText,
  Eye,
  EyeOff,
  Type as StyleIcon,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Info,
  Clock,
  HardDrive,
  FileVideo,
  Music,
  Download,
  Cpu,
  MessageSquare,
  ChevronDown,
  Check,
} from "lucide-react";
import { FileUploader } from "./components/FileUploader";
import { SubtitleView } from "./components/SubtitleView";
import { Timeline } from "./components/Timeline";
import { SettingsModal } from "./components/SettingsModal";
import { SubtitleStyleModal } from "./components/SubtitleStyleModal";
import { AppState, SubtitleItem, AppSettings, SubtitleStyle } from "./types";
import { Tooltip } from "./components/ui/Tooltip";
import { transcribeVideo, translateSubtitles } from "./services/geminiService";
import { extractAudio } from "./services/audioService";
import { parseSRT, parseVTT } from "./services/subtitleParser";
import { translations } from "./i18n";

const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontSize: 20,
  letterSpacing: 0,
  lineHeight: 1.2,
  textColor: "#ffffff",
  backgroundColor: "#ffffff",
  backgroundOpacity: 0.15,
  backgroundBorderRadius: 12,
  backgroundPaddingX: 20,
  backgroundPaddingY: 10,
  shadowColor: "rgba(0,0,0,0.2)",
  shadowBlur: 12,
  strokeColor: "#000000",
  strokeWidth: 0,
  verticalPosition: 85,
  fontFamily: "'Nunito', sans-serif",
  fontWeight: "900",
  fontStyle: "normal",
  textDecoration: "none",
};

import { SYSTEM_PROMPTS, AI_MODELS } from "./constants";
import { Toaster, toast } from "sonner";

export const DEFAULT_SETTINGS: AppSettings = {
  apiKeys: [],
  activeKeyId: null,
  geniusApiKey: "",
  language: "vi",
  theme: "dark",
  subtitleStyle: DEFAULT_SUBTITLE_STYLE,
  showOriginal: true,
  showTranslated: true,
  isSubtitleVisible: true,
  extractionModel: "gemini-2.5-flash", // Gemini 2.5 Flash
  translationModel: "gemini-2.5-flash",
  selectedPromptId: "speech-recognition",
  customPrompts: [],
  transcriptionPrompt: SYSTEM_PROMPTS[0].content,
};

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem("zhiyu_settings");
    let settings = DEFAULT_SETTINGS;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: Remap deprecated or preview model IDs to stable Gemini 2.5 equivalents
        const oldIds = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.5-flash-8b", "gemini-2.0-flash-exp", "gemini-3-flash-preview"];
        if (oldIds.includes(parsed.extractionModel)) {
          if (parsed.extractionModel === "gemini-1.5-pro") parsed.extractionModel = "gemini-2.5-pro";
          else if (parsed.extractionModel === "gemini-1.5-flash-8b") parsed.extractionModel = "gemini-2.5-flash-lite";
          else parsed.extractionModel = "gemini-2.5-flash";
        }
        if (oldIds.includes(parsed.translationModel)) {
          if (parsed.translationModel === "gemini-1.5-pro") parsed.translationModel = "gemini-2.5-pro";
          else if (parsed.translationModel === "gemini-1.5-flash-8b") parsed.translationModel = "gemini-2.5-flash-lite";
          else parsed.translationModel = "gemini-2.5-flash";
        }
        settings = { ...DEFAULT_SETTINGS, ...parsed };
      } catch (e) {
        console.error("Failed to parse settings");
      }
    }
    return {
      videoUrl: null,
      videoFile: null,
      subtitles: [],
      status: "idle",
      settings,
    };
  });

  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubtitleStyleOpen, setIsSubtitleStyleOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isPromptDropdownOpen, setIsPromptDropdownOpen] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState<"up" | "down">("up");
  const modelBtnRef = useRef<HTMLButtonElement>(null);
  const promptBtnRef = useRef<HTMLButtonElement>(null);

  const toggleModelDropdown = () => {
    if (!isModelDropdownOpen && modelBtnRef.current) {
      const rect = modelBtnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Prefer down unless there's clearly no room and there's more room above
      setDropdownDirection(spaceBelow > 300 ? "down" : rect.top > spaceBelow ? "up" : "down");
    }
    setIsModelDropdownOpen(!isModelDropdownOpen);
  };

  const togglePromptDropdown = () => {
    if (!isPromptDropdownOpen && promptBtnRef.current) {
      const rect = promptBtnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // Prefer down unless there's clearly no room and there's more room above
      setDropdownDirection(spaceBelow > 300 ? "down" : rect.top > spaceBelow ? "up" : "down");
    }
    setIsPromptDropdownOpen(!isPromptDropdownOpen);
  };
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const skipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const t = translations[state.settings.language];

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message}`,
        );
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 1500);
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 1500);
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) videoRef.current.play();
          else videoRef.current.pause();
        }
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        skip(-5);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        skip(5);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [videoDuration]);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) videoRef.current.play();
    else videoRef.current.pause();
  };

  useEffect(() => {
    localStorage.setItem("zhiyu_settings", JSON.stringify(state.settings));
    document.documentElement.classList.add("dark");
  }, [state.settings]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [playbackSpeed, volume, isMuted]);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  const handleFileSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setState((prev) => ({
      ...prev,
      videoFile: file,
      videoUrl: url,
      status: "idle",
      subtitles: [],
      error: undefined,
    }));
    toast.success(`${t.title}: Tải tệp thành công`, {
      description: file.name,
    });
  };

  const handleUpdateSubtitle = React.useCallback((id: string, updates: Partial<SubtitleItem>) => {
    setState(prev => ({
      ...prev,
      subtitles: prev.subtitles.map(sub => 
        sub.id === id ? { ...sub, ...updates } : sub
      )
    }));
  }, []);

  const handleDeleteSubtitle = React.useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      subtitles: prev.subtitles.filter(sub => sub.id !== id)
    }));
    toast.info("Đã xoá dòng phụ đề");
  }, []);

  const handleAddSubtitle = React.useCallback((time: number) => {
    setState(prev => {
      const newSub: SubtitleItem = {
        id: Math.random().toString(36).substr(2, 9),
        startTime: time,
        endTime: time + 3 < (prev.subtitles[0]?.startTime ?? 100) ? time + 3 : time + 3, // simplified
        chinese: "",
        vietnamese: ""
      };
      // Better duration logic
      const nextSub = prev.subtitles.find(s => s.startTime > time);
      if (nextSub) {
        newSub.endTime = Math.min(time + 3, nextSub.startTime);
      }

      const newSubtitles = [...prev.subtitles, newSub].sort((a, b) => a.startTime - b.startTime);
      return { ...prev, subtitles: newSubtitles };
    });
    toast.success("Đã thêm dòng phụ đề mới");
  }, []);

  const handleSplitSubtitle = React.useCallback((id: string, time: number) => {
    setState(prev => {
      const subIndex = prev.subtitles.findIndex(s => s.id === id);
      if (subIndex === -1) return prev;
      
      const sub = prev.subtitles[subIndex];
      if (time <= sub.startTime + 0.1 || time >= sub.endTime - 0.1) return prev;
      
      const sub1: SubtitleItem = { ...sub, endTime: time };
      const sub2: SubtitleItem = {
        ...sub,
        id: Math.random().toString(36).substr(2, 9),
        startTime: time,
      };
      
      const newSubtitles = [...prev.subtitles];
      newSubtitles.splice(subIndex, 1, sub1, sub2);
      return { ...prev, subtitles: newSubtitles };
    });
    toast.success("Đã tách dòng phụ đề");
  }, []);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const [isErrorDetailOpen, setIsErrorDetailOpen] = useState(false);
  const [errorDetail, setErrorDetail] = useState<any>(null);

  const getVietnameseErrorMessage = (err: any) => {
    const msg = err.message || JSON.stringify(err);
    if (msg.includes("404") || msg.includes("NOT_FOUND")) {
      return "Không tìm thấy mô hình AI hoặc tài nguyên (Lỗi 404). Vui lòng kiểm tra lại cài đặt Model ID.";
    }
    if (msg.includes("429") || msg.includes("quota")) {
      return "Hết hạn mức sử dụng (Lỗi 429). Vui lòng thử lại sau hoặc đổi API Key khác.";
    }
    if (msg.includes("403") || msg.includes("permission")) {
      return "Lỗi xác thực hoặc không có quyền (Lỗi 403). Kiểm tra lại API Key.";
    }
    if (msg.includes("API key not valid")) {
      return "API Key không hợp lệ. Vui lòng cập nhật key chính xác.";
    }
    if (msg.includes("Safety") || msg.includes("HARM_CATEGORY")) {
      return "Nội dung bị chặn do vi phạm chính sách an toàn của AI.";
    }
    if (msg.includes("NetworkError") || msg.includes("fetch")) {
      return "Lỗi kết nối mạng. Vui lòng kiểm tra internet.";
    }
    return "Đã xảy ra lỗi không xác định. Nhấn 'Xem chi tiết' để biết thêm.";
  };

  const handleKeyError = (id: string, error: any) => {
    const isQuotaError =
      error?.message?.includes("429") || error?.message?.includes("quota");
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        apiKeys: prev.settings.apiKeys.map((k) =>
          k.id === id
            ? {
                ...k,
                status: "error",
                errorCount: k.errorCount + 1,
                hasQuota: isQuotaError ? false : k.hasQuota,
              }
            : k,
        ),
      },
    }));
    console.warn(`API Key ${id} failed:`, error.message);
  };

  const handleStartTranscription = async () => {
    if (!state.videoFile) return;
    try {
      setState((prev) => ({
        ...prev,
        status: "transcribing",
        error: undefined,
      }));

      // Check if file is potentially too large for browser memory (OOM risk)
      if (state.videoFile.size > 80 * 1024 * 1024) {
        toast.warning("Tệp video khá lớn. Nếu trình duyệt gặp lỗi, hãy sử dụng chức năng 'Trích xuất âm thanh' thủ công trước.");
      }

      const base64 = await fileToBase64(state.videoFile);
      const res = await transcribeVideo(
        base64,
        state.videoFile.type,
        state.settings.apiKeys,
        state.settings.activeKeyId,
        state.settings.extractionModel,
        state.settings.transcriptionPrompt,
        handleKeyError,
      );
      setState((prev) => ({ ...prev, subtitles: res, status: "completed" }));
      toast.success("Trích xuất phụ đề thành công", {
        description: `Tìm thấy ${res.length} đoạn hội thoại.`,
      });
    } catch (err: any) {
      console.error("Transcription error:", err);
      const vnMappedError = getVietnameseErrorMessage(err);
      setState((prev) => ({
        ...prev,
        status: "error",
        error: vnMappedError,
      }));
      setErrorDetail(err);
      toast.error("Trích xuất phụ đề thất bại", {
        description: vnMappedError,
        action: {
          label: "Xem chi tiết",
          onClick: () => setIsErrorDetailOpen(true)
        },
        duration: 8000
      });
    }
  };

  const handleTranslate = async () => {
    if (state.subtitles.length === 0) return;
    try {
      setState((prev) => ({ ...prev, status: "translating" }));
      const translated = await translateSubtitles(
        state.subtitles,
        state.settings.apiKeys,
        state.settings.activeKeyId,
        state.settings.translationModel,
        handleKeyError,
      );
      setState((prev) => ({
        ...prev,
        subtitles: translated,
        status: "completed",
      }));
      toast.success("Dịch phụ đề thành công");
    } catch (err: any) {
      const vnMappedError = getVietnameseErrorMessage(err);
      setState((prev) => ({
        ...prev,
        status: "error",
        error: vnMappedError,
      }));
      setErrorDetail(err);
      toast.error("Dịch phụ đề thất bại", {
        description: vnMappedError,
        action: {
          label: "Xem chi tiết",
          onClick: () => setIsErrorDetailOpen(true)
        },
        duration: 8000
      });
    }
  };

  const reset = () => {
    if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
    setState((prev) => ({
      ...prev,
      videoUrl: null,
      videoFile: null,
      subtitles: [],
      status: "idle",
    }));
    setCurrentTime(0);
    setVideoDuration(0);
    setPlaybackSpeed(1);
    toast.info("Đã đặt lại ứng dụng");
  };

  const handleExtractAudio = async () => {
    if (!state.videoFile) return;
    try {
      setState((prev) => ({ ...prev, status: "processing", error: undefined }));
      toast.info("Đang xử lý tệp tin...");
      
      const audioBlob = await extractAudio(state.videoFile);
      const originalName = state.videoFile.name;
      const baseName = originalName.substring(0, originalName.lastIndexOf(".")) || originalName;
      const audioFileName = `${baseName}.wav`;

      setState((prev) => ({
        ...prev,
        status: "audio_extracted",
        videoFile: new File([audioBlob], audioFileName, {
          type: "audio/wav",
          lastModified: Date.now(),
        }),
      }));
      toast.success("Trích xuất âm thanh thành công", {
        description: "Đã chuyển đổi video thành âm thanh để tối ưu dung lượng.",
      });
    } catch (err: any) {
      console.error("Extraction error:", err);
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err.message || "Extraction failed",
      }));
      toast.error("Trích xuất thất bại", {
        description: "Không thể trích xuất âm thanh. Trình duyệt của bạn có thể không hỗ trợ codec của video này.",
      });
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      const isConsecutive = skipTimeoutRef.current !== null;
      // If consecutive skip within 500ms, use 10s instead of 5s
      const skipAmount = isConsecutive ? (seconds > 0 ? 10 : -10) : seconds;

      const duration = videoRef.current.duration || videoDuration;
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(duration, videoRef.current.currentTime + skipAmount),
      );

      // Reset skip timeout
      if (skipTimeoutRef.current) clearTimeout(skipTimeoutRef.current);
      skipTimeoutRef.current = setTimeout(() => {
        skipTimeoutRef.current = null;
      }, 500);
    }
  };

  const toggleSpeed = () => {
    const speeds = [1, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIndex]);
  };

  const handleSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      let subs: SubtitleItem[] = [];

      if (file.name.toLowerCase().endsWith(".srt")) {
        subs = parseSRT(text);
      } else if (file.name.toLowerCase().endsWith(".vtt")) {
        subs = parseVTT(text);
      }

      if (subs.length > 0) {
        setState((prev) => ({ ...prev, subtitles: subs, status: "completed" }));
        toast.success("Tải phụ đề thành công", {
          description: `Đã nhập ${subs.length} đoạn phụ đề từ tệp ${file.name}`,
        });
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = "";
  };

  const onSeek = React.useCallback((t: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      setCurrentTime(t);
    }
  }, []);

  const activeSub = useMemo(() => 
    state.subtitles.find(
      (s) => currentTime >= s.startTime && currentTime <= s.endTime,
    ),
    [state.subtitles, currentTime]
  );

  // We use the event handlers on the video tag directly for better reliability
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, state.videoUrl]);

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300 bg-zinc-950 text-zinc-100"
    >
      {/* Header */}
      <header
        className="h-20 border-b flex items-center justify-between px-4 md:px-12 shrink-0 z-50 backdrop-blur-xl transition-all duration-300 bg-zinc-950/80 border-zinc-800 shadow-xl shadow-black/20"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg leading-tight tracking-tight">
              {t.title}
            </h1>
            <p className="text-[10px] uppercase font-mono text-zinc-500">
              {t.subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-4">
          {/* Language Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs font-bold uppercase tracking-wider bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white border"
            >
              <Languages className="w-4 h-4" />
              <span className="hidden sm:inline">
                {state.settings.language}
              </span>
            </button>

            <AnimatePresence>
              {isLangMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsLangMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
                    animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                    exit={{ opacity: 0, y: 10, scale: 0.95, x: "-50%" }}
                    className="absolute top-full left-1/2 mt-2 w-48 rounded-xl shadow-2xl border z-50 overflow-hidden backdrop-blur-xl bg-zinc-900/95 border-zinc-800"
                  >
                    <div className="p-1 space-y-0.5">
                      {(["en", "vi", "zh"] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => {
                            setState((prev) => ({
                              ...prev,
                              settings: { ...prev.settings, language: lang },
                            }));
                            setIsLangMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-[11px] font-bold transition-all rounded-lg
                            ${
                              state.settings.language === lang
                                ? "bg-blue-600 text-white"
                                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                            }
                          `}
                        >
                          {lang === "en"
                            ? "English (English)"
                            : lang === "vi"
                              ? "Tiếng Việt (Vietnamese)"
                              : "中文 (Chinese)"}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-lg transition-all text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-[80vw] px-4 py-8 space-y-8">
          {/* Section 1: Upload */}
          {!state.videoUrl && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <FileUploader
                onFileSelect={handleFileSelect}
                isLoading={state.status.includes("ing")}
                language={state.settings.language}
              />
            </section>
          )}

          {state.videoUrl && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Section 2: Player */}
              <section className="space-y-4">
                <motion.div
                  layout
                  ref={containerRef}
                  onMouseMove={handleMouseMove}
                  onClick={togglePlay}
                  className={`aspect-video overflow-hidden shadow-2xl relative border group
                    bg-black border-zinc-800
                    ${isFullscreen ? "fixed inset-0 z-[200] rounded-none border-0" : "rounded-3xl"}
                    ${!showControls && isPlaying ? "cursor-none" : "cursor-pointer"}
                  `}
                  transition={{ type: "spring", stiffness: 300, damping: 35 }}
                >
                  <motion.video
                    layout
                    ref={videoRef}
                    src={state.videoUrl}
                    className="w-full h-full object-contain"
                    playsInline
                    onClick={togglePlay}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={(e) =>
                      setCurrentTime(e.currentTarget.currentTime)
                    }
                    onLoadedMetadata={(e) =>
                      setVideoDuration(e.currentTarget.duration)
                    }
                    onVolumeChange={(e) => {
                      setVolume(e.currentTarget.volume);
                      setIsMuted(e.currentTarget.muted);
                    }}
                  />

                  {/* Top Right Controls: Subtitles */}
                  <div
                    className={`absolute top-4 right-4 z-20 flex flex-col gap-2 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                  >
                    <div className="flex bg-black/60 rounded-xl p-1 backdrop-blur-xl border border-white/10 shadow-2xl">
                      <Tooltip content={state.settings.isSubtitleVisible ? "Ẩn phụ đề" : "Hiện phụ đề"}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setState((prev) => ({
                              ...prev,
                              settings: {
                                ...prev.settings,
                                isSubtitleVisible:
                                  !prev.settings.isSubtitleVisible,
                              },
                            }));
                          }}
                          className={`p-2 rounded-lg transition-all ${state.settings.isSubtitleVisible ? "bg-blue-600 text-white" : "text-white/40 hover:text-white"}`}
                        >
                          {state.settings.isSubtitleVisible ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                      </Tooltip>
                      <Tooltip content={t.showOriginal}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setState((prev) => ({
                              ...prev,
                              settings: {
                                ...prev.settings,
                                showOriginal: !prev.settings.showOriginal,
                              },
                            }));
                          }}
                          className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ml-1 ${state.settings.showOriginal ? "bg-white/20 text-white" : "text-white/30 hover:text-white"}`}
                        >
                          {t.showOriginal}
                        </button>
                      </Tooltip>
                      <Tooltip content={t.showTranslated}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setState((prev) => ({
                              ...prev,
                              settings: {
                                ...prev.settings,
                                showTranslated: !prev.settings.showTranslated,
                              },
                            }));
                          }}
                          className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ml-1 ${state.settings.showTranslated ? "bg-white/20 text-white" : "text-white/30 hover:text-white"}`}
                        >
                          {t.showTranslated}
                        </button>
                      </Tooltip>
                      <Tooltip content="Tùy chỉnh kiểu hiển thị phụ đề">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSubtitleStyleOpen(true);
                          }}
                          className="p-2 text-white/50 hover:text-white transition-colors ml-1"
                        >
                          <StyleIcon className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Subtitle Overlay */}
                  {state.settings.isSubtitleVisible && activeSub && (
                    <div
                      className="absolute left-0 right-0 px-8 pointer-events-none flex flex-col items-center gap-2 z-10"
                      style={{
                        top: `${state.settings.subtitleStyle.verticalPosition}%`,
                        transform: "translateY(-50%)",
                      }}
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        {state.settings.showOriginal && (
                          <motion.div
                            key={`cn-${activeSub.id}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1, ease: "linear" }}
                          style={
                            state.settings.subtitleStyle.backgroundOpacity > 0
                              ? {
                                  backgroundColor: `rgba(${parseInt(state.settings.subtitleStyle.backgroundColor.slice(1, 3), 16)}, ${parseInt(state.settings.subtitleStyle.backgroundColor.slice(3, 5), 16)}, ${parseInt(state.settings.subtitleStyle.backgroundColor.slice(5, 7), 16)}, ${state.settings.subtitleStyle.backgroundOpacity})`,
                                  borderRadius: `${state.settings.subtitleStyle.backgroundBorderRadius}px`,
                                  padding: `${state.settings.subtitleStyle.backgroundPaddingY}px ${state.settings.subtitleStyle.backgroundPaddingX}px`,
                                }
                              : {}
                          }
                          className={
                            state.settings.subtitleStyle.backgroundOpacity > 0
                              ? "backdrop-blur-lg [backdrop-filter:blur(8px)_saturate(180%)] text-center shadow-2xl border border-white/20 flex items-center justify-center"
                              : "text-center"
                          }
                        >
                          <p
                            style={{
                              fontSize: `${state.settings.subtitleStyle.fontSize}px`,
                              letterSpacing: `${state.settings.subtitleStyle.letterSpacing}px`,
                              lineHeight: 1,
                              color: state.settings.subtitleStyle.textColor,
                              fontFamily:
                                state.settings.subtitleStyle.fontFamily,
                              fontWeight:
                                state.settings.subtitleStyle.fontWeight,
                              fontStyle: state.settings.subtitleStyle.fontStyle,
                              textDecoration:
                                state.settings.subtitleStyle.textDecoration,
                              textShadow: `0 0 ${state.settings.subtitleStyle.shadowBlur}px ${state.settings.subtitleStyle.shadowColor}`,
                              WebkitTextStroke: `${state.settings.subtitleStyle.strokeWidth}px ${state.settings.subtitleStyle.strokeColor}`,
                              paintOrder: "stroke fill",
                              whiteSpace: "nowrap",
                            }}
                            className="font-bold tracking-wide"
                          >
                            {activeSub.chinese}
                          </p>
                        </motion.div>
                      )}
                      {state.settings.showTranslated &&
                        activeSub.vietnamese && (
                          <motion.div
                            key={`vn-${activeSub.id}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1, ease: "linear" }}
                            style={
                              state.settings.subtitleStyle.backgroundOpacity > 0
                                ? {
                                    backgroundColor: `rgba(${parseInt(state.settings.subtitleStyle.backgroundColor.slice(1, 3), 16)}, ${parseInt(state.settings.subtitleStyle.backgroundColor.slice(3, 5), 16)}, ${parseInt(state.settings.subtitleStyle.backgroundColor.slice(5, 7), 16)}, ${state.settings.subtitleStyle.backgroundOpacity})`,
                                    borderRadius: `${state.settings.subtitleStyle.backgroundBorderRadius}px`,
                                    padding: `${state.settings.subtitleStyle.backgroundPaddingY}px ${state.settings.subtitleStyle.backgroundPaddingX}px`,
                                  }
                                : {}
                            }
                            className={
                              state.settings.subtitleStyle.backgroundOpacity > 0
                                ? "backdrop-blur-lg [backdrop-filter:blur(8px)_saturate(180%)] text-center shadow-2xl border border-white/20 flex items-center justify-center"
                                : "text-center"
                            }
                          >
                            <p
                              style={{
                                fontSize: `${state.settings.subtitleStyle.fontSize * 0.8}px`,
                                letterSpacing: `${state.settings.subtitleStyle.letterSpacing}px`,
                                lineHeight: 1,
                                color: state.settings.subtitleStyle.textColor,
                                fontFamily:
                                  state.settings.subtitleStyle.fontFamily,
                                fontWeight:
                                  state.settings.subtitleStyle.fontWeight,
                                fontStyle:
                                  state.settings.subtitleStyle.fontStyle ===
                                  "normal"
                                    ? "italic"
                                    : state.settings.subtitleStyle.fontStyle,
                                textDecoration:
                                  state.settings.subtitleStyle.textDecoration,
                                textShadow: `0 0 ${state.settings.subtitleStyle.shadowBlur}px ${state.settings.subtitleStyle.shadowColor}`,
                                WebkitTextStroke: `${state.settings.subtitleStyle.strokeWidth * 0.8}px ${state.settings.subtitleStyle.strokeColor}`,
                                paintOrder: "stroke fill",
                                whiteSpace: "nowrap",
                              }}
                              className="font-medium tracking-wide"
                            >
                              {activeSub.vietnamese}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Internal Player Controls */}
                  <div
                    onClick={togglePlay}
                    className={`absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent transition-opacity duration-300 flex flex-col justify-end p-4 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                  >
                    <div className="flex flex-col gap-2">
                      {/* Integrated Progress Bar */}
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-white/70 w-10 text-right">
                          {formatTime(currentTime)}
                        </span>
                        <Tooltip content="Lùi 10 giây" className="flex-1">
                          <div
                            className="h-1.5 bg-white/20 rounded-full relative overflow-hidden cursor-pointer backdrop-blur-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              const x = e.clientX - rect.left;
                              if (videoRef.current)
                                videoRef.current.currentTime =
                                  (x / rect.width) * videoDuration;
                            }}
                          >
                            <div
                              className="absolute h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                              style={{
                                width: `${(currentTime / (videoDuration || 1)) * 100}%`,
                              }}
                            />
                          </div>
                        </Tooltip>
                        <span className="text-[10px] font-mono text-white/70 w-10">
                          {formatTime(videoDuration)}
                        </span>
                      </div>

                      {/* Control Buttons Area */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Tooltip content={isPlaying ? "Tạm dừng (Space)" : "Phát (Space)"}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                isPlaying
                                  ? videoRef.current?.pause()
                                  : videoRef.current?.play();
                              }}
                              className="p-2 text-white hover:scale-110 transition-transform"
                            >
                              {isPlaying ? (
                                <Pause className="w-6 h-6 fill-current" />
                              ) : (
                                <Play className="w-6 h-6 fill-current" />
                              )}
                            </button>
                          </Tooltip>

                          <Tooltip content="Lùi 5s (←)">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                skip(-5);
                              }}
                              className="p-2 text-white/70 hover:text-white transition-colors"
                            >
                              <SkipBack className="w-5 h-5" />
                            </button>
                          </Tooltip>

                          <Tooltip content="Tiến 5s (→)">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                skip(5);
                              }}
                              className="p-2 text-white/70 hover:text-white transition-colors"
                            >
                              <SkipForward className="w-5 h-5" />
                            </button>
                          </Tooltip>

                          <Tooltip content="Tốc độ phát">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSpeed();
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition-all ml-2"
                            >
                              <Gauge className="w-3.5 h-3.5" />
                              {playbackSpeed}x
                            </button>
                          </Tooltip>

                          {/* Volume Control */}
                          <div className="flex items-center gap-2 ml-4 group/vol">
                            <button
                              onClick={toggleMute}
                              className="p-2 text-white/70 hover:text-white transition-colors"
                            >
                              {isMuted || volume === 0 ? (
                                <VolumeX className="w-5 h-5" />
                              ) : (
                                <Volume2 className="w-5 h-5" />
                              )}
                            </button>
                            <div className="w-0 group-hover/vol:w-24 transition-all duration-300 overflow-hidden flex items-center">
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={isMuted ? 0 : volume}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setVolume(val);
                                  if (val > 0) setIsMuted(false);
                                  if (videoRef.current)
                                    videoRef.current.volume = val;
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 sm:gap-4">
                          {/* Status Badge */}
                          <div className="px-3 py-2 bg-blue-600/40 backdrop-blur-xl rounded-xl border border-blue-400/20 text-[10px] font-mono uppercase tracking-widest text-white shadow-lg">
                            {state.status.includes("ing") ? (
                              <span className="flex items-center gap-1.5">
                                <Loader2 className="w-3 h-3 animate-spin" />{" "}
                                {state.status}
                              </span>
                            ) : (
                              state.status
                            )}
                          </div>

                          <Tooltip content={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFullscreen();
                              }}
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all backdrop-blur-xl border border-white/10 shadow-lg"
                            >
                              {isFullscreen ? (
                                <Minimize2 className="w-4 h-4" />
                              ) : (
                                <Maximize2 className="w-4 h-4" />
                              )}
                            </button>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </section>

              {!isFullscreen && (
                <>
                  {/* Video Info Card */}
                  <section
                    className="px-6 py-5 rounded-3xl border flex flex-col gap-5 bg-zinc-900/50 border-zinc-800"
                  >
                {/* File Name Row */}
                <div className="flex items-center gap-4 pb-4 border-b border-zinc-800/50">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 shrink-0 shadow-sm">
                    <FileVideo className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase font-black text-zinc-500 tracking-widest mb-0.5">
                      {(t as any).fileName}
                    </p>
                    <Tooltip content={state.videoFile?.name} className="max-w-full">
                      <h3
                        className="text-lg font-black truncate leading-tight"
                      >
                        {state.videoFile?.name}
                      </h3>
                    </Tooltip>
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-y-6 gap-x-4 sm:gap-x-8 items-center">
                  {/* Size */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-600/10 flex items-center justify-center text-purple-500 shadow-sm shrink-0">
                      <HardDrive className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5">
                        {(t as any).fileSize}
                      </p>
                      <p className="text-sm font-bold leading-none truncate">
                        {state.videoFile
                          ? formatFileSize(state.videoFile.size)
                          : "--"}
                      </p>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-500 shadow-sm shrink-0">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5">
                        {(t as any).duration}
                      </p>
                      <p className="text-sm font-bold leading-none truncate">
                        {formatTime(videoDuration)}
                      </p>
                    </div>
                  </div>

                  {/* Format */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-orange-600/10 flex items-center justify-center text-orange-500 shadow-sm shrink-0">
                      <Info className="w-4.5 h-4.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5">
                        {(t as any).format}
                      </p>
                      <p className="text-sm font-bold uppercase leading-none truncate">
                        {state.videoFile?.name.split(".").pop() || "Unknown"}
                      </p>
                    </div>
                  </div>

                  {/* Model */}
                  <div className="relative min-w-0">
                    <button
                      ref={modelBtnRef}
                      onClick={toggleModelDropdown}
                      onBlur={() => setTimeout(() => setIsModelDropdownOpen(false), 200)}
                      className="flex items-center gap-3 text-left p-1.5 -m-1.5 rounded-xl transition-all w-full hover:bg-white/5"
                    >
                      <div className="w-9 h-9 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                        <Cpu className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5 flex items-center gap-1">
                          {(t as any).model}
                          <ChevronDown className={`w-3 h-3 transition-transform ${isModelDropdownOpen ? "rotate-180" : ""}`} />
                        </p>
                        <p className="text-sm font-bold leading-none truncate">
                          {AI_MODELS.find((m) => m.id === state.settings.extractionModel)?.label || state.settings.extractionModel}
                        </p>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isModelDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: dropdownDirection === "up" ? 10 : -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: dropdownDirection === "up" ? 10 : -10, scale: 0.95 }}
                          className={`absolute ${dropdownDirection === "up" ? "bottom-full mb-4" : "top-full mt-4"} left-0 w-56 p-2 rounded-2xl border shadow-2xl z-[100] bg-zinc-900 border-zinc-800`}
                        >
                          <div className="px-3 py-2 text-[10px] font-black text-blue-500 uppercase tracking-widest border-b border-blue-500/10 mb-1">
                            Chọn Mô Hình AI
                          </div>
                          {AI_MODELS.map((model) => {
                            const modelColorMap: Record<string, string> = {
                              'gemini-2.5-pro': 'amber',
                              'gemini-2.5-flash': 'emerald',
                              'gemini-2.5-flash-lite': 'blue',
                              'gemini-2.0-flash': 'indigo'
                            };
                            const colorKey = modelColorMap[model.id] || 'purple';
                            
                            const colorClasses: Record<string, string> = {
                              amber: state.settings.extractionModel === model.id 
                                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30" 
                                : "text-amber-400/70 hover:bg-amber-600/10 hover:text-amber-400",
                              emerald: state.settings.extractionModel === model.id 
                                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30" 
                                : "text-emerald-400/70 hover:bg-emerald-600/10 hover:text-emerald-400",
                              blue: state.settings.extractionModel === model.id 
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                                : "text-blue-400/70 hover:bg-blue-600/10 hover:text-blue-400",
                              indigo: state.settings.extractionModel === model.id 
                                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                                : "text-indigo-400/70 hover:bg-indigo-600/10 hover:text-indigo-400",
                              purple: state.settings.extractionModel === model.id 
                                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" 
                                : "text-purple-400/70 hover:bg-purple-600/10 hover:text-purple-400",
                            };

                            return (
                              <button
                                key={model.id}
                                onClick={() => {
                                  setState((prev) => ({
                                    ...prev,
                                    settings: {
                                      ...prev.settings,
                                      extractionModel: model.id,
                                      translationModel: model.id,
                                    },
                                  }));
                                  setIsModelDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all mb-0.5 ${colorClasses[colorKey]}`}
                              >
                                {model.label}
                                {state.settings.extractionModel === model.id && (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Prompt */}
                  <div className="relative min-w-0">
                    <button
                      ref={promptBtnRef}
                      onClick={togglePromptDropdown}
                      onBlur={() => setTimeout(() => setIsPromptDropdownOpen(false), 200)}
                      className="flex items-center gap-3 text-left p-1.5 -m-1.5 rounded-xl transition-all w-full hover:bg-white/5"
                    >
                      <div className="w-9 h-9 rounded-xl bg-orange-600/10 flex items-center justify-center text-orange-500 shadow-sm shrink-0">
                        <MessageSquare className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider mb-0.5 flex items-center gap-1">
                          {(t as any).prompt}
                          <ChevronDown className={`w-3 h-3 transition-transform ${isPromptDropdownOpen ? "rotate-180" : ""}`} />
                        </p>
                        <p className="text-sm font-bold truncate leading-none">
                          {SYSTEM_PROMPTS.concat(state.settings.customPrompts).find(
                            (p) => p.id === state.settings.selectedPromptId,
                          )?.title || "Custom"}
                        </p>
                      </div>
                    </button>

                    <AnimatePresence>
                      {isPromptDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: dropdownDirection === "up" ? 10 : -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: dropdownDirection === "up" ? 10 : -10, scale: 0.95 }}
                          className={`absolute ${dropdownDirection === "up" ? "bottom-full mb-4" : "top-full mt-4"} left-0 w-72 p-2 rounded-2xl border shadow-2xl z-[100] max-h-80 overflow-y-auto custom-scrollbar bg-zinc-900 border-zinc-800`}
                        >
                          <div className="px-3 py-2 text-[10px] font-black text-orange-500 uppercase tracking-widest border-b border-orange-500/10 mb-1">
                            Chọn Chế Độ Prompt
                          </div>
                          {SYSTEM_PROMPTS.concat(state.settings.customPrompts).map(
                            (prompt) => {
                              const promptColorMap: Record<string, string> = {
                                'speech-recognition': 'purple',
                                'game-recognition': 'rose',
                                'hardsub-extraction': 'emerald',
                                'combined-subtitle': 'orange',
                                'lyrics-extraction': 'amber',
                                'video-description': 'pink',
                                'chaptering': 'indigo',
                                'speaker-recognition': 'yellow',
                                'direct-translation': 'cyan',
                              };
                              const colorKey = promptColorMap[prompt.id] || 'zinc';

                              const colorClasses: Record<string, string> = {
                                purple: state.settings.selectedPromptId === prompt.id 
                                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" 
                                  : "text-purple-400/70 hover:bg-purple-600/10 hover:text-purple-400",
                                rose: state.settings.selectedPromptId === prompt.id 
                                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30" 
                                  : "text-rose-400/70 hover:bg-rose-600/10 hover:text-rose-400",
                                emerald: state.settings.selectedPromptId === prompt.id 
                                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30" 
                                  : "text-emerald-400/70 hover:bg-emerald-600/10 hover:text-emerald-400",
                                orange: state.settings.selectedPromptId === prompt.id 
                                  ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30" 
                                  : "text-orange-400/70 hover:bg-orange-600/10 hover:text-orange-400",
                                amber: state.settings.selectedPromptId === prompt.id 
                                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30" 
                                  : "text-amber-400/70 hover:bg-amber-600/10 hover:text-amber-400",
                                pink: state.settings.selectedPromptId === prompt.id 
                                  ? "bg-pink-600 text-white shadow-lg shadow-pink-600/30" 
                                  : "text-pink-400/70 hover:bg-pink-600/10 hover:text-pink-400",
                                indigo: state.settings.selectedPromptId === prompt.id 
                                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                                  : "text-indigo-400/70 hover:bg-indigo-600/10 hover:text-indigo-400",
                                yellow: state.settings.selectedPromptId === prompt.id 
                                  ? "bg-yellow-600 text-white shadow-lg shadow-yellow-600/30" 
                                  : "text-yellow-400/70 hover:bg-yellow-600/10 hover:text-yellow-400",
                                cyan: state.settings.selectedPromptId === prompt.id 
                                  ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30" 
                                  : "text-cyan-400/70 hover:bg-cyan-600/10 hover:text-cyan-400",
                                zinc: state.settings.selectedPromptId === prompt.id 
                                  ? "bg-zinc-600 text-white shadow-lg shadow-zinc-600/30" 
                                  : "text-zinc-400 hover:bg-zinc-600/10 hover:text-zinc-400",
                              };

                              return (
                                <button
                                  key={prompt.id}
                                  onClick={() => {
                                    setState((prev) => ({
                                      ...prev,
                                      settings: {
                                        ...prev.settings,
                                        selectedPromptId: prompt.id,
                                        transcriptionPrompt: prompt.content,
                                      },
                                    }));
                                    setIsPromptDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all mb-0.5 ${colorClasses[colorKey]}`}
                                >
                                  <span className="truncate pr-4">{prompt.title}</span>
                                  {state.settings.selectedPromptId ===
                                    prompt.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                                </button>
                              );
                            },
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </section>

              {/* Timeline Section */}
              {state.subtitles.length > 0 && (
                <Timeline 
                  subtitles={state.subtitles}
                  duration={videoDuration}
                  currentTime={currentTime}
                  onSeek={(t) => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = t;
                      setCurrentTime(t);
                    }
                  }}
                  onUpdateSubtitle={handleUpdateSubtitle}
                  isDark={true}
                />
              )}

              {/* Action Area */}
              <section className="flex flex-col sm:flex-row gap-3">
                <input
                  type="file"
                  id="sub-upload"
                  accept=".srt,.vtt"
                  className="hidden"
                  onChange={handleSubtitleUpload}
                />

                <Tooltip content={(t as any).uploadSubtitleTooltip}>
                  <button
                    onClick={() =>
                      document.getElementById("sub-upload")?.click()
                    }
                    className="px-6 py-4 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-500 hover:text-white rounded-2xl font-bold flex items-center justify-center transition-all border border-indigo-500/20"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                </Tooltip>

                <Tooltip content={(t as any).extractAudio}>
                  <button
                    disabled={state.status.includes("ing")}
                    onClick={handleExtractAudio}
                    className="px-6 py-4 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-2xl font-bold flex items-center justify-center transition-all border border-emerald-500/20 disabled:opacity-50"
                  >
                    <Music className="w-5 h-5" />
                  </button>
                </Tooltip>

                {state.subtitles.length === 0 ? (
                  <button
                    disabled={state.status === "transcribing"}
                    onClick={handleStartTranscription}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-900/20 disabled:bg-zinc-800"
                  >
                    {state.status === "transcribing" ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    {t.startTranscription}
                  </button>
                ) : (
                  <div className="flex-1 flex gap-3">
                    <button
                      disabled={
                        state.status === "translating" ||
                        state.subtitles.some((s) => s.vietnamese)
                      }
                      onClick={handleTranslate}
                      className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-sm tracking-widest flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] border border-white/10 disabled:opacity-50 disabled:bg-zinc-800 disabled:shadow-none"
                    >
                      {state.status === "translating" ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Languages className="w-5 h-5" />
                      )}
                      {state.subtitles.some((s) => s.vietnamese)
                        ? (t as any).translated || "ĐÃ DỊCH"
                        : t.translate}
                    </button>
                    
                    <Tooltip content="Xóa tất cả phụ đề hiện tại">
                      <button
                        onClick={() => setState(prev => ({ ...prev, subtitles: [], status: 'idle' }))}
                        className="px-6 py-4 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white rounded-2xl font-bold flex items-center justify-center transition-all border border-orange-500/20"
                      >
                        <Eraser className="w-5 h-5" />
                      </button>
                    </Tooltip>
                  </div>
                )}

                <Tooltip content={(t as any).deleteVideo}>
                  <button
                    onClick={reset}
                    className="px-6 py-4 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all border border-red-500/20"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span className="sm:hidden">{(t as any).deleteVideo}</span>
                  </button>
                </Tooltip>
              </section>

              {/* Section 3: Subtitles List */}
              <section
                className="rounded-3xl border overflow-hidden flex flex-col h-[600px] min-h-[400px] bg-zinc-900/30 border-zinc-800"
              >
                <SubtitleView
                  subtitles={state.subtitles}
                  currentTime={currentTime}
                  onSeek={(t) => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = t;
                      setCurrentTime(t);
                    }
                  }}
                  onUpdateSubtitle={handleUpdateSubtitle}
                  onDeleteSubtitle={handleDeleteSubtitle}
                  onAddSubtitle={handleAddSubtitle}
                  onSplitSubtitle={handleSplitSubtitle}
                  isTranslating={state.status === "translating"}
                  language={state.settings.language}
                />
              </section>
            </>
          )}
        </div>
      )}
    </div>
  </main>
      
      {createPortal(
        <>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={state.settings}
            onSave={(newSettings) =>
              setState((prev) => ({ ...prev, settings: newSettings }))
            }
          />

          <SubtitleStyleModal
            isOpen={isSubtitleStyleOpen}
            onClose={() => setIsSubtitleStyleOpen(false)}
            style={state.settings.subtitleStyle}
            defaultStyle={DEFAULT_SUBTITLE_STYLE}
            onSave={(newStyle) =>
              setState((prev) => ({
                ...prev,
                settings: { ...prev.settings, subtitleStyle: newStyle },
              }))
            }
            onChange={(newStyle) =>
              setState((prev) => ({
                ...prev,
                settings: { ...prev.settings, subtitleStyle: newStyle },
              }))
            }
            language={state.settings.language}
            isDark={true}
            activeSubtitle={activeSub}
          />

          <AnimatePresence>
            {isErrorDetailOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsErrorDetailOpen(false)}
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
                >
                  <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <Info className="w-4 h-4 text-red-500" />
                      </div>
                      <h3 className="font-bold text-zinc-100">Chi tiết lỗi kỹ thuật</h3>
                    </div>
                    <button
                      onClick={() => setIsErrorDetailOpen(false)}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                    >
                      <Minimize2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto">
                    <p className="text-sm text-zinc-400 mb-4">
                      Bạn có thể cung cấp thông tin này cho quản trị viên để được hỗ trợ:
                    </p>
                    <pre className="p-4 bg-black rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-300 whitespace-pre-wrap overflow-x-auto">
                      {errorDetail ? (
                        (() => {
                          const errObj = errorDetail instanceof Error 
                            ? { 
                                name: errorDetail.name, 
                                message: errorDetail.message, 
                                stack: errorDetail.stack,
                                ...errorDetail 
                              } 
                            : errorDetail;
                          return JSON.stringify(errObj, null, 2);
                        })()
                      ) : "Không có thông tin chi tiết."}
                    </pre>
                  </div>

                  <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        const text = typeof errorDetail === 'object' ? JSON.stringify(errorDetail, null, 2) : String(errorDetail);
                        navigator.clipboard.writeText(text);
                        toast.success("Đã sao chép lỗi vào bộ nhớ tạm");
                      }}
                      className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-medium transition-colors border border-zinc-700"
                    >
                      Sao chép
                    </button>
                    <button
                      onClick={() => setIsErrorDetailOpen(false)}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/20 transition-all"
                    >
                      Đóng
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>,
        isFullscreen && containerRef.current ? containerRef.current : document.body
      )}

      <Toaster richColors position="bottom-right" theme="dark" />
    </div>
  );
}

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
