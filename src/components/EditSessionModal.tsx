import React, { useState, useEffect } from 'react';
import { StudySession } from '../types';
import { TagBadge } from './TagBadge';
import { X, Save, Plus, Tag as TagIcon } from 'lucide-react';

interface EditSessionModalProps {
  session: StudySession | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: StudySession) => void;
  subjectPresets: string[];
  tagPresets?: string[];
}

export const EditSessionModal: React.FC<EditSessionModalProps> = ({
  session,
  isOpen,
  onClose,
  onSave,
  subjectPresets,
  tagPresets = ['urgent', 'review', 'exam-prep', 'deep-work', 'assignment', 'revision'],
}) => {
  if (!isOpen || !session) return null;

  const [subject, setSubject] = useState(session.subject);
  const [notes, setNotes] = useState(session.notes || '');
  const [tags, setTags] = useState<string[]>(session.tags || []);
  const [newTagInput, setNewTagInput] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(
    Math.round(session.accumulatedActiveMs / 60000)
  );

  useEffect(() => {
    if (session) {
      setSubject(session.subject);
      setNotes(session.notes || '');
      setTags(session.tags || []);
      setDurationMinutes(Math.round(session.accumulatedActiveMs / 60000));
    }
  }, [session]);

  const togglePresetTag = (tag: string) => {
    const clean = tag.replace(/^#/, '').toLowerCase().trim();
    if (tags.includes(clean)) {
      setTags(tags.filter((t) => t !== clean));
    } else {
      setTags([...tags, clean]);
    }
  };

  const handleAddCustomTag = () => {
    const clean = newTagInput.replace(/^#/, '').toLowerCase().trim();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedMs = Math.max(0, durationMinutes * 60000);
    const updated: StudySession = {
      ...session,
      subject: subject.trim() || 'General Study',
      notes: notes.trim(),
      tags,
      accumulatedActiveMs: updatedMs,
      updatedAt: Date.now(),
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e1017] border border-amber-500/25 rounded-2xl p-6 shadow-2xl text-[#f1f2f6] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-white tracking-wide">Edit Study Session</h3>
        <p className="text-xs text-slate-400 mt-1">
          Adjust session label, duration, #tags, and notes.
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
              list="subject-presets-edit"
              className="w-full px-3.5 py-2.5 bg-black/50 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40"
              placeholder="e.g. Mathematics, Physics, Chemistry"
              required
            />
            <datalist id="subject-presets-edit">
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

          {/* Tags Management */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Session Tags (e.g. #urgent, #review, #exam-prep)
            </label>

            {/* Active Tags */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((t) => (
                <TagBadge key={t} tag={t} onRemove={() => handleRemoveTag(t)} size="sm" />
              ))}
              {tags.length === 0 && (
                <span className="text-xs text-slate-500 italic">No tags assigned.</span>
              )}
            </div>

            {/* Preset Toggle Pills */}
            <div className="flex flex-wrap gap-1 mb-2">
              {tagPresets.map((preset) => {
                const clean = preset.replace(/^#/, '');
                const isSelected = tags.includes(clean);
                return (
                  <button
                    key={clean}
                    type="button"
                    onClick={() => togglePresetTag(clean)}
                    className={`text-[11px] px-2 py-0.5 rounded border font-mono transition-colors ${
                      isSelected
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    #{clean}
                  </button>
                );
              })}
            </div>

            {/* Add Custom Tag */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                placeholder="Add custom tag (e.g. homework)..."
                className="flex-1 px-3 py-1.5 bg-black/50 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/60"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-amber-300 rounded-xl border border-slate-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
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
