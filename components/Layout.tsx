
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ClipboardList, ListTodo, Map, CalendarClock, CloudSun, 
  ArrowLeftRight, ShieldAlert, AlertTriangle, Stethoscope, Heart, Wrench, 
  AlertOctagon, FileText, Clock, Settings, LogOut, Menu, Power, 
  ChevronLeft, ChevronRight, Maximize, Minimize, HelpCircle
} from 'lucide-react';
import { UserRole, User, TimeLogEntry, UserPermissions, OrganizationProfile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: any) => void;
  currentUser: User;
  onLogout: () => void;
  activeShift?: TimeLogEntry | null;
  onClockIn?: () => void;
  onClockOut?: () => void;
  isOffline?: boolean;
  fontScale?: number;
  setFontScale?: (scale: number) => void;
  orgProfile?: OrganizationProfile | null;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, activeView, onNavigate, currentUser, onLogout, 
  activeShift, onClockIn, onClockOut, orgProfile 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const isAdmin = currentUser.role === UserRole.ADMIN;
  
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(e => console.error(e));
      } else {
          if (document.exitFullscreen) document.exitFullscreen();
      }
  };
  
  const p: UserPermissions = {
    dashboard: true, 
    dailyLog: true, 
    tasks: true, 
    medical: isAdmin, 
    movements: isAdmin, 
    safety: true, 
    maintenance: true, 
    reports: true, 
    settings: isAdmin,
    flightRecords: true, 
    feedingSchedule: true, 
    attendance: true, 
    attendanceManager: isAdmin, 
    missingRecords: isAdmin,
    ...(currentUser.permissions || {})
  };

  const handleNavigate = (view: string) => {
    onNavigate(view);
    setIsMobileMenuOpen(false);
  };

  const NavItem = ({ view, icon: Icon, label, permission }: { view: string, icon: any, label: string, permission: boolean }) => {
      if (!permission) return null;
      const isActive = activeView === view;
      return (
        <button 
          onClick={() => handleNavigate(view)}
          className={`flex items-center gap-3 px-4 py-2.5 transition-all duration-200 group relative w-full ${
            isActive 
              ? 'bg-emerald-500/10 text-emerald-400 border-r-4 border-emerald-500' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-r-4 border-transparent'
          } ${isSidebarCollapsed ? 'justify-center px-0 border-r-0' : ''}`}
        >
          <Icon size={20} className={`shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
          {!isSidebarCollapsed && <span className="whitespace-nowrap overflow-hidden text-sm font-medium">{label}</span>}
        </button>
      );
  };

  const SectionHeader = ({ title }: { title: string }) => {
    if (isSidebarCollapsed) return <div className="h-4"></div>;
    return <div className="px-6 pt-6 pb-2"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{title}</p></div>;
  };

  const sidebarContent = (
    <div className={`flex flex-col h-full bg-[#1c1c1e] text-slate-300 transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} no-print`}>
      <div className={`h-14 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between px-4'} border-b border-slate-800`}>
          {!isSidebarCollapsed && <span className="font-bold text-white tracking-tight">KOA Manager</span>}
          {orgProfile?.logoUrl ? <img src={orgProfile.logoUrl} className="w-8 h-8 object-contain rounded-lg" /> : <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center font-bold text-emerald-500">K</div>}
      </div>

      <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
        <SectionHeader title="Main Menu" />
        <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" permission={p.dashboard} />
        <NavItem view="daily" icon={ClipboardList} label="Daily Log" permission={p.dailyLog} />
        <NavItem view="tasks" icon={ListTodo} label="To-Do List" permission={p.tasks} />
        <NavItem view="flight_records" icon={Map} label="Flight Records" permission={p.flightRecords} />
        <NavItem view="schedule" icon={CalendarClock} label="Feeding Schedule" permission={p.feedingSchedule} />
        <NavItem view="weather" icon={CloudSun} label="Weather" permission={true} />

        <SectionHeader title="Administration" />
        <NavItem view="movements" icon={ArrowLeftRight} label="Stock Movements" permission={p.movements} />
        <NavItem view="drills" icon={ShieldAlert} label="Emergency Drills" permission={p.safety} />
        <NavItem view="incidents" icon={AlertTriangle} label="Incidents & Issues" permission={p.safety} />
        <NavItem view="first_aid" icon={Stethoscope} label="Health & Safety Log" permission={p.safety} />
        <NavItem view="health" icon={Heart} label="Animal Medical" permission={p.medical} />
        <NavItem view="maintenance" icon={Wrench} label="Site Maintenance" permission={p.maintenance} />
        <NavItem view="missing_records" icon={AlertOctagon} label="Missing Records" permission={p.missingRecords} />
        <NavItem view="reports" icon={FileText} label="Reports" permission={p.reports} />

        <SectionHeader title="HR & Systems" />
        <NavItem view="timesheets" icon={Clock} label="Time Sheets" permission={p.attendance} />
        <NavItem view="settings" icon={Settings} label="Settings" permission={p.settings} />
        <NavItem view="help" icon={HelpCircle} label="Help & Support" permission={true} />

        {!isSidebarCollapsed && (
            <div className="px-4 mt-6">
                <button onClick={toggleFullscreen} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all duration-200 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700">
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    <span className="text-xs font-black uppercase tracking-widest">{isFullscreen ? 'Exit Full' : 'Full Screen'}</span>
                </button>
            </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-800/50 bg-[#18181a]">
        {!isSidebarCollapsed ? (
            <>
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center font-black text-xs text-white shrink-0">{currentUser.initials}</div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                        <p className="text-[9px] font-black text-emerald-500 truncate uppercase tracking-widest">{currentUser.jobPosition || currentUser.role}</p>
                    </div>
                    <button onClick={onLogout} className="text-slate-500 hover:text-red-400"><LogOut size={16}/></button>
                </div>
                {activeShift ? (
                    <button onClick={onClockOut} className="w-full bg-amber-500/10 border border-amber-500/50 text-amber-500 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2">
                        <Power size={14}/> CLOCK OUT
                    </button>
                ) : (
                    <button onClick={onClockIn} className="w-full bg-emerald-600 text-white rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2">
                        <Clock size={14}/> START SHIFT
                    </button>
                )}
            </>
        ) : (
            <div className="flex flex-col items-center gap-4">
                 <button onClick={onLogout} className="text-slate-400"><LogOut size={16}/></button>
                 <button onClick={activeShift ? onClockOut : onClockIn} className={`w-9 h-9 rounded-lg flex items-center justify-center ${activeShift ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-600 text-white'}`}>
                    {activeShift ? <Power size={16}/> : <Clock size={16}/>}
                 </button>
            </div>
        )}
      </div>
      
      <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="w-full h-8 bg-[#151516] flex items-center justify-center text-slate-500 border-t border-slate-800">
          {isSidebarCollapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
      </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f3f4f6] overflow-hidden selection:bg-emerald-500/30">
      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/60 z-[60] md:hidden backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-[70] transition-all duration-300 ease-in-out md:static ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>{sidebarContent}</aside>
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden print:overflow-visible">
        <header className="md:hidden h-14 bg-[#1c1c1e] border-b border-slate-800 flex items-center justify-between px-4 z-50">
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-300"><Menu size={24} /></button>
          <span className="text-sm font-bold text-white">KOA Manager</span>
          <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center font-bold text-[10px] text-white">{currentUser.initials}</div>
        </header>
        <div className="flex-1 overflow-y-auto bg-slate-200 print:bg-white">{children}</div>
      </main>
    </div>
  );
};
export default Layout;
