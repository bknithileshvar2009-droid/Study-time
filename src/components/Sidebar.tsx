import React from 'react';
import { useStudy } from '../context/StudyContext';
import { ViewTab } from '../types';
import {
  LayoutDashboard,
  Timer,
  History,
  Calendar,
  BookOpen,
  Target,
  BarChart3,
  FileEdit,
  FileBarChart,
  Database,
  Bell,
  Settings,
  Activity,
  Flame,
} from 'lucide-react';

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileMenuOpen, setMobileMenuOpen }) => {
  const { activeTab, setActiveTab, activeSession, isTimerRunning } = useStudy();

  const coreNav: { id: ViewTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'timer',
      label: 'Study Timer',
      icon: <Timer className="w-4 h-4" />,
      badge: activeSession ? (isTimerRunning ? 'ACTIVE' : 'PAUSED') : undefined,
    },
    {
      id: 'history',
      label: 'Session History',
      icon: <History className="w-4 h-4" />,
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: <Calendar className="w-4 h-4" />,
    },
  ];

  const curriculumNav: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'subjects',
      label: 'Subjects & Syllabus',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'goals',
      label: 'Goals & Targets',
      icon: <Target className="w-4 h-4" />,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'review',
      label: 'Daily Review',
      icon: <FileEdit className="w-4 h-4" />,
    },
    {
      id: 'reports',
      label: 'Reports & PDF',
      icon: <FileBarChart className="w-4 h-4" />,
    },
  ];

  const systemNav: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'backup',
      label: 'Backup & Restore',
      icon: <Database className="w-4 h-4" />,
    },
    {
      id: 'reminders',
      label: 'Reminders & Audio',
      icon: <Bell className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
    {
      id: 'diagnostics',
      label: 'Diagnostics',
      icon: <Activity className="w-4 h-4" />,
    },
  ];

  const handleSelect = (tab: ViewTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const renderNavGroup = (
    title: string,
    items: { id: ViewTab; label: string; icon: React.ReactNode; badge?: string }[]
  ) => (
    <div className="space-y-1">
      <div className="px-3 pb-1 text-[10px] uppercase font-bold tracking-widest text-slate-500">
        {title}
      </div>
      {items.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleSelect(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              isActive
                ? 'bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-transparent text-amber-300 border-l-2 border-amber-500 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`transition-colors ${
                  isActive ? 'text-amber-400' : 'text-slate-400'
                }`}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </div>

            {item.badge && (
              <span
                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded tracking-wider ${
                  item.badge === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 z-30 bg-black/70 backdrop-blur-sm no-print"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 z-40 h-[100dvh] lg:h-[calc(100vh-4rem)] w-64 bg-[#0a0c12] border-r border-slate-800/80 p-3.5 flex flex-col justify-between overflow-y-auto transition-transform duration-300 no-print ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-4">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="font-display font-bold tracking-wider text-xs text-amber-400">
              BK NITHILESHVAR
            </span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕ Close
            </button>
          </div>

          {/* Group 1: Core Navigation */}
          {renderNavGroup('Tracking', coreNav)}

          {/* Group 2: Curriculum & Mastery */}
          {renderNavGroup('Curriculum & Insights', curriculumNav)}

          {/* Group 3: System & Storage */}
          {renderNavGroup('System & Vault', systemNav)}
        </div>

        {/* Bottom Focus / Identity Card */}
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-b from-slate-900/90 to-black/60 border border-amber-500/15">
          <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold mb-1">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>BK NITHILESHVAR</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed italic">
            "Disciplined effort compounds into unstoppable mastery."
          </p>
          <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-500">
            <span>₹0 Zero Cost Stack</span>
            <span className="font-mono text-amber-400/80">RTDB Auto-Sync</span>
          </div>
        </div>
      </aside>
    </>
  );
};
