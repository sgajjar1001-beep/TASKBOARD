import React, { useState } from 'react';
import { Download, Smartphone, X, Check, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'header' | 'settings' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState<boolean>(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState<boolean>(false);
  const [installed, setInstalled] = useState<boolean>(false);

  // If already installed in standalone mode, hide
  if (isInstalled || installed) {
    return null;
  }

  const handleInstall = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setInstalled(true);
      }
      return;
    }

    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    setShowAndroidGuide(true);
  };

  return (
    <>
      {variant === 'settings' ? (
        <button
          type="button"
          onClick={handleInstall}
          className={`w-full flex items-center justify-between p-3 rounded-xl border border-[#dadce0] dark:border-[#3c4043] bg-white dark:bg-[#202124] hover:bg-blue-50/60 dark:hover:bg-blue-950/30 text-left transition-all cursor-pointer group ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-[#1a73e8] dark:text-[#8ab4f8] flex items-center justify-center">
              <Download className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#202124] dark:text-white group-hover:text-[#1a73e8]">
                Install App on Phone / Desktop
              </h4>
              <p className="text-[11px] text-[#5f6368] dark:text-slate-400">
                PWA install karein aur home screen se directly use karein
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-[#1a73e8] text-white text-[11px] font-bold rounded-lg shadow-2xs">
            Install
          </span>
        </button>
      ) : variant === 'compact' ? (
        <button
          type="button"
          onClick={handleInstall}
          className={`p-1.5 rounded-lg border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#303134] text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold ${className}`}
          title="Install App on this Device"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstall}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#dadce0] dark:border-[#5f6368] bg-white dark:bg-[#303134] hover:bg-blue-50 dark:hover:bg-blue-950/60 text-[#1a73e8] dark:text-[#8ab4f8] transition-colors cursor-pointer text-xs font-bold shadow-2xs ${className}`}
          title="Install Pinboard on Phone / PC"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden md:inline">Install App</span>
        </button>
      )}

      {/* iOS Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm bg-white dark:bg-[#202124] rounded-2xl shadow-2xl border border-[#dadce0] dark:border-[#3c4043] p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#dadce0] dark:border-[#3c4043]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#1a73e8]" />
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

            <div className="space-y-2.5 text-xs text-[#3c4043] dark:text-slate-300">
              <p>1. Safari me neeche <strong>Share</strong> icon (⎋) tap karein.</p>
              <p>2. Scroll karke <strong>Add to Home Screen</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-[#1a73e8]" />) tap karein.</p>
              <p>3. Top right me <strong>Add</strong> tap karein.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2 bg-[#1a73e8] text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Android Modal */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm bg-white dark:bg-[#202124] rounded-2xl shadow-2xl border border-[#dadce0] dark:border-[#3c4043] p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#dadce0] dark:border-[#3c4043]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#1a73e8]" />
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

            <div className="space-y-2.5 text-xs text-[#3c4043] dark:text-slate-300">
              <p>1. Chrome browser me upar <strong>3-dots (⋮) Menu</strong> dabayein.</p>
              <p>2. <strong>"Install app"</strong> ya <strong>"Add to Home screen"</strong> par click karein.</p>
              <p>3. Pop-up me <strong>"Install"</strong> select karein.</p>
            </div>

            <button
              type="button"
              onClick={() => setShowAndroidGuide(false)}
              className="w-full py-2 bg-[#1a73e8] text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Theek Hai
            </button>
          </div>
        </div>
      )}
    </>
  );
};
