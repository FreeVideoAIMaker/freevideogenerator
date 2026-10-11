import React from 'react';
import { useThemeConfig } from '../context/ThemeConfigContext';

interface AdBannerProps {
  type: 'leaderboard' | 'sidebar' | 'showcase' | 'completion' | 'in-feed' | 'footer-banner';
  className?: string;
}

export const AdBanner: React.FC<AdBannerProps> = ({ type, className = '' }) => {
  const { config, mode } = useThemeConfig();
  const isLight = mode === 'light';

  // Check if ads are enabled
  if (config?.ads?.headerAdEnabled === false && type === 'leaderboard') return null;
  if (config?.ads?.sidebarAdEnabled === false && type === 'sidebar') return null;
  if (config?.ads?.showcaseAdEnabled === false && type === 'showcase') return null;
  if (config?.ads?.completionAdEnabled === false && type === 'completion') return null;

  // Custom Ad HTML / Google AdSense snippet set by admin
  if (config?.ads?.customAdSnippet && config.ads.customAdSnippet.trim().length > 0) {
    return (
      <div 
        className={`ad-container relative overflow-hidden text-center my-4 max-w-full ${className}`}
        dangerouslySetInnerHTML={{ __html: config.ads.customAdSnippet }}
      />
    );
  }

  // Google AdSense code injection
  if (config?.ads?.googleAdSenseCode && config.ads.googleAdSenseCode.trim().length > 0) {
    return (
      <div 
        className={`adsense-wrapper relative overflow-hidden text-center my-4 max-w-full ${className}`}
        dangerouslySetInnerHTML={{ __html: config.ads.googleAdSenseCode }}
      />
    );
  }

  // Universal clean Ad box with simple "ad" in corner
  if (type === 'leaderboard' || type === 'footer-banner') {
    return (
      <div className={`w-full max-w-5xl mx-auto my-5 px-3 sm:px-4 ${className}`}>
        <div className={`relative rounded-xl border border-dashed p-4 sm:p-5 text-center transition-all ${
          isLight 
            ? 'bg-slate-100/70 border-slate-300 text-slate-700' 
            : 'bg-slate-900/40 border-slate-800 text-slate-400'
        }`}>
          {/* Simple "ad" in top corner */}
          <span className="absolute top-2 left-2 text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 font-semibold">
            ad
          </span>

          <div className="py-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left pl-6 sm:pl-7">
              <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-200">
                Premium Cloud Computing & AI Media Infrastructure
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                High-throughput rendering pipelines, neural APIs, and dedicated edge storage.
              </p>
            </div>
            <a
              href="#studio"
              className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors shrink-0"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'sidebar') {
    return (
      <div className={`relative rounded-xl border border-dashed p-4 my-3 text-center transition-all ${
        isLight 
          ? 'bg-slate-100/70 border-slate-300 text-slate-700' 
          : 'bg-slate-900/40 border-slate-800 text-slate-400'
      } ${className}`}>
        {/* Simple "ad" in top corner */}
        <span className="absolute top-2 left-2 text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 font-semibold">
          ad
        </span>

        <div className="pt-4 pb-2">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-200 mb-1">
            Display Advertising Partner
          </p>
          <p className="text-[11px] text-slate-500 mb-3">
            High-converting programmatic placements tailored for digital creators.
          </p>
          <span className="text-[10px] font-mono text-slate-400 block">
            300 × 250 Placement
          </span>
        </div>
      </div>
    );
  }

  // In-Feed / Showcase / Completion Banner
  return (
    <div className={`w-full max-w-4xl mx-auto my-4 px-3 sm:px-4 ${className}`}>
      <div className={`relative rounded-xl border border-dashed p-3 sm:p-4 text-center transition-all ${
        isLight 
          ? 'bg-slate-100/70 border-slate-300 text-slate-700' 
          : 'bg-slate-900/40 border-slate-800 text-slate-400'
      }`}>
        {/* Simple "ad" in top corner */}
        <span className="absolute top-2 left-2 text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 font-semibold">
          ad
        </span>

        <div className="py-1">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">
            Professional Creative Suite & AI Workflows
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Zero-watermark tools for filmmakers, animators, and content creators.
          </p>
        </div>
      </div>
    </div>
  );
};
