import React, { useState, useEffect } from 'react';
import { Download, X, Share2, Smartphone, Check, Sparkles, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isMobile, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('pinboard_pwa_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  // If already installed (standalone display-mode) or user dismissed this session, don't show the bottom banner
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('pinboard_pwa_dismissed', 'true');
    } catch {}
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setInstallSuccess(true);
        setTimeout(() => handleDismiss(), 3000);
      }
      return;
    }

    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    // Fallback for Android browsers when beforeinstallprompt event is pending
    setShowAndroidGuide(true);
  };

  return (
    <>
      {/* Floating Bottom Install Banner (Optimized for Mobile Phones) */}
      <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-40 animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-white dark:bg-[#202124] rounded-2xl p-3.5 shadow-2xl border-2 border-[#1a73e8] dark:border-[#8ab4f8] flex items-center justify-between gap-3">
          {/* App Icon + Text */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#1a73e8] to-[#1557b0] p-1 flex items-center justify-center shrink-0 shadow-md">
              <img
                src="/icon.svg"
                alt="Pinboard Icon"
                className="w-9 h-9 object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border border-white flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs sm:text-sm font-black text-[#202124] dark:text-white leading-tight truncate">
                  Pinboard App Install Karein
                </h4>
              </div>
              <p className="text-[11px] text-[#5f6368] dark:text-[#9aa0a6] truncate leading-tight mt-0.5">
                Phone screen par app ki tarah chalu karein
              </p>
            </div>
          </div>

          {/* Action Buttons: Install & Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3.5 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-xs font-black shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {installSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Installed!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Install</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Guided Install Sheet */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-white dark:bg-[#202124] rounded-2xl shadow-2xl border border-[#dadce0] dark:border-[#3c4043] p-5 space-y-4 animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#dadce0] dark:border-[#3c4043]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-[#1a73e8] flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#202124] dark:text-white">
                  iPhone / iPad par Install karein
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#3c4043] dark:text-slate-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#303134]">
                <div className="w-6 h-6 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </div>
                <div className="flex-1 leading-relaxed">
                  Safari browser me neeche diye gaye <strong className="text-[#1a73e8]">Share</strong> button (
                  <span className="inline-block px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-mono">⎋</span> / square with up-arrow) par tap karein.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#303134]">
                <div className="w-6 h-6 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </div>
                <div className="flex-1 leading-relaxed">
                  Thoda neeche scroll karein aur <strong className="text-[#1a73e8] font-bold">"Add to Home Screen"</strong> (
                  <PlusSquare className="w-3.5 h-3.5 inline text-[#1a73e8]" />) par click karein.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#303134]">
                <div className="w-6 h-6 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </div>
                <div className="flex-1 leading-relaxed">
                  Upar right corner me <strong className="text-[#188038] font-bold">"Add"</strong> dabayein. App aapke home screen par icon ban jayega!
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
            >
              Samajh Gaya (Done)
            </button>
          </div>
        </div>
      )}

      {/* Android Browser Guided Modal */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-white dark:bg-[#202124] rounded-2xl shadow-2xl border border-[#dadce0] dark:border-[#3c4043] p-5 space-y-4 animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#dadce0] dark:border-[#3c4043]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/80 text-[#1a73e8] flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-[#202124] dark:text-white">
                  Phone me App Install karein
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAndroidGuide(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#3c4043] dark:text-slate-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#303134]">
                <div className="w-6 h-6 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  1
                </div>
                <div className="flex-1 leading-relaxed">
                  Browser ke upar right corner me <strong className="text-[#1a73e8]">3-dots (⋮) Menu</strong> par tap karein.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#303134]">
                <div className="w-6 h-6 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  2
                </div>
                <div className="flex-1 leading-relaxed">
                  Menu me <strong className="text-[#1a73e8] font-bold">"Install app"</strong> ya <strong className="text-[#1a73e8] font-bold">"Add to Home screen"</strong> par click karein.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-[#303134]">
                <div className="w-6 h-6 rounded-full bg-[#1a73e8] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  3
                </div>
                <div className="flex-1 leading-relaxed">
                  Pop-up me <strong>"Install"</strong> dabayein. App turant aapke phone me install ho jayegi!
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAndroidGuide(false)}
              className="w-full py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors"
            >
              Theek Hai (Close)
            </button>
          </div>
        </div>
      )}
    </>
  );
};
