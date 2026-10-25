import React, { useState, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import { DailyReview } from '../types';
import { getLocalDateString, formatDurationHuman } from '../utils/timeFormat';
import {
  FileEdit,
  Star,
  Calendar,
  Save,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

export const DailyReviewView: React.FC = () => {
  const {
    dailyReviews,
    saveDailyReview,
    deleteDailyReview,
    sessions,
    stats,
    showToast,
  } = useStudy();

  const todayStr = getLocalDateString();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Existing review for selected date if any
  const existingReview = useMemo(() => {
    return dailyReviews.find((r) => r.date === selectedDate);
  }, [dailyReviews, selectedDate]);

  // Form states
  const [rating, setRating] = useState<number>(existingReview?.rating || 5);
  const [reflection, setReflection] = useState<string>(existingReview?.reflection || '');
  const [difficultInput, setDifficultInput] = useState<string>('');
  const [difficultTopics, setDifficultTopics] = useState<string[]>(
    existingReview?.difficultTopics || []
  );
  const [tomorrowPlan, setTomorrowPlan] = useState<string>(existingReview?.tomorrowPlan || '');
  const [isSaving, setIsSaving] = useState(false);

  // When selected date changes, update form inputs
  React.useEffect(() => {
    const rev = dailyReviews.find((r) => r.date === selectedDate);
    if (rev) {
      setRating(rev.rating);
      setReflection(rev.reflection);
      setDifficultTopics(rev.difficultTopics || []);
      setTomorrowPlan(rev.tomorrowPlan || '');
    } else {
      setRating(5);
      setReflection('');
      setDifficultTopics([]);
      setTomorrowPlan('');
    }
  }, [selectedDate, dailyReviews]);

  // Today's study time on the selected date
  const selectedDateStudyMs = useMemo(() => {
    return sessions
      .filter((s) => s.date === selectedDate)
      .reduce((acc, curr) => acc + curr.accumulatedActiveMs, 0);
  }, [sessions, selectedDate]);

  const addDifficultTopic = () => {
    if (!difficultInput.trim()) return;
    if (!difficultTopics.includes(difficultInput.trim())) {
      setDifficultTopics([...difficultTopics, difficultInput.trim()]);
    }
    setDifficultInput('');
  };

  const removeDifficultTopic = (topic: string) => {
    setDifficultTopics(difficultTopics.filter((t) => t !== topic));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveDailyReview({
        date: selectedDate,
        rating,
        reflection: reflection.trim(),
        completedTopics: [],
        difficultTopics,
        tomorrowPlan: tomorrowPlan.trim(),
      });
      showToast(`Review for ${selectedDate} saved successfully.`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0f17] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FileEdit className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              Daily Study Review & Journal
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                {dailyReviews.length} journals recorded
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Reflect on focus quality, log concepts needing revision, and formulate tomorrow's battle plan.
            </p>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2 bg-[#111420] border border-slate-800 rounded-xl p-1.5 self-start md:self-auto">
          <Calendar className="w-4 h-4 text-amber-400 ml-1.5" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none text-xs text-white focus:ring-0 outline-none font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Form (2 columns) */}
        <div className="lg:col-span-2 bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-6 shadow-lg">
          <form onSubmit={handleSave} className="space-y-5">
            {/* Date and Study Hours info bar */}
            <div className="p-3.5 rounded-xl bg-[#111420] border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Target Date
                </span>
                <div className="text-sm font-bold font-mono text-white mt-0.5">
                  {selectedDate} {selectedDate === todayStr && '(Today)'}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Tracked Focus Time
                </span>
                <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                  {formatDurationHuman(selectedDateStudyMs)}
                </div>
              </div>
            </div>

            {/* Star Rating */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Focus & Discipline Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating
                          ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                          : 'text-slate-700'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-3 text-xs font-mono font-bold text-amber-300">
                  {rating === 5 && 'Outstanding Deep Work'}
                  {rating === 4 && 'Solid Productive Session'}
                  {rating === 3 && 'Moderate Focus'}
                  {rating === 2 && 'Suboptimal / Distracted'}
                  {rating === 1 && 'Poor Session'}
                </span>
              </div>
            </div>

            {/* Accomplishments & Reflection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Key Accomplishments & Daily Reflection
              </label>
              <textarea
                rows={4}
                placeholder="What went well today? What subjects and topics did you cover? Any insights or breakthroughs?"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#141824] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none resize-none"
              />
            </div>

            {/* Difficult Concepts for Revision */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Difficult Concepts Requiring Revision
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="e.g. Carnot efficiency formula, Calculus integration by parts..."
                  value={difficultInput}
                  onChange={(e) => setDifficultInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addDifficultTopic();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 bg-[#141824] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                />
                <button
                  type="button"
                  onClick={addDifficultTopic}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-200"
                >
                  Add
                </button>
              </div>

              {difficultTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {difficultTopics.map((topic) => (
                    <span
                      key={topic}
                      className="px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-1.5 font-mono"
                    >
                      <span>{topic}</span>
                      <button
                        type="button"
                        onClick={() => removeDifficultTopic(topic)}
                        className="text-rose-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Tomorrow's Battle Plan */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Tomorrow's Focus Plan & Target Chapters
              </label>
              <textarea
                rows={3}
                placeholder="What must be accomplished tomorrow? Specify primary subject, mock tests, or chapter targets..."
                value={tomorrowPlan}
                onChange={(e) => setTomorrowPlan(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#141824] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Automatically saved to local storage & cloud database.
              </span>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold rounded-xl shadow-lg transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Daily Review'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Past Reviews Archive (1 column) */}
        <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Journal History
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Review your reflections across previous study dates.
            </p>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {dailyReviews.length === 0 ? (
                <p className="text-xs text-slate-500 py-10 text-center italic">
                  No journals saved yet. Fill out the review form on the left to save your first entry.
                </p>
              ) : (
                dailyReviews.map((rev) => (
                  <div
                    key={rev.id || rev.date}
                    onClick={() => setSelectedDate(rev.date)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      rev.date === selectedDate
                        ? 'bg-amber-500/10 border-amber-500/40'
                        : 'bg-[#111420] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold font-mono text-white">
                        {rev.date}
                      </span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${
                              s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {rev.reflection && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                        "{rev.reflection}"
                      </p>
                    )}

                    {rev.tomorrowPlan && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-800/60 text-[10px] text-slate-400 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="truncate">Plan: {rev.tomorrowPlan}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
