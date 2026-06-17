import React, { useState, useEffect } from 'react';
import { timeSlots, days, getScheduleForEntity } from './data';
import { clsx } from 'clsx';
import { Loader2, Moon, Sun, LogOut, AlertTriangle, ChevronDown, List, Grid, Share2 } from 'lucide-react';
import Masters from './Masters';
import Sheet from './Sheet';
import Dashboard from './Dashboard';
import Login from './Login';
import ScheduleBuilder from './ScheduleBuilder';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

import { useSupabase } from './context/SupabaseContext';
import { supabase } from './supabaseClient';

function App() {
  const { user, db } = useSupabase();
  const [activeTab, setActiveTab] = useState('ตาราง');
  const [viewType, setViewType] = useState('section'); // 'section', 'instructor', 'room'
  const [isListView, setIsListView] = useState(false); // Mobile-friendly list view toggle
  const [selectedEntity, setSelectedEntity] = useState('ce6641');
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredSchedule, setHoveredSchedule] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  
  // Theme state
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    // URL Parsing for Share Link
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const idParam = params.get('id');
    
    if (viewParam && ['section', 'instructor', 'room'].includes(viewParam)) {
      setViewType(viewParam);
    }
    if (idParam) {
      setSelectedEntity(idParam);
    }

    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if (!loading && db && db.meetings) {
      setScheduleData(getScheduleForEntity(db, viewType, selectedEntity));
      
      // Basic Conflict Detection
      const currentConflicts = [];
      const meetings = db.meetings;
      for (let i = 0; i < meetings.length; i++) {
        for (let j = i + 1; j < meetings.length; j++) {
          const m1 = meetings[i];
          const m2 = meetings[j];
          if (m1.day === m2.day && m1.start < m2.end && m2.start < m1.end) {
            // Overlap detected! Check if same room or same instructor or same section
            const c1 = db.courses.find(c => c.id === m1.courseId);
            const c2 = db.courses.find(c => c.id === m2.courseId);
            if (!c1 || !c2) continue;
            
            if (m1.roomId === m2.roomId && m1.roomId) {
               currentConflicts.push(`ห้อง ${db.rooms.find(r=>r.id===m1.roomId)?.name} มีการจองซ้อนกันเวลา ${m1.start}:00`);
            }
            if (c1.instructorIds.some(id => c2.instructorIds.includes(id))) {
               const inst = db.instructors.find(i => c1.instructorIds.includes(i.id));
               currentConflicts.push(`อ.${inst?.name} สอนซ้อนเวลาเดียวกัน`);
            }
            if (c1.sectionId === c2.sectionId) {
               currentConflicts.push(`กลุ่ม ${c1.sectionId} เรียนซ้อนเวลาเดียวกัน`);
            }
          }
        }
      }
      setConflicts([...new Set(currentConflicts)]);
    }
  }, [selectedEntity, viewType, loading, db.meetings]);

  const tabs = [
    { name: 'ตาราง', path: '/', private: false },
    { name: 'แดชบอร์ด', path: '/dashboard', private: true },
    { name: 'จัดตารางสอน', path: '/builder', private: true },
    { name: 'ข้อมูลหลัก', path: '/masters', private: true },
    { name: 'พิมพ์ตาราง', path: '/sheet', private: true }
  ];

  const options = 
    viewType === 'section' ? db.sections :
    viewType === 'instructor' ? db.instructors :
    db.rooms;

  useEffect(() => {
    if (user && showLogin) {
      setShowLogin(false); // Hide login modal when user successfully logs in
    }
  }, [user, showLogin]);

  if (showLogin) {
    return (
      <>
        <Toaster position="bottom-right" richColors theme={isDark ? 'dark' : 'light'} />
        <Login onCancel={() => setShowLogin(false)} />
      </>
    );
  }

  const allowedTabs = tabs.filter(t => !t.private || user);
  const currentTab = allowedTabs.find(t => t.name === activeTab)?.name || allowedTabs[0]?.name;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setActiveTab('ตาราง'); // Reset to public tab
  };

  return (
    <div className="min-h-full flex flex-col font-sans selection:bg-blue-600/30 transition-colors duration-300">
      <Toaster position="bottom-right" richColors theme={isDark ? 'dark' : 'light'} />
      <header className="no-print sticky top-0 z-50 bg-[#1E3A5F] shadow-lg transition-colors duration-300">
        <div className="mx-auto flex flex-col md:flex-row max-w-6xl items-center gap-4 md:gap-6 px-4 py-3 relative z-10">
          <div className="flex w-full justify-between items-center md:w-auto">
            <span className="font-bold text-white flex items-center gap-3 truncate tracking-wide">
              <div className="flex items-center">
                <img src="/ksu-logo.png" alt="KSU" className="w-9 h-9 drop-shadow-sm" /> 
              </div>
              <span className="hidden sm:inline">ระบบจัดตารางเรียนตารางสอน</span><span className="sm:hidden">ระบบตารางสอน</span>
            </span>
            
            <div className="flex md:hidden items-center gap-3">
              {conflicts.length > 0 && user && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full ring-1 ring-amber-200/50">
                  <AlertTriangle size={14} />
                  <span>{conflicts.length}</span>
                </div>
              )}
              <button onClick={() => setIsDark(!isDark)} className="p-1.5 rounded-full text-blue-200 hover:bg-white/10">
                {isDark ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} />}
              </button>
              {user ? (
                <button onClick={handleLogout} className="p-1.5 rounded-full text-rose-300 hover:bg-rose-500/20">
                  <LogOut size={16} />
                </button>
              ) : (
                <button onClick={() => setShowLogin(true)} className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-100 border border-blue-400/30 text-xs font-semibold">
                  เข้าสู่ระบบ
                </button>
              )}
            </div>
          </div>

          <nav className="flex gap-1 text-sm text-blue-200 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            {allowedTabs.map(tab => (
              <a 
                key={tab.name} 
                href={tab.path} 
                className={clsx(
                  "px-4 py-1.5 rounded-full cursor-pointer transition-all duration-300 font-medium whitespace-nowrap",
                  currentTab === tab.name 
                    ? "text-[#1E3A5F] bg-white shadow-sm ring-0" 
                    : "hover:bg-white/10 hover:text-white"
                )}
                onClick={(e) => { e.preventDefault(); setActiveTab(tab.name); }}
              >
                {tab.name}
              </a>
            ))}
          </nav>
          
          <div className="hidden md:flex ml-auto items-center gap-3">
            {conflicts.length > 0 && user && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full ring-1 ring-amber-200/50 cursor-help" title={conflicts.join('\n')}>
                <AlertTriangle size={14} />
                <span>พบตารางชน {conflicts.length} จุด</span>
              </div>
            )}
            
            {user ? (
              <div className="flex items-center gap-2 border-l border-white/20 pl-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-white">{user.email?.split('@')[0]}</span>
                  <span className="text-[10px] uppercase text-[#6B9DC2] font-bold">Admin</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-1.5 rounded-full text-blue-200 hover:text-white hover:bg-white/10 transition-colors"
                  title="ออกจากระบบ"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center border-l border-white/20 pl-3">
                <button 
                  onClick={() => setShowLogin(true)}
                  className="px-4 py-1.5 rounded-full bg-white text-[#1E3A5F] hover:bg-blue-50 transition-colors text-sm font-bold shadow-sm"
                >
                  สำหรับเจ้าหน้าที่
                </button>
              </div>
            )}

            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-1.5 rounded-full text-blue-200 hover:bg-white/10 hover:text-white transition-colors"
              title="Toggle Dark Mode"
            >
              {isDark ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} />}
            </button>
          </div>
        </div>
        
      </header>

      {/* Subtle KSU Graphic Watermark */}
      <div 
        className="fixed bottom-[-150px] right-[-150px] w-[600px] h-[600px] opacity-[0.03] dark:opacity-[0.02] pointer-events-none z-0" 
        style={{ backgroundImage: 'url("https://th.ksu.ac.th/wp-content/uploads/2021/07/pic01-cycle.png")', backgroundSize: 'contain', backgroundRepeat: 'no-repeat' }}
      ></div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <AnimatePresence mode="wait">
        {currentTab === 'ข้อมูลหลัก' && (
          <motion.div key="masters" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <Masters />
          </motion.div>
        )}
        {currentTab === 'พิมพ์ตาราง' && (
          <motion.div key="sheet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <Sheet />
          </motion.div>
        )}
        {currentTab === 'จัดตารางสอน' && (
          <motion.div key="builder" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <ScheduleBuilder />
          </motion.div>
        )}
        {currentTab === 'แดชบอร์ด' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <Dashboard />
          </motion.div>
        )}
        {currentTab === 'ตาราง' && (
          <motion.div key="schedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#1E3A5F] to-[#6B9DC2] bg-clip-text text-transparent dark:from-sky-300 dark:to-sky-100">ตารางเรียนตารางสอน</h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">เลือกมุมมองและรายการเพื่อดูตารางทั้งสัปดาห์</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex p-1 rounded-xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md shadow-sm border border-slate-200/60 dark:border-zinc-800">
                  <button onClick={() => setViewType('section')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition-all", viewType === 'section' ? "bg-white text-[#1E3A5F] shadow-sm dark:bg-zinc-800 dark:text-sky-400" : "text-slate-600 dark:text-zinc-400")}>กลุ่มเรียน</button>
                  <button onClick={() => setViewType('instructor')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition-all", viewType === 'instructor' ? "bg-white text-[#1E3A5F] shadow-sm dark:bg-zinc-800 dark:text-sky-400" : "text-slate-600 dark:text-zinc-400")}>อาจารย์</button>
                  <button onClick={() => setViewType('room')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition-all", viewType === 'room' ? "bg-white text-[#1E3A5F] shadow-sm dark:bg-zinc-800 dark:text-sky-400" : "text-slate-600 dark:text-zinc-400")}>ห้องเรียน</button>
                </div>
                
                <div className="relative">
                  <select 
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    className="h-10 w-full appearance-none rounded-xl border border-slate-200/60 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 backdrop-blur-sm pl-4 pr-10 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900 sm:w-auto shadow-sm transition-all"
                  >
                    {options && options.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name || opt.code || opt.id}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500" size={14} />
                </div>
                
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?view=${viewType}&id=${selectedEntity}`;
                    navigator.clipboard.writeText(url);
                    import('sonner').then(({ toast }) => {
                      toast.success('คัดลอกลิงก์สำเร็จ', { description: 'สามารถส่งลิงก์นี้ให้เพื่อนหรือนักศึกษาได้เลยครับ' });
                    });
                  }}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-sky-500/10 dark:hover:bg-sky-500/20 text-blue-600 dark:text-sky-400 rounded-xl font-medium text-sm transition-colors border border-blue-200/50 dark:border-sky-500/20"
                  title="แชร์ตารางนี้"
                >
                  <Share2 size={16} />
                  <span>แชร์ลิงก์</span>
                </button>
                
                <div className="flex p-1 rounded-xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md shadow-sm border border-slate-200/60 dark:border-zinc-800 ml-auto sm:ml-2">
                  <button onClick={() => setIsListView(false)} className={clsx("p-1.5 rounded-lg transition-all", !isListView ? "bg-white text-[#1E3A5F] shadow-sm dark:bg-zinc-800 dark:text-sky-400" : "text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300")} title="มุมมองตาราง">
                    <Grid size={18} />
                  </button>
                  <button onClick={() => setIsListView(true)} className={clsx("p-1.5 rounded-lg transition-all", isListView ? "bg-white text-[#1E3A5F] shadow-sm dark:bg-zinc-800 dark:text-sky-400" : "text-slate-500 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300")} title="มุมมองรายการ">
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-[#121214] backdrop-blur-xl border border-white/40 dark:border-zinc-800 shadow-xl shadow-sky-900/5 dark:shadow-black/50 rounded-3xl overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-16 text-zinc-500 gap-4"><Loader2 className="animate-spin" size={32} /></div>
              ) : isListView ? (
                <div className="p-4 sm:p-6 space-y-6">
                  {days.filter(d => d.id >= 1 && d.id <= 5).map(day => {
                    const dayMeetings = scheduleData.filter(item => item.day === day.id).sort((a,b) => a.startHour - b.startHour);
                    if (dayMeetings.length === 0) return null;
                    return (
                      <div key={day.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 shadow-sm">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-zinc-100 mb-4 flex items-center gap-2">
                          <span className="w-2 h-6 bg-sky-500 rounded-full inline-block"></span> {day.name}
                        </h3>
                        <div className="space-y-3">
                          {dayMeetings.map((item, i) => (
                            <div key={i} className={clsx("p-4 rounded-xl border flex flex-col gap-3 relative overflow-hidden", item.colorClass.replace('backdrop-blur-sm', '').replace('bg-opacity-80', ''))}>
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <div className="font-bold text-base tracking-tight mb-1">{item.courseCode}</div>
                                  <div className="font-semibold text-sm opacity-90 leading-snug">{item.courseName}</div>
                                </div>
                                <div className="shrink-0 text-xs font-bold bg-white/60 dark:bg-black/20 px-2.5 py-1.5 rounded-lg border border-white/20 dark:border-white/5 shadow-sm">
                                  {item.startTime} - {item.endTime}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs font-medium opacity-80 mt-1">
                                <div className="flex items-center gap-1.5"><span className="text-[14px]">🚪</span> ห้อง {item.roomName}</div>
                                <div className="flex items-center gap-1.5"><span className="text-[14px]">👩‍🏫</span> {item.instructorName}</div>
                                <div className="flex items-center gap-1.5 col-span-2"><span className="text-[14px]">👥</span> กลุ่ม {item.sectionName}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {scheduleData.length === 0 && (
                    <div className="text-center py-12 text-slate-500 dark:text-zinc-500">
                      ไม่มีตารางเรียน/สอนในรายการที่เลือก
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="grid min-w-[1000px] grid-cols-[80px_repeat(14,minmax(60px,1fr))]">
                    <div className="contents">
                      <div className="sticky left-0 z-20 border-b border-r border-slate-200/60 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900 p-2" />
                      {timeSlots.map(time => (
                        <div key={time} className="border-b border-r border-slate-200/60 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900 p-2 text-center text-xs font-medium text-slate-500 dark:text-zinc-400">
                          {`${String(time).padStart(2, '0')}:00`}
                        </div>
                      ))}
                    </div>
                    {days.filter(d => d.id >= 1 && d.id <= 5).map((day, idx) => (
                      <div key={day.id} className="contents">
                        <div className={clsx("sticky left-0 z-10 flex items-center justify-center border-r border-slate-200/60 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900 p-2 font-semibold text-slate-800 dark:text-zinc-200", idx !== 4 && "border-b")}>{day.name}</div>
                        <div className={clsx("col-span-14 relative min-h-[120px] bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#27272a_1px,transparent_1px)] bg-[size:calc(100%/14)_100%]", idx !== 4 && "border-b border-slate-200/60 dark:border-zinc-800")}>
                          {scheduleData.filter(item => item.day === day.id).map((item, i) => {
                            const left = (item.startHour - 8) * (100/14);
                            const width = (item.endHour - item.startHour) * (100/14);
                            return (
                              <motion.div 
                                key={i}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.02, zIndex: 30 }}
                                onHoverStart={() => setHoveredSchedule(item)}
                                onHoverEnd={() => setHoveredSchedule(null)}
                                className={clsx("absolute top-1 bottom-1 rounded-xl p-2 text-xs transition-all duration-200 cursor-pointer", item.colorClass)}
                                style={{ left: `${left}%`, width: `${width}%` }}
                              >
                                <div className="h-full w-full flex flex-col overflow-hidden relative z-10">
                                  <div className="flex items-start justify-between gap-1 mb-1">
                                    <span className="font-bold text-[13px] tracking-tight truncate">{item.courseCode}</span>
                                    {item.type && item.type !== 'ไม่ระบุ' && (
                                      <span className={clsx("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold", item.type === 'ป' ? "bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100" : "bg-indigo-200/80 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-100")}>{item.type}</span>
                                    )}
                                  </div>
                                  <div className="text-xs font-semibold opacity-90 leading-snug line-clamp-2">{item.courseName}</div>
                                  <div className="text-[11px] opacity-80 mt-auto truncate pt-1 flex justify-between items-center">
                                    <span className="truncate pr-1">👩‍🏫 {item.instructorName}</span>
                                    <span className="shrink-0 bg-white/40 dark:bg-black/20 px-1.5 rounded-md text-[10px] font-medium">กลุ่ม {item.sectionName}</span>
                                  </div>
                                  <div className="text-[11px] opacity-80 truncate mt-0.5">
                                    🚪 {item.roomName}
                                  </div>
                                </div>
                                <AnimatePresence>
                                  {hoveredSchedule === item && (
                                    <motion.div 
                                      initial={{ opacity: 0, y: idx === 0 ? -10 : 10 }} 
                                      animate={{ opacity: 1, y: 0 }} 
                                      exit={{ opacity: 0, y: idx === 0 ? -10 : 10 }} 
                                      className={clsx(
                                        "absolute z-50 left-1/2 -translate-x-1/2 w-56 p-3 rounded-xl bg-white dark:bg-zinc-800 shadow-2xl border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200",
                                        idx === 0 ? "top-full mt-2" : "bottom-full mb-2"
                                      )}
                                    >
                                      <div className="font-bold text-sm text-[#1E3A5F] dark:text-sky-400 mb-1">{item.courseCode}</div>
                                      <div className="font-medium text-xs mb-2 leading-tight">{item.courseName}</div>
                                      <div className="text-xs space-y-1">
                                        <div className="flex items-start gap-1.5 opacity-80"><span className="shrink-0">👩‍🏫</span> <span>{item.instructorName}</span></div>
                                        <div className="flex items-start gap-1.5 opacity-80"><span className="shrink-0">🚪</span> <span>ห้อง {item.roomName}</span></div>
                                        <div className="flex items-start gap-1.5 opacity-80"><span className="shrink-0">👥</span> <span>กลุ่ม {item.sectionName}</span></div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;


