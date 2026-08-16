import React, { useState } from 'react';
import { X, Copy, Check, FileCode, Download, Smartphone, Terminal, CheckCircle2 } from 'lucide-react';
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
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);

  if (!isOpen) return null;

  const projectFiles = generateAndroidProjectFiles(config);
  const currentFile = projectFiles[activeFileIndex] || projectFiles[0];

  const handleCopyCurrent = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopiedFile(currentFile.filename);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([currentFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="android-code-export-modal"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-xl flex flex-col text-slate-900 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                Android Native Kotlin Codebase
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                  Ready to Compile
                </span>
              </h3>
              <span className="text-[11px] text-slate-500">
                Production-ready Android Studio code enforcing URL hiding, whitelist, ad-blocking & anti-injection
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* File Tabs Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex gap-1 py-2 overflow-x-auto">
            {projectFiles.map((file, idx) => (
              <button
                key={file.filename}
                onClick={() => setActiveFileIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeFileIndex === idx
                    ? 'bg-white text-emerald-700 border border-slate-200 font-bold shadow-xs'
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
              Download
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

        {/* File Description Header */}
        <div className="bg-slate-100/70 px-5 py-2 border-b border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
          <span className="font-mono text-slate-800 font-medium">📁 {currentFile.filepath}</span>
          <span className="text-slate-500">{currentFile.description}</span>
        </div>

        {/* Code Content View */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-4 font-mono text-xs text-slate-100 selection:bg-emerald-800">
          <pre className="whitespace-pre overflow-x-auto leading-relaxed">{currentFile.content}</pre>
        </div>

        {/* Instructions Footer */}
        <div className="bg-white border-t border-slate-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Create a new <strong>Empty Activity</strong> project in Android Studio and paste these files into your <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">app/src/main</code> directory.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg shrink-0 cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
