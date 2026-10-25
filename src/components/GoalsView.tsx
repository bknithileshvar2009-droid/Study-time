import React, { useState, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import { StudyGoal } from '../types';
import { formatDurationHuman, formatDurationHMS, getLocalDateString } from '../utils/timeFormat';
import {
  Target,
  Plus,
  Trash2,
  CheckCircle2,
  TrendingUp,
  Clock,
  Calendar,
  Flame,
  Award,
  BookOpen,
} from 'lucide-react';

export const GoalsView: React.FC = () => {
  const {
    goals,
    addGoal,
    deleteGoal,
    sessions,
    stats,
    subjects,
    settings,
  } = useStudy();

  const [showAddModal, setShowAddModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalType, setGoalType] = useState<StudyGoal['type']>('daily');
  const [targetHours, setTargetHours] = useState('4');
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]?.name || '');

  const todayStr = getLocalDateString();

  // Calculate actual hours studied for each goal based on its type and criteria
  const goalProgressList = useMemo(() => {
    // Current week boundary (Monday-based)
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = (currentDay === 0 ? -6 : 1) - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const weekStartStr = monday.toISOString().slice(0, 10);

    // Current month prefix YYYY-MM
    const monthPrefix = todayStr.slice(0, 7);

    return goals.map((goal) => {
      let actualMs = 0;

      if (goal.type === 'daily') {
        // Today's sessions
        for (const s of sessions) {
          if (s.date === todayStr) {
            if (!goal.subject || s.subject === goal.subject) {
              actualMs += s.accumulatedActiveMs;
            }
          }
        }
      } else if (goal.type === 'weekly') {
        // Sessions since Monday of this week
        for (const s of sessions) {
          if (s.date >= weekStartStr) {
            if (!goal.subject || s.subject === goal.subject) {
              actualMs += s.accumulatedActiveMs;
            }
          }
        }
      } else if (goal.type === 'monthly') {
        // Sessions in current month
        for (const s of sessions) {
          if (s.date.startsWith(monthPrefix)) {
            if (!goal.subject || s.subject === goal.subject) {
              actualMs += s.accumulatedActiveMs;
            }
          }
        }
      } else if (goal.type === 'subject') {
        // All sessions for this subject
        for (const s of sessions) {
          if (s.subject === goal.subject) {
            actualMs += s.accumulatedActiveMs;
          }
        }
      } else if (goal.type === 'chapter') {
        for (const s of sessions) {
          if (s.subject === goal.subject && s.chapter === goal.chapter) {
            actualMs += s.accumulatedActiveMs;
          }
        }
      }

      const targetMs = goal.targetHours * 3600 * 1000;
      const progressPercent = targetMs > 0 ? Math.min(100, Math.round((actualMs / targetMs) * 100)) : 0;
      const remainingMs = Math.max(0, targetMs - actualMs);
      const isCompleted = actualMs >= targetMs;

      return {
        goal,
        actualMs,
        targetMs,
        progressPercent,
        remainingMs,
        isCompleted,
      };
    });
  }, [goals, sessions, todayStr]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const hours = parseFloat(targetHours);
    if (!goalTitle.trim() || isNaN(hours) || hours <= 0) return;

    await addGoal({
      title: goalTitle.trim(),
      type: goalType,
      targetHours: hours,
      subject: goalType === 'subject' || goalType === 'chapter' ? selectedSubject : undefined,
      startDate: todayStr,
    });

    setGoalTitle('');
    setTargetHours('4');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0f17] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              Study Goals & Targets
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                {goals.length} active
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Measure focus milestones against genuine tracked study hours.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold rounded-xl shadow-md transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Global Presets Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Daily Goal Card */}
        <div className="p-4 rounded-2xl bg-[#0a0c12] border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Today's Benchmark
            </span>
            <span className="font-mono text-amber-400 font-bold">
              {settings.dailyGoalHours}h target
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {formatDurationHuman(stats.todayTotalMs)}
          </div>
          <div className="mt-3 w-full bg-slate-800/60 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.round((stats.todayTotalMs / (settings.dailyGoalHours * 3600 * 1000)) * 100)
                )}%`,
              }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
            <span>
              {Math.min(
                100,
                Math.round((stats.todayTotalMs / (settings.dailyGoalHours * 3600 * 1000)) * 100)
              )}% achieved
            </span>
            <span>
              {stats.todayTotalMs >= settings.dailyGoalHours * 3600 * 1000
                ? 'Goal completed!'
                : `${formatDurationHuman(
                    Math.max(0, settings.dailyGoalHours * 3600 * 1000 - stats.todayTotalMs)
                  )} remaining`}
            </span>
          </div>
        </div>

        {/* Weekly Benchmark */}
        <div className="p-4 rounded-2xl bg-[#0a0c12] border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              Weekly Benchmark
            </span>
            <span className="font-mono text-rose-400 font-bold">
              {settings.weeklyGoalHours}h target
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {formatDurationHuman(stats.weekTotalMs)}
          </div>
          <div className="mt-3 w-full bg-slate-800/60 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-rose-500 to-amber-400 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  Math.round((stats.weekTotalMs / (settings.weeklyGoalHours * 3600 * 1000)) * 100)
                )}%`,
              }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
            <span>
              {Math.min(
                100,
                Math.round((stats.weekTotalMs / (settings.weeklyGoalHours * 3600 * 1000)) * 100)
              )}% achieved
            </span>
            <span>
              {formatDurationHuman(
                Math.max(0, settings.weeklyGoalHours * 3600 * 1000 - stats.weekTotalMs)
              )} remaining
            </span>
          </div>
        </div>

        {/* Study Streak */}
        <div className="p-4 rounded-2xl bg-[#0a0c12] border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              Current Streak
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-500">Consecutive Days</span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 flex items-center gap-2">
            <span>{stats.currentStreakDays}</span>
            <span className="text-xs font-normal text-slate-400">days in a row</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
            <span>Personal Best</span>
            <span className="font-mono text-slate-200 font-bold">{stats.bestStreakDays} days</span>
          </div>
        </div>
      </div>

      {/* Custom Goals List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Active Targets & Objectives
        </h2>

        {goalProgressList.length === 0 ? (
          <div className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-12 text-center shadow-lg">
            <Target className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-200 mb-1">No custom goals configured yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              Set specific study objectives for subjects, weekly hours, or chapters to stay accountable and disciplined.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-xl transition-colors"
            >
              + Create First Target
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goalProgressList.map(({ goal, actualMs, targetMs, progressPercent, remainingMs, isCompleted }) => (
              <div
                key={goal.id}
                className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {goal.type}
                        </span>
                        {goal.subject && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-semibold">
                            {goal.subject}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1.5">
                        {goal.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Remove goal "${goal.title}"?`)) {
                          deleteGoal(goal.id);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress values */}
                  <div className="flex items-baseline justify-between mt-3 mb-1.5">
                    <span className="text-lg font-bold font-mono text-white">
                      {formatDurationHuman(actualMs)}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      / {goal.targetHours}h ({progressPercent}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-emerald-400'
                          : 'bg-gradient-to-r from-amber-500 to-rose-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Footer status */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  {isCompleted ? (
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      Target Completed!
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      {formatDurationHuman(remainingMs)} remaining
                    </span>
                  )}

                  <span className="text-[10px] text-slate-500 font-mono">
                    Since {goal.startDate}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0e111a] border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Create Study Goal</h3>
            <p className="text-xs text-slate-400 mb-5">
              Set target hours to build consistency and track progress.
            </p>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Electromagnetism, 40h Weekly Grind"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#141824] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Goal Frequency
                  </label>
                  <select
                    value={goalType}
                    onChange={(e) => setGoalType(e.target.value as StudyGoal['type'])}
                    className="w-full px-3 py-2 bg-[#141824] border border-slate-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="daily">Daily Target</option>
                    <option value="weekly">Weekly Target</option>
                    <option value="monthly">Monthly Target</option>
                    <option value="subject">Subject Specific</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target Hours *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="1000"
                    required
                    value={targetHours}
                    onChange={(e) => setTargetHours(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141824] border border-slate-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none font-mono"
                  />
                </div>
              </div>

              {(goalType === 'subject' || goalType === 'chapter') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Subject
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-[#141824] border border-slate-800 rounded-xl text-xs text-white focus:border-amber-500 outline-none"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
