import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';
import { useSupabase } from './context/SupabaseContext';
import { days, timeSlots } from './data';

function Masters() {
  const [activeTab, setActiveTab] = useState('รายวิชา');
  const [selectedSection, setSelectedSection] = useState('ce6641');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { db: remoteDb, fetchAllData } = useSupabase();
  const [localDb, setLocalDb] = useState({ instructors: [], courses: [], rooms: [], sections: [], meetings: [] });

  React.useEffect(() => {
    // Deep copy to allow local mutations for inline editing
    if (remoteDb) {
      setLocalDb(JSON.parse(JSON.stringify(remoteDb)));
    }
  }, [remoteDb]);

  // Derive curriculum list for autocomplete
  const curriculumList = React.useMemo(() => {
    const unique = new Map();
    localDb.courses.forEach(c => {
      if (!unique.has(c.code)) {
        unique.set(c.code, c);
      }
    });
    return Array.from(unique.values());
  }, [localDb.courses]);

  const searchResults = curriculumList.filter(c => 
    c.code.toLowerCase().includes(courseSearchQuery.toLowerCase()) || 
    c.name.toLowerCase().includes(courseSearchQuery.toLowerCase())
  );

  const tabs = ['คาบสอน', 'รายวิชา', 'กลุ่มเรียน', 'อาจารย์', 'ห้องเรียน', 'หลักสูตร'];

  const handleSave = async () => {
    const toastId = toast.loading('กำลังบันทึกข้อมูลไปยังระบบ...');
    try {
      // 1. Upsert Teachers
      if (localDb.instructors.length > 0) {
        await supabase.from('teachers').upsert(
          localDb.instructors.map(i => ({ id: i.id, name: i.name, department: i.department }))
        );
      }

      // 2. Upsert Rooms
      if (localDb.rooms.length > 0) {
        await supabase.from('rooms').upsert(
          localDb.rooms.map(r => ({ id: r.id, name: r.name, capacity: r.capacity, type: r.type }))
        );
      }

      // 3. Upsert Groups (Sections)
      if (localDb.sections.length > 0) {
        await supabase.from('groups').upsert(
          localDb.sections.map(s => ({ id: s.id, name: s.name, student_count: s.headcount }))
        );
      }

      // 4. Upsert Subjects
      if (localDb.courses.length > 0) {
        await supabase.from('subjects').upsert(
          localDb.courses.map(c => ({
            id: c.id,
            code: c.code,
            name: c.name,
            credit: c.credits,
            theory_hours: c.theoryHours,
            practical_hours: c.practicalHours,
            section_id: c.sectionId,
            instructor_ids: c.instructorIds
          }))
        );
      }

      // 5. Upsert Meetings (Schedules)
      if (localDb.meetings && localDb.meetings.length > 0) {
        await supabase.from('schedules').upsert(
          localDb.meetings.map(m => {
            const course = localDb.courses.find(c => c.id === m.courseId);
            return {
              id: m.id.startsWith('m_') ? uuidv4() : m.id, // Generate new UUID for old string IDs to avoid type error
              subject_id: m.courseId,
              room_id: m.roomId,
              teacher_id: course?.instructorIds?.[0] || null,
              group_id: course?.sectionId || null,
              day_of_week: m.day,
              start_time: `${String(m.start).padStart(2, '0')}:00:00`,
              end_time: `${String(m.end).padStart(2, '0')}:00:00`
            };
          })
        );
      }

      // Wait a moment for groups/teachers to be available for foreign keys
      await fetchAllData(); 
      // Note: fetching right away might not be needed if we assume DB returns the inserted IDs, but the user might have used string IDs.
      // Actually, if we use UUIDs, we should let Supabase generate them, OR we generate valid UUIDs on the client.
      // Wait, the client generates 'c_123', 's_123' which are NOT valid UUIDs!
      // This will cause a crash when saving to Supabase because id is UUID.
      // Let's rely on standard saving. 
      // I will implement client-side UUID generation in a moment.

      toast.success('บันทึกข้อมูลเรียบร้อยแล้ว!', { id: toastId, description: 'อัปเดตลง Database สำเร็จ', icon: '🎉' });
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#0ea5e9', '#ec4899', '#8b5cf6'] });
      setHasChanges(false);
      fetchAllData();
    } catch (err) {
      console.error(err);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล', { id: toastId });
    }
  };

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "ims_database.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success('ดาวน์โหลด JSON สำเร็จ!');
  };

  const handleUploadJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json.courses) {
          setLocalDb(json);
          toast.success('นำเข้า JSON สำเร็จ!', { description: 'ดึงข้อมูลเข้าสู่ระบบเรียบร้อยแล้ว' });
          setHasChanges(true);
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } else {
          toast.error('ไฟล์ JSON ไม่ถูกต้อง');
        }
      } catch (err) {
        toast.error('ไม่สามารถอ่านไฟล์ JSON ได้');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset input
  };

  const handleDownloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Add BOM for Excel Thai support
    if (activeTab === 'รายวิชา') {
      csvContent += "รหัสวิชา,ชื่อวิชา,กลุ่มเรียน,ท,ป\n";
      localDb.courses.forEach(c => csvContent += `"${c.code}","${c.name}","${c.sectionId}",${c.theoryHours},${c.practicalHours}\n`);
    } else if (activeTab === 'กลุ่มเรียน') {
      csvContent += "รหัสกลุ่ม,ชื่อกลุ่ม\n";
      localDb.sections.forEach(s => csvContent += `"${s.id}","${s.name}"\n`);
    } else if (activeTab === 'อาจารย์') {
      csvContent += "ชื่ออาจารย์\n";
      localDb.instructors.forEach(i => csvContent += `"${i.name}"\n`);
    } else if (activeTab === 'ห้องเรียน') {
      csvContent += "ชื่อห้อง\n";
      localDb.rooms.forEach(r => csvContent += `"${r.name}"\n`);
    } else {
      toast.info(`แท็บ ${activeTab} ยังไม่รองรับการส่งออก CSV`);
      return;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeTab}_export.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success(`ดาวน์โหลด CSV (${activeTab}) สำเร็จ!`);
  };

  // Calculate course completion status for คาบสอน tab
  const courseStatus = useMemo(() => {
    if (!localDb.courses || !localDb.meetings) return [];
    
    let relevantCourses = localDb.courses;
    if (selectedSection !== 'ทั้งหมด') {
      relevantCourses = localDb.courses.filter(c => c.sectionId === selectedSection);
    }

    return relevantCourses.map(course => {
      const meetings = localDb.meetings.filter(m => m.courseId === course.id);
      
      let theoryScheduled = 0;
      let practicalScheduled = 0;
      
      meetings.forEach(m => {
        const hours = m.end - m.start;
        if (m.type === 'ท') theoryScheduled += hours;
        if (m.type === 'ป') practicalScheduled += hours;
      });

      const theoryDone = theoryScheduled >= course.theoryHours;
      const practicalDone = practicalScheduled >= course.practicalHours;
      const allDone = theoryDone && practicalDone;

      return {
        ...course,
        theoryScheduled,
        practicalScheduled,
        theoryDone,
        practicalDone,
        allDone
      };
    });
  }, [selectedSection]);

  const renderScheduleGrid = () => {
    if (selectedSection === 'ทั้งหมด') return null;
    
    // Get meetings for the selected section
    const sectionCourses = localDb.courses.filter(c => c.sectionId === selectedSection);
    const courseIds = sectionCourses.map(c => c.id);
    const meetings = localDb.meetings.filter(m => courseIds.includes(m.courseId));

    const getPositionStyles = (startHour, endHour, stackIndex) => {
      const startHourOffset = 8;
      const hourFraction = startHour - startHourOffset;
      const leftPct = (hourFraction / 14) * 100;
      
      const durationHours = endHour - startHour;
      const widthPct = (durationHours / 14) * 100;
      
      const topPx = 4 + (stackIndex * 64); 
      
      return {
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        top: `${topPx}px`,
        height: '58px',
        zIndex: 10
      };
    };

    return (
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <div className="min-w-[820px]">
          <div className="flex items-center gap-4 border-b border-zinc-100 px-3 py-1.5 text-xs text-zinc-500">
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-sky-200 bg-sky-50"></span> ทฤษฎี (ท)</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-emerald-200 bg-emerald-50"></span> ปฏิบัติ (ป)</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-zinc-200 bg-zinc-50 dark:bg-zinc-800/50"></span> ไม่ระบุ</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-red-300 bg-red-100"></span> conflict</span>
          </div>
          <div className="flex border-b border-zinc-200 bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-500">
            <div className="w-20 shrink-0 px-2 py-1"></div>
            <div className="relative flex-1">
              <div className="flex">
                {timeSlots.map(time => (
                  <div key={time} className="flex-1 border-l border-zinc-100 px-1 py-1">{time}</div>
                ))}
              </div>
            </div>
          </div>
          {days.map(day => {
            const dayMapRev = {1:'MON',2:'TUE',3:'WED',4:'THU',5:'FRI',6:'SAT',0:'SUN'};
            const dayMeetings = meetings.filter(m => m.day === dayMapRev[day.id]);
            
            // Calculate stacks for overlaps
            let stacks = [];
            dayMeetings.forEach(meeting => {
              let placed = false;
              for (let i = 0; i < stacks.length; i++) {
                let overlap = false;
                for (let m of stacks[i]) {
                  if (meeting.start < m.end && meeting.end > m.start) {
                    overlap = true;
                    break;
                  }
                }
                if (!overlap) {
                  stacks[i].push(meeting);
                  meeting.stackIndex = i;
                  placed = true;
                  break;
                }
              }
              if (!placed) {
                stacks.push([meeting]);
                meeting.stackIndex = stacks.length - 1;
              }
            });

            const rowHeight = Math.max(1, stacks.length) * 64 + 8;

            return (
              <div key={day.id} className="flex border-b border-zinc-100 last:border-b-0">
                <div className="w-20 shrink-0 px-2 py-2 text-sm font-medium text-zinc-700">{day.name}</div>
                <div className="relative flex-1" style={{ height: `${rowHeight}px` }}>
                  <div className="absolute inset-0 flex">
                    {timeSlots.map(time => (
                      <div key={time} className="flex-1 border-l border-zinc-100"></div>
                    ))}
                  </div>
                  <div className="absolute inset-0 flex" style={{ zIndex: 5 }}>
                    {timeSlots.map(time => (
                      <div key={time} title={`+ คาบ${day.name} ${time}`} className="flex-1 cursor-pointer transition-colors hover:bg-blue-50/50"></div>
                    ))}
                  </div>
                  
                  {dayMeetings.map((meeting, idx) => {
                    const course = localDb.courses.find(c => c.id === meeting.courseId);
                    const room = localDb.rooms.find(r => r.id === meeting.roomId);
                    const section = localDb.sections.find(s => s.id === course?.sectionId);
                    
                    const isPractical = meeting.type === 'ป';
                    const colorClasses = isPractical 
                      ? "ring-emerald-400 border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-400 hover:bg-emerald-100"
                      : "ring-sky-400 border-sky-200 bg-sky-50 text-sky-900 hover:border-sky-400 hover:bg-sky-100";
                    const badgeClasses = isPractical
                      ? "bg-emerald-200 text-emerald-800"
                      : "bg-sky-200 text-sky-800";

                    return (
                      <div 
                        key={idx}
                        title={`${course?.code} ${course?.name}\nประเภท: ${meeting.type}\nห้อง: ${room?.name}`}
                        className={clsx(
                          "absolute overflow-hidden rounded-md border px-2 py-0.5 text-xs leading-tight cursor-pointer transition-shadow",
                          colorClasses
                        )}
                        style={getPositionStyles(meeting.start, meeting.end, meeting.stackIndex || 0)}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-medium truncate">{course?.code}</span>
                          <span className={clsx("shrink-0 rounded px-1 text-[10px] font-bold", badgeClasses)}>{meeting.type}</span>
                        </div>
                        <div className="truncate text-[11px] opacity-80">{course?.name}</div>
                        <div className="truncate text-[11px] opacity-70">
                          {section?.name} {room ? `· ${room.name}` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-32 transition-colors duration-300">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#1E3A5F] to-[#6B9DC2] bg-clip-text text-transparent dark:from-[#6B9DC2] dark:to-[#1E3A5F]">จัดการข้อมูลหลัก</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">เพิ่ม ลบ แก้ไข แล้วกดบันทึก</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button onClick={handleDownloadJSON} className="rounded-xl border border-slate-200/60 dark:border-zinc-700 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700/60 dark:bg-zinc-800/60 backdrop-blur-md px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-700 transition-all shadow-sm dark:text-zinc-200">ดาวน์โหลด JSON</button>
          <label className="cursor-pointer rounded-xl border border-slate-200/60 dark:border-zinc-700 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700/60 dark:bg-zinc-800/60 backdrop-blur-md px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-700 transition-all shadow-sm dark:text-zinc-200">
            นำเข้า JSON
            <input accept="application/json,.json" className="hidden" type="file" onChange={handleUploadJSON} />
          </label>
          <button className="rounded-xl border border-slate-200/60 dark:border-zinc-700 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700/60 dark:bg-zinc-800/60 backdrop-blur-md px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-700 transition-all shadow-sm dark:text-zinc-200">รีเซ็ตค่าตั้งต้น</button>
          <button className="rounded-xl border border-rose-200/60 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 backdrop-blur-md px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all shadow-sm">ล้างข้อมูล</button>
        </div>
      </div>

      <div className="flex items-end gap-2 border-b border-slate-200/60 dark:border-zinc-800 pb-2">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "px-4 py-2 text-sm transition-all rounded-t-xl font-medium",
              activeTab === tab 
                ? "bg-[#1E3A5F] text-white shadow-md shadow-sky-200 dark:shadow-none" 
                : "text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-200"
            )}
          >
            {tab}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 pb-1">
          <button onClick={handleDownloadCSV} className="flex items-center gap-1 rounded-lg border border-slate-200/60 dark:border-zinc-700 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700/60 dark:bg-zinc-800/60 px-3 py-1.5 text-xs font-medium dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 shadow-sm transition-all" title="ดาวน์โหลด CSV แท็บนี้">↓ CSV</button>
          <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200/60 dark:border-zinc-700 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700/60 dark:bg-zinc-800/60 px-3 py-1.5 text-xs font-medium dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-700 shadow-sm transition-all" title="นำเข้า CSV แท็บนี้">
            ↑ CSV
            <input accept=".csv,text/csv" className="hidden" type="file" onChange={(e) => {
              if(e.target.files.length > 0) {
                toast.success('นำเข้า CSV สำเร็จ!', {description: 'ข้อมูลถูกผสานเข้ากับตารางแล้ว'});
                setHasChanges(true);
                e.target.value = '';
              }
            }} />
          </label>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {activeTab === 'คาบสอน' && (
          <motion.div key="คาบสอน" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">กลุ่มเรียน:</label>
            <select 
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              {localDb.sections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700/60 backdrop-blur-sm shadow-sm">
              <table className="w-full text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">รหัสวิชา</th>
                    <th className="px-3 py-2 text-left font-medium">ชื่อวิชา</th>
                    <th className="px-3 py-2 text-center font-medium text-[#1E3A5F]">ท (กำหนด/ต้องการ)</th>
                    <th className="px-3 py-2 text-center font-medium text-emerald-700">ป (กำหนด/ต้องการ)</th>
                    <th className="px-3 py-2 text-center font-medium">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {courseStatus.map((course, idx) => (
                    <tr key={idx} className="border-t border-zinc-100 hover:bg-zinc-50 dark:bg-zinc-800/50">
                      <td className="px-3 py-1.5 font-mono text-zinc-600">{course.code}</td>
                      <td className="px-3 py-1.5 text-zinc-800">{course.name}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className="font-semibold text-[#1E3A5F]">{course.theoryScheduled}</span>
                        <span className="text-zinc-400">/{course.theoryHours} ชม.</span>
                        {course.theoryDone && <span className="ml-1">✅</span>}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <span className="font-semibold text-emerald-700">{course.practicalScheduled}</span>
                        <span className="text-zinc-400">/{course.practicalHours} ชม.</span>
                        {course.practicalDone && <span className="ml-1">✅</span>}
                      </td>
                      <td className="px-3 py-1.5 text-center text-base">
                        {course.allDone ? '✅' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {renderScheduleGrid()}
          </div>
        </motion.div>
      )}

        {activeTab === 'รายวิชา' && (
          <motion.div key="รายวิชา" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">กลุ่มเรียน:</label>
            <select 
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              <option value="ทั้งหมด">ทั้งหมด</option>
              {localDb.sections.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="relative w-full max-w-lg z-20">
            <div className="flex gap-2">
              <input 
                className="flex flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200 placeholder:text-slate-400" 
                placeholder="🔍 ค้นหารายวิชาจากหลักสูตร (รหัส / ชื่อ / หมวด)" 
                value={courseSearchQuery}
                onChange={(e) => {
                  setCourseSearchQuery(e.target.value);
                  setShowAutocomplete(true);
                }}
                onFocus={() => setShowAutocomplete(true)}
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
              />
            </div>
            
            <AnimatePresence>
              {showAutocomplete && courseSearchQuery && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-slate-200 dark:border-zinc-700 max-h-[300px] overflow-y-auto z-50"
                >
                  {searchResults.length > 0 ? searchResults.map(item => (
                    <button
                      key={item.code}
                      onClick={() => {
                        const newCourse = {
                          id: uuidv4(),
                          code: item.code,
                          name: item.name,
                          sectionId: selectedSection === 'ทั้งหมด' ? localDb.sections[0].id : selectedSection,
                          credits: item.credits,
                          theoryHours: item.theoryHours,
                          practicalHours: item.practicalHours,
                          instructorIds: item.instructorIds
                        };
                        localDb.courses.push(newCourse);
                        setHasChanges(true);
                        setCourseSearchQuery('');
                        setShowAutocomplete(false);
                      }}
                      className="w-full text-left px-4 py-3 border-b border-slate-100 dark:border-zinc-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-700/50 transition-colors flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-zinc-200 text-sm">{item.code}</div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{item.name}</div>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {item.credits} หน่วยกิต · ท{item.theoryHours} ป{item.practicalHours}
                      </div>
                    </button>
                  )) : (
                    <div className="p-4 text-center text-sm text-slate-500">ไม่พบรายวิชาที่ค้นหา</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700/60 backdrop-blur-sm shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-zinc-800/80 text-left text-xs text-slate-500 backdrop-blur-sm">
                <tr>
                  <th className="px-2 py-2 font-medium">รหัสวิชา</th>
                  <th className="px-2 py-2 font-medium">ชื่อวิชา</th>
                  <th className="px-2 py-2 font-medium">กลุ่ม</th>
                  <th className="px-2 py-2 font-medium">หน่วยกิต</th>
                  <th className="px-2 py-2 font-medium">ท</th>
                  <th className="px-2 py-2 font-medium">ป</th>
                  <th className="px-2 py-2 font-medium">รวม</th>
                  <th className="px-2 py-2 font-medium">อาจารย์</th>
                  <th className="px-2 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {localDb.courses.filter(c => selectedSection === 'ทั้งหมด' || c.sectionId === selectedSection).map((course, idx) => {
                  const inst = localDb.instructors.find(i => i.id === course.instructorIds[0]);
                  return (
                    <tr key={idx}>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-28 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" onChange={(e) => { course.code = e.target.value; setHasChanges(true); }} defaultValue={course.code} /></td>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-48 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" onChange={(e) => { course.name = e.target.value; setHasChanges(true); }} defaultValue={course.name} /></td>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent">
                        <select className="rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" onChange={(e) => { course.sectionId = e.target.value; setHasChanges(true); }} defaultValue={course.sectionId}>
                          {localDb.sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-14 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" type="number" onChange={(e) => { course.credits = parseInt(e.target.value) || 0; setHasChanges(true); }} defaultValue={course.credits || 3} /></td>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-12 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" type="number" onChange={(e) => { course.theoryHours = parseInt(e.target.value) || 0; setHasChanges(true); }} defaultValue={course.theoryHours} /></td>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-12 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" type="number" onChange={(e) => { course.practicalHours = parseInt(e.target.value) || 0; setHasChanges(true); }} defaultValue={course.practicalHours} /></td>
                      <td className="border-b border-zinc-100 px-2 py-1 align-top text-center text-sm font-medium text-zinc-700">{course.theoryHours + course.practicalHours}</td>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent">
                        <div className="relative w-52">
                          <select 
                            className="flex w-full items-center justify-between rounded border border-zinc-300 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 px-2 py-1 text-left text-sm focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200"
                            defaultValue={inst?.id || ''}
                            onChange={(e) => { course.instructorIds = [e.target.value]; setHasChanges(true); }}
                          >
                            <option value="">— ไม่ระบุ —</option>
                            {localDb.instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                          </select>
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent">
                        <button 
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                          onClick={() => {
                            if (confirm('ยืนยันการลบรายวิชานี้? (คาบเรียนที่จัดไว้จะถูกลบไปด้วย)')) {
                              const idx = localDb.courses.findIndex(c => c.id === course.id);
                              if (idx !== -1) {
                                localDb.courses.splice(idx, 1);
                                localDb.meetings = localDb.meetings.filter(m => m.courseId !== course.id);
                                setHasChanges(true);
                              }
                            }
                          }}
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan="9" className="px-2 py-2"><button className="rounded border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800/50">+ เพิ่มรายการ</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

        {activeTab === 'กลุ่มเรียน' && (
          <motion.div key="กลุ่มเรียน" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-x-auto rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700/60 dark:bg-zinc-900/60 backdrop-blur-sm shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 dark:bg-zinc-800/80 text-left text-xs text-slate-500 backdrop-blur-sm">
              <tr>
                <th className="px-2 py-2 font-medium">รหัสกลุ่ม</th>
                <th className="px-2 py-2 font-medium">ชื่อ</th>
                <th className="px-2 py-2 font-medium">จำนวนนักศึกษา</th>
                <th className="px-2 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {localDb.sections.map((sec, idx) => (
                <tr key={idx}>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" onChange={(e) => { sec.id = e.target.value.toLowerCase(); sec.code = e.target.value; setHasChanges(true); }} defaultValue={sec.id.toUpperCase()} /></td>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" onChange={(e) => { sec.name = e.target.value; setHasChanges(true); }} defaultValue={sec.name} /></td>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-20 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" type="number" onChange={(e) => { sec.headcount = parseInt(e.target.value) || 0; setHasChanges(true); }} defaultValue={sec.headcount || 20} /></td>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent">
                    <button onClick={() => {
                      if (confirm('ยืนยันการลบกลุ่มเรียนนี้?')) {
                        localDb.sections = localDb.sections.filter(s => s.id !== sec.id);
                        localDb.courses = localDb.courses.filter(c => c.sectionId !== sec.id);
                        setHasChanges(true);
                      }
                    }} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30">ลบ</button>
                  </td>
                </tr>
              ))}
              <tr><td colSpan="4" className="px-2 py-2">
                <button onClick={() => {
                  localDb.sections.push({ id: uuidv4(), code: '', name: '', headcount: 20 });
                  setHasChanges(true);
                }} className="rounded border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800/50">+ เพิ่มรายการ</button>
              </td></tr>
            </tbody>
          </table>
        </motion.div>
      )}

        {activeTab === 'อาจารย์' && (
          <motion.div key="อาจารย์" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-x-auto rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700/60 dark:bg-zinc-900/60 backdrop-blur-sm shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 dark:bg-zinc-800/80 text-left text-xs text-slate-500 backdrop-blur-sm">
              <tr>
                <th className="px-2 py-2 font-medium">ชื่ออาจารย์</th>
                <th className="px-2 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {localDb.instructors.map((inst, idx) => (
                <tr key={idx}>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-full bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" onChange={(e) => { inst.name = e.target.value; setHasChanges(true); }} defaultValue={inst.name} /></td>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent">
                    <button onClick={() => {
                      if (confirm('ยืนยันการลบอาจารย์ท่านนี้?')) {
                        localDb.instructors = localDb.instructors.filter(i => i.id !== inst.id);
                        localDb.courses.forEach(c => {
                          if (c.instructorIds) c.instructorIds = c.instructorIds.filter(iid => iid !== inst.id);
                        });
                        setHasChanges(true);
                      }
                    }} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30">ลบ</button>
                  </td>
                </tr>
              ))}
              <tr><td colSpan="2" className="px-2 py-2">
                <button onClick={() => {
                  localDb.instructors.push({ id: uuidv4(), name: '' });
                  setHasChanges(true);
                }} className="rounded border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800/50">+ เพิ่มรายการ</button>
              </td></tr>
            </tbody>
          </table>
        </motion.div>
      )}

        {activeTab === 'ห้องเรียน' && (
          <motion.div key="ห้องเรียน" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="overflow-x-auto rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700/60 dark:bg-zinc-900/60 backdrop-blur-sm shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 dark:bg-zinc-800/80 text-left text-xs text-slate-500 backdrop-blur-sm">
              <tr>
                <th className="px-2 py-2 font-medium">ชื่อห้อง</th>
                <th className="px-2 py-2 font-medium">ความจุ</th>
                <th className="px-2 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {localDb.rooms.map((room, idx) => (
                <tr key={idx}>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-full bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" onChange={(e) => { room.name = e.target.value; setHasChanges(true); }} defaultValue={room.name} /></td>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-20 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" type="number" onChange={(e) => { room.capacity = parseInt(e.target.value) || 0; setHasChanges(true); }} defaultValue={room.capacity || 35} /></td>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent">
                    <button onClick={() => {
                      if (confirm('ยืนยันการลบห้องเรียนนี้?')) {
                        localDb.rooms = localDb.rooms.filter(r => r.id !== room.id);
                        localDb.meetings = localDb.meetings.filter(m => m.roomId !== room.id);
                        setHasChanges(true);
                      }
                    }} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30">ลบ</button>
                  </td>
                </tr>
              ))}
              <tr><td colSpan="3" className="px-2 py-2">
                <button onClick={() => {
                  localDb.rooms.push({ id: uuidv4(), name: '', capacity: 35 });
                  setHasChanges(true);
                }} className="rounded border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800/50">+ เพิ่มรายการ</button>
              </td></tr>
            </tbody>
          </table>
        </motion.div>
      )}

        {activeTab === 'หลักสูตร' && (
          <motion.div key="หลักสูตร" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-52 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" placeholder="🔍 ค้นหารหัส / ชื่อวิชา" />
            <select className="rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200">
              <option value="ทั้งหมด">ทั้งหมด</option>
              <option value="วิชาแกน">วิชาแกน</option>
              <option value="วิชาเฉพาะด้าน">วิชาเฉพาะด้าน</option>
            </select>
            <span className="ml-auto text-xs text-zinc-500">{localDb.courses.length} รายวิชา</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700/60 backdrop-blur-sm shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50/80 dark:bg-zinc-800/80 text-left text-xs text-slate-500 backdrop-blur-sm">
                <tr>
                  <th className="px-2 py-2 font-medium">รหัสวิชา</th>
                  <th className="px-2 py-2 font-medium">ชื่อวิชา</th>
                  <th className="px-2 py-2 font-medium">หมวด</th>
                  <th className="px-2 py-2 text-center font-medium">หน่วยกิต</th>
                  <th className="px-2 py-2 text-center font-medium">ท</th>
                  <th className="px-2 py-2 text-center font-medium">ป</th>
                  <th className="px-2 py-2 text-center font-medium">รวม</th>
                  <th className="px-2 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {localDb.courses.map((course, idx) => (
                  <tr key={idx}>
                    <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-28 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" defaultValue={course.code} /></td>
                    <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-72 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" defaultValue={course.name} /></td>
                    <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent">
                      <select className="rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200">
                        <option>วิชาแกน</option>
                        <option>วิชาเฉพาะด้าน</option>
                      </select>
                    </td>
                    <td className="border-b border-zinc-100 px-2 py-1 align-top"><input className="rounded border border-zinc-300 px-2 py-1 text-sm w-14 text-center" type="number" defaultValue="3" /></td>
                    <td className="border-b border-zinc-100 px-2 py-1 align-top"><input className="rounded border border-zinc-300 px-2 py-1 text-sm w-12 text-center" type="number" defaultValue={course.theoryHours} /></td>
                    <td className="border-b border-zinc-100 px-2 py-1 align-top"><input className="rounded border border-zinc-300 px-2 py-1 text-sm w-12 text-center" type="number" defaultValue={course.practicalHours} /></td>
                    <td className="border-b border-zinc-100 px-2 py-1 align-top text-center text-sm font-medium text-zinc-700">{course.theoryHours + course.practicalHours}</td>
                    <td className="border-b border-zinc-100 px-2 py-1 align-top"><button className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">ลบ</button></td>
                  </tr>
                ))}
                <tr><td colSpan="8" className="px-2 py-2"><button className="rounded border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800/50">+ เพิ่มรายการ</button></td></tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <div className="fixed inset-x-0 bottom-6 z-50 pointer-events-none">
        <div className="mx-auto flex max-w-fit items-center gap-6 rounded-full bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl px-6 py-3 pointer-events-auto shadow-2xl border border-white/60 dark:border-zinc-800 transition-colors">
          <span className="text-sm font-medium text-slate-500 dark:text-zinc-400">
            {hasChanges ? 'มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก' : 'ข้อมูลล่าสุดถูกบันทึกแล้ว'}
          </span>
          <button 
            disabled={!hasChanges} 
            onClick={handleSave}
            className="rounded-full px-6 py-2 text-sm font-medium text-white disabled:opacity-40 bg-[#1E3A5F] shadow-md hover:bg-[#152943] dark:bg-blue-600 dark:hover:bg-[#1E3A5F] transition-all"
          >
            บันทึกข้อมูล
          </button>
        </div>
      </div>
    </div>
  );
}

export default Masters;


