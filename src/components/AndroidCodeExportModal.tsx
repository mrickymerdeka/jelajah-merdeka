import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  FileCode,
  Download,
  Smartphone,
  Terminal,
  CheckCircle2,
  CloudLightning,
  Sparkles,
  ExternalLink,
  Github,
  Zap,
  FolderArchive,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import JSZip from 'jszip';
import { KioskConfig } from '../types';
import { generateAndroidProjectFiles } from '../utils/androidCodeGenerator';

interface AndroidCodeExportModalProps {
  config: KioskConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidCodeExportModal: React.FC<AndroidCodeExportModalProps> = ({
  config,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'cloud-apk' | 'files'>('cloud-apk');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  if (!isOpen) return null;

  const projectFiles = generateAndroidProjectFiles(config);
  const currentFile = projectFiles[activeFileIndex] || projectFiles[0];

  const handleCopyCurrent = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopiedFile(currentFile.filename);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([currentFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.filename.includes('/')
      ? currentFile.filename.split('/').pop() || currentFile.filename
      : currentFile.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();

      // Add all project files into the zip preserving directory paths
      projectFiles.forEach((file) => {
        zip.file(file.filepath, file.content);
      });

      // Add a handy README.md
      zip.file(
        'README.md',
        `# ${config.appName} - Dedicated Kiosk Browser Android Project

This project compiles a secure, hardened Android APK restricted strictly to:
${config.targetUrl}

## Cloud Compilation (No Android Studio required)
1. Push this folder to a GitHub repository.
2. Go to the "Actions" tab in your GitHub repository.
3. The included workflow (.github/workflows/build-apk.yml) will automatically build your APK and let you download it.

## Local Compilation
Open this directory in Android Studio and click Build -> Build Bundle(s) / APK(s) -> Build APK(s).
`
      );

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kiosk-browser-${config.profileId || 'android'}-project.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create ZIP', err);
    } finally {
      setIsZipping(false);
    }
  };

  const currentHostUrl = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-ba3stdgj7p2rygtzpbbm4q-161750721863.asia-southeast1.run.app';

  return (
    <div
      id="android-code-export-modal"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[94vh] shadow-2xl flex flex-col text-slate-900 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="h-16 bg-white border-b border-slate-200 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                Native Android APK & Code Generator
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  No Android Studio Needed
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Generate standalone APK files directly in the cloud or download the complete source code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 flex items-center justify-between shrink-0">
          <div className="flex gap-2 py-2">
            <button
              onClick={() => setActiveTab('cloud-apk')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'cloud-apk'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              1-Click Cloud APK Builders (Zero Setup)
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'files'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              Source Code & GitHub Action
            </button>
          </div>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
          >
            <FolderArchive className="w-3.5 h-3.5 text-emerald-600" />
            {isZipping ? 'Zipping...' : 'Download Project ZIP'}
          </button>
        </div>

        {/* TAB 1: CLOUD APK BUILDERS (NO ANDROID STUDIO) */}
        {activeTab === 'cloud-apk' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
            {/* Method 1: Instant PWA Native WebAPK */}
            <div className="bg-white border border-emerald-200/90 rounded-xl p-4.5 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/80 border border-emerald-300 flex items-center justify-center text-emerald-700 font-bold shrink-0 text-sm">
                  1
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      Instant Standalone App (WebAPK directly on Android)
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                        Fastest • 0 Software Required
                      </span>
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Android natively compiles Progressive Web Apps into a real system <strong>WebAPK</strong> that installs into your App Drawer. It runs in full-screen standalone mode with <strong>zero URL bar</strong>, zero browser tabs, and its own dedicated app icon.
                  </p>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                    <div className="font-semibold text-slate-800">How to install on Android in 10 seconds:</div>
                    <ol className="list-decimal list-inside space-y-1 text-slate-600">
                      <li>Open this URL on your Android device:</li>
                      <div className="flex items-center gap-2 mt-1 mb-1">
                        <code className="bg-white px-2.5 py-1 rounded border border-slate-200 text-[11px] font-mono text-emerald-700 font-medium truncate flex-1">
                          {currentHostUrl}
                        </code>
                        <button
                          onClick={() => handleCopyUrl(currentHostUrl)}
                          className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded text-[11px] font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          {copiedUrl ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          {copiedUrl ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <li>Tap the browser menu (<strong>⋮</strong> in Chrome or Samsung Internet).</li>
                      <li>Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.</li>
                      <li>Android will automatically register and launch it as a dedicated, standalone application.</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Method 2: Microsoft PWABuilder Cloud APK Generator */}
            <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100/80 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold shrink-0 text-sm">
                  2
                </div>
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      Microsoft PWABuilder (Generates Real .APK File in the Cloud)
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                        Official Microsoft Tool
                      </span>
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    PWABuilder by Microsoft packages web apps into official native signed Android APKs/AABs via cloud servers in 60 seconds without installing anything on your PC.
                  </p>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 text-xs">
                    <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                      <li>
                        Go to{' '}
                        <a
                          href="https://www.pwabuilder.com"
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 font-semibold underline inline-flex items-center gap-0.5"
                        >
                          PWABuilder.com <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                      <li>Paste your portal URL (<code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-800">{currentHostUrl}</code>) and click <strong>Start</strong>.</li>
                      <li>Click <strong>&quot;Package for Android&quot;</strong> and select <strong>&quot;Generate APK&quot;</strong>.</li>
                      <li>Download the compiled <code className="text-indigo-700 font-mono font-semibold">.apk</code> file and transfer it to your Android device to install!</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Method 3: GitHub Actions Automated Cloud Build */}
            <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold shrink-0 text-sm">
                  <Github className="w-4 h-4" />
                </div>
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      Free GitHub Actions Cloud Compiler (Pure Kotlin / Android SDK)
                      <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                        Automated CI/CD
                      </span>
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    We included an automated <code className="text-emerald-700 font-mono">.github/workflows/build-apk.yml</code> workflow. When you upload this project to a free GitHub repository, GitHub compiles the native APK in its cloud Linux runner and attaches the downloadable APK file under the <strong>Actions</strong> tab.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleDownloadZip}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Project ZIP for GitHub
                    </button>
                    <button
                      onClick={() => setActiveTab('files')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      View build-apk.yml Code
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CODEBASE & GRADLE FILES */}
        {activeTab === 'files' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* File List Horizontal Bar */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between gap-2 overflow-x-auto text-xs shrink-0">
              <div className="flex gap-1 py-2 overflow-x-auto">
                {projectFiles.map((file, idx) => (
                  <button
                    key={file.filename}
                    onClick={() => setActiveFileIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      activeFileIndex === idx
                        ? 'bg-white text-emerald-700 border border-slate-300 font-bold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    {file.filename}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 shrink-0 py-2">
                <button
                  onClick={handleDownloadSingle}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  Download File
                </button>
                <button
                  id="btn-copy-code"
                  onClick={handleCopyCurrent}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                >
                  {copiedFile === currentFile.filename ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* File Path Header */}
            <div className="bg-slate-100 px-5 py-2 border-b border-slate-200 text-[11px] text-slate-600 flex items-center justify-between shrink-0">
              <span className="font-mono text-slate-800 font-semibold">📁 {currentFile.filepath}</span>
              <span className="text-slate-500 hidden sm:inline">{currentFile.description}</span>
            </div>

            {/* Code Content View */}
            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 font-mono text-xs text-slate-100 selection:bg-emerald-800">
              <pre className="whitespace-pre overflow-x-auto leading-relaxed">{currentFile.content}</pre>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 p-3.5 px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Configured target URL: <strong className="text-slate-800">{config.targetUrl}</strong> (Hidden address bar + whitelist locked)
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
