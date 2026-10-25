import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { X, Cloud, Lock, Mail, UserCheck, LogOut, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    cloudStatus,
    loginAnonymously,
    loginWithEmail,
    registerWithEmail,
    logoutUser,
    syncWithCloud,
  } = useStudy();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnonLogin = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await loginAnonymously();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to connect anonymously');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0e1017] border border-amber-500/25 rounded-2xl p-6 shadow-2xl text-[#f1f2f6]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">
              {cloudStatus.user ? 'Cloud Sync Status' : 'Connect Cloud Backup'}
            </h3>
            <p className="text-xs text-slate-400">
              Firebase Realtime Database synchronization
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {cloudStatus.user ? (
          <div className="mt-5 space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-sm">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle className="w-4 h-4" /> Connected & Synchronized
              </div>
              <div className="mt-2 text-xs text-slate-300 space-y-1">
                <div>
                  <span className="text-slate-500">Account: </span>
                  {cloudStatus.user.isAnonymous
                    ? '1-Click Anonymous Student'
                    : cloudStatus.user.email}
                </div>
                <div className="font-mono text-slate-500 text-[11px] truncate">
                  UID: {cloudStatus.user.uid}
                </div>
                <div>
                  <span className="text-slate-500">Last Synced: </span>
                  {cloudStatus.lastSyncedAt
                    ? new Date(cloudStatus.lastSyncedAt).toLocaleTimeString()
                    : 'Just now'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => syncWithCloud()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-colors shadow-lg shadow-amber-500/20"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Sync Now
              </button>
              <button
                onClick={() => {
                  logoutUser();
                  onClose();
                }}
                className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Your sessions are saved permanently in browser IndexedDB. Connect to Firebase Realtime Database to back up your study sessions to the cloud and access them across devices.
            </p>

            {/* Quick 1-click anonymous sync */}
            <button
              onClick={handleAnonLogin}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-amber-500/30 transition-colors shadow-sm"
            >
              <UserCheck className="w-4 h-4 text-amber-400" />
              1-Click Instant Cloud Connect (No password needed)
            </button>

            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-slate-800 w-full"></div>
              <span className="bg-[#0e1017] px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold absolute">
                Or Sign In with Email
              </span>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="student@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-black/50 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-black/50 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-xs text-amber-400/90 hover:text-amber-300 underline"
                >
                  {mode === 'signin'
                    ? "Don't have an account? Sign up"
                    : 'Already registered? Sign in'}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition-colors shadow-lg shadow-amber-500/20"
                >
                  {isSubmitting
                    ? 'Connecting...'
                    : mode === 'signin'
                    ? 'Sign In'
                    : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
