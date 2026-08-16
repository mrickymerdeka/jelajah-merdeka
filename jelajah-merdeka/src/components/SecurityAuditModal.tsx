import React, { useState } from 'react';
import { X, ShieldAlert, Trash2, Download, Filter, CheckCircle } from 'lucide-react';
import { SecurityEvent } from '../types';

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: SecurityEvent[];
  onClearEvents: () => void;
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({
  isOpen,
  onClose,
  events,
  onClearEvents,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  if (!isOpen) return null;

  const filteredEvents = events.filter((e) => {
    if (filterSeverity === 'all') return true;
    return e.severity === filterSeverity;
  });

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(events, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `security-audit-log-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      id="security-audit-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-xl flex flex-col text-slate-900 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="h-14 bg-white border-b border-slate-200 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Live Security Intercept Audit Log</h3>
              <span className="text-[11px] text-slate-500">
                {events.length} total events intercepted by browser protection engine
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

        {/* Toolbar Filter */}
        <div className="h-12 bg-slate-50/80 border-b border-slate-200 px-5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600 font-medium">Filter Severity:</span>
            {(['all', 'high', 'medium', 'low'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-0.5 rounded-lg capitalize transition-colors cursor-pointer text-xs ${
                  filterSeverity === sev
                    ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              disabled={events.length === 0}
              className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Download className="w-3 h-3 text-slate-500" />
              Export JSON
            </button>
            <button
              onClick={onClearEvents}
              disabled={events.length === 0}
              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-40 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3 h-3 text-rose-600" />
              Clear
            </button>
          </div>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold text-slate-700">No Security Violations Intercepted</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Your browser is enforcing zero ads, zero HTML injections, and strict whitelist navigation.
              </p>
            </div>
          ) : (
            filteredEvents.map((evt) => {
              let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
              if (evt.severity === 'high') {
                badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
              } else if (evt.severity === 'medium') {
                badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
              } else if (evt.severity === 'low') {
                badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
              }

              return (
                <div
                  key={evt.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs flex flex-col gap-1.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold border ${badgeColor}`}>
                        {evt.type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">
                      Severity: <strong className="text-slate-800">{evt.severity}</strong>
                    </span>
                  </div>

                  <p className="text-slate-800 leading-relaxed font-medium">{evt.details}</p>

                  {evt.sourceUrl && (
                    <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 truncate">
                      <span className="text-slate-400 font-medium">Source: </span>
                      {evt.sourceUrl}
                    </div>
                  )}

                  {evt.blockedContent && (
                    <div className="text-[10px] font-mono text-rose-800 bg-rose-50 p-2 rounded border border-rose-200 overflow-x-auto whitespace-pre-wrap break-all max-h-20">
                      <span className="text-rose-700 font-bold block mb-0.5">Blocked Payload Snippet:</span>
                      {evt.blockedContent}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="h-12 bg-white border-t border-slate-200 px-5 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
          >
            Close Audit Log
          </button>
        </div>
      </div>
    </div>
  );
};
