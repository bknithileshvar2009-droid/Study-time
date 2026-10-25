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
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { SessionDetailModal } from './components/SessionDetailModal';
import { EditSessionModal } from './components/EditSessionModal';
import { StudySession } from './types';
import { CheckCircle2, AlertCircle } from 'lucide-react';

function MainApp() {
  const { activeTab, toastMessage, editSession, deleteSession, settings } = useStudy();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [inspectedSession, setInspectedSession] = useState<StudySession | null>(null);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);

  return (
    <div className="min-h-screen bg-[#07080c] text-[#f1f2f6] flex flex-col font-sans">
      {/* Header */}
      <Header mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      {/* Main Layout Area */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Sidebar */}
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView onInspectSession={(s) => setInspectedSession(s)} />
          )}

          {activeTab === 'timer' && <TimerView />}

          {activeTab === 'history' && (
            <HistoryView
              onInspectSession={(s) => setInspectedSession(s)}
              onEditSession={(s) => setEditingSession(s)}
            />
          )}

          {activeTab === 'reports' && <ReportsView />}

          {activeTab === 'settings' && <SettingsView />}
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
