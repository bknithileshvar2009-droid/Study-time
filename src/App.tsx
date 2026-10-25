/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StudyProvider, useStudy } from './context/StudyContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TimerView } from './components/TimerView';
import { HistoryView } from './components/HistoryView';
import { CalendarView } from './components/CalendarView';
import { SubjectsView } from './components/SubjectsView';
import { GoalsView } from './components/GoalsView';
import { AnalyticsView } from './components/AnalyticsView';
import { DailyReviewView } from './components/DailyReviewView';
import { ReportsView } from './components/ReportsView';
import { BackupRestoreView } from './components/BackupRestoreView';
import { RemindersView } from './components/RemindersView';
import { SettingsView } from './components/SettingsView';
import { DiagnosticsView } from './components/DiagnosticsView';
import { SessionDetailModal } from './components/SessionDetailModal';
import { EditSessionModal } from './components/EditSessionModal';
import { ManualSessionModal } from './components/ManualSessionModal';
import { MinimalWidgetView } from './components/MinimalWidgetView';
import { StudySession } from './types';
import { formatDurationHuman } from './utils/timeFormat';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

function MainApp() {
  const {
    activeTab,
    toastMessage,
    editSession,
    deleteSession,
    settings,
    idleDetected,
    idleDurationMs,
    handleKeepIdleTime,
    handleTrimIdleTime,
  } = useStudy();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inspectedSession, setInspectedSession] = useState<StudySession | null>(null);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const [manualModalOpen, setManualModalOpen] = useState(false);

  // Minimal Widget Mode: Displays ONLY the minimal timer & study history
  if (settings.widgetMode) {
    return (
      <div className="min-h-screen bg-[#07080c] text-[#f1f2f6] flex flex-col font-sans">
        {idleDetected && (
          <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs z-50">
            <span>
              <strong>Inactivity:</strong> {formatDurationHuman(idleDurationMs)} inactive.
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleKeepIdleTime}
                className="px-2 py-0.5 bg-amber-500 text-black font-bold rounded text-[11px]"
              >
                Keep
              </button>
              <button
                onClick={handleTrimIdleTime}
                className="px-2 py-0.5 bg-slate-800 text-slate-200 font-semibold rounded text-[11px]"
              >
                Trim
              </button>
            </div>
          </div>
        )}

        <MinimalWidgetView />

        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2 bg-[#111420] border border-amber-500/40 text-amber-200 text-xs font-semibold rounded-xl shadow-2xl no-print">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080c] text-[#f1f2f6] flex flex-col font-sans">
      {/* Idle Detection Prompt Banner */}
      {idleDetected && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Inactivity Detected:</strong> You were inactive for{' '}
              {formatDurationHuman(idleDurationMs)} while the timer was running.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleKeepIdleTime}
              className="px-3 py-1 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors"
            >
              Keep as Study Time
            </button>
            <button
              onClick={handleTrimIdleTime}
              className="px-3 py-1 bg-slate-800 text-slate-200 font-semibold rounded-lg hover:bg-slate-700 transition-colors"
            >
              Trim Inactive Time
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        onOpenManualEntry={() => setManualModalOpen(true)}
      />

      {/* Main Layout Area */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Sidebar */}
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

        {/* Content View Router */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              onInspectSession={(s) => setInspectedSession(s)}
              onOpenManualEntry={() => setManualModalOpen(true)}
            />
          )}

          {activeTab === 'timer' && <TimerView />}

          {activeTab === 'history' && (
            <HistoryView
              onInspectSession={(s) => setInspectedSession(s)}
              onEditSession={(s) => setEditingSession(s)}
              onOpenManualEntry={() => setManualModalOpen(true)}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarView
              onInspectSession={(s) => setInspectedSession(s)}
              onOpenManualEntry={() => setManualModalOpen(true)}
            />
          )}

          {activeTab === 'subjects' && <SubjectsView />}

          {activeTab === 'goals' && <GoalsView />}

          {activeTab === 'analytics' && <AnalyticsView />}

          {activeTab === 'review' && <DailyReviewView />}

          {activeTab === 'reports' && <ReportsView />}

          {activeTab === 'backup' && <BackupRestoreView />}

          {activeTab === 'reminders' && <RemindersView />}

          {activeTab === 'settings' && <SettingsView />}

          {activeTab === 'diagnostics' && <DiagnosticsView />}
        </main>
      </div>

      {/* Session Inspector Modal */}
      <SessionDetailModal
        session={inspectedSession}
        onClose={() => setInspectedSession(null)}
        onEdit={(s) => setEditingSession(s)}
        onDelete={(id) => {
          deleteSession(id);
          setInspectedSession(null);
        }}
      />

      {/* Edit Session Modal */}
      <EditSessionModal
        session={editingSession}
        isOpen={Boolean(editingSession)}
        onClose={() => setEditingSession(null)}
        onSave={(updated) => editSession(updated)}
        subjectPresets={settings.subjectPresets}
        tagPresets={settings.tagPresets}
      />

      {/* Manual Past Session Entry Modal */}
      <ManualSessionModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
      />

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#111420] border border-amber-500/40 text-amber-200 text-xs font-semibold rounded-2xl shadow-2xl shadow-black/80 animate-in fade-in slide-in-from-bottom-4 duration-300 no-print">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StudyProvider>
      <MainApp />
    </StudyProvider>
  );
}
