export interface SecurityPolicy {
  allowedDomains: string[];
  blockAds: boolean;
  blockTrackers: boolean;
  preventHtmlInjection: boolean;
  preventScriptExecutionInUntrusted: boolean;
  disableContextMenu: boolean;
  disableTextSelection: boolean;
  disablePopups: boolean;
  clearSessionOnReset: boolean;
  hideUrlBar: boolean;
  inactivityTimeoutSeconds: number; // 0 = disabled
  customCssInjectionBlock: boolean;
}

export interface KioskConfig {
  targetUrl: string;
  appName: string;
  appDescription: string;
  adminPin: string;
  deviceType: 'pixel8' | 'tablet' | 'fullscreen';
  orientation: 'portrait' | 'landscape';
  kioskLocked: boolean;
  profileId: string;
  security: SecurityPolicy;
}

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: 'ad_blocked' | 'injection_blocked' | 'whitelist_violation' | 'unsafe_protocol_blocked' | 'popup_prevented';
  details: string;
  sourceUrl?: string;
  blockedContent?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface PresetProfile {
  id: string;
  name: string;
  description: string;
  icon: string;
  targetUrl: string;
  allowedDomains: string[];
  category: 'Enterprise' | 'Education' | 'Healthcare' | 'Retail' | 'Custom';
}

export interface AndroidExportFile {
  filename: string;
  filepath: string;
  language: 'kotlin' | 'xml' | 'groovy' | 'gradle' | 'yaml' | 'json' | 'markdown' | 'text';
  content: string;
  description: string;
}
