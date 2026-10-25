import React, { useState, useEffect } from 'react';
import { StudySession } from '../types';
import { X, Save } from 'lucide-react';

interface EditSessionModalProps {
  session: StudySession | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: StudySession) => void;
  subjectPresets: string[];
}

export const EditSessionModal: React.FC<EditSessionModalProps> = ({
  session,
  isOpen,
  onClose,
  onSave,
  subjectPresets,
}) => {
  if (!isOpen || !session) return null;

  const [subject, setSubject] = useState(session.subject);
  const [notes, setNotes] = useState(session.notes || '');
  const [durationMinutes, setDurationMinutes] = useState(
    Math.round(session.accumulatedActiveMs / 60000)
  );

  useEffect(() => {
    if (session) {
      setSubject(session.subject);
      setNotes(session.notes || '');
      setDurationMinutes(Math.round(session.accumulatedActiveMs / 60000));
    }
  }, [session]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedMs = Math.max(0, durationMinutes * 60000);
    const updated: StudySession = {
      ...session,
      subject: subject.trim() || 'General Study',
      notes: notes.trim(),
      accumulatedActiveMs: updatedMs,
      updatedAt: Date.now(),
    };
    onSave(updated);
    onClose();
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

        <h3 className="text-lg font-bold text-white tracking-wide">Edit Study Session</h3>
        <p className="text-xs text-slate-400 mt-1">
          Adjust session details and metadata safely.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Subject or Label
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              list="subject-presets"
              className="w-full px-3.5 py-2.5 bg-black/50 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40"
              placeholder="e.g. Mathematics, Physics, Chemistry"
              required
            />
            <datalist id="subject-presets">
              {subjectPresets.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Duration (Minutes)
            </label>
            <input
              type="number"
              min="0"
              max="1440"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-black/50 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Calculates to {(durationMinutes / 60).toFixed(2)} hours
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-black/50 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 resize-none"
              placeholder="What topics were covered? Any key formulas or takeaways?"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition-colors shadow-lg shadow-amber-500/20"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
