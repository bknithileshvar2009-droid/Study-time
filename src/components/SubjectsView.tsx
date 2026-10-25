import React, { useState, useMemo } from 'react';
import { useStudy } from '../context/StudyContext';
import { SubjectItem, ChapterItem } from '../types';
import { formatDurationHuman, formatDurationHMS } from '../utils/timeFormat';
import {
  BookOpen,
  Plus,
  FolderPlus,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  Clock,
  Play,
  Layers,
  Sparkles,
} from 'lucide-react';

export const SubjectsView: React.FC = () => {
  const {
    subjects,
    sessions,
    addSubject,
    updateSubject,
    deleteSubject,
    addChapter,
    addTopic,
    toggleChapterCompletion,
    startStudy,
    setActiveTab,
  } = useStudy();

  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({
    [subjects[0]?.id || '']: true,
  });

  // Modal / Form states
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [newSubjName, setNewSubjName] = useState('');
  const [newSubjColor, setNewSubjColor] = useState('#f59e0b');
  const [newSubjCourse, setNewSubjCourse] = useState('');

  // Add Chapter state
  const [activeSubjectForChapter, setActiveSubjectForChapter] = useState<string | null>(null);
  const [newChapterName, setNewChapterName] = useState('');

  // Add Topic state
  const [activeChapterForTopic, setActiveChapterForTopic] = useState<{ subjectId: string; chapterId: string } | null>(null);
  const [newTopicName, setNewTopicName] = useState('');

  // Preset palette colors
  const colorPalette = [
    '#f59e0b', // Amber
    '#e11d48', // Rose
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#ec4899', // Pink
    '#64748b', // Slate
  ];

  // Calculate study stats per subject from actual saved sessions
  const subjectStats = useMemo(() => {
    const stats: Record<string, { totalMs: number; sessionCount: number; lastStudied?: number }> = {};
    let totalAllMs = 0;

    for (const session of sessions) {
      totalAllMs += session.accumulatedActiveMs;
      if (!stats[session.subject]) {
        stats[session.subject] = { totalMs: 0, sessionCount: 0 };
      }
      stats[session.subject].totalMs += session.accumulatedActiveMs;
      stats[session.subject].sessionCount += 1;
      if (!stats[session.subject].lastStudied || session.startTime > (stats[session.subject].lastStudied || 0)) {
        stats[session.subject].lastStudied = session.startTime;
      }
    }

    return { stats, totalAllMs };
  }, [sessions]);

  const toggleExpand = (id: string) => {
    setExpandedSubjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjName.trim()) return;
    await addSubject(newSubjName.trim(), newSubjColor, newSubjCourse.trim() || undefined);
    setNewSubjName('');
    setNewSubjCourse('');
    setShowAddSubjectModal(false);
  };

  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubjectForChapter || !newChapterName.trim()) return;
    await addChapter(activeSubjectForChapter, newChapterName.trim());
    setNewChapterName('');
    setActiveSubjectForChapter(null);
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChapterForTopic || !newTopicName.trim()) return;
    await addTopic(activeChapterForTopic.subjectId, activeChapterForTopic.chapterId, newTopicName.trim());
    setNewTopicName('');
    setActiveChapterForTopic(null);
  };

  const handleStartTimerForSubject = (subjName: string, chapterName?: string) => {
    startStudy({
      subject: subjName,
      chapter: chapterName,
    });
    setActiveTab('timer');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0d0f17] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
              Subjects & Syllabus
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                {subjects.length} registered
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Manage academic disciplines, chapters, curriculum progress, and subject study time.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddSubjectModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold rounded-xl shadow-md transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Subject</span>
        </button>
      </div>

      {/* Subjects Grid & List */}
      <div className="space-y-4">
        {subjects.map((subject) => {
          const stats = subjectStats.stats[subject.name] || { totalMs: 0, sessionCount: 0 };
          const percentOfTotal =
            subjectStats.totalAllMs > 0
              ? Math.round((stats.totalMs / subjectStats.totalAllMs) * 100)
              : 0;
          const isExpanded = Boolean(expandedSubjects[subject.id]);
          const completedChapters = subject.chapters.filter((c) => c.isCompleted).length;
          const totalChapters = subject.chapters.length;

          return (
            <div
              key={subject.id}
              className="bg-[#0a0c12] border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg transition-all"
            >
              {/* Subject Header Bar */}
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900/60 to-transparent">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleExpand(subject.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-amber-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>

                  <div
                    className="w-3.5 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: subject.color }}
                  />

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white tracking-tight">
                        {subject.name}
                      </h3>
                      {subject.course && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                          {subject.course}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>{totalChapters} chapters</span>
                      <span>•</span>
                      <span>{completedChapters}/{totalChapters} completed</span>
                      <span>•</span>
                      <span>{stats.sessionCount} sessions</span>
                    </div>
                  </div>
                </div>

                {/* Right side stats & quick actions */}
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-amber-400">
                      {formatDurationHMS(stats.totalMs)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {percentOfTotal}% of total time
                    </div>
                  </div>

                  {/* Start Timer with this subject */}
                  <button
                    onClick={() => handleStartTimerForSubject(subject.name)}
                    className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title={`Start timer for ${subject.name}`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span className="hidden sm:inline">Focus</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Delete subject "${subject.name}" and its syllabus?`)) {
                        deleteSubject(subject.id);
                      }
                    }}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress Bar of total study share */}
              <div className="w-full bg-slate-800/40 h-1">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${percentOfTotal}%`,
                    backgroundColor: subject.color,
                  }}
                />
              </div>

              {/* Collapsible Chapter & Topics Tree */}
              {isExpanded && (
                <div className="p-4 sm:p-5 bg-[#0e111a]/40 border-t border-slate-800/70 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      Chapters & Syllabus ({totalChapters})
                    </span>
                    <button
                      onClick={() => {
                        setActiveSubjectForChapter(subject.id);
                        setNewChapterName('');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Add Chapter</span>
                    </button>
                  </div>

                  {/* Add chapter inline input */}
                  {activeSubjectForChapter === subject.id && (
                    <form
                      onSubmit={handleCreateChapter}
                      className="flex items-center gap-2 p-2.5 bg-[#121624] border border-amber-500/40 rounded-xl animate-in fade-in duration-200"
                    >
                      <input
                        type="text"
                        placeholder="Chapter name (e.g. Thermodynamics, Calculus III)..."
                        value={newChapterName}
                        onChange={(e) => setNewChapterName(e.target.value)}
                        className="flex-1 bg-transparent border-none text-xs text-white placeholder-slate-500 focus:ring-0 outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded-lg hover:bg-amber-400 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveSubjectForChapter(null)}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                    </form>
                  )}

                  {subject.chapters.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-2">
                      No chapters added yet. Click "Add Chapter" to track topics and syllabus coverage.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {subject.chapters.map((chapter) => (
                        <div
                          key={chapter.id}
                          className="bg-[#121520] border border-slate-800 rounded-xl p-3 space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() => toggleChapterCompletion(subject.id, chapter.id)}
                                className="text-slate-400 hover:text-amber-400 transition-colors"
                                title={chapter.isCompleted ? 'Mark incomplete' : 'Mark completed'}
                              >
                                {chapter.isCompleted ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Circle className="w-4 h-4 text-slate-600" />
                                )}
                              </button>
                              <span
                                className={`text-xs font-semibold ${
                                  chapter.isCompleted
                                    ? 'line-through text-slate-500'
                                    : 'text-slate-200'
                                }`}
                              >
                                {chapter.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleStartTimerForSubject(subject.name, chapter.name)}
                                className="p-1 text-slate-400 hover:text-amber-400 transition-colors"
                                title="Start session for this chapter"
                              >
                                <Play className="w-3 h-3 fill-current" />
                              </button>
                              <button
                                onClick={() => {
                                  setActiveChapterForTopic({ subjectId: subject.id, chapterId: chapter.id });
                                  setNewTopicName('');
                                }}
                                className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                              >
                                + Topic
                              </button>
                            </div>
                          </div>

                          {/* Add Topic inline form */}
                          {activeChapterForTopic?.subjectId === subject.id &&
                            activeChapterForTopic?.chapterId === chapter.id && (
                              <form
                                onSubmit={handleCreateTopic}
                                className="flex items-center gap-2 pl-6 pt-1 animate-in fade-in duration-200"
                              >
                                <input
                                  type="text"
                                  placeholder="Topic name (e.g. Carnot Engine)..."
                                  value={newTopicName}
                                  onChange={(e) => setNewTopicName(e.target.value)}
                                  className="flex-1 bg-[#181c2c] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:ring-0 outline-none"
                                  autoFocus
                                />
                                <button
                                  type="submit"
                                  className="px-2.5 py-1 bg-amber-500 text-black text-[10px] font-bold rounded-lg hover:bg-amber-400"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setActiveChapterForTopic(null)}
                                  className="text-[10px] text-slate-400 hover:text-white"
                                >
                                  ✕
                                </button>
                              </form>
                            )}

                          {/* Topics tag pills */}
                          {chapter.topics && chapter.topics.length > 0 && (
                            <div className="pl-6 flex flex-wrap gap-1.5">
                              {chapter.topics.map((topic, tidx) => (
                                <span
                                  key={tidx}
                                  className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[10px] text-slate-300 font-mono"
                                >
                                  {topic}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* New Subject Modal */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0e111a] border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-1">Add New Academic Subject</h3>
            <p className="text-xs text-slate-400 mb-5">
              Create a custom discipline to track session hours, syllabus, and study targets.
            </p>

            <form onSubmit={handleCreateSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Chemistry, Quantum Physics, Economics"
                  value={newSubjName}
                  onChange={(e) => setNewSubjName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#141824] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Course or Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PHY-201, JEE Main, USMLE, Sem 4"
                  value={newSubjCourse}
                  onChange={(e) => setNewSubjCourse(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#141824] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Color Accent
                </label>
                <div className="flex items-center gap-2">
                  {colorPalette.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setNewSubjColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        newSubjColor === c
                          ? 'scale-110 border-white shadow-md'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowAddSubjectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  Create Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
