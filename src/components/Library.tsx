import React, { useState, useEffect } from 'react';
import { 
  Film, 
  Clock, 
  Loader2, 
  CheckCircle2, 
  Download, 
  Play, 
  RefreshCw, 
  Sparkles, 
  AlertCircle,
  Copy,
  Check,
  Calendar,
  Volume2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useThemeConfig } from '../context/ThemeConfigContext';
import { fetchMyVideos } from '../lib/api';
import { GeneratedVideo } from '../types';

interface LibraryProps {
  onStartCreating: () => void;
  newlyCreatedVideo?: GeneratedVideo | null;
}

type LibraryTab = 'queued' | 'processing' | 'ready';

export const Library: React.FC<LibraryProps> = ({ onStartCreating, newlyCreatedVideo }) => {
  const { user, openAuthModal } = useAuth();
  const { mode, accentClass } = useThemeConfig();
  const isLight = mode === 'light';

  const [activeTab, setActiveTab] = useState<LibraryTab>('ready');
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<GeneratedVideo | null>(null);

  const loadVideos = async () => {
    if (!user) {
      setVideos([]);
      return;
    }
    try {
      setIsLoading(true);
      const list = await fetchMyVideos();
      setVideos(list);
    } catch (err) {
      console.error('[Library] Failed to fetch personal videos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [user]);

  // When newly created video arrives, refresh and switch tab to queued
  useEffect(() => {
    if (newlyCreatedVideo) {
      loadVideos();
      setActiveTab('queued');
    }
  }, [newlyCreatedVideo]);

  // Auto-poll if there are any queued or processing items
  useEffect(() => {
    const hasPending = videos.some((v) => v.status === 'queued' || v.status === 'processing');
    if (!hasPending || !user) return;

    const interval = setInterval(() => {
      loadVideos();
    }, 4000);

    return () => clearInterval(interval);
  }, [videos, user]);

  const queuedVideos = videos.filter((v) => v.status === 'queued' || v.status === 'pending');
  const processingVideos = videos.filter((v) => v.status === 'processing');
  const readyVideos = videos.filter((v) => v.status === 'completed' && Boolean(v.videoUrl));

  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatCountdown = (minutesRemaining?: number) => {
    if (minutesRemaining === undefined || minutesRemaining <= 0) return 'Expiring soon';
    const hours = Math.floor(minutesRemaining / 60);
    const mins = minutesRemaining % 60;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };

  return (
    <section id="library" className="w-full py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-xl ${isLight ? 'bg-cyan-100 text-cyan-700' : 'bg-cyan-500/10 text-cyan-400'}`}>
              <Film className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-500">
              Personal Vault
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Creator Library
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Track your queued, rendering, and ready-to-download AI video orders. Finished MP4s are stored for 24 hours.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-end">
          <button
            onClick={loadVideos}
            disabled={isLoading || !user}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              isLight 
                ? 'border-slate-300 bg-white hover:bg-slate-100 text-slate-700' 
                : 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
            }`}
            title="Refresh Library"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onStartCreating}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
              accentClass.bg
            } text-slate-950 hover:brightness-110 shadow-md`}
          >
            <Sparkles className="w-4 h-4" />
            <span>New Video</span>
          </button>
        </div>
      </div>

      {!user ? (
        /* Sign-in prompt for guest visitors */
        <div className={`rounded-2xl border p-8 sm:p-12 text-center max-w-xl mx-auto ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'
        }`}>
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 mx-auto flex items-center justify-center mb-4">
            <Film className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold mb-2">Sign in to Access Your Library</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Your personal video queue, rendering progress, and ready 24-hour MP4 downloads are linked to your registered creator account.
          </p>
          <button
            onClick={() => openAuthModal('signin')}
            className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer transition-all ${
              accentClass.bg
            } text-slate-950 hover:brightness-110 shadow-md`}
          >
            Sign In with Email
          </button>
        </div>
      ) : (
        <div>
          {/* Navigation Tabs (Queued, Processing, Ready) */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-2 sm:gap-6 overflow-x-auto pb-1">
            {/* Tab 1: Queued */}
            <button
              onClick={() => setActiveTab('queued')}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'queued'
                  ? 'border-amber-500 text-amber-500 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Queued</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                queuedVideos.length > 0 
                  ? 'bg-amber-500/20 text-amber-500 dark:text-amber-300' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                {queuedVideos.length}
              </span>
            </button>

            {/* Tab 2: Processing */}
            <button
              onClick={() => setActiveTab('processing')}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'processing'
                  ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Loader2 className={`w-4 h-4 ${processingVideos.length > 0 ? 'animate-spin' : ''}`} />
              <span>Processing</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                processingVideos.length > 0 
                  ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                {processingVideos.length}
              </span>
            </button>

            {/* Tab 3: Ready */}
            <button
              onClick={() => setActiveTab('ready')}
              className={`pb-3 px-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'ready'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Ready</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${
                readyVideos.length > 0 
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                {readyVideos.length}
              </span>
            </button>
          </div>

          {/* TAB 1: QUEUED VIDEOS */}
          {activeTab === 'queued' && (
            <div>
              {queuedVideos.length === 0 ? (
                <div className={`rounded-2xl border p-12 text-center ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-slate-800'
                }`}>
                  <Clock className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-60" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                    No Videos Currently in Queue
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    When you submit a new video prompt, it will appear here with its real-time queue position.
                  </p>
                  <button
                    onClick={onStartCreating}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Queue a Video Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {queuedVideos.map((video) => (
                    <div
                      key={video.id}
                      className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all ${
                        isLight ? 'bg-white border-amber-300 shadow-sm' : 'bg-slate-900/80 border-amber-500/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-500 dark:text-amber-300 flex items-center gap-1.5">
                            <Clock className="w-3 h-3 animate-pulse" />
                            <span>Queued {video.queuePosition ? `· Position #${video.queuePosition}` : ''}</span>
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {video.duration}s · {video.aspectRatio}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-3 mb-3 leading-relaxed">
                          "{video.prompt}"
                        </p>

                        {video.sfxPrompt && (
                          <div className="flex items-center gap-1 text-[11px] text-cyan-500 dark:text-cyan-400 mb-3">
                            <Volume2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">SFX: {video.sfxPrompt}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(video.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                        <span className="text-amber-500 font-semibold">
                          Waiting for worker...
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROCESSING VIDEOS (With Real-Time Accurate Progress Bar) */}
          {activeTab === 'processing' && (
            <div>
              {processingVideos.length === 0 ? (
                <div className={`rounded-2xl border p-12 text-center ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-slate-800'
                }`}>
                  <Loader2 className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-60" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                    No Videos Currently Processing
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    Videos currently rendering on the neural engine will show here with live progress percentages.
                  </p>
                  <button
                    onClick={onStartCreating}
                    className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Start Video Generation
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {processingVideos.map((video) => {
                    const progressVal = Math.min(100, Math.max(5, video.progress || 15));
                    return (
                      <div
                        key={video.id}
                        className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all ${
                          isLight ? 'bg-white border-cyan-300 shadow-md' : 'bg-slate-900/90 border-cyan-500/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 flex items-center gap-1.5">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Rendering & Synthesizing</span>
                            </span>
                            <span className="text-[11px] font-mono text-cyan-500 font-bold">
                              {progressVal}%
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-3 mb-3 leading-relaxed">
                            "{video.prompt}"
                          </p>

                          {/* Progress Bar Container */}
                          <div className="mb-4">
                            <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progressVal}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5 font-mono">
                              <span>Multiplexing frames & audio</span>
                              <span>{progressVal}% Complete</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                          <span>{video.duration}s · {video.aspectRatio}</span>
                          <span className="text-cyan-500 font-semibold animate-pulse">
                            Email alert will fire on completion
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: READY VIDEOS (Ready to Watch & Download + 24h Purge Indicator) */}
          {activeTab === 'ready' && (
            <div>
              {readyVideos.length === 0 ? (
                <div className={`rounded-2xl border p-12 text-center ${
                  isLight ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-slate-800'
                }`}>
                  <CheckCircle2 className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-60" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                    No Completed Videos Yet
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    Finished creations are delivered here. Download them before the 24-hour expiration window!
                  </p>
                  <button
                    onClick={onStartCreating}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Create Your First Video
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {readyVideos.map((video) => (
                    <div
                      key={video.id}
                      className={`rounded-2xl border overflow-hidden flex flex-col justify-between transition-all group ${
                        isLight ? 'bg-white border-slate-200 shadow-md hover:border-cyan-400' : 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/50'
                      }`}
                    >
                      {/* Video Player / Thumbnail Preview */}
                      <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
                        <video
                          src={video.videoUrl}
                          poster={video.thumbnailUrl}
                          controls
                          className="w-full h-full object-cover"
                          preload="metadata"
                        />
                        {/* 24-Hour Expiration Badge */}
                        <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/40 text-[10px] font-bold text-amber-400 flex items-center gap-1 shadow-lg pointer-events-none">
                          <Clock className="w-3 h-3" />
                          <span>{formatCountdown(video.minutesRemainingUntilPurge)}</span>
                        </div>
                      </div>

                      {/* Video Details */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
                            <span>{video.duration}s · {video.aspectRatio}</span>
                            <span className="text-emerald-500 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Ready</span>
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 mb-2 leading-relaxed">
                            "{video.prompt}"
                          </p>

                          {video.sfxPrompt && (
                            <p className="text-[11px] text-cyan-600 dark:text-cyan-400 flex items-center gap-1 mb-3 truncate">
                              <Volume2 className="w-3 h-3 shrink-0" />
                              <span>SFX: {video.sfxPrompt}</span>
                            </p>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2 mt-2">
                          <a
                            href={video.videoUrl}
                            download={`${video.title || 'ai-video'}.mp4`}
                            className="flex-1 py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download MP4</span>
                          </a>

                          <button
                            onClick={() => handleCopyPrompt(video.id, video.prompt)}
                            className={`p-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                              copiedId === video.id
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : isLight
                                  ? 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                                  : 'border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-850'
                            }`}
                            title="Copy Prompt"
                          >
                            {copiedId === video.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
