import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Sparkles, 
  Play, 
  Trash2, 
  Image as ImageIcon, 
  Film, 
  Download, 
  AlertCircle, 
  Lock, 
  Layers, 
  Clock, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronUp, 
  RotateCcw, 
  Zap, 
  Loader2, 
  Volume2, 
  VolumeX, 
  Music, 
  Radio, 
  Cpu, 
  Monitor, 
  Smartphone, 
  Square, 
  ListOrdered,
  Sliders,
  CheckCircle2,
  Info
} from 'lucide-react';
import { 
  VideoStylePreset, 
  CameraMotion, 
  AspectRatio, 
  GeneratedVideo 
} from '../types';
import { generateVideo, checkVideoStatus } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useThemeConfig } from '../context/ThemeConfigContext';
import { AdBanner } from './AdBanner';

interface VideoStudioProps {
  initialPrompt?: string;
  onVideoCreated?: (video: GeneratedVideo) => void;
}

const STYLE_PRESETS: { id: VideoStylePreset; label: string; icon: string }[] = [
  { id: 'cinematic', label: 'Cinematic Movie', icon: '🎬' },
  { id: 'cyberpunk-neon', label: 'Cyberpunk Neon', icon: '🌃' },
  { id: 'anime', label: 'Anime / Makoto Shinkai', icon: '🌸' },
  { id: 'photorealistic', label: '8K Hyperrealism', icon: '📸' },
  { id: '3d-render', label: 'Octane 3D Render', icon: '🧊' },
  { id: 'dark-fantasy', label: 'Dark Fantasy Film', icon: '⚔️' },
  { id: 'drone-fpv', label: 'Drone FPV Racing', icon: '🚁' },
];

const MOTION_PRESETS: { id: CameraMotion; label: string }[] = [
  { id: 'cinematic-pan', label: 'Smooth Horizontal Pan' },
  { id: 'zoom-in', label: 'Dynamic Zoom In' },
  { id: 'zoom-out', label: 'Slow Reveal Zoom Out' },
  { id: 'orbit-3d', label: '3D Spiral Orbit' },
  { id: 'tilt-up', label: 'Dramatic Tilt Up' },
  { id: 'static-subtle', label: 'Subtle Parallax Drift' },
];

const ASPECT_RATIO_OPTIONS: { id: AspectRatio; titleEn: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  {
    id: '16:9',
    titleEn: '16:9 Cinema & Widescreen',
    desc: 'YouTube, TV, and Desktop Landscape',
    icon: Monitor,
  },
  {
    id: '9:16',
    titleEn: '9:16 Vertical Story',
    desc: 'TikTok, Instagram Reels & Shorts',
    icon: Smartphone,
  },
  {
    id: '1:1',
    titleEn: '1:1 Square Feed',
    desc: 'Instagram Posts & Social Tiles',
    icon: Square,
  },
];

export const VideoStudio: React.FC<VideoStudioProps> = ({ initialPrompt = '', onVideoCreated }) => {
  const { user, openAuthModal, updateUserQuota } = useAuth();
  const { config, mode, accentClass } = useThemeConfig();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Multi-Input Prompts (Video + SFX + Music)
  const [images, setImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [sfxPrompt, setSfxPrompt] = useState('car engine revving, rain sound, distant thunder');
  const [musicPrompt, setMusicPrompt] = useState('cyberpunk synthwave, energetic bass, 120 bpm');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showNegative, setShowNegative] = useState(false);

  // Audio Toggle Switches
  const [hasMusic, setHasMusic] = useState<boolean>(true);
  const [hasSFX, setHasSFX] = useState<boolean>(true);

  // Configuration
  const [selectedStyle, setSelectedStyle] = useState<VideoStylePreset>('cyberpunk-neon');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [motion, setMotion] = useState<CameraMotion>('cinematic-pan');
  const [duration, setDuration] = useState<number>(5);
  const [isPublic, setIsPublic] = useState(true);

  // Queue & Dedicated Engine Processing Monitor State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<'queued' | 'processing' | 'completed' | 'failed' | null>(null);
  const [queuePosition, setQueuePosition] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const isLight = mode === 'light';
  const maxSeconds = user?.maxDailySeconds || config?.dailyUserLimit || 100;
  const secondsUsed = user?.secondsUsedToday ?? (user?.minutesUsedToday ? Math.round(user.minutesUsedToday * 60) : 0);
  const remainingSeconds = Math.max(0, maxSeconds - secondsUsed);

  useEffect(() => {
    if (initialPrompt) {
      setPrompt(initialPrompt);
    }
  }, [initialPrompt]);

  // Clean polling timer on unmount
  useEffect(() => {
    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, []);

  // Handle Multi-Image Upload (Up to 5 images)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (images.length + files.length > 5) {
      setErrorMsg('You can upload a maximum of 5 images for keyframe sequencing.');
      return;
    }
    setErrorMsg(null);

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Only standard image formats (PNG, JPG, WebP) are supported.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // AI Prompt Enhancers
  const handleEnhancePrompt = () => {
    if (!prompt.trim()) {
      setPrompt('Futuristic cyber vehicle accelerating through rainy neon metropolis, volumetric optical lighting, 8k cinematic slow motion, award-winning cinematography');
      return;
    }
    const enhancements = [
      ', 35mm anamorphic lens, raytraced volumetric lighting, highly detailed fluid motion, award-winning cinematography',
      ', photorealistic octane render, 60fps slow-motion camera glide, vibrant neon luminescence',
      ', cinematic depth of field, dramatic atmospheric haze, 8K ultra-resolution, masterpiece video direction',
    ];
    const picked = enhancements[Math.floor(Math.random() * enhancements.length)];
    setPrompt((prev) => prev.trim() + picked);
  };

  // Start polling queue status until completion
  const startPolling = (orderId: string) => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }

    pollingTimerRef.current = setInterval(async () => {
      try {
        const update = await checkVideoStatus(orderId);

        if (update.status === 'processing') {
          setTaskStatus('processing');
        } else if (update.status === 'completed' && update.videoUrl) {
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
          setTaskStatus('completed');
          setIsSubmitting(false);
          setGeneratedVideo(update);
          if (onVideoCreated) {
            onVideoCreated(update);
          }
        } else if (update.status === 'failed') {
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
          setTaskStatus('failed');
          setIsSubmitting(false);
          setErrorMsg(update.error || 'Video synthesis encountered an issue on generation engine.');
        } else if (typeof update.queuePosition === 'number') {
          setQueuePosition(update.queuePosition);
        }
      } catch {
        // Continue polling smoothly
      }
    }, 3500);
  };

  // Dispatch Video Generation Order into Queue
  const handleGenerate = async () => {
    setErrorMsg(null);

    if (!user) {
      openAuthModal('signin');
      return;
    }

    if (remainingSeconds < duration) {
      setErrorMsg(`Daily limit reached (${secondsUsed} / ${maxSeconds} seconds used). Your 100 free daily generation seconds reset every 24 hours.`);
      return;
    }

    if (!prompt.trim()) {
      setErrorMsg('Please enter a descriptive prompt for your cinematic AI video.');
      return;
    }

    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
    }

    setIsSubmitting(true);
    setGeneratedVideo(null);
    setTaskStatus('queued');

    try {
      const response = await generateVideo({
        images,
        prompt: prompt.trim(),
        sfxPrompt: hasSFX ? sfxPrompt.trim() : '',
        musicPrompt: hasMusic ? musicPrompt.trim() : '',
        hasMusic,
        hasSFX,
        negativePrompt: negativePrompt.trim(),
        style: selectedStyle,
        aspectRatio,
        motion,
        duration,
        isPublic,
      });

      const orderId = response.orderId;
      setActiveOrderId(orderId);
      setTaskStatus('queued');
      if (response.queuePosition) {
        setQueuePosition(response.queuePosition);
      }

      if (response.quota) {
        updateUserQuota(
          response.quota.generationsToday, 
          response.quota.maxDailyGenerations,
          response.quota.secondsUsedToday,
          response.quota.maxDailySeconds,
          response.quota.minutesUsedToday,
          response.quota.maxDailyMinutes
        );
      }

      startPolling(orderId);
    } catch (err: any) {
      setIsSubmitting(false);
      setTaskStatus(null);
      setErrorMsg(err.message || 'Failed to submit video task to queue.');
    }
  };

  const handleForceDownload = async (url: string, id: string) => {
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = blobUrl;
      link.download = `FreeVideoAIMaker-${id}.mp4`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(link);
      }, 1500);
    } catch {
      const link = document.createElement('a');
      link.href = url;
      link.download = `FreeVideoAIMaker-${id}.mp4`;
      link.target = '_blank';
      link.click();
    } finally {
      setIsDownloading(false);
    }
  };

  const isAudioActive = hasMusic || hasSFX;

  return (
    <section id="studio" className={`py-10 sm:py-16 px-3 sm:px-6 lg:px-8 border-b w-full overflow-hidden ${
      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#030712] border-slate-800'
    }`}>
      <div className="max-w-6xl mx-auto w-full">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 mb-3">
              <Cpu className="w-3.5 h-3.5" />
              <span>Multi-Track Neural Engine · AnimateDiff + MAGNET + MusicGen</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 dark:text-white">
              Advanced AI Video & Audio Studio
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
              Queue reference photos, cinematic motion prompts, dynamic sound effects, and background melodies for complete production.
            </p>
          </div>

          {/* Daily Quota Counter Badge: 100 Free Daily Generation Seconds */}
          <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Daily Free Creator Quota
              </div>
              <div className="text-xs font-bold text-slate-950 dark:text-white">
                {user ? `${remainingSeconds} of ${maxSeconds}s remaining` : '100 free daily generation seconds per user'}
              </div>
            </div>
          </div>
        </div>

        {/* PROMINENT OPERATING HOURS & QUEUE NOTICE BOARD */}
        <div className="mb-8 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-purple-950/30 p-5 sm:p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                <Clock className="w-5 h-5 text-cyan-300" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
                    Engine Operating Notice
                  </span>
                  <span className="text-xs font-bold text-slate-200">
                    Dedicated Neural Processing Queue
                  </span>
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    Active Development Mode
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                  This service utilizes a 100% free processing queue powered by a dedicated high-performance generation engine. 
                  Scheduled engine synthesis hours run daily from <strong className="text-cyan-300">06:00 PM to 06:00 AM</strong> server time.
                </p>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Tasks are queued with ultra-short turnaround times per clip. The platform is continuously optimized—minor runtime improvements and patches are applied regularly.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex md:flex-col items-center md:items-end gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
              <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>100 Seconds / User Daily</span>
              </div>
              <span className="text-[10px] text-slate-400">Zero subscription fees</span>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN STUDIO WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Controls & Input Parameters (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6 w-full">

            {/* MASTER PROMPT TIP BANNER */}
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-950/20 to-slate-900/60 p-4 sm:p-5 shadow-lg backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                      Cinematic Quality Advice
                    </span>
                    <span className="text-xs font-bold text-slate-200">
                      Master Prompt Engineering
                    </span>
                  </div>
                  <p className="text-xs font-semibold leading-relaxed text-amber-200/90">
                    💡 <strong>Pro Tip:</strong> Final video fidelity directly depends on detailed descriptions. Take your time writing camera lighting, lens depth, and action specifics to achieve the cleanest cinematic motion from our local engine.
                  </p>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Describe visual movement, natural sound effects (SFX), and melodic soundtrack themes in separate inputs below for complete audiovisual harmony.
                  </p>
                </div>
              </div>
            </div>

            {/* 1. Multi-Image Keyframe Sequencing (Up to 5 images) */}
            <div className={`rounded-2xl border p-4 sm:p-5 shadow-lg ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-cyan-500" />
                  <span>Reference Photos & Keyframes ({images.length}/5)</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Multiple Images Supported
                </span>
              </div>

              <div className="space-y-3">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    images.length >= 5 
                      ? 'opacity-50 cursor-not-allowed border-slate-300 dark:border-slate-700' 
                      : 'border-cyan-500/40 hover:border-cyan-400 bg-cyan-500/5 hover:bg-cyan-500/10'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    multiple 
                    accept="image/*" 
                    className="hidden" 
                    disabled={images.length >= 5}
                  />
                  <Upload className="w-6 h-6 text-cyan-500 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Click to upload up to 5 photos
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    PNG, JPG, WebP supported for optical keyframing
                  </p>
                </div>

                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700">
                        <img src={img} alt={`Keyframe ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 bg-black/70 text-[9px] text-white px-1 rounded font-mono">
                          #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-1 right-1 p-1 bg-rose-600/90 text-white rounded-full opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 2. CINEMATIC VIDEO MOTION PROMPT (AnimateDiff-Lightning) */}
            <div className={`rounded-2xl border p-4 sm:p-5 shadow-lg ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-cyan-500" />
                  <span>Cinematic Video Motion Prompt (AnimateDiff-Lightning)</span>
                </label>
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-500 hover:text-cyan-400 cursor-pointer bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30 transition-all hover:scale-105"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Enhance with AI</span>
                </button>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Describe camera motion, visual actions, lighting, and scene atmosphere (e.g. 'Cyberpunk hovercar speeding through rainy neon city at night, 8k cinematic slow motion, award-winning lighting')..."
                className={`w-full rounded-xl p-3 text-xs sm:text-sm border transition-all resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  isLight 
                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' 
                    : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                }`}
              />

              {/* Negative Prompt Accordion */}
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setShowNegative(!showNegative)}
                  className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-cyan-500 flex items-center gap-1 cursor-pointer"
                >
                  {showNegative ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{showNegative ? 'Hide Negative Prompt' : 'Add Negative Prompt (Elements to Avoid)'}</span>
                </button>
                {showNegative && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="e.g. blurry, low quality, distorted, watermark, jittery, artifacts..."
                      className={`w-full rounded-xl p-2.5 text-xs border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                        isLight 
                          ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' 
                          : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                      }`}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 3. AUDIO ENGINEERING & MULTI-TRACK TOGGLES (MAGNET & MUSICGEN) */}
            <div className={`rounded-2xl border p-4 sm:p-5 shadow-lg ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Audio Engineering & Sound Tracks
                  </span>
                </div>
                <div className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                  isAudioActive 
                    ? 'bg-purple-950/40 text-purple-300 border-purple-800/40' 
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {isAudioActive ? 'Multi-Track Audio Active' : 'Muted (No Audio)'}
                </div>
              </div>

              {/* Toggle Switches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {/* SFX Toggle */}
                <button
                  type="button"
                  onClick={() => setHasSFX(!hasSFX)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                    hasSFX
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/30'
                      : isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-500'
                        : 'border-slate-800 bg-slate-950 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Radio className={`w-4 h-4 ${hasSFX ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Sound Effects (SFX)
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Kinetic audio for MAGNET
                      </div>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
                    hasSFX ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      hasSFX ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </div>
                </button>

                {/* Music Toggle */}
                <button
                  type="button"
                  onClick={() => setHasMusic(!hasMusic)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                    hasMusic
                      ? 'border-purple-500 bg-purple-500/10 text-purple-300 ring-1 ring-purple-500/30'
                      : isLight
                        ? 'border-slate-200 bg-slate-50 text-slate-500'
                        : 'border-slate-800 bg-slate-950 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Music className={`w-4 h-4 ${hasMusic ? 'text-purple-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Background Music
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Melody synthesis for MusicGen
                      </div>
                    </div>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
                    hasMusic ? 'bg-purple-500' : 'bg-slate-700'
                  }`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      hasMusic ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </div>
                </button>
              </div>

              {/* SFX Prompt Field (Visible only when SFX enabled) */}
              {hasSFX && (
                <div className="space-y-1.5 mb-3.5 p-3 rounded-xl border border-cyan-500/20 bg-cyan-950/10">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Sound Effects (SFX) Prompt · MAGNET Model</span>
                  </label>
                  <input
                    type="text"
                    value={sfxPrompt}
                    onChange={(e) => setSfxPrompt(e.target.value)}
                    placeholder="e.g. car engine roaring, heavy rainfall, laser blasts, footsteps on gravel..."
                    className={`w-full rounded-lg p-2.5 text-xs border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isLight 
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' 
                        : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                    }`}
                  />
                  <p className="text-[10px] text-slate-500">
                    Natural kinetic Foley effects generated and layered directly onto scene actions.
                  </p>
                </div>
              )}

              {/* Music Prompt Field (Visible only when Music enabled) */}
              {hasMusic && (
                <div className="space-y-1.5 mb-2 p-3 rounded-xl border border-purple-500/20 bg-purple-950/10">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-purple-400" />
                    <span>Background Music Prompt · MusicGen Model</span>
                  </label>
                  <input
                    type="text"
                    value={musicPrompt}
                    onChange={(e) => setMusicPrompt(e.target.value)}
                    placeholder="e.g. cyberpunk synthwave beat, emotional cinematic piano, fast techno rhythm..."
                    className={`w-full rounded-lg p-2.5 text-xs border transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      isLight 
                        ? 'bg-white border-slate-300 text-slate-900 placeholder-slate-400' 
                        : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                    }`}
                  />
                  <p className="text-[10px] text-slate-500">
                    High-fidelity orchestral or electronic background tracks synced to your duration.
                  </p>
                </div>
              )}

              {!isAudioActive && (
                <div className="p-2.5 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-400 text-xs flex items-center gap-2">
                  <VolumeX className="w-4 h-4 text-slate-500" />
                  <span>Both audio tracks disabled: Video will be generated as a silent (muted) MP4 clip.</span>
                </div>
              )}
            </div>

            {/* 4. ASPECT RATIO LAYOUTS (16:9 Cinema, 9:16 Vertical, 1:1 Square) */}
            <div className={`rounded-2xl border p-4 sm:p-5 shadow-lg ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-cyan-500" />
                  <span>Aspect Ratio Layouts</span>
                </label>
                <span className="text-[11px] text-cyan-400 font-mono font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                  {aspectRatio} Selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {ASPECT_RATIO_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = aspectRatio === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAspectRatio(opt.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300 shadow-md ring-1 ring-cyan-500/40'
                          : isLight
                            ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                            : 'border-slate-800 bg-slate-950 hover:bg-slate-900/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-black/40 text-cyan-400 border border-cyan-500/30">
                          {opt.id}
                        </span>
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                      </div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {opt.titleEn}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Style Presets Selection */}
            <div className={`rounded-2xl border p-4 sm:p-5 shadow-lg ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-cyan-500" />
                <span>Visual Art Style (Neural Preset)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      selectedStyle === style.id
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-sm'
                        : isLight
                          ? 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                          : 'border-slate-800 bg-slate-950 hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <span className="text-base">{style.icon}</span>
                    <span className="truncate">{style.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Camera Motion, Duration, and Privacy */}
            <div className={`rounded-2xl border p-4 sm:p-5 shadow-lg ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Camera Motion */}
                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
                    Camera Motion Trajectory
                  </label>
                  <select
                    value={motion}
                    onChange={(e) => setMotion(e.target.value as CameraMotion)}
                    className={`w-full rounded-xl p-2.5 text-xs font-semibold border transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isLight 
                        ? 'bg-slate-50 border-slate-300 text-slate-900' 
                        : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  >
                    {MOTION_PRESETS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
                    Target Duration
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[5, 10].map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setDuration(dur)}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          duration === dur
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                            : isLight
                              ? 'border-slate-200 bg-slate-50 text-slate-700'
                              : 'border-slate-800 bg-slate-950 text-slate-400'
                        }`}
                      >
                        {dur} Seconds
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Showcase Visibility */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold border flex items-center justify-between transition-all cursor-pointer ${
                    isPublic
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
                      : isLight
                        ? 'border-slate-300 bg-slate-50 text-slate-600'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {isPublic ? <Eye className="w-3.5 h-3.5 text-cyan-500" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{isPublic ? 'Public in Showcase' : 'Private Creation'}</span>
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-slate-800 px-1.5 py-0.5 rounded text-white">
                    {isPublic ? 'Public' : 'Private'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error Message Feedback */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* GENERATE ACTION BUTTON */}
            {!user ? (
              <button
                type="button"
                onClick={() => openAuthModal('signin')}
                className={`w-full py-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${accentClass.bg} text-slate-950 hover:brightness-110 shadow-lg cursor-pointer`}
              >
                <Lock className="w-4 h-4" />
                <span>Sign In to Queue Free Video Task (100 Daily Seconds)</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting || remainingSeconds <= 0}
                onClick={handleGenerate}
                className={`w-full py-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer ${
                  isSubmitting || remainingSeconds <= 0
                    ? 'opacity-60 cursor-not-allowed bg-slate-700 text-slate-400'
                    : `${accentClass.bg} text-slate-950 hover:brightness-110 ${accentClass.glow}`
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>
                      {taskStatus === 'processing'
                        ? 'Synthesizing Audio & Video on Dedicated Engine...'
                        : `Queued in Generation Line (Your Position: #${queuePosition})...`}
                    </span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>Generate AI Video & Audio (100 Free Seconds Daily)</span>
                  </>
                )}
              </button>
            )}

            {/* In-Studio Sidebar Ad */}
            <AdBanner type="sidebar" className="mt-2" />
          </div>

          {/* RIGHT COLUMN: Output Monitor & Queue Player (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4 w-full">
            <div className={`rounded-2xl border p-4 sm:p-5 shadow-lg ${
              isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Film className="w-4 h-4 text-cyan-500" />
                  <span>Output Monitor & Neural Player</span>
                </h3>
                <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  Zero Watermarks
                </span>
              </div>

              {/* 1. QUEUE STATUS INDICATOR: QUEUED IN LINE */}
              {isSubmitting && taskStatus === 'queued' && !generatedVideo && (
                <div className="p-6 rounded-xl border border-amber-500/40 bg-gradient-to-b from-amber-950/30 to-slate-950/80 text-center mb-4 shadow-xl">
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto mb-3.5 shadow-lg">
                    <ListOrdered className="w-7 h-7 text-amber-400 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                    Your Order is Registered in the Queue (Position: #{queuePosition})
                  </h4>
                  <p className="text-xs text-amber-300 font-medium mb-2 font-mono">
                    Order #{activeOrderId ? activeOrderId.slice(-6) : 'QUEUED'} · Awaiting Generation Window
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-4 leading-relaxed">
                    Task safely logged in database. The dedicated generation host processes queued requests in order with multi-track audio synthesis...
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs font-mono text-amber-400 bg-amber-950/50 py-2 px-3 rounded-lg w-max mx-auto border border-amber-800/40">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Polling Queue Status Every 3.5s...</span>
                  </div>
                </div>
              )}

              {/* 2. LOCAL GPU PROCESSING INDICATOR: ENGINE ACTIVE */}
              {isSubmitting && taskStatus === 'processing' && !generatedVideo && (
                <div className="p-6 rounded-xl border border-cyan-500/40 bg-gradient-to-b from-cyan-950/40 to-slate-950/80 text-center mb-4 shadow-xl">
                  <div className="w-14 h-14 rounded-full bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 flex items-center justify-center mx-auto mb-3.5 shadow-lg animate-pulse">
                    <Cpu className="w-7 h-7 text-cyan-400" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 flex items-center justify-center gap-2">
                    <span>Rendering on Dedicated Generation Engine...</span>
                  </h4>
                  <p className="text-xs text-cyan-300 font-medium mb-3">
                    AnimateDiff-Lightning + MAGNET (SFX) + MusicGen Active
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 max-w-xs mx-auto mb-3">
                    Synthesizing neural video frames ({aspectRatio}) and rendering synchronized audio tracks...
                  </p>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden my-3 border border-cyan-500/20">
                    <div className="bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-400 h-full w-full animate-pulse" />
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-950/60 py-1.5 px-3 rounded-lg w-max mx-auto border border-cyan-800/50">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Dedicated Processing Engine Working on Clip</span>
                  </div>
                </div>
              )}

              {/* 3. COMPLETED VIDEO PLAYER WITH DIRECT BLOB DOWNLOAD */}
              {generatedVideo && generatedVideo.videoUrl ? (
                <div className="space-y-4">
                  {/* Interactive Video Player */}
                  <div className="relative rounded-xl overflow-hidden bg-black border border-slate-300 dark:border-slate-800 shadow-2xl">
                    <video
                      controls
                      autoPlay
                      loop
                      playsInline
                      src={generatedVideo.videoUrl}
                      className="w-full max-h-[460px] object-contain mx-auto"
                    />
                  </div>

                  {/* Video Specs & Metadata */}
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">
                        {generatedVideo.title}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                        Clean MP4 · Zero Watermarks
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono bg-cyan-950/40 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-800/30">
                        {generatedVideo.aspectRatio || aspectRatio}
                      </span>
                      <span>·</span>
                      <span className="capitalize">{generatedVideo.style}</span>
                      <span>·</span>
                      <span className="text-purple-400 flex items-center gap-1">
                        <Volume2 className="w-3 h-3" />
                        {generatedVideo.hasAudio ? 'Multi-Track Synced' : 'Muted'}
                      </span>
                    </div>
                  </div>

                  {/* High-Contrast Green Download Button */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => handleForceDownload(generatedVideo.videoUrl, generatedVideo.id)}
                      className="w-full py-3.5 px-4 rounded-xl text-xs font-extrabold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving to Device...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 stroke-[2.5]" />
                          <span>Download MP4 (Blob)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPrompt(generatedVideo.prompt);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                      className={`w-full py-3.5 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        isLight 
                          ? 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800' 
                          : 'border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Remix Prompt</span>
                    </button>
                  </div>

                  {/* 24-Hour Expiration Warning */}
                  <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      24-Hour Retention Alert: Please download your MP4 file now. Videos auto-delete after 24 hours.
                    </span>
                  </div>

                  <AdBanner type="completion" />
                </div>
              ) : (
                /* Empty Standby State */
                !isSubmitting && (
                  <div className="text-center py-10 px-4 border border-dashed rounded-xl border-slate-300 dark:border-slate-800">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center mx-auto mb-2.5">
                      <Play className="w-4 h-4 fill-cyan-500" />
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Your Rendered Video Appears Here
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                      Fill in your prompt, configure audio tracks (SFX & Music), pick an aspect ratio (16:9, 9:16, 1:1), and queue your creation.
                    </p>
                  </div>
                )
              )}
            </div>

            {/* Engine Architecture Card */}
            <div className={`rounded-xl border p-3.5 text-xs ${
              isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900/50 border-slate-800 text-slate-400'
            }`}>
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-200 mb-1">
                <Layers className="w-3.5 h-3.5 text-cyan-500" />
                <span>Multi-Track Neural Engine (Dedicated Host)</span>
              </div>
              <p className="leading-relaxed text-[11px]">
                Web application and persistent task queue hosted on <strong>Render</strong>. Offline generation executed on dedicated high-performance engine with <strong>AnimateDiff-Lightning</strong>, <strong>MAGNET (SFX)</strong>, and <strong>MusicGen</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
