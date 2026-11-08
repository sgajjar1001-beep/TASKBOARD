import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Smartphone,
  ShieldAlert,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Layers,
  Sparkles,
  Settings,
  HelpCircle,
} from 'lucide-react';

interface AndroidOverlayPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchPiP?: () => void;
  isPiPSupported?: boolean;
}

export const AndroidOverlayPermissionModal: React.FC<AndroidOverlayPermissionModalProps> = ({
  isOpen,
  onClose,
  onLaunchPiP,
  isPiPSupported = false,
}) => {
  const [copiedManifest, setCopiedManifest] = useState(false);
  const [copiedCapacitor, setCopiedCapacitor] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'manifest' | 'pip'>('settings');

  if (!isOpen) return null;

  const manifestCode = `<!-- AndroidManifest.xml: Display Over Other Apps & Background Service -->
<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.VIBRATE" />`;

  const capacitorPluginCode = `// Capacitor / Cordova Bridge to launch Floating Overlay
// In Android Kotlin / Java (MainActivity.kt):
import android.content.Intent
import android.net.Uri
import android.provider.Settings

// Check & request "Display over other apps" permission:
if (!Settings.canDrawOverlays(this)) {
    val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:\$packageName")
    )
    startActivityForResult(intent, 1234)
}`;

  const copyToClipboard = (text: string, type: 'manifest' | 'capacitor') => {
    navigator.clipboard.writeText(text);
    if (type === 'manifest') {
      setCopiedManifest(true);
      setTimeout(() => setCopiedManifest(false), 2000);
    } else {
      setCopiedCapacitor(true);
      setTimeout(() => setCopiedCapacitor(false), 2000);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/40 dark:border-white/10 flex flex-col max-h-[90vh] overflow-hidden text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-xs">
              <Smartphone className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black leading-tight flex items-center gap-1.5">
                <span>Display Over Apps & APK Setup</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  Android & Web
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                Floating Assistant bubble over other apps (Like iPhone AssistiveTouch)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-200 dark:border-white/10 flex items-center gap-2 shrink-0 bg-transparent">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-[#1a73e8] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Mobile Phone Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manifest')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'manifest'
                ? 'bg-[#1a73e8] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>APK Manifest XML</span>
          </button>

          {isPiPSupported && (
            <button
              type="button"
              onClick={() => setActiveTab('pip')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'pip'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Web PiP Floating</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3 text-amber-900 dark:text-amber-200">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-xs">Android "Display Over Other Apps" Permission</h4>
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    Android me floating widget ko dusri apps ke upar hamesha dikhane ke liye{' '}
                    <strong>"Appear on top / Display over other apps"</strong> permission allow karni hoti hai.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Android Mobile Par Permission Allow Karne Ka Tarika:
                </h4>

                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#1a73e8] text-white flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">Phone Settings Kholein</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Apne Android phone ki <strong>Settings</strong> me jaakar <strong>Apps</strong> ya <strong>App Management</strong> par tap karein.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#1a73e8] text-white flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">Special App Access</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Neeche diye gaye <strong>Special app access</strong> ya top right me 3 dots par tap karke Special Access select karein.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#1a73e8] text-white flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">Display over other apps</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        <strong>"Display over other apps"</strong> (ya <em>Appear on top</em>) par tap karein aur list me <strong>Pinboard Task Manager</strong> ko dhundhein.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                      ✓
                    </span>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">Switch ON Karein</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        <strong>"Allow display over other apps"</strong> toggle ko ON kar dein. Ab floating assistant hamesha screen par available rahega!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manifest' && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white">
                    APK Permissions (Included in Code)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    File: <code className="text-[#1a73e8] font-bold">public/AndroidManifest.xml</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(manifestCode, 'manifest')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-800 dark:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                >
                  {copiedManifest ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy XML</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-950 text-slate-200 p-3.5 font-mono text-[11px] leading-relaxed overflow-x-auto shadow-inner">
                <pre>{manifestCode}</pre>
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-bold text-xs">APK Conversion Guide:</p>
                <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
                  Aap is project ko <strong>Capacitor</strong>, <strong>Cordova</strong>, ya <strong>TWA (Trusted Web Activity / Bubblewrap)</strong> se 1-click me Android APK me convert kar sakte hain. Humne Manifest aur saari zaroori permissions project me pehle se configure kar di hain!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'pip' && isPiPSupported && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-2">
                <div className="flex items-center gap-2 text-purple-900 dark:text-purple-200 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Document Picture-in-Picture (OS-Level Floating Window)</span>
                </div>
                <p className="text-[11px] text-purple-800 dark:text-purple-300 leading-relaxed">
                  Aapke browser me <strong>Document Picture-in-Picture</strong> supported hai! Is button par click karke aap browser ko minimize karke bhi apne tasks ko pure computer/mobile par float kar sakte hain!
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  onLaunchPiP?.();
                  onClose();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-98"
              >
                <Layers className="w-4 h-4" />
                <span>Launch Floating Window Now (Float Over All Apps)</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-white/5 shrink-0">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
            AssistiveTouch Floating Assistant Ready
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
