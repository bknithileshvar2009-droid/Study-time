import React, { useState } from 'react';
import { useStudy } from '../context/StudyContext';
import { TagBadge } from './TagBadge';
import { getLocalDateString } from '../utils/timeFormat';
import { X, Plus, Calendar, Clock, BookOpen, FileText, Tag as TagIcon, Check } from 'lucide-react';

interface ManualSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualSessionModal: React.FC<ManualSessionModalProps> = ({ isOpen, onClose }) => {
  const { subjects, settings, addManualSession } = useStudy();

  const todayStr = getLocalDateString();
  const [date, setDate] = useState(todayStr);
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [activeHours, setActiveHours] = useState('1');
  const [activeMins, setActiveMins] = useState('30');
  const [pausedMins, setPausedMins] = useState('0');
  const [subject, setSubject] = useState(subjects[0]?.name || settings.defaultSubject);
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const currentSubjectObj = subjects.find((s) => s.name === subject);

  const toggleTag = (t: string) => {
    const clean = t.replace(/^#/, '').toLowerCase().trim();
    if (selectedTags.includes(clean)) {
      setSelectedTags(selectedTags.filter((x) => x !== clean));
    } else {
      setSelectedTags([...selectedTags, clean]);
    }
  };

  const addCustomTag = () => {
    const clean = customTagInput.replace(/^#/, '').toLowerCase().trim();
    if (clean && !selectedTags.includes(clean)) {
      setSelectedTags([...selectedTags, clean]);
      setCustomTagInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalActiveMinutes = (parseInt(activeHours, 10) || 0) * 60 + (parseInt(activeMins, 10) || 0);
    if (totalActiveMinutes <= 0) return;

    setIsSubmitting(true);
    try {
      await addManualSession({
        date,
        startTimeStr,
        activeMinutes: totalActiveMinutes,
        pausedMinutes: parseInt(pausedMins, 10) || 0,
        subject,
        chapter,
        topic,
        notes,
        tags: selectedTags,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0e111a] border border-amber-500/25 rounded-2xl p-6 shadow-2xl text-[#f1f2f6] max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white tracking-wide">Log Manual Study Session</h3>
            <p className="text-xs text-slate-400">Record a study session that occurred offline</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Study Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-black/60 border border-slate-800 rounded-xl text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
                required
                className="w-full px-3 py-2 bg-black/60 border border-slate-800 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Active Hours
              </label>
              <input
                type="number"
                min="0"
                max="24"
                value={activeHours}
                onChange={(e) => setActiveHours(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-slate-800 rounded-xl text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Active Minutes
              </label>
              <input
                type="number"
                min="0"
                max="59"
                value={activeMins}
                onChange={(e) => setActiveMins(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-slate-800 rounded-xl text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Paused Minutes
              </label>
              <input
                type="number"
                min="0"
                max="300"
                value={pausedMins}
                onChange={(e) => setPausedMins(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-slate-800 rounded-xl text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Subject & Chapter */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-black/60 border border-slate-800 rounded-xl text-xs text-white"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Chapter / Unit
              </label>
              <input
                type="text"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="e.g. Thermodynamics"
                list="chapter-options"
                className="w-full px-3 py-2 bg-black/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600"
              />
              <datalist id="chapter-options">
                {currentSubjectObj?.chapters.map((ch) => (
                  <option key={ch.id} value={ch.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Topic Covered
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Carnot Cycle and Entropy Calculations"
              className="w-full px-3 py-2 bg-black/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
              <TagIcon className="w-3.5 h-3.5 text-amber-400" /> Tags
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {settings.tagPresets.map((tag) => {
                const clean = tag.replace(/^#/, '');
                const isSelected = selectedTags.includes(clean);
                return (
                  <button
                    key={clean}
                    type="button"
                    onClick={() => toggleTag(clean)}
                    className={`text-[11px] px-2 py-0.5 rounded-lg border font-mono transition-colors ${
                      isSelected
                        ? 'bg-amber-500/25 text-amber-300 border-amber-500/50 font-semibold'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    #{clean}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTag();
                  }
                }}
                placeholder="+ Add custom tag (e.g. mock-test)"
                className="flex-1 px-3 py-1.5 bg-black/60 border border-slate-800 rounded-lg text-xs font-mono text-white placeholder-slate-600"
              />
              <button
                type="button"
                onClick={addCustomTag}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs"
              >
                Add
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Notes & Reflections
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What went well? Any formulas or revision needed?"
              className="w-full px-3 py-2 bg-black/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Save Manual Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
