import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium, ShieldAlert, ArrowLeft, Circle, Square } from 'lucide-react';
import { KioskConfig } from '../types';

interface AndroidFrameProps {
  config: KioskConfig;
  children: React.ReactNode;
  onBack: () => void;
  onHome: () => void;
  canGoBack: boolean;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  config,
  children,
  onBack,
  onHome,
  canGoBack,
}) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  if (config.deviceType === 'fullscreen') {
    return (
      <div id="kiosk-fullscreen-container" className="w-full h-full flex flex-col bg-white text-slate-900 overflow-hidden select-none border border-slate-200 rounded-xl shadow-xs">
        {/* Fullscreen Minimal Kiosk Status Strip */}
        <div id="fullscreen-status-strip" className="h-7 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5 text-[11px] tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              LOCKED DEDICATED KIOSK
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-300 font-mono text-xs">
            <span>{time || '12:00'}</span>
            <Wifi className="w-3.5 h-3.5 text-slate-300" />
            <BatteryMedium className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden bg-white">
          {children}
        </div>
      </div>
    );
  }

  const isTablet = config.deviceType === 'tablet';
  const isLandscape = config.orientation === 'landscape';

  // Frame Dimensions based on device and orientation
  let frameDimensions = 'w-[400px] h-[800px] max-h-[88vh]';
  if (isTablet) {
    frameDimensions = isLandscape ? 'w-[940px] h-[640px] max-h-[86vh]' : 'w-[700px] h-[880px] max-h-[88vh]';
  } else if (isLandscape) {
    frameDimensions = 'w-[800px] h-[400px] max-h-[84vh]';
  }

  return (
    <div
      id="android-device-wrapper"
      className={`relative mx-auto bg-slate-900 text-slate-100 rounded-[42px] p-3.5 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700/60 flex flex-col overflow-hidden transition-all duration-300 ${frameDimensions}`}
    >
      {/* Speaker / Camera Notch */}
      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full z-40 flex items-center justify-center">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800 mr-2"></div>
        <div className="w-10 h-1 bg-slate-800 rounded-full"></div>
      </div>

      {/* Android System Status Bar */}
      <div
        id="android-status-bar"
        className="h-8 pt-1 px-4 flex items-center justify-between text-xs text-slate-300 font-medium select-none z-30"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">{time || '09:41'}</span>
          {config.kioskLocked && (
            <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30">
              🔒 PINNED
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <Wifi className="w-3.5 h-3.5 text-slate-200" />
          <span className="text-[10px] font-bold text-slate-300">5G</span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-slate-300">98%</span>
            <BatteryMedium className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Device Display Screen */}
      <div
        id="android-screen-content"
        className="flex-1 bg-white text-slate-900 rounded-[28px] overflow-hidden flex flex-col relative border border-slate-200/80 shadow-inner"
      >
        {children}
      </div>

      {/* Android Bottom Navigation Bar (Back, Home, Lock Indicator) */}
      <div
        id="android-nav-bar"
        className="h-10 px-8 flex items-center justify-around text-slate-400 select-none z-30 pt-1"
      >
        {/* Hardware Back Button */}
        <button
          id="btn-android-back"
          onClick={onBack}
          disabled={!canGoBack}
          title="Android Back Button"
          className={`p-2 rounded-full transition-colors flex items-center justify-center ${
            canGoBack
              ? 'text-slate-200 hover:bg-slate-800 active:bg-slate-700 cursor-pointer'
              : 'text-slate-600 cursor-not-allowed opacity-40'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Hardware Home Button (Resets to Target Home) */}
        <button
          id="btn-android-home"
          onClick={onHome}
          title="Android Home (Kiosk Locked)"
          className="p-2 rounded-full hover:bg-slate-800 active:bg-slate-700 text-slate-200 cursor-pointer transition-colors"
        >
          <Circle className="w-4 h-4" />
        </button>

        {/* Hardware App Switcher (Disabled in Kiosk Mode) */}
        <div
          id="btn-android-overview"
          title={config.kioskLocked ? 'Kiosk Mode: Task Switcher Locked by Admin' : 'App Switcher'}
          className="p-2 rounded-full text-slate-600 flex items-center justify-center cursor-not-allowed"
        >
          {config.kioskLocked ? (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
        </div>
      </div>
    </div>
  );
};
