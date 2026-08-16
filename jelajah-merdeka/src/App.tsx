/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Smartphone,
  Tablet,
  Maximize2,
  FileCode2,
  Bug,
  ListFilter,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { KioskConfig, SecurityEvent } from './types';
import { PRESET_PROFILES } from './constants/presets';
import { AndroidFrame } from './components/AndroidFrame';
import { KioskBrowserView } from './components/KioskBrowserView';
import { AdminModal } from './components/AdminModal';
import { SecurityAuditModal } from './components/SecurityAuditModal';
import { SecurityTestLab } from './components/SecurityTestLab';
import { AndroidCodeExportModal } from './components/AndroidCodeExportModal';

const DEFAULT_CONFIG: KioskConfig = {
  targetUrl: 'https://mr-merdeka.blogspot.com',
  appName: 'MR Merdeka Portal',
  appDescription: 'Dedicated Kiosk Browser restricted exclusively to authorized portals with hidden address bar, zero ads, strict whitelist, and anti-injection sandbox.',
  adminPin: '1234',
  deviceType: 'pixel8',
  orientation: 'portrait',
  kioskLocked: true,
  profileId: 'mr-merdeka-blog',
  security: {
    allowedDomains: [
      'mr-merdeka.blogspot.com',
      '*.blogspot.com',
      'blogger.com',
      '*.blogger.com',
      '*.googleusercontent.com',
      'merdeka.infinityfreeapp.com',
      '*.infinityfreeapp.com',
    ],
    blockAds: true,
    blockTrackers: true,
    preventHtmlInjection: true,
    preventScriptExecutionInUntrusted: true,
    disableContextMenu: true,
    disableTextSelection: false,
    disablePopups: true,
    clearSessionOnReset: true,
    hideUrlBar: true,
    inactivityTimeoutSeconds: 0,
    customCssInjectionBlock: true,
  },
};

export default function App() {
  const [config, setConfig] = useState<KioskConfig>(DEFAULT_CONFIG);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [canGoBack, setCanGoBack] = useState<boolean>(false);

  // Modals state
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);
  const [isTestLabOpen, setIsTestLabOpen] = useState<boolean>(false);
  const [isCodeExportOpen, setIsCodeExportOpen] = useState<boolean>(false);

  // Hardware Back and Home triggers
  const [backTrigger, setBackTrigger] = useState<number>(0);
  const [homeTrigger, setHomeTrigger] = useState<number>(0);

  const handleSecurityEvent = useCallback((event: SecurityEvent) => {
    setSecurityEvents((prev) => [event, ...prev.slice(0, 99)]);
  }, []);

  const handleHistoryUpdate = useCallback((canBack: boolean) => {
    setCanGoBack(canBack);
  }, []);

  const handleClearAuditEvents = () => {
    setSecurityEvents([]);
  };

  return (
    <div id="app-root-layout" className="min-h-screen w-full bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* 
        ========================================================================
        TOP PLATFORM NAVIGATION BAR
        ========================================================================
      */}
      <header id="main-header" className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-4 select-none shrink-0 shadow-xs z-20">
        {/* App Title & Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                Dedicated Secure Browser
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200">
                Android Kiosk Sandbox
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate">
              URL Hidden • 0 Ads • Anti-Injection Sandbox • Whitelist Locked
            </p>
          </div>
        </div>

        {/* Device Switcher (Phone / Tablet / Fullscreen) */}
        <div className="hidden md:flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/90 gap-1 text-xs">
          <button
            id="btn-frame-pixel"
            onClick={() => setConfig({ ...config, deviceType: 'pixel8' })}
            title="Google Pixel 8 Simulator"
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
              config.deviceType === 'pixel8'
                ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Phone
          </button>
          <button
            id="btn-frame-tablet"
            onClick={() => setConfig({ ...config, deviceType: 'tablet' })}
            title="Android Tablet Kiosk Stand"
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
              config.deviceType === 'tablet'
                ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            Tablet
          </button>
          <button
            id="btn-frame-fullscreen"
            onClick={() => setConfig({ ...config, deviceType: 'fullscreen' })}
            title="Direct Fullscreen Kiosk"
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all cursor-pointer ${
              config.deviceType === 'fullscreen'
                ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Fullscreen
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="btn-nav-test-lab"
            onClick={() => setIsTestLabOpen(true)}
            className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Bug className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">Pen-Test Lab</span>
          </button>

          <button
            id="btn-nav-audit-log"
            onClick={() => setIsAuditOpen(true)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200/90 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors relative"
          >
            <ListFilter className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Security Log</span>
            {securityEvents.length > 0 && (
              <span className="w-4 h-4 bg-emerald-600 text-white font-bold text-[9px] rounded-full flex items-center justify-center font-mono">
                {securityEvents.length > 9 ? '9+' : securityEvents.length}
              </span>
            )}
          </button>

          <button
            id="btn-nav-export-code"
            onClick={() => setIsCodeExportOpen(true)}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <FileCode2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">Android Kotlin Code</span>
          </button>

          <button
            id="btn-nav-admin"
            onClick={() => setIsAdminOpen(true)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>
      </header>

      {/* 
        ========================================================================
        MAIN APPLICATION STAGE (DEVICE EMULATION & KIOSK BROWSER)
        ========================================================================
      */}
      <main id="main-stage-container" className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-3 sm:p-6 bg-slate-100/60 relative">
        {/* Preset Quick Switcher Banner (Desktop) */}
        <div className="w-full max-w-4xl mb-4 bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Profile:
            </span>
            <span className="font-bold text-slate-800">{config.appName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_PROFILES.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setConfig({
                    ...config,
                    targetUrl: p.targetUrl,
                    appName: p.name,
                    appDescription: p.description,
                    profileId: p.id,
                    security: {
                      ...config.security,
                      allowedDomains: [...p.allowedDomains],
                    },
                  });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  config.profileId === p.id
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {p.name.split(' ')[0]} {p.name.split(' ')[1] || ''}
              </button>
            ))}
          </div>
        </div>

        {/* The Android Frame Housing the Secure Browser */}
        <div className="w-full flex-1 flex items-center justify-center py-2">
          <AndroidFrame
            config={config}
            canGoBack={canGoBack}
            onBack={() => setBackTrigger((c) => c + 1)}
            onHome={() => setHomeTrigger((c) => c + 1)}
          >
            <KioskBrowserView
              key={`${config.targetUrl}-${config.profileId}`}
              config={config}
              onOpenAdmin={() => setIsAdminOpen(true)}
              onOpenAudit={() => setIsAuditOpen(true)}
              onOpenTestLab={() => setIsTestLabOpen(true)}
              onSecurityEvent={handleSecurityEvent}
              securityEvents={securityEvents}
              onHistoryUpdate={handleHistoryUpdate}
            />
          </AndroidFrame>
        </div>

        {/* Security Assurance Guarantee Strip */}
        <div className="w-full max-w-4xl mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800">1. URL Not Shown</h4>
              <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                Address bar is strictly removed from the user interface. Only verified target titles and SSL indicators are displayed.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800">2. Zero Advertisements</h4>
              <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                Built-in filter drops ad networks, tracking scripts, pop-up windows, and external analytical beacons automatically.
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800">3. Anti-HTML Injection</h4>
              <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                Strips unapproved scripts, XSS payloads, and javascript: protocols while locking navigation strictly to allowed domains.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* 
        ========================================================================
        MODALS
        ========================================================================
      */}
      <AdminModal
        config={config}
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onSaveConfig={(newConf) => setConfig(newConf)}
        onOpenExportCode={() => setIsCodeExportOpen(true)}
      />

      <SecurityAuditModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        events={securityEvents}
        onClearEvents={handleClearAuditEvents}
      />

      <SecurityTestLab
        config={config}
        isOpen={isTestLabOpen}
        onClose={() => setIsTestLabOpen(false)}
        onSecurityEvent={handleSecurityEvent}
      />

      <AndroidCodeExportModal
        config={config}
        isOpen={isCodeExportOpen}
        onClose={() => setIsCodeExportOpen(false)}
      />
    </div>
  );
}
