import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Activity, 
  Database, 
  User as UserIcon,
  RefreshCw,
  Terminal,
  Lock
} from 'lucide-react';
import { autoFirebaseService } from '../services/firebase';

export const FirebaseDiagnostics: React.FC = () => {
  const { 
    cloudStatus, 
    runDiagnostics, 
    cloudSaveStatus,
    showToast 
  } = useStudy();

  const [diagResult, setDiagResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const config = autoFirebaseService.getRawConfig();

  const handleRunDiagnostics = async () => {
    setIsRunning(true);
    try {
      const result = await runDiagnostics();
      setDiagResult(result);
      if (result.writeSuccess && result.readSuccess && result.match) {
        showToast('Firebase Diagnostics: SUCCESS');
      } else {
        showToast('Firebase Diagnostics: FAILED');
      }
    } catch (err) {
      console.error(err);
      setDiagResult({ error: String(err) });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-[#0c0e15] border border-amber-500/20 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Firebase Persistence Diagnostics
            </h3>
            <p className="text-xs text-slate-400">
              Technical audit of your cloud connection and write/read capability.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunDiagnostics}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Terminal className="w-4 h-4" />}
          Run Connection Test
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Connection & Auth Card */}
        <div className="p-4 rounded-xl bg-black/40 border border-slate-800/80 space-y-3">
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 flex items-center gap-2">
            <Database className="w-3 h-3" /> System Status
          </h4>
          
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Initialization</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Auth Status</span>
              <span className={`font-semibold ${cloudStatus.userId ? 'text-emerald-400' : 'text-amber-400'}`}>
                {cloudStatus.isAnonymous ? 'Anonymous' : (cloudStatus.userId ? 'Authenticated' : 'Not Signed In')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Current UID</span>
              <span className="font-mono text-[10px] text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded">
                {cloudStatus.userId || 'none'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Cloud Save State</span>
              <span className={`font-bold uppercase text-[10px] ${
                cloudSaveStatus === 'success' ? 'text-emerald-400' : 
                cloudSaveStatus === 'error' ? 'text-rose-400' : 
                cloudSaveStatus === 'saving' ? 'text-amber-400 animate-pulse' : 'text-slate-500'
              }`}>
                {cloudSaveStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Database Path Audit */}
        <div className="md:col-span-2 p-4 rounded-xl bg-black/40 border border-slate-800/80 space-y-3">
          <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 flex items-center gap-2">
            <Lock className="w-3 h-3" /> Database Reference Paths
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 uppercase font-bold">Standard Sync Path (Target)</span>
              <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-amber-500/90 break-all border border-slate-800">
                users/{cloudStatus.userId || '{uid}'}/studySessions/
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[9px] text-slate-500 uppercase font-bold">Diagnostics Test Path</span>
              <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-slate-400 break-all border border-slate-800">
                users/{cloudStatus.userId || '{uid}'}/diagnostics/
              </div>
            </div>
          </div>
          
          <p className="text-[10px] text-slate-500 italic mt-2">
            Current system ensures both Laptop and Mobile target the same path when signed into UID: <strong>{cloudStatus.userId || 'Guest'}</strong>.
          </p>
        </div>
      </div>

      {/* Result Section */}
      {diagResult && (
        <div className={`p-4 rounded-xl border animate-in slide-in-from-top-2 duration-300 ${
          diagResult.writeSuccess && diagResult.readSuccess && diagResult.match
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-rose-500/5 border-rose-500/20'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-1.5 rounded-full ${
              diagResult.writeSuccess && diagResult.readSuccess && diagResult.match
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}>
              {diagResult.writeSuccess && diagResult.readSuccess && diagResult.match
                ? <CheckCircle2 className="w-4 h-4" />
                : <ShieldAlert className="w-4 h-4" />
              }
            </div>
            
            <div className="flex-1 space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                Test Result: {diagResult.writeSuccess && diagResult.readSuccess && diagResult.match ? 'SUCCESS' : 'FAILED'}
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                <div className="flex flex-col">
                  <span className="text-slate-500">Write Stage</span>
                  <span className={diagResult.writeSuccess ? 'text-emerald-400' : 'text-rose-400'}>
                    {diagResult.writeSuccess ? 'Confirmed' : 'Failed'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500">Read Stage</span>
                  <span className={diagResult.readSuccess ? 'text-emerald-400' : 'text-rose-400'}>
                    {diagResult.readSuccess ? 'Confirmed' : 'Failed'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-500">Data Integrity</span>
                  <span className={diagResult.match ? 'text-emerald-400' : 'text-rose-400'}>
                    {diagResult.match ? 'Verified Match' : 'Mismatch'}
                  </span>
                </div>
              </div>

              {diagResult.error && (
                <div className="mt-2 p-2 rounded bg-black/60 border border-rose-500/20 text-[10px] text-rose-300 font-mono overflow-auto max-h-24">
                  ERROR: {diagResult.error}
                </div>
              )}

              {diagResult.writtenValue && (
                <div className="text-[9px] text-slate-500 font-mono mt-1 italic">
                  Path tested: users/{diagResult.uid}/diagnostics/diag_...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
