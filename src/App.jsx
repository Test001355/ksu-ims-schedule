import React, { useState, useEffect } from 'react';
import { db, sections, instructors, rooms, timeSlots, days, getScheduleForEntity } from './data';
import { clsx } from 'clsx';
import { Loader2, Moon, Sun, LogOut, AlertTriangle, ChevronDown } from 'lucide-react';
import Masters from './Masters';
import Sheet from './Sheet';
import Dashboard from './Dashboard';
import Login from './Login';
import ScheduleBuilder from './ScheduleBuilder';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [activeTab, setActiveTab] = useState('แดชบอร์ด');
  const [viewType, setViewType] = useState('section'); // 'section', 'instructor', 'room'
  const [selectedEntity, setSelectedEntity] = useState('ce6641');
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredSchedule, setHoveredSchedule] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
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
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if (!loading) {
      setScheduleData(getScheduleForEntity(viewType, selectedEntity));
      
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
    { name: 'แดชบอร์ด', path: '/dashboard', roles: ['admin', 'instructor'] },
    { name: 'ตาราง', path: '/', roles: ['admin', 'instructor', 'student'] },
    { name: 'จัดตารางสอน', path: '/builder', roles: ['admin'] },
    { name: 'ข้อมูลหลัก', path: '/masters', roles: ['admin'] },
    { name: 'พิมพ์ตาราง', path: '/sheet', roles: ['admin', 'instructor'] }
  ];

  const options = 
    viewType === 'section' ? sections :
    viewType === 'instructor' ? instructors :
    rooms;

  if (!currentUser) {
    return (
      <>
        <Toaster position="bottom-right" richColors theme={isDark ? 'dark' : 'light'} />
        <Login onLogin={setCurrentUser} />
      </>
    );
  }

  const allowedTabs = tabs.filter(t => t.roles.includes(currentUser.role));

  return (
    <div className="min-h-full flex flex-col font-sans selection:bg-blue-600/30 transition-colors duration-300">
      <Toaster position="bottom-right" richColors theme={isDark ? 'dark' : 'light'} />
      <header className="no-print sticky top-0 z-50 bg-white/70 dark:bg-[#09090b]/80 backdrop-blur-xl border-b border-white/50 dark:border-zinc-800 shadow-sm transition-colors duration-300">
        <div className="mx-auto flex flex-col md:flex-row max-w-6xl items-center gap-4 md:gap-6 px-4 py-3">
          <div className="flex w-full justify-between items-center md:w-auto">
            <span className="font-semibold dark:text-zinc-100 flex items-center gap-2 truncate">
              <span className="text-xl">📅</span> <span className="hidden sm:inline">ระบบตารางเรียนตารางสอน</span><span className="sm:hidden">ระบบตารางสอน</span>
            </span>
            
            <div className="flex md:hidden items-center gap-3">
              {conflicts.length > 0 && currentUser.role === 'admin' && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full ring-1 ring-amber-200/50">
                  <AlertTriangle size={14} />
                  <span>{conflicts.length}</span>
                </div>
              )}
              <button onClick={() => setIsDark(!isDark)} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800">
                {isDark ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} />}
              </button>
              <button onClick={() => setCurrentUser(null)} className="p-1.5 rounded-full text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                <LogOut size={16} />
              </button>
            </div>
          </div>

          <nav className="flex gap-1 text-sm text-slate-500 dark:text-zinc-400 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            {allowedTabs.map(tab => (
              <a 
                key={tab.name} 
                href={tab.path} 
                className={clsx(
                  "px-4 py-1.5 rounded-full cursor-pointer transition-all duration-300 font-medium whitespace-nowrap",
                  activeTab === tab.name 
                    ? "text-[#1e4c7c] bg-sky-50 shadow-sm ring-1 ring-sky-200/50 dark:text-zinc-100 dark:bg-zinc-800 dark:ring-0" 
                    : "hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200"
                )}
                onClick={(e) => { e.preventDefault(); setActiveTab(tab.name); }}
              >
                {tab.name}
              </a>
            ))}
          </nav>
          
          <div className="hidden md:flex ml-auto items-center gap-3">
            {conflicts.length > 0 && currentUser.role === 'admin' && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full ring-1 ring-amber-200/50 cursor-help" title={conflicts.join('\n')}>
                <AlertTriangle size={14} />
                <span>พบตารางชน {conflicts.length} จุด</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 border-l border-slate-200 dark:border-zinc-700 pl-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">{currentUser.username}</span>
                <span className="text-[10px] uppercase text-[#1e4c7c] dark:text-sky-400 font-bold">{currentUser.role}</span>
              </div>
              <button 
                onClick={() => setCurrentUser(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                title="ออกจากระบบ"
              >
                <LogOut size={16} />
              </button>
            </div>

            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
              title="Toggle Dark Mode"
            >
              {isDark ? <Sun size={16} className="text-yellow-400" /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <AnimatePresence mode="wait">
        {activeTab === 'ข้อมูลหลัก' && (
          <motion.div key="masters" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <Masters />
          </motion.div>
        )}
        {activeTab === 'พิมพ์ตาราง' && (
          <motion.div key="sheet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <Sheet />
          </motion.div>
        )}
        {activeTab === 'จัดตารางสอน' && (
          <motion.div key="builder" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <ScheduleBuilder />
          </motion.div>
        )}
        {activeTab === 'แดชบอร์ด' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            <Dashboard />
          </motion.div>
        )}
        {activeTab === 'ตาราง' && (
          <motion.div key="schedule" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#1e4c7c] to-[#3a7ca5] bg-clip-text text-transparent dark:from-[#3a7ca5] dark:to-[#1e4c7c]">ตารางเรียนตารางสอน</h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">เลือกมุมมองและรายการเพื่อดูตารางทั้งสัปดาห์</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex p-1 rounded-xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md shadow-sm border border-slate-200/60 dark:border-zinc-800">
                  <button onClick={() => setViewType('section')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition-all", viewType === 'section' ? "bg-white text-[#1e4c7c] shadow-sm dark:bg-zinc-800 dark:text-sky-400" : "text-slate-600 dark:text-zinc-400")}>กลุ่มเรียน</button>
                  <button onClick={() => setViewType('instructor')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition-all", viewType === 'instructor' ? "bg-white text-[#1e4c7c] shadow-sm dark:bg-zinc-800 dark:text-sky-400" : "text-slate-600 dark:text-zinc-400")}>อาจารย์</button>
                  <button onClick={() => setViewType('room')} className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition-all", viewType === 'room' ? "bg-white text-[#1e4c7c] shadow-sm dark:bg-zinc-800 dark:text-sky-400" : "text-slate-600 dark:text-zinc-400")}>ห้องเรียน</button>
                </div>
                
                <div className="relative">
                  <select 
                    value={selectedEntity}
                    onChange={(e) => setSelectedEntity(e.target.value)}
                    className="h-10 w-full appearance-none rounded-xl border border-slate-200/60 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 backdrop-blur-sm pl-4 pr-10 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900 sm:w-auto shadow-sm transition-all"
                  >
                    {options.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name || opt.code || opt.id}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500" size={14} />
                </div>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-[#121214] backdrop-blur-xl border border-white/40 dark:border-zinc-800 shadow-xl shadow-sky-900/5 dark:shadow-black/50 rounded-3xl overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center p-16 text-zinc-500 gap-4"><Loader2 className="animate-spin" size={32} /></div>
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
                        <div className={clsx("col-span-14 relative min-h-[80px] bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#27272a_1px,transparent_1px)] bg-[size:calc(100%/14)_100%]", idx !== 4 && "border-b border-slate-200/60 dark:border-zinc-800")}>
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
                                <div className="h-full w-full overflow-hidden relative z-10">
                                <div className="font-semibold">{item.courseCode} {item.courseName}</div>
                                <div className="mt-1 opacity-90 truncate">{item.instructorName}</div>
                                <div className="mt-0.5 opacity-80 flex items-center justify-between">
                                  <span>ห้อง {item.roomName}</span>
                                  <span className="bg-white/40 dark:bg-black/20 px-1.5 rounded-full text-[10px]">กลุ่ม {item.sectionName}</span>
                                </div>
                                </div>
                                <AnimatePresence>
                                  {hoveredSchedule === item && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 rounded-xl bg-white dark:bg-zinc-800 shadow-xl border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200">
                                      <div className="font-bold text-sm text-[#1e4c7c] dark:text-sky-400 mb-1">{item.courseCode}</div>
                                      <div className="font-medium text-xs mb-2 leading-tight">{item.courseName}</div>
                                      <div className="text-xs space-y-1">
                                        <div className="flex items-center gap-1 opacity-80">👩‍🏫 {item.instructorName}</div>
                                        <div className="flex items-center gap-1 opacity-80">🚪 ห้อง {item.roomName}</div>
                                        <div className="flex items-center gap-1 opacity-80">👥 กลุ่ม {item.sectionName}</div>
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


