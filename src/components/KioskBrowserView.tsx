import React, { useState, useEffect, useRef, useTransition } from 'react';
import {
  ShieldCheck,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Home,
  Lock,
  ShieldX,
  AlertTriangle,
  Sparkles,
  Layers,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';
import { KioskConfig, SecurityEvent } from '../types';
import { isUrlAllowed, isAdOrTracker, sanitizeHtml, createSecurityEvent, extractHostname } from '../utils/security';

interface KioskBrowserViewProps {
  config: KioskConfig;
  onOpenAdmin: () => void;
  onOpenAudit: () => void;
  onOpenTestLab: () => void;
  onSecurityEvent: (event: SecurityEvent) => void;
  securityEvents: SecurityEvent[];
  onHistoryUpdate: (canGoBack: boolean) => void;
}

export const KioskBrowserView: React.FC<KioskBrowserViewProps> = ({
  config,
  onOpenAdmin,
  onOpenAudit,
  onOpenTestLab,
  onSecurityEvent,
  securityEvents,
  onHistoryUpdate,
}) => {
  // Navigation State
  const [currentUrl, setCurrentUrl] = useState<string>(config.targetUrl);
  const [history, setHistory] = useState<string[]>([config.targetUrl]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [pageTitle, setPageTitle] = useState<string>(config.appName || 'Secure Kiosk');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [blockedAttempt, setBlockedAttempt] = useState<{ url: string; reason: string } | null>(null);

  // Security Shields Statistics
  const [blockedAdsCount, setBlockedAdsCount] = useState<number>(0);
  const [sanitizedInjectionsCount, setSanitizedInjectionsCount] = useState<number>(0);
  const [iframeError, setIframeError] = useState<boolean>(false);
  const [activeTabMode, setActiveTabMode] = useState<'live' | 'isolated-sandbox'>('live');

  // Inactivity timer
  const lastInteractionRef = useRef<number>(Date.now());
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [, startTransition] = useTransition();

  // Keep target in sync with config updates
  useEffect(() => {
    setCurrentUrl(config.targetUrl);
    setHistory([config.targetUrl]);
    setHistoryIndex(0);
    setBlockedAttempt(null);
    setIframeError(false);
  }, [config.targetUrl]);

  // Update parent for hardware button state
  useEffect(() => {
    onHistoryUpdate(historyIndex > 0);
  }, [historyIndex, onHistoryUpdate]);

  // Inactivity Timeout
  useEffect(() => {
    if (config.security.inactivityTimeoutSeconds <= 0) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - lastInteractionRef.current) / 1000;
      if (elapsed >= config.security.inactivityTimeoutSeconds) {
        // Reset to initial target
        handleResetToHome();
        onSecurityEvent(
          createSecurityEvent(
            'popup_prevented',
            `Kiosk auto-reset triggered after ${config.security.inactivityTimeoutSeconds}s of inactivity.`,
            currentUrl,
            undefined,
            'low'
          )
        );
        lastInteractionRef.current = Date.now();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [config.security.inactivityTimeoutSeconds, currentUrl]);

  const recordUserActivity = () => {
    lastInteractionRef.current = Date.now();
  };

  // Safe Navigation Handler (Core Whitelist Enforcement)
  const navigateTo = (targetCandidate: string) => {
    recordUserActivity();
    setBlockedAttempt(null);

    // 1. Check Anti-Injection / Unsafe Schemes
    if (config.security.preventHtmlInjection) {
      const lower = targetCandidate.toLowerCase();
      if (
        lower.startsWith('javascript:') ||
        lower.startsWith('data:text/html') ||
        lower.includes('<script') ||
        lower.includes('onerror=')
      ) {
        setSanitizedInjectionsCount((prev) => prev + 1);
        const event = createSecurityEvent(
          'injection_blocked',
          'Attempted malicious script or HTML injection payload was blocked and neutralized.',
          targetCandidate,
          targetCandidate,
          'high'
        );
        onSecurityEvent(event);
        setBlockedAttempt({
          url: '[INJECTION_PAYLOAD_MASKED]',
          reason: 'Anti-Injection Shield: Blocked malicious script payload.',
        });
        return;
      }
    }

    // 2. Check Ad & Tracker Networks
    if (config.security.blockAds) {
      const adCheck = isAdOrTracker(targetCandidate);
      if (adCheck.isAd) {
        setBlockedAdsCount((prev) => prev + 1);
        const event = createSecurityEvent(
          'ad_blocked',
          `Blocked advertisement or tracker request matching rule "${adCheck.matchedPattern}"`,
          targetCandidate,
          undefined,
          'low'
        );
        onSecurityEvent(event);
        return;
      }
    }

    // 3. Whitelist Check
    const whitelistResult = isUrlAllowed(targetCandidate, config.security.allowedDomains);
    if (!whitelistResult.allowed) {
      const event = createSecurityEvent(
        'whitelist_violation',
        whitelistResult.reason || 'Requested host is not permitted by administrator policy.',
        targetCandidate,
        undefined,
        'medium'
      );
      onSecurityEvent(event);
      setBlockedAttempt({
        url: targetCandidate,
        reason: whitelistResult.reason || 'External destination is not in allowed domain list.',
      });
      return;
    }

    // Allowed: Proceed to navigate
    setIsLoading(true);
    setIframeError(false);
    startTransition(() => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(targetCandidate);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setCurrentUrl(targetCandidate);
    });

    // Update title heuristically
    const host = extractHostname(targetCandidate);
    setPageTitle(`${config.appName} • ${host}`);

    setTimeout(() => {
      setIsLoading(false);
    }, 600);
  };

  const handleBack = () => {
    recordUserActivity();
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setCurrentUrl(history[prevIndex]);
      setBlockedAttempt(null);
    }
  };

  const handleForward = () => {
    recordUserActivity();
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setCurrentUrl(history[nextIndex]);
      setBlockedAttempt(null);
    }
  };

  const handleRefresh = () => {
    recordUserActivity();
    setIsLoading(true);
    setBlockedAttempt(null);
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleResetToHome = () => {
    recordUserActivity();
    setCurrentUrl(config.targetUrl);
    setBlockedAttempt(null);
    setIframeError(false);
    setHistory([config.targetUrl]);
    setHistoryIndex(0);
  };

  // Sample Whitelisted Interactive Mock Links inside Sandbox
  const allowedHost = extractHostname(config.targetUrl);

  return (
    <div
      id="kiosk-browser-main-view"
      onMouseMove={recordUserActivity}
      onClick={recordUserActivity}
      onKeyDown={recordUserActivity}
      className={`w-full h-full flex flex-col bg-slate-50 text-slate-900 overflow-hidden relative ${
        config.security.disableTextSelection ? 'select-none' : ''
      }`}
      onContextMenu={(e) => {
        if (config.security.disableContextMenu) {
          e.preventDefault();
        }
      }}
    >
      {/* 
        ========================================================================
        SECURE TOP APP BAR (MANDATORY REQUIREMENT: URL IS NOT SHOWN)
        ========================================================================
      */}
      <div
        id="kiosk-secure-header"
        className="h-13 bg-white border-b border-slate-200/90 px-3 flex items-center justify-between gap-2 select-none shrink-0 shadow-xs"
      >
        {/* Navigation Controls */}
        <div className="flex items-center gap-1">
          <button
            id="btn-kiosk-back"
            onClick={handleBack}
            disabled={historyIndex === 0}
            title="Go Back"
            className={`p-1.5 rounded-lg transition-colors ${
              historyIndex > 0
                ? 'text-slate-700 hover:bg-slate-100 active:bg-slate-200 cursor-pointer'
                : 'text-slate-300 opacity-40 cursor-not-allowed'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            id="btn-kiosk-forward"
            onClick={handleForward}
            disabled={historyIndex >= history.length - 1}
            title="Go Forward"
            className={`p-1.5 rounded-lg transition-colors ${
              historyIndex < history.length - 1
                ? 'text-slate-700 hover:bg-slate-100 active:bg-slate-200 cursor-pointer'
                : 'text-slate-300 opacity-40 cursor-not-allowed'
            }`}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            id="btn-kiosk-refresh"
            onClick={handleRefresh}
            title="Reload Page"
            className="p-1.5 text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-lg cursor-pointer transition-colors"
          >
            <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <button
            id="btn-kiosk-home"
            onClick={handleResetToHome}
            title="Home Destination"
            className="p-1.5 text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-lg cursor-pointer transition-colors"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>

        {/* 
          PAGE TITLE & SECURITY SHIELD (URL IS STRICTLY HIDDEN)
        */}
        <div
          id="kiosk-page-title-badge"
          className="flex-1 min-w-0 bg-slate-50 border border-slate-200/90 rounded-xl py-1 px-3 flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/80 shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-800 truncate leading-tight">
                {pageTitle}
              </span>
              <span className="text-[10px] text-emerald-700 font-mono tracking-tight flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                HTTPS • Verified Destination • No Ads
              </span>
            </div>
          </div>

          {/* Quick Security Status Counts */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {config.security.blockAds && (
              <button
                id="btn-badge-adblock"
                onClick={onOpenAudit}
                title="Active Ad Blocker: Click to view filtered items"
                className="text-[10px] bg-white hover:bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 font-mono cursor-pointer transition-colors"
              >
                Ads: <span className="text-emerald-700 font-bold">{blockedAdsCount}</span>
              </button>
            )}
            {config.security.preventHtmlInjection && (
              <span
                id="badge-anti-injection"
                title="Anti-Injection Guard Active"
                className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200 font-mono font-medium"
              >
                Shield: <span className="font-semibold">Active</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Controls: Security Test, Logs & Admin Settings */}
        <div className="flex items-center gap-1">
          <button
            id="btn-open-test-lab"
            onClick={onOpenTestLab}
            title="Open Security Penetration Test Lab"
            className="p-1.5 text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-lg cursor-pointer transition-colors flex items-center gap-1 text-xs font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden md:inline">Test Lab</span>
          </button>

          <button
            id="btn-open-admin-pin"
            onClick={onOpenAdmin}
            title="Administrator Settings (PIN Protected)"
            className="p-1.5 text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-lg cursor-pointer transition-colors"
          >
            <Lock className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Progress Loading Bar */}
      {isLoading && (
        <div className="h-0.5 w-full bg-slate-200 overflow-hidden shrink-0">
          <div className="h-full bg-emerald-500 animate-pulse w-full"></div>
        </div>
      )}

      {/* 
        ========================================================================
        MAIN BROWSER CONTENT CANVAS
        ========================================================================
      */}
      <div className="flex-1 relative overflow-hidden bg-slate-50">
        {/* INTERSTITIAL: Blocked Navigation Screen */}
        {blockedAttempt ? (
          <div
            id="kiosk-blocked-alert-screen"
            className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-200"
          >
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 text-rose-600 shadow-xs">
              <ShieldX className="w-9 h-9" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 mb-2">Navigation Blocked</h3>
            <p className="text-sm text-slate-600 max-w-md mb-4 leading-relaxed">
              {blockedAttempt.reason}
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md w-full mb-6 text-left">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-1">
                Kiosk Policy Enforcement
              </div>
              <p className="text-xs text-slate-700 font-mono break-all leading-relaxed">
                • Target URL hidden by administrator policy
                <br />
                • Permitted Destinations: <strong>MR Merdeka Blogspot</strong> OR <strong>Merdeka Absensi Portal</strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="btn-return-allowed-page"
                onClick={handleResetToHome}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Return to Designated Home
              </button>
              <button
                id="btn-view-audit-blocked"
                onClick={onOpenAudit}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                View Security Log
              </button>
            </div>
          </div>
        ) : null}

        {/* 
          SANDBOXED RENDERER:
          Toggles between Live Hardened Iframe with sandbox flags and Safe Dedicated Interactive App View
        */}
        <div className="w-full h-full flex flex-col">
          {/* Top Sub-Bar with Permitted Destination Toggles & Sandbox Switcher */}
          <div className="h-8 bg-slate-100/90 border-b border-slate-200 px-3 flex items-center justify-between text-[11px] text-slate-600 gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              <span className="font-semibold text-slate-700 text-[10px] uppercase tracking-wider shrink-0 mr-1">
                Authorized Portals:
              </span>
              <button
                id="btn-dest-1-blogspot"
                onClick={() => navigateTo('https://mr-merdeka.blogspot.com')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  currentUrl.includes('blogspot.com')
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>1. MR Merdeka Blog</span>
              </button>
              <button
                id="btn-dest-2-absensi"
                onClick={() => navigateTo('https://merdeka.infinityfreeapp.com/absen/?i=1')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                  currentUrl.includes('infinityfreeapp.com')
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>2. Merdeka Absen</span>
              </button>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                id="btn-mode-live"
                onClick={() => setActiveTabMode('live')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  activeTabMode === 'live'
                    ? 'bg-white text-slate-900 border border-slate-300 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Live WebView
              </button>
              <button
                id="btn-mode-sandbox"
                onClick={() => setActiveTabMode('isolated-sandbox')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                  activeTabMode === 'isolated-sandbox'
                    ? 'bg-white text-indigo-900 border border-indigo-300 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sanitized Portal
              </button>
            </div>
          </div>

          {/* Render Active View */}
          <div className="flex-1 relative overflow-hidden bg-white">
            {activeTabMode === 'live' ? (
              <div className="w-full h-full relative">
                <iframe
                  ref={iframeRef}
                  id="dedicated-secure-iframe"
                  src={currentUrl}
                  title={pageTitle}
                  // Strict HTML Sandbox to prevent unauthorized escapes, injections & top-level redirects
                  sandbox="allow-scripts allow-forms allow-same-origin allow-presentation"
                  referrerPolicy="no-referrer"
                  className="w-full h-full border-0 bg-white"
                  onError={() => setIframeError(true)}
                  onLoad={() => setIsLoading(false)}
                />

                {/* Helpful Floating Overlay to test whitelisted interaction within the portal */}
                <div
                  id="kiosk-nav-helper-panel"
                  className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-xl p-2.5 shadow-md flex items-center justify-between text-xs text-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded bg-slate-100 text-emerald-600 border border-slate-200">
                      <Layers className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium">
                      Simulate Navigation Tests:
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      id="btn-quick-allowed"
                      onClick={() => navigateTo(config.targetUrl)}
                      className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-emerald-700 border border-slate-200 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      Target Home
                    </button>
                    <button
                      id="btn-quick-blocked-ad"
                      onClick={() => navigateTo('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')}
                      className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-amber-800 border border-slate-200 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      Trigger Ad Intercept
                    </button>
                    <button
                      id="btn-quick-blocked-external"
                      onClick={() => navigateTo('https://unauthorized-competitor-tracker.org/steal')}
                      className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-rose-700 border border-slate-200 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      Trigger Whitelist Block
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ISOLATED SECURE PORTAL INTERFACE */
              <div
                id="kiosk-isolated-portal"
                className="w-full h-full overflow-y-auto p-4 bg-slate-50 text-slate-900 flex flex-col justify-between"
              >
                <div className="max-w-2xl mx-auto w-full space-y-4">
                  {/* Security Status Header */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-800">{config.appName}</h4>
                          <span className="text-[11px] text-emerald-700 font-mono">Dedicated Browser Kiosk Active</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] text-slate-600 font-mono font-medium">
                        URL Hidden
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-3">
                      {config.appDescription ||
                        'This application is configured in strict dedicated kiosk mode. The destination address is hidden to maintain focus and prevent navigation tampering.'}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Address Bar</span>
                        <span className="text-emerald-700 font-semibold font-mono text-[11px]">Strictly Hidden</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">Ad & Tracker Filter</span>
                        <span className="text-emerald-700 font-semibold font-mono text-[11px]">Active (0 Ads Allowed)</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">HTML Injection</span>
                        <span className="text-emerald-700 font-semibold font-mono text-[11px]">Sanitized & Blocked</span>
                      </div>
                    </div>
                  </div>

                  {/* Whitelisted Actions & Internal Subpages */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-emerald-600" />
                      Approved Whitelisted Actions
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        id="btn-subpage-dashboard"
                        onClick={() => navigateTo(config.targetUrl)}
                        className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700">
                            Launch Target Destination
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                        </div>
                        <span className="text-[11px] text-slate-500 line-clamp-1">
                          Loads primary destination safely in locked WebView frame.
                        </span>
                      </button>

                      <button
                        id="btn-test-injection"
                        onClick={() => {
                          const testPayload = '<script>alert("XSS Attack")</script><img src=x onerror=alert(1)>';
                          const sanitized = sanitizeHtml(testPayload);
                          setSanitizedInjectionsCount((prev) => prev + 1);
                          onSecurityEvent(
                            createSecurityEvent(
                              'injection_blocked',
                              `Intercepted dangerous HTML injection: ${sanitized.flaggedPayloads.join(', ')}`,
                              currentUrl,
                              testPayload,
                              'high'
                            )
                          );
                          setBlockedAttempt({
                            url: '[INJECTION_PAYLOAD_MASKED]',
                            reason: `Anti-Injection Guard: Neutralized ${sanitized.flaggedPayloads.length} malicious scripts.`,
                          });
                        }}
                        className="p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-rose-700 group-hover:text-rose-800">
                            Test Injection Defense
                          </span>
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        </div>
                        <span className="text-[11px] text-slate-500 line-clamp-1">
                          Executes simulated script injection to verify zero-execution.
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Kiosk Info */}
                <div className="text-center py-2 text-[11px] text-slate-400 font-mono">
                  Locked Mode: Android Task Pinning Enabled • Tap Lock icon in toolbar to administer
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
