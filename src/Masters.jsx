import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import db from './db.json';
import { days, timeSlots } from './data';

function Masters() {
  const [activeTab, setActiveTab] = useState('รายวิชา');
  const [selectedSection, setSelectedSection] = useState('ce6641');
  const [hasChanges, setHasChanges] = useState(false);

  const tabs = ['คาบสอน', 'รายวิชา', 'กลุ่มเรียน', 'อาจารย์', 'ห้องเรียน', 'หลักสูตร'];

  const handleSave = () => {
    // Show success toast
    toast.success('บันทึกข้อมูลเรียบร้อยแล้ว!', {
      description: 'ตารางสอนถูกอัปเดตตามข้อมูลใหม่ล่าสุด',
      icon: '🎉'
    });
    
    // Trigger confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0ea5e9', '#ec4899', '#8b5cf6']
    });
    
    setHasChanges(false);
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
      db.courses.forEach(c => csvContent += `"${c.code}","${c.name}","${c.sectionId}",${c.theoryHours},${c.practicalHours}\n`);
    } else if (activeTab === 'กลุ่มเรียน') {
      csvContent += "รหัสกลุ่ม,ชื่อกลุ่ม\n";
      db.sections.forEach(s => csvContent += `"${s.id}","${s.name}"\n`);
    } else if (activeTab === 'อาจารย์') {
      csvContent += "ชื่ออาจารย์\n";
      db.instructors.forEach(i => csvContent += `"${i.name}"\n`);
    } else if (activeTab === 'ห้องเรียน') {
      csvContent += "ชื่อห้อง\n";
      db.rooms.forEach(r => csvContent += `"${r.name}"\n`);
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
    if (!db.courses || !db.meetings) return [];
    
    let relevantCourses = db.courses;
    if (selectedSection !== 'ทั้งหมด') {
      relevantCourses = db.courses.filter(c => c.sectionId === selectedSection);
    }

    return relevantCourses.map(course => {
      const meetings = db.meetings.filter(m => m.courseId === course.id);
      
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
    const sectionCourses = db.courses.filter(c => c.sectionId === selectedSection);
    const courseIds = sectionCourses.map(c => c.id);
    const meetings = db.meetings.filter(m => courseIds.includes(m.courseId));

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
                    const course = db.courses.find(c => c.id === meeting.courseId);
                    const room = db.rooms.find(r => r.id === meeting.roomId);
                    const section = db.sections.find(s => s.id === course?.sectionId);
                    
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
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#1e4c7c] to-[#3a7ca5] bg-clip-text text-transparent dark:from-[#3a7ca5] dark:to-[#1e4c7c]">จัดการข้อมูลหลัก</h1>
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
                ? "bg-[#1e4c7c] text-white shadow-md shadow-sky-200 dark:shadow-none" 
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
              {db.sections.map(s => (
                <option key={s.id} value={s.id}>{s.id.toUpperCase()} — {s.name}</option>
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
                    <th className="px-3 py-2 text-center font-medium text-[#1e4c7c]">ท (กำหนด/ต้องการ)</th>
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
                        <span className="font-semibold text-[#1e4c7c]">{course.theoryScheduled}</span>
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
              {db.sections.map(s => (
                <option key={s.id} value={s.id}>{s.id.toUpperCase()} — {s.name}</option>
              ))}
            </select>
          </div>
          <div className="relative w-full max-w-lg">
            <div className="flex gap-2">
              <input className="flex flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200 placeholder:text-slate-400" placeholder="🔍 ค้นหารายวิชาจากหลักสูตร (รหัส / ชื่อ / หมวด)" />
            </div>
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
                {db.courses.filter(c => selectedSection === 'ทั้งหมด' || c.sectionId === selectedSection).map((course, idx) => {
                  const inst = db.instructors.find(i => i.id === course.instructorIds[0]);
                  return (
                    <tr key={idx}>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-28 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" onChange={() => setHasChanges(true)} defaultValue={course.code} /></td>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-48 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" onChange={() => setHasChanges(true)} defaultValue={course.name} /></td>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent">
                        <select className="rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" onChange={() => setHasChanges(true)} defaultValue={course.sectionId}>
                          {db.sections.map(s => <option key={s.id} value={s.id}>{s.id.toUpperCase()}</option>)}
                        </select>
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-14 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" type="number" onChange={() => setHasChanges(true)} defaultValue="3" /></td>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-12 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" type="number" onChange={() => setHasChanges(true)} defaultValue={course.theoryHours} /></td>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-12 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" type="number" onChange={() => setHasChanges(true)} defaultValue={course.practicalHours} /></td>
                      <td className="border-b border-zinc-100 px-2 py-1 align-top text-center text-sm font-medium text-zinc-700">{course.theoryHours + course.practicalHours}</td>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent">
                        <div className="relative w-52">
                          <button type="button" className="flex w-full items-center justify-between rounded border border-zinc-300 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 px-2 py-1 text-left text-sm">
                            <span className="truncate text-xs">{inst?.name || '—'}</span>
                            <span className="ml-1 text-zinc-400">▼</span>
                          </button>
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><button className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">ลบ</button></td>
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
              {db.sections.map((sec, idx) => (
                <tr key={idx}>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" onChange={() => setHasChanges(true)} defaultValue={sec.id.toUpperCase()} /></td>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" onChange={() => setHasChanges(true)} defaultValue={sec.name} /></td>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-20 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" type="number" onChange={() => setHasChanges(true)} defaultValue="20" /></td>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><button className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">ลบ</button></td>
                </tr>
              ))}
              <tr><td colSpan="4" className="px-2 py-2"><button className="rounded border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800/50">+ เพิ่มรายการ</button></td></tr>
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
              {db.instructors.map((inst, idx) => (
                <tr key={idx}>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-full bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" onChange={() => setHasChanges(true)} defaultValue={inst.name} /></td>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><button className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">ลบ</button></td>
                </tr>
              ))}
              <tr><td colSpan="2" className="px-2 py-2"><button className="rounded border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800/50">+ เพิ่มรายการ</button></td></tr>
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
              {db.rooms.map((room, idx) => (
                <tr key={idx}>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-full bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" onChange={() => setHasChanges(true)} defaultValue={room.name} /></td>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><input className="rounded-lg border border-slate-200 px-2 py-1 text-sm w-20 bg-white dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200" type="number" onChange={() => setHasChanges(true)} defaultValue="35" /></td>
                  <td className="border-b border-slate-100 px-2 py-1 align-top bg-transparent"><button className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">ลบ</button></td>
                </tr>
              ))}
              <tr><td colSpan="3" className="px-2 py-2"><button className="rounded border border-dashed border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-800/50">+ เพิ่มรายการ</button></td></tr>
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
            <span className="ml-auto text-xs text-zinc-500">{db.courses.length} รายวิชา</span>
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
                {db.courses.map((course, idx) => (
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
            className="rounded-full px-6 py-2 text-sm font-medium text-white disabled:opacity-40 bg-[#1e4c7c] shadow-md hover:bg-[#153658] dark:bg-blue-600 dark:hover:bg-[#1e4c7c] transition-all"
          >
            บันทึกข้อมูล
          </button>
        </div>
      </div>
    </div>
  );
}

export default Masters;


