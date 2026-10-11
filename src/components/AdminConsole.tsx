import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  BarChart3, 
  Users, 
  Palette, 
  HardDrive, 
  DollarSign, 
  FileText, 
  Lock, 
  LogOut, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Bot, 
  UserCheck, 
  TrendingUp, 
  Cpu, 
  Mail,
  Video,
  Activity,
  Trash2,
  Download,
  Clock,
  RefreshCw,
  Gauge,
  Flame,
  Zap
} from 'lucide-react';
import { 
  adminLogin, 
  fetchAdminStats, 
  fetchAdminUsers, 
  toggleBanUser, 
  fetchAdminAuditLogs, 
  fetchAdminSettings, 
  updateAdminSettings,
  fetchAdminVideos,
  deleteAdminVideo,
  purgeExpiredAdminVideos,
  fetchWorkerTelemetry
} from '../lib/api';
import { AdminStats, AdminUserView, AuditLog, GeneratedVideo, EngineTelemetry } from '../types';
import { useThemeConfig } from '../context/ThemeConfigContext';

interface AdminConsoleProps {
  isOpen: boolean;
  onClose: () => void;
}

type AdminTab = 'overview' | 'telemetry' | 'videos' | 'storage' | 'quotas' | 'users' | 'audit' | 'theme-content' | 'ads' | 'email';

export const AdminConsole: React.FC<AdminConsoleProps> = ({ isOpen, onClose }) => {
  const { refreshConfig } = useThemeConfig();

  // Authentication State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Tab
  const [currentTab, setCurrentTab] = useState<AdminTab>('overview');

  // Admin Data
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [usersList, setUsersList] = useState<AdminUserView[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [customerVideos, setCustomerVideos] = useState<GeneratedVideo[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);

  // Real-Time Engine & Hardware Telemetry State
  const [telemetry, setTelemetry] = useState<EngineTelemetry | null>(null);
  const [isTelemetryConnected, setIsTelemetryConnected] = useState(false);

  // Form Fields
  const [dailyLimit, setDailyLimit] = useState(100);
  const [retentionHours, setRetentionHours] = useState(24);
  
  // SMTP Config
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');

  // Theme & Text Customization State
  const [accentColor, setAccentColor] = useState<'cyan' | 'purple' | 'emerald' | 'rose' | 'amber'>('cyan');
  const [siteName, setSiteName] = useState('');
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroCtaText, setHeroCtaText] = useState('');
  const [noticeBannerText, setNoticeBannerText] = useState('');
  const [isNoticeVisible, setIsNoticeVisible] = useState(true);

  // Section Visibilities
  const [visibility, setVisibility] = useState({
    hero: true,
    studio: true,
    showcase: true,
    features: true,
    faq: true,
    sponsorBanner: true,
  });

  // Ads Monetization Configuration (No crypto mentions)
  const [adsConfig, setAdsConfig] = useState<{
    headerAdEnabled: boolean;
    sidebarAdEnabled: boolean;
    showcaseAdEnabled: boolean;
    completionAdEnabled: boolean;
    googleAdSenseCode: string;
    customAdSnippet: string;
  }>({
    headerAdEnabled: true,
    sidebarAdEnabled: true,
    showcaseAdEnabled: true,
    completionAdEnabled: true,
    googleAdSenseCode: '',
    customAdSnippet: '',
  });

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Check existing token
  useEffect(() => {
    const token = localStorage.getItem('fva_admin_token');
    if (token) {
      setIsAdminAuthenticated(true);
      loadAllAdminData();
    }
  }, [isOpen]);

  // Real-time Telemetry Live SSE Stream & Fallback
  useEffect(() => {
    if (!isAdminAuthenticated || !isOpen) return;

    let eventSource: EventSource | null = null;
    let fallbackInterval: any = null;

    try {
      eventSource = new EventSource('/api/worker/telemetry/stream');
      
      eventSource.onopen = () => {
        setIsTelemetryConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setTelemetry(data);
          setIsTelemetryConnected(data.status !== 'offline');
        } catch {
          // ignore parsing error
        }
      };

      eventSource.onerror = () => {
        setIsTelemetryConnected(false);
      };
    } catch {
      // Fallback to polling
    }

    // Polling fallback every 3.5 seconds
    fallbackInterval = setInterval(async () => {
      try {
        const t = await fetchWorkerTelemetry();
        setTelemetry(t);
        setIsTelemetryConnected(Boolean(t.isOnline));
      } catch {
        // ignore
      }
    }, 3500);

    return () => {
      if (eventSource) eventSource.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [isAdminAuthenticated, isOpen]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsLoggingIn(true);

    try {
      const res = await adminLogin(adminPasswordInput);
      localStorage.setItem('fva_admin_token', res.token);
      setIsAdminAuthenticated(true);
      setAdminPasswordInput('');
      await loadAllAdminData();
    } catch {
      setAuthError('Access Denied: Invalid credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('fva_admin_token');
    setIsAdminAuthenticated(false);
  };

  const loadAllAdminData = async () => {
    try {
      const [s, u, a, settings] = await Promise.all([
        fetchAdminStats(),
        fetchAdminUsers(),
        fetchAdminAuditLogs(),
        fetchAdminSettings(),
      ]);

      setStats(s);
      setUsersList(u);
      setAuditLogs(a);
      setAdminSettings(settings);

      if (settings?.config) {
        setDailyLimit(settings.config.dailyUserLimit || 100);
        setRetentionHours(settings.config.videoRetentionHours || 24);
        setAccentColor(settings.config.theme?.accentColor || 'cyan');
        setSiteName(settings.config.siteName || '');
        setHeroTitle(settings.config.heroTitle || '');
        setHeroSubtitle(settings.config.heroSubtitle || '');
        setHeroCtaText(settings.config.heroCtaText || '');
        setNoticeBannerText(settings.config.noticeBannerText || '');
        setIsNoticeVisible(Boolean(settings.config.isNoticeBannerVisible));
        if (settings.config.sectionVisibility) setVisibility(settings.config.sectionVisibility);
        if (settings.config.ads) setAdsConfig(settings.config.ads);
        if (settings.config.smtp) {
          setSmtpHost(settings.config.smtp.host || '');
          setSmtpPort(settings.config.smtp.port || 587);
          setSmtpUser(settings.config.smtp.user || '');
          setSmtpPass(settings.config.smtp.pass || '');
          setSmtpFrom(settings.config.smtp.from || '');
        }
      }

      loadVideosList();
    } catch (err: any) {
      if (err.message?.includes('Unauthorized')) {
        handleAdminLogout();
      }
    }
  };

  const loadVideosList = async () => {
    try {
      setIsLoadingVideos(true);
      const list = await fetchAdminVideos();
      setCustomerVideos(list);
    } catch {
      // ignore
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const handlePurgeExpiredVideos = async () => {
    try {
      const res = await purgeExpiredAdminVideos();
      setSaveSuccessMsg(`Auto-purge executed: Deleted ${res.purgedCount} expired videos (>24 hours).`);
      await loadVideosList();
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setSaveErrorMsg(err.message || 'Failed to purge expired videos');
    }
  };

  const handleDeleteSingleVideo = async (id: string) => {
    try {
      await deleteAdminVideo(id);
      setCustomerVideos((prev) => prev.filter((v) => v.id !== id));
      setSaveSuccessMsg(`Video ${id} successfully removed from disk.`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      setSaveErrorMsg(err.message || 'Failed to delete video');
    }
  };

  const handleSaveAllSettings = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);

    try {
      const payload: any = {
        dailyUserLimit: Number(dailyLimit),
        videoRetentionHours: Number(retentionHours),
        theme: { accentColor },
        siteName,
        heroTitle,
        heroSubtitle,
        heroCtaText,
        noticeBannerText,
        isNoticeBannerVisible: isNoticeVisible,
        sectionVisibility: visibility,
        ads: adsConfig,
        smtp: {
          host: smtpHost,
          port: Number(smtpPort),
          user: smtpUser,
          pass: smtpPass,
          from: smtpFrom,
        },
      };

      await updateAdminSettings(payload);
      setSaveSuccessMsg('Configuration saved and synced live!');
      await refreshConfig();
      await loadAllAdminData();
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err: any) {
      setSaveErrorMsg(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBanToggle = async (userId: string) => {
    try {
      const res = await toggleBanUser(userId);
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isBanned: res.isBanned } : u))
      );
    } catch {
      // Ignored
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-6xl max-h-[92vh] rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#060a12] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-wide text-white">
                  System Administration Console
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  PROTECTED
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Storage, Real-Time Synchronizer & Direct Ad Monetization
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdminAuthenticated && (
              <button
                onClick={handleAdminLogout}
                className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Auth Gate or Main Console */}
        {!isAdminAuthenticated ? (
          <div className="p-8 sm:p-12 max-w-md mx-auto w-full my-auto text-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Master Key Required</h4>
            <p className="text-xs text-slate-400 mb-6">
              Enter your administrative access password to manage users, storage, and real-time engine telemetry.
            </p>

            {authError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input
                type="password"
                required
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="Access Key..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors shadow-lg cursor-pointer"
              >
                {isLoggingIn ? 'Authenticating...' : 'Access Portal'}
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Dashboard Interface */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-60 border-r border-slate-800 bg-[#060a12]/80 p-3 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0 scrollbar-none">
              {[
                { id: 'overview', label: 'Analytics (From 0)', icon: <BarChart3 className="w-4 h-4" /> },
                { id: 'telemetry', label: 'Engine Telemetry', icon: <Activity className="w-4 h-4" /> },
                { id: 'videos', label: 'Customer Videos (24h)', icon: <Video className="w-4 h-4" /> },
                { id: 'storage', label: 'Storage', icon: <HardDrive className="w-4 h-4" /> },
                { id: 'quotas', label: 'Quotas & Limits', icon: <Cpu className="w-4 h-4" /> },
                { id: 'users', label: 'Registered Accounts', icon: <Users className="w-4 h-4" /> },
                { id: 'audit', label: 'Safety & Prompts', icon: <FileText className="w-4 h-4" /> },
                { id: 'theme-content', label: 'Theme & Text Overrides', icon: <Palette className="w-4 h-4" /> },
                { id: 'ads', label: 'Ad Spaces & Monetization', icon: <DollarSign className="w-4 h-4" /> },
                { id: 'email', label: 'Welcome Email SMTP', icon: <Mail className="w-4 h-4" /> },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id as AdminTab)}
                  className={`w-full px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition-all text-left whitespace-nowrap cursor-pointer ${
                    currentTab === tab.id
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </aside>

            {/* Main Tab Panel */}
            <main className="flex-1 p-5 sm:p-7 overflow-y-auto max-h-[calc(92vh-70px)]">
              {saveSuccessMsg && (
                <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}
              {saveErrorMsg && (
                <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{saveErrorMsg}</span>
                </div>
              )}

              {/* 1. OVERVIEW & ANALYTICS */}
              {currentTab === 'overview' && stats && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span>Total Real Visitors</span>
                        <UserCheck className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div className="text-2xl font-black text-white">{stats.totalVisitors}</div>
                      <span className="text-[10px] text-slate-500">From 0 (Anti-Sleep Pings Filtered)</span>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span>Active Video Generations</span>
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-2xl font-black text-white">{stats.totalGenerations}</div>
                      <span className="text-[10px] text-emerald-400">
                        {stats.todayGenerations} generated today
                      </span>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span>Customer Accounts</span>
                        <Users className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="text-2xl font-black text-white">{stats.totalUsers}</div>
                      <span className="text-[10px] text-slate-500">Email Authenticated</span>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                        <span>Bot & Crawler Traps</span>
                        <Bot className="w-4 h-4 text-red-400" />
                      </div>
                      <div className="text-2xl font-black text-white">{stats.botRequestsFiltered}</div>
                      <span className="text-[10px] text-slate-500">Filtered & Discarded</span>
                    </div>
                  </div>

                  {/* Device Traffic Breakdown */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                      Device Traffic Distribution
                    </h4>
                    <div className="grid grid-cols-3 gap-3 text-center text-xs">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-850">
                        <span className="text-slate-400 block text-[11px] mb-1">Desktop Visitors</span>
                        <span className="font-bold text-white text-base">{stats.deviceBreakdown.desktop}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-850">
                        <span className="text-slate-400 block text-[11px] mb-1">Mobile Visitors</span>
                        <span className="font-bold text-white text-base">{stats.deviceBreakdown.mobile}</span>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-850">
                        <span className="text-slate-400 block text-[11px] mb-1">Tablet Visitors</span>
                        <span className="font-bold text-white text-base">{stats.deviceBreakdown.tablet}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. REAL-TIME ENGINE & HARDWARE TELEMETRY */}
              {currentTab === 'telemetry' && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className={`w-3 h-3 rounded-full animate-ping ${
                          isTelemetryConnected ? 'bg-emerald-400' : 'bg-red-400'
                        }`} />
                        <h4 className="text-sm font-bold text-white">
                          Real-Time Engine Connection Status
                        </h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          telemetry?.status === 'generating_video'
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                            : telemetry?.status === 'generating_sfx'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : telemetry?.status === 'error'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : isTelemetryConnected
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400'
                        }`}>
                          {telemetry?.status === 'generating_video' 
                            ? 'Active · Generating Video'
                            : telemetry?.status === 'generating_sfx'
                              ? 'Active · Generating Sound Effects'
                              : telemetry?.status === 'error'
                                ? 'Engine Issue / Error'
                                : isTelemetryConnected
                                  ? 'Connected & Standby'
                                  : 'Engine Offline / Standby'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Live bi-directional telemetry pipe directly monitoring the dedicated local acceleration engine.
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-mono text-slate-500 block">
                        Last Signal Pulse
                      </span>
                      <span className="text-xs font-mono font-bold text-cyan-400">
                        {telemetry?.lastSeen ? `${Math.round((Date.now() - telemetry.lastSeen) / 1000)}s ago` : 'Waiting for engine...'}
                      </span>
                    </div>
                  </div>

                  {/* Hardware Telemetry Gauges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Gauge 1: GPU Temperature */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                        <span>GPU Temperature</span>
                        <Flame className={`w-4 h-4 ${
                          (telemetry?.gpuTemperature || 0) > 75 
                            ? 'text-red-500 animate-pulse' 
                            : (telemetry?.gpuTemperature || 0) > 60
                              ? 'text-amber-400'
                              : 'text-cyan-400'
                        }`} />
                      </div>
                      <div className="text-3xl font-black text-white font-mono mb-2">
                        {telemetry?.gpuTemperature ?? 48}°C
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            (telemetry?.gpuTemperature || 0) > 75
                              ? 'bg-red-500'
                              : (telemetry?.gpuTemperature || 0) > 60
                                ? 'bg-amber-500'
                                : 'bg-cyan-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(10, ((telemetry?.gpuTemperature || 48) / 95) * 100))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Thermal Operating Threshold: 85°C
                      </span>
                    </div>

                    {/* Gauge 2: Compute Load */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                        <span>Compute Utilization</span>
                        <Gauge className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="text-3xl font-black text-white font-mono mb-2">
                        {telemetry?.computeLoadPercent ?? 0}%
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, telemetry?.computeLoadPercent || 0))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Neural Core Load
                      </span>
                    </div>

                    {/* Gauge 3: Power Draw */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                        <span>Power Draw Rate</span>
                        <Zap className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="text-3xl font-black text-white font-mono mb-2">
                        {telemetry?.powerWatts ?? 35}W
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-amber-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(10, ((telemetry?.powerWatts || 35) / 100) * 100))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Active Power Consumption
                      </span>
                    </div>

                    {/* Gauge 4: VRAM Memory */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
                      <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
                        <span>VRAM Memory Allocated</span>
                        <Cpu className="w-4 h-4 text-purple-400" />
                      </div>
                      <div className="text-2xl font-black text-white font-mono mb-2">
                        {telemetry?.vramUsedMB ?? 1420} <span className="text-xs text-slate-500 font-normal">/ {telemetry?.vramTotalMB ?? 4096} MB</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, (((telemetry?.vramUsedMB || 1420) / (telemetry?.vramTotalMB || 4096)) * 100)))}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        Video Memory Pool
                      </span>
                    </div>
                  </div>

                  {/* Active Job Progress */}
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center justify-between">
                      <span>Active Task Synthesis Progress</span>
                      <span className="text-cyan-400 font-mono text-sm">
                        {telemetry?.taskProgressPercent ?? 0}%
                      </span>
                    </h4>

                    {telemetry?.currentTaskId ? (
                      <div>
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 mb-3 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Order ID:</span>
                            <span className="font-mono text-cyan-400">{telemetry.currentTaskId}</span>
                          </div>
                          {telemetry.currentTaskPrompt && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Task Prompt:</span>
                              <span className="font-semibold text-white truncate max-w-md">"{telemetry.currentTaskPrompt}"</span>
                            </div>
                          )}
                        </div>

                        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(5, telemetry.taskProgressPercent))}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        No active generation task currently executing. Engine is waiting on the task queue.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. CUSTOMER VIDEOS & 24-HOUR AUTO-PURGE MANAGEMENT */}
              {currentTab === 'videos' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Video className="w-4 h-4 text-cyan-400" />
                        <span>Customer Generated Videos</span>
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        All videos created by registered customers. Videos are held for 24 hours then automatically unlinked.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={loadVideosList}
                        disabled={isLoadingVideos}
                        className="px-3 py-2 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingVideos ? 'animate-spin text-cyan-400' : ''}`} />
                        <span>Refresh</span>
                      </button>

                      <button
                        onClick={handlePurgeExpiredVideos}
                        className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Purge Expired Videos Now</span>
                      </button>
                    </div>
                  </div>

                  {/* Videos Table */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="p-3">Video / Thumbnail</th>
                          <th className="p-3">Customer</th>
                          <th className="p-3">Prompt & Audio</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Expiration Window</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {customerVideos.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500">
                              No customer videos produced yet. Newly generated videos will appear here.
                            </td>
                          </tr>
                        ) : (
                          customerVideos.map((video) => (
                            <tr key={video.id} className="hover:bg-slate-900/50">
                              <td className="p-3">
                                <div className="w-16 h-10 rounded-lg overflow-hidden bg-black relative border border-slate-800">
                                  <img
                                    src={video.thumbnailUrl}
                                    alt="thumbnail"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="font-semibold text-white block">{video.userName || 'Customer'}</span>
                                <span className="text-[10px] font-mono text-slate-500">{video.userId}</span>
                              </td>
                              <td className="p-3 max-w-xs">
                                <p className="font-medium text-slate-200 line-clamp-2">"{video.prompt}"</p>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {video.duration}s · {video.aspectRatio} {video.sfxPrompt ? `· SFX: ${video.sfxPrompt}` : ''}
                                </span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  video.status === 'completed'
                                    ? 'bg-emerald-950 text-emerald-400'
                                    : video.status === 'processing'
                                      ? 'bg-cyan-950 text-cyan-400'
                                      : 'bg-amber-950 text-amber-400'
                                }`}>
                                  {video.status}
                                </span>
                              </td>
                              <td className="p-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 text-[11px]">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span className={(video.minutesRemainingUntilPurge ?? 0) <= 60 ? 'text-red-400 font-bold' : 'text-slate-300'}>
                                    {(video.minutesRemainingUntilPurge ?? 0) > 0 
                                      ? `${Math.floor((video.minutesRemainingUntilPurge ?? 0) / 60)}h ${(video.minutesRemainingUntilPurge ?? 0) % 60}m left`
                                      : 'Expired (>24h)'}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {video.videoUrl && (
                                    <a
                                      href={video.videoUrl}
                                      download={`${video.id}.mp4`}
                                      className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-cyan-400"
                                      title="Download Video"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  <button
                                    onClick={() => handleDeleteSingleVideo(video.id)}
                                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-red-950 text-red-400 cursor-pointer"
                                    title="Delete Video"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. STORAGE & AUTO-CLEANUP DAEMON */}
              {currentTab === 'storage' && (
                <div className="space-y-5">
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                      <HardDrive className="w-4 h-4 text-emerald-400" />
                      <span>Storage & Auto-Cleanup Daemon</span>
                    </h4>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      All videos, databases, and user records are maintained in local storage with automatic 24-hour cleanup.
                    </p>

                    <div className="p-3 rounded-xl border border-slate-800 bg-slate-900 mb-4 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Database Storage File:</span>
                        <span className="font-mono text-cyan-400">./data/database.json</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Video Storage Directory:</span>
                        <span className="font-mono text-cyan-400">./data/videos/</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Current Videos in Storage:</span>
                        <span className="font-bold text-white">{customerVideos.length} Files</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-white block mb-1">
                        Auto-Purge Expiration Window (Hours)
                      </label>
                      <p className="text-[11px] text-slate-400 mb-2">
                        Videos older than this duration are automatically unlinked and permanently deleted from disk.
                      </p>
                      <input
                        type="number"
                        min={1}
                        max={72}
                        value={retentionHours}
                        onChange={(e) => setRetentionHours(Number(e.target.value))}
                        className="w-full sm:w-48 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-bold text-cyan-400"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveAllSettings}
                    disabled={isSaving}
                    className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Storage Settings</span>
                  </button>
                </div>
              )}

              {/* 5. QUOTAS & LIMITS (API Key Section 100% Removed) */}
              {currentTab === 'quotas' && (
                <div className="space-y-5">
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60">
                    <h4 className="text-sm font-bold text-white mb-2">
                      Customer Daily Video Generation Limits
                    </h4>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      Control the daily video generation quota allowed for each registered creator account. Quota resets every 24 hours.
                    </p>

                    <div>
                      <label className="text-xs font-bold text-white block mb-1">
                        Free Daily Generation Limit (Seconds Per Account)
                      </label>
                      <p className="text-[11px] text-slate-400 mb-2">
                        Default standard limit: 100 Seconds per day.
                      </p>
                      <input
                        type="number"
                        min={10}
                        max={600}
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(Number(e.target.value))}
                        className="w-full sm:w-48 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-bold text-emerald-400"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveAllSettings}
                    disabled={isSaving}
                    className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Daily Limit</span>
                  </button>
                </div>
              )}

              {/* 6. REGISTERED ACCOUNTS */}
              {currentTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">Registered Customer Accounts</h4>
                      <p className="text-xs text-slate-400">
                        Email authenticated creators with salted hashes.
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/60 px-3 py-1 rounded-lg border border-cyan-800/40">
                      Total: {usersList.length}
                    </span>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="p-3">Creator Name</th>
                          <th className="p-3">Email Address</th>
                          <th className="p-3 text-center">Generations</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Account Control</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {usersList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-500">
                              No registered users yet. Starts at zero.
                            </td>
                          </tr>
                        ) : (
                          usersList.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-900/50">
                              <td className="p-3 font-semibold text-white">{u.username}</td>
                              <td className="p-3 text-slate-400 font-mono">{u.maskedEmail}</td>
                              <td className="p-3 text-center">
                                <span className="font-bold text-cyan-400">{u.generationsToday}</span>
                                <span className="text-slate-500"> / {u.totalGenerations}</span>
                              </td>
                              <td className="p-3">
                                {u.isBanned ? (
                                  <span className="text-red-400 font-semibold bg-red-950/40 px-2 py-0.5 rounded text-[10px]">
                                    Suspended
                                  </span>
                                ) : (
                                  <span className="text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded text-[10px]">
                                    Active
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => handleBanToggle(u.id)}
                                  className={`px-2.5 py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                                    u.isBanned ? 'border-emerald-700 text-emerald-400' : 'border-red-850 text-red-400'
                                  }`}
                                >
                                  {u.isBanned ? 'Reinstate' : 'Ban'}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 7. AUDIT & PROMPTS */}
              {currentTab === 'audit' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">Safety Moderation Logs</h4>
                    <p className="text-xs text-slate-400">
                      Prompts requested by users and real-time moderation status.
                    </p>
                  </div>

                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="p-3">Time</th>
                          <th className="p-3">User</th>
                          <th className="p-3">Prompt</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {auditLogs.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-6 text-center text-slate-500">
                              No prompts logged yet.
                            </td>
                          </tr>
                        ) : (
                          auditLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-slate-900/50">
                              <td className="p-3 text-slate-400 whitespace-nowrap">{log.timestamp.slice(11, 19)}</td>
                              <td className="p-3 font-semibold text-slate-200">{log.username || 'Anonymous'}</td>
                              <td className="p-3 text-slate-300 max-w-xs break-words">"{log.prompt}"</td>
                              <td className="p-3 whitespace-nowrap">
                                {log.safetyStatus === 'approved' ? (
                                  <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
                                    Approved
                                  </span>
                                ) : (
                                  <span className="bg-red-950 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold">
                                    Blocked
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 8. THEME & TEXT OVERRIDES */}
              {currentTab === 'theme-content' && (
                <div className="space-y-5">
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60">
                    <h4 className="text-sm font-bold text-white mb-2">Neon Accent Theme</h4>
                    <div className="flex flex-wrap gap-2.5">
                      {[
                        { id: 'cyan', label: 'Cyber Cyan', color: '#06b6d4' },
                        { id: 'purple', label: 'Electric Violet', color: '#a855f7' },
                        { id: 'emerald', label: 'Matrix Emerald', color: '#10b981' },
                        { id: 'rose', label: 'Neon Rose', color: '#f43f5e' },
                        { id: 'amber', label: 'Cyber Amber', color: '#f59e0b' },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setAccentColor(c.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border cursor-pointer ${
                            accentColor === c.id ? 'border-white text-white' : 'border-slate-800 text-slate-400'
                          }`}
                        >
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                          <span>{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
                    <h4 className="text-sm font-bold text-white mb-1">Live Text Customizer</h4>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Site Brand Name</label>
                      <input
                        type="text"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Hero Title</label>
                      <input
                        type="text"
                        value={heroTitle}
                        onChange={(e) => setHeroTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Hero Subtitle</label>
                      <textarea
                        rows={2}
                        value={heroSubtitle}
                        onChange={(e) => setHeroSubtitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60">
                    <h4 className="text-sm font-bold text-white mb-2">Section Visibility Toggles</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {Object.entries(visibility).map(([key, val]) => (
                        <label key={key} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                          <input
                            type="checkbox"
                            checked={val}
                            onChange={(e) => setVisibility({ ...visibility, [key]: e.target.checked })}
                          />
                          <span className="capitalize">{key}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleSaveAllSettings}
                    disabled={isSaving}
                    className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Theme & Content</span>
                  </button>
                </div>
              )}

              {/* 9. AD SPACES & MONETIZATION */}
              {currentTab === 'ads' && (
                <div className="space-y-5">
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Ad Placement & Monetization Settings</span>
                    </h4>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      Configure advertising spaces and code snippets for advertising partners and networks.
                    </p>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                          <input
                            type="checkbox"
                            checked={adsConfig.headerAdEnabled}
                            onChange={(e) => setAdsConfig({ ...adsConfig, headerAdEnabled: e.target.checked })}
                          />
                          <span>Top Leaderboard Ad</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                          <input
                            type="checkbox"
                            checked={adsConfig.sidebarAdEnabled}
                            onChange={(e) => setAdsConfig({ ...adsConfig, sidebarAdEnabled: e.target.checked })}
                          />
                          <span>Sidebar Ad Space</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                          <input
                            type="checkbox"
                            checked={adsConfig.showcaseAdEnabled}
                            onChange={(e) => setAdsConfig({ ...adsConfig, showcaseAdEnabled: e.target.checked })}
                          />
                          <span>Showcase Banner Ad</span>
                        </label>
                        <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                          <input
                            type="checkbox"
                            checked={adsConfig.completionAdEnabled}
                            onChange={(e) => setAdsConfig({ ...adsConfig, completionAdEnabled: e.target.checked })}
                          />
                          <span>Post-Generation Ad Box</span>
                        </label>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Google AdSense Code Snippet (Optional)
                        </label>
                        <textarea
                          rows={3}
                          value={adsConfig.googleAdSenseCode}
                          onChange={(e) => setAdsConfig({ ...adsConfig, googleAdSenseCode: e.target.value })}
                          placeholder='<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-..." crossorigin="anonymous"></script>'
                          className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Custom HTML Ad Tag / Script (Optional)
                        </label>
                        <textarea
                          rows={2}
                          value={adsConfig.customAdSnippet}
                          onChange={(e) => setAdsConfig({ ...adsConfig, customAdSnippet: e.target.value })}
                          placeholder='<div id="ad-unit">...</div>'
                          className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveAllSettings}
                    disabled={isSaving}
                    className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Ad Settings</span>
                  </button>
                </div>
              )}

              {/* 10. WELCOME EMAIL SMTP */}
              {currentTab === 'email' && (
                <div className="space-y-5">
                  <div className="p-5 rounded-xl border border-slate-800 bg-slate-950/60">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4 text-cyan-400" />
                      <span>SMTP Welcome & Video Ready Email Delivery</span>
                    </h4>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                      Configure your SMTP server to automatically deliver welcome onboarding emails and instant notifications when a customer's video finishes rendering.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">SMTP Host</label>
                        <input
                          type="text"
                          value={smtpHost}
                          onChange={(e) => setSmtpHost(e.target.value)}
                          placeholder="smtp.gmail.com"
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">SMTP Port</label>
                        <input
                          type="number"
                          value={smtpPort}
                          onChange={(e) => setSmtpPort(Number(e.target.value))}
                          placeholder="587"
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">SMTP Username / Email</label>
                        <input
                          type="text"
                          value={smtpUser}
                          onChange={(e) => setSmtpUser(e.target.value)}
                          placeholder="user@example.com"
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">SMTP Password</label>
                        <input
                          type="password"
                          value={smtpPass}
                          onChange={(e) => setSmtpPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveAllSettings}
                    disabled={isSaving}
                    className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save SMTP Settings</span>
                  </button>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
};
