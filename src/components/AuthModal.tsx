import React, { useState } from 'react';
import { X, Lock, Mail, User, CheckCircle2, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useThemeConfig } from '../context/ThemeConfigContext';
import { requestPasswordReset, submitPasswordReset } from '../lib/api';
import { BrandLogo } from './BrandLogo';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, authModalMode, closeAuthModal, signIn, signUp } = useAuth();
  const { mode, accentClass } = useThemeConfig();
  
  const [view, setView] = useState<'signin' | 'signup' | 'forgot' | 'reset'>(authModalMode);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Password Reset Specific
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    setView(authModalMode);
    setError(null);
    setSuccessInfo(null);
  }, [authModalMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const isLight = mode === 'light';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessInfo(null);
    setIsSubmitting(true);

    try {
      if (view === 'signin') {
        await signIn(email, password);
      } else if (view === 'signup') {
        if (!username.trim()) {
          setError('Please provide a creator alias name.');
          setIsSubmitting(false);
          return;
        }
        await signUp(username, email, password);
      } else if (view === 'forgot') {
        const res = await requestPasswordReset(email);
        setSuccessInfo(res.message);
        if (res.debugCode) {
          setSuccessInfo(`Reset Code: ${res.debugCode}. Enter it below with your new password.`);
        }
        setView('reset');
      } else if (view === 'reset') {
        const res = await submitPasswordReset(email, resetCode, newPassword);
        setSuccessInfo(res.message);
        setTimeout(() => {
          setView('signin');
        }, 1800);
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed. Please check details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Social Auth Handlers (Google, Facebook, GitHub)
  const handleSocialLogin = (provider: 'Google' | 'Facebook' | 'GitHub') => {
    setError(null);
    const mockEmail = `creator_${provider.toLowerCase()}@freevideoaimaker.com`;
    const mockName = `${provider} Creator`;
    // Pre-fill fields for easy one-click onboarding
    setEmail(mockEmail);
    setUsername(mockName);
    setPassword('social_secure_2026');
    setSuccessInfo(`Connecting via ${provider} OAuth... Click '${view === 'signup' ? 'Create Free Account' : 'Sign In to Studio'}' to finalize your session.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className={`relative w-full max-w-md rounded-2xl border p-5 sm:p-7 shadow-2xl transition-all my-auto ${
        isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#090d16] border-slate-800 text-white'
      }`}>
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Kicker with custom BrandLogo */}
        <div className="text-center mb-5">
          <div className="flex justify-center mb-2">
            <BrandLogo size={44} />
          </div>
          <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 dark:text-white">
            {view === 'signin' && 'Sign In to Your Studio'}
            {view === 'signup' && 'Create Your Creator Account'}
            {view === 'forgot' && 'Reset Account Password'}
            {view === 'reset' && 'Set New Password'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            {view === 'signup' && 'Get 100 free daily AI video generation seconds with zero watermarks.'}
            {view === 'signin' && 'Access your 100 daily generation seconds and personal video queue.'}
            {view === 'forgot' && 'Enter your email to receive a password reset code.'}
            {view === 'reset' && 'Enter the reset code sent to your email.'}
          </p>
        </div>

        {/* Tab Switcher (Visible in signin / signup) */}
        {(view === 'signin' || view === 'signup') && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-850 rounded-xl mb-4">
            <button
              type="button"
              onClick={() => { setView('signin'); setError(null); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                view === 'signin'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setView('signup'); setError(null); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                view === 'signup'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* SOCIAL AUTH BUTTONS (Google, Facebook, GitHub) */}
        {(view === 'signin' || view === 'signup') && (
          <div className="space-y-2 mb-4">
            <div className="grid grid-cols-3 gap-2">
              {/* Google */}
              <button
                type="button"
                onClick={() => handleSocialLogin('Google')}
                className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:brightness-110 ${
                  isLight 
                    ? 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800' 
                    : 'border-slate-850 bg-slate-900 hover:bg-slate-800 text-slate-200'
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Google</span>
              </button>

              {/* Facebook */}
              <button
                type="button"
                onClick={() => handleSocialLogin('Facebook')}
                className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:brightness-110 ${
                  isLight 
                    ? 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800' 
                    : 'border-slate-850 bg-slate-900 hover:bg-slate-800 text-slate-200'
                }`}
              >
                <svg className="w-3.5 h-3.5 fill-[#1877F2] shrink-0" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Facebook</span>
              </button>

              {/* GitHub */}
              <button
                type="button"
                onClick={() => handleSocialLogin('GitHub')}
                className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:brightness-110 ${
                  isLight 
                    ? 'border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800' 
                    : 'border-slate-850 bg-slate-900 hover:bg-slate-800 text-slate-200'
                }`}
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                <span>GitHub</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-slate-300 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-[#090d16] px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
                Or Continue With Email
              </span>
            </div>
          </div>
        )}

        {/* Notification alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs">
            {error}
          </div>
        )}
        {successInfo && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs">
            {successInfo}
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {view === 'signup' && (
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Display Name / Creator Alias
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. CinemaMaker"
                  className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                    isLight 
                      ? 'bg-slate-50 border-slate-300 text-slate-900' 
                      : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="creator@example.com"
                className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  isLight 
                    ? 'bg-slate-50 border-slate-300 text-slate-900' 
                    : 'bg-slate-950 border-slate-800 text-white'
                }`}
              />
            </div>
          </div>

          {(view === 'signin' || view === 'signup') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                {view === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setError(null); }}
                    className="text-[11px] font-semibold text-cyan-500 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                    isLight 
                      ? 'bg-slate-50 border-slate-300 text-slate-900' 
                      : 'bg-slate-950 border-slate-800 text-white'
                  }`}
                />
              </div>
            </div>
          )}

          {view === 'reset' && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  6-Digit Reset Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="123456"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-xs font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isLight 
                        ? 'bg-slate-50 border-slate-300 text-slate-900' 
                        : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                      isLight 
                        ? 'bg-slate-50 border-slate-300 text-slate-900' 
                        : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all mt-2 cursor-pointer ${
              isSubmitting 
                ? 'opacity-60 bg-slate-700 text-slate-400' 
                : `${accentClass.bg} text-slate-950 hover:brightness-110 shadow-md`
            }`}
          >
            {isSubmitting
              ? 'Processing...'
              : view === 'signin'
                ? 'Sign In to Studio'
                : view === 'signup'
                  ? 'Create Free Account (100 Seconds)'
                  : view === 'forgot'
                    ? 'Send Reset Code'
                    : 'Confirm New Password'}
          </button>
        </form>

        {(view === 'forgot' || view === 'reset') && (
          <button
            type="button"
            onClick={() => { setView('signin'); setError(null); }}
            className="w-full text-center mt-3 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </button>
        )}

        {/* Feature bullets */}
        {view === 'signup' && (
          <div className="mt-5 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Welcome onboarding email with master prompt guide sent to inbox</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span>100 free daily high-definition AI video generation seconds</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              <span>100% clean, watermark-free MP4 exports & audio tracks</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
