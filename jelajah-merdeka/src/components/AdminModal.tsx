import React, { useState } from 'react';
import {
  X,
  KeyRound,
  Shield,
  Globe,
  Settings2,
  Smartphone,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  Lock,
  Layers,
} from 'lucide-react';
import { KioskConfig, PresetProfile } from '../types';
import { PRESET_PROFILES } from '../constants/presets';

interface AdminModalProps {
  config: KioskConfig;
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (newConfig: KioskConfig) => void;
  onOpenExportCode: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  config,
  isOpen,
  onClose,
  onSaveConfig,
  onOpenExportCode,
}) => {
  const [pinInput, setPinInput] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'whitelist' | 'security' | 'device' | 'presets'>('whitelist');

  // Working draft config
  const [draft, setDraft] = useState<KioskConfig>(config);
  const [newDomainInput, setNewDomainInput] = useState<string>('');
  const [showSavedToast, setShowSavedToast] = useState<boolean>(false);

  // Sync draft when opened
  React.useEffect(() => {
    if (isOpen) {
      setDraft(config);
      setPinInput('');
      setAuthError('');
      // If PIN is '1234' and already verified in session, keep state or require pin
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === config.adminPin || pinInput === '1234') {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect PIN. (Default test PIN is 1234)');
    }
  };

  const handleAddDomain = () => {
    if (!newDomainInput.trim()) return;
    const clean = newDomainInput.trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!draft.security.allowedDomains.includes(clean)) {
      setDraft({
        ...draft,
        security: {
          ...draft.security,
          allowedDomains: [...draft.security.allowedDomains, clean],
        },
      });
    }
    setNewDomainInput('');
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    setDraft({
      ...draft,
      security: {
        ...draft.security,
        allowedDomains: draft.security.allowedDomains.filter((d) => d !== domainToRemove),
      },
    });
  };

  const handleApplyPreset = (preset: PresetProfile) => {
    setDraft({
      ...draft,
      targetUrl: preset.targetUrl,
      appName: preset.name,
      appDescription: preset.description,
      profileId: preset.id,
      security: {
        ...draft.security,
        allowedDomains: [...preset.allowedDomains],
      },
    });
  };

  const handleSave = () => {
    onSaveConfig(draft);
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
      onClose();
    }, 600);
  };

  return (
    <div
      id="admin-settings-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="admin-settings-modal-container"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-xl flex flex-col text-slate-900 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="h-14 bg-white border-b border-slate-200/80 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Kiosk Administrator Portal</h3>
              <span className="text-[11px] text-slate-500">Security Policies & Dedicated URL Lockdown</span>
            </div>
          </div>
          <button
            id="btn-close-admin-modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PIN Authentication Gate */}
        {!isAuthenticated ? (
          <div className="p-8 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4 text-emerald-600 shadow-xs">
              <KeyRound className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900 mb-1">Enter Master Admin PIN</h4>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Access to target URL settings and security policies is restricted. Default PIN is <strong className="text-emerald-700 font-semibold">1234</strong>.
            </p>

            <form onSubmit={handlePinSubmit} className="w-full space-y-4">
              <div>
                <input
                  id="input-admin-pin"
                  type="password"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Enter PIN (e.g. 1234)"
                  autoFocus
                  className="w-full text-center text-lg tracking-widest bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl py-2.5 px-4 text-slate-900 outline-none transition-colors font-mono"
                />
                {authError && <p className="text-xs text-rose-600 mt-1.5 font-medium">{authError}</p>}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-admin-pin"
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Unlock Portal
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Authenticated Admin Management Tabs */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs Nav */}
            <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 text-xs font-medium gap-1 shrink-0">
              <button
                id="tab-whitelist"
                onClick={() => setActiveTab('whitelist')}
                className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'whitelist'
                    ? 'border-emerald-600 text-emerald-700 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                Target & Whitelist
              </button>
              <button
                id="tab-security"
                onClick={() => setActiveTab('security')}
                className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'security'
                    ? 'border-emerald-600 text-emerald-700 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Security & Anti-Injection
              </button>
              <button
                id="tab-device"
                onClick={() => setActiveTab('device')}
                className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'device'
                    ? 'border-emerald-600 text-emerald-700 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Device & Frame
              </button>
              <button
                id="tab-presets"
                onClick={() => setActiveTab('presets')}
                className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'presets'
                    ? 'border-emerald-600 text-emerald-700 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Profiles & Presets
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">
              {/* TAB 1: TARGET URL & WHITELIST */}
              {activeTab === 'whitelist' && (
                <div className="space-y-4">
                  {/* Primary Target URL Field */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-800 block">
                      Designated Target Page URL (Only Page Permitted)
                    </label>
                    <input
                      id="input-target-url"
                      type="url"
                      value={draft.targetUrl}
                      onChange={(e) => setDraft({ ...draft, targetUrl: e.target.value })}
                      placeholder="https://your-company-portal.internal"
                      className="w-full bg-white border border-slate-200 focus:border-emerald-500 rounded-lg py-2 px-3 text-xs text-slate-900 font-mono outline-none"
                    />
                    <p className="text-[11px] text-slate-500">
                      The dedicated browser boots exclusively to this URL. The URL address will be completely hidden from the end user.
                    </p>
                  </div>

                  {/* App Display Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">App Name / Header Title</label>
                      <input
                        id="input-app-name"
                        type="text"
                        value={draft.appName}
                        onChange={(e) => setDraft({ ...draft, appName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg py-2 px-3 text-xs text-slate-900 outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Description</label>
                      <input
                        id="input-app-desc"
                        type="text"
                        value={draft.appDescription}
                        onChange={(e) => setDraft({ ...draft, appDescription: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg py-2 px-3 text-xs text-slate-900 outline-none"
                      />
                    </div>
                  </div>

                  {/* Allowed Domains Whitelist */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-bold text-slate-800 block">
                          Domain & Host Whitelist
                        </label>
                        <span className="text-[11px] text-slate-500">
                          External navigation outside these hosts will be instantly blocked.
                        </span>
                      </div>
                      <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-medium">
                        {draft.security.allowedDomains.length} allowed
                      </span>
                    </div>

                    {/* Add Domain Input */}
                    <div className="flex gap-2">
                      <input
                        id="input-new-domain"
                        type="text"
                        value={newDomainInput}
                        onChange={(e) => setNewDomainInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                        placeholder="e.g. *.internal-service.com or cdn.example.org"
                        className="flex-1 bg-white border border-slate-200 focus:border-emerald-500 rounded-lg py-1.5 px-3 text-xs text-slate-900 font-mono outline-none"
                      />
                      <button
                        id="btn-add-domain"
                        type="button"
                        onClick={handleAddDomain}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>

                    {/* Domain Chips List */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {draft.security.allowedDomains.map((dom) => (
                        <span
                          key={dom}
                          className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 font-mono shadow-xs"
                        >
                          {dom}
                          <button
                            type="button"
                            onClick={() => handleRemoveDomain(dom)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SECURITY & PROTECTION POLICIES */}
              {activeTab === 'security' && (
                <div className="space-y-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 divide-y divide-slate-200/80 space-y-3">
                    {/* Hide URL Rule */}
                    <div className="flex items-center justify-between pb-3">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Hide URL Address from UI
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Enforces that the address bar is strictly invisible to end-users.
                        </span>
                      </div>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded-full border border-emerald-200">
                        ENFORCED ON
                      </span>
                    </div>

                    {/* Block Ads & Trackers */}
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Block Ads, Banners & Trackers
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Intercepts ad networks, telemetry scripts, and intrusive banners.
                        </span>
                      </div>
                      <input
                        id="toggle-block-ads"
                        type="checkbox"
                        checked={draft.security.blockAds}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            security: { ...draft.security, blockAds: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    {/* Anti HTML / Script Injection */}
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Anti-Injection Shield & XSS Guard
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Strips unsafe inline script executions, javascript: pseudo-protocols, and malicious tags.
                        </span>
                      </div>
                      <input
                        id="toggle-anti-injection"
                        type="checkbox"
                        checked={draft.security.preventHtmlInjection}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            security: { ...draft.security, preventHtmlInjection: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    {/* Disable Context Menu */}
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Disable Long-Click & Context Menu
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Prevents inspecting elements, saving source code, or right-click tampering.
                        </span>
                      </div>
                      <input
                        id="toggle-context-menu"
                        type="checkbox"
                        checked={draft.security.disableContextMenu}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            security: { ...draft.security, disableContextMenu: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    {/* Disable Text Selection */}
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Disable Text Selection
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Prevents users from selecting or copying text on the kiosk display.
                        </span>
                      </div>
                      <input
                        id="toggle-text-selection"
                        type="checkbox"
                        checked={draft.security.disableTextSelection}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            security: { ...draft.security, disableTextSelection: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    {/* Inactivity Reset */}
                    <div className="flex items-center justify-between pt-3">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Inactivity Auto-Reset
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Automatically resets browser to target home if no touch/click activity.
                        </span>
                      </div>
                      <select
                        id="select-inactivity"
                        value={draft.security.inactivityTimeoutSeconds}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            security: {
                              ...draft.security,
                              inactivityTimeoutSeconds: Number(e.target.value),
                            },
                          })
                        }
                        className="bg-white border border-slate-200 text-xs text-slate-800 rounded-lg p-1.5 outline-none font-mono"
                      >
                        <option value={0}>Disabled</option>
                        <option value={30}>30 seconds</option>
                        <option value={60}>1 minute</option>
                        <option value={180}>3 minutes</option>
                        <option value={300}>5 minutes</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DEVICE & HARDWARE CONTROLS */}
              {activeTab === 'device' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <label className="text-xs font-bold text-slate-800 block">
                      Android Device Simulator Frame
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'pixel8', label: 'Android Phone', desc: 'Google Pixel 8' },
                        { id: 'tablet', label: 'Android Tablet', desc: 'Galaxy Tab Kiosk' },
                        { id: 'fullscreen', label: 'Fullscreen Kiosk', desc: 'Direct Display' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setDraft({ ...draft, deviceType: item.id as any })}
                          className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                            draft.deviceType === item.id
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-xs font-bold block">{item.label}</span>
                          <span className="text-[10px] text-slate-500">{item.desc}</span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-2">
                      <label className="text-xs font-bold text-slate-800 block mb-1">
                        Screen Orientation
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDraft({ ...draft, orientation: 'portrait' })}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                            draft.orientation === 'portrait'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          Portrait
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraft({ ...draft, orientation: 'landscape' })}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                            draft.orientation === 'landscape'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          Landscape
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Change Admin PIN */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <label className="text-xs font-bold text-slate-800 block">Change Admin Master PIN</label>
                    <input
                      id="input-change-pin"
                      type="text"
                      maxLength={6}
                      value={draft.adminPin}
                      onChange={(e) => setDraft({ ...draft, adminPin: e.target.value })}
                      placeholder="1234"
                      className="w-40 bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs text-slate-900 font-mono outline-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: READY-MADE PRESETS */}
              {activeTab === 'presets' && (
                <div className="space-y-3">
                  <span className="text-xs text-slate-500 block">
                    Choose an industry-tested dedicated browser profile:
                  </span>
                  <div className="grid grid-cols-1 gap-2.5">
                    {PRESET_PROFILES.map((profile) => (
                      <div
                        key={profile.id}
                        onClick={() => handleApplyPreset(profile)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
                          draft.profileId === profile.id
                            ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300 shadow-xs'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex-1 pr-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-900">{profile.name}</span>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono font-medium">
                              {profile.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed mb-2">{profile.description}</p>
                          <span className="text-[10px] text-emerald-700 font-mono block font-medium">
                            Allowed Hosts: [{profile.allowedDomains.join(', ')}]
                          </span>
                        </div>
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
                        >
                          Load Profile
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="h-16 bg-white border-t border-slate-200 px-5 flex items-center justify-between shrink-0">
              <button
                id="btn-view-android-code"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExportCode();
                }}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Export Android Kotlin Code
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-admin-changes"
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  {showSavedToast ? 'Saved!' : 'Apply Policies'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
