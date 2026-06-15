import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { toPng } from 'html-to-image';
import { db, sections, instructors, rooms, timeSlots, days, getScheduleForEntity } from './data';

function Sheet() {
  const [viewType, setViewType] = useState('section'); // 'section', 'instructor', 'room'
  const [selectedEntity, setSelectedEntity] = useState(sections[0]?.id);
  const [scheduleData, setScheduleData] = useState([]);
  const printRef = useRef(null);

  const options = 
    viewType === 'section' ? sections :
    viewType === 'instructor' ? db.instructors :
    db.rooms;

  const currentEntityInfo = options.find(opt => opt.id === selectedEntity);

  useEffect(() => {
    setScheduleData(getScheduleForEntity(viewType, selectedEntity));
  }, [selectedEntity, viewType]);

  const getTimeGridPosition = (startHour) => {
    const startHourOffset = 8;
    const hourFraction = startHour - startHourOffset;
    return (hourFraction / 14) * 100;
  };

  const getDurationPct = (startHour, endHour) => {
    const durationHours = endHour - startHour;
    return (durationHours / 14) * 100;
  };

  // Get distinct courses from schedule data to show in table
  const distinctCourses = [];
  scheduleData.forEach(item => {
    if (!distinctCourses.find(c => c.courseCode === item.courseCode)) {
      const courseObj = db.courses.find(c => c.code === item.courseCode && c.sectionId === item.sectionId) || 
                        db.courses.find(c => c.code === item.courseCode);
      distinctCourses.push({
        courseCode: item.courseCode,
        courseName: item.courseName,
        room: item.roomName,
        instructor: item.instructorName,
        theoryHours: courseObj?.theoryHours || 0,
        practicalHours: courseObj?.practicalHours || 0
      });
    }
  });

  const getTitleText = () => {
    if (viewType === 'section') return `ตารางเรียนสาขาวิชาวิศวกรรมคอมพิวเตอร์ กลุ่มนักศึกษา ${currentEntityInfo?.name || selectedEntity}`;
    if (viewType === 'instructor') return `ตารางสอนอาจารย์ ${currentEntityInfo?.name || selectedEntity}`;
    return `ตารางการใช้ห้องเรียน ${currentEntityInfo?.name || selectedEntity}`;
  };

  const handleExportImage = async () => {
    if (printRef.current === null) {
      return;
    }
    try {
      const dataUrl = await toPng(printRef.current, { cacheBust: true, backgroundColor: '#ffffff', style: { transform: 'scale(1)' } });
      const link = document.createElement('a');
      link.download = `ตารางสอน_${currentEntityInfo.name || currentEntityInfo.id}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export image', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-end gap-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200/60 dark:border-zinc-800 shadow-sm mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-[#1e4c7c] to-[#3a7ca5] bg-clip-text text-transparent dark:from-[#3a7ca5] dark:to-[#1e4c7c]">ใบตารางสอน</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">เลือกมุมมองและรายการ แล้วสั่งพิมพ์ หรือแคปเจอร์เป็นรูปภาพ</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <div className="flex p-1 rounded-xl bg-slate-100/80 dark:bg-zinc-800/80 shadow-inner border border-slate-200/60 dark:border-zinc-700">
            <button 
              onClick={() => { setViewType('section'); setSelectedEntity(sections[0]?.id); }}
              className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-300", viewType === 'section' ? "bg-white text-[#1e4c7c] shadow-sm" : "text-slate-600 hover:text-slate-900")}
            >กลุ่มเรียน</button>
            <button 
              onClick={() => { setViewType('instructor'); setSelectedEntity(db.instructors[0]?.id); }}
              className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-300", viewType === 'instructor' ? "bg-white text-[#1e4c7c] shadow-sm" : "text-slate-600 hover:text-slate-900")}
            >อาจารย์ผู้สอน</button>
            <button 
              onClick={() => { setViewType('room'); setSelectedEntity(db.rooms[0]?.id); }}
              className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-300", viewType === 'room' ? "bg-white text-[#1e4c7c] shadow-sm" : "text-slate-600 hover:text-slate-900")}
            >ห้องเรียน</button>
          </div>
          <select 
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="max-w-[18rem] rounded-xl border border-slate-200/60 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 outline-none transition-all dark:text-zinc-200"
          >
            {options.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.name || opt.code || opt.id}</option>
            ))}
          </select>
          <button onClick={handleExportImage} className="rounded-xl bg-amber-500 text-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md">📷 แคปเป็นรูปภาพ</button>
          <button onClick={() => window.print()} className="rounded-xl bg-[#1e4c7c] px-6 py-2 text-sm font-medium text-white hover:bg-[#153658] hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-md">พิมพ์ / บันทึก PDF</button>
        </div>
      </div>

      <div ref={printRef} className="print-sheet space-y-3 rounded-lg border border-zinc-300 bg-white text-slate-900 p-8 shadow-sm">
        <div className="text-center mb-8 relative">
          <div className="absolute left-0 top-0 w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center border-2 border-sky-600">
            <span className="text-2xl">🏛️</span>
          </div>
          <div className="font-bold text-xl">มหาวิทยาลัยกาฬสินธุ์ (Kalasin University)</div>
          <div className="text-sm mt-1">คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม</div>
          <div className="text-lg font-bold mt-4">{getTitleText()}</div>
          <div className="text-sm mt-1">ประจำภาคเรียนที่ 1 ปีการศึกษา 2569</div>
        </div>

        {distinctCourses.length > 0 && (
          <table className="w-full border-collapse text-xs mb-6">
            <thead>
              <tr className="bg-zinc-100 text-left">
                <th className="border border-zinc-300 px-2 py-1 w-8 text-center">ที่</th>
                <th className="border border-zinc-300 px-2 py-1">รหัสวิชา</th>
                <th className="border border-zinc-300 px-2 py-1">ชื่อวิชา</th>
                <th className="border border-zinc-300 px-2 py-1">ชื่อห้องเรียน</th>
                <th className="border border-zinc-300 px-2 py-1 w-8 text-center">ท</th>
                <th className="border border-zinc-300 px-2 py-1 w-8 text-center">ป</th>
                <th className="border border-zinc-300 px-2 py-1 w-10 text-center">รวม</th>
                <th className="border border-zinc-300 px-2 py-1">ผู้สอน</th>
              </tr>
            </thead>
            <tbody>
              {distinctCourses.map((course, idx) => (
                <tr key={idx}>
                  <td className="border border-zinc-300 px-2 py-1 text-center">{idx + 1}</td>
                  <td className="border border-zinc-300 px-2 py-1 font-mono">{course.courseCode}</td>
                  <td className="border border-zinc-300 px-2 py-1">{course.courseName}</td>
                  <td className="border border-zinc-300 px-2 py-1">{course.room}</td>
                  <td className="border border-zinc-300 px-2 py-1 text-center">{course.theoryHours}</td>
                  <td className="border border-zinc-300 px-2 py-1 text-center">{course.practicalHours}</td>
                  <td className="border border-zinc-300 px-2 py-1 text-center font-semibold">{course.theoryHours + course.practicalHours}</td>
                  <td className="border border-zinc-300 px-2 py-1">{course.instructor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <div className="min-w-[820px]">
            <div className="flex border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
              <div className="w-20 shrink-0 px-2 py-1"></div>
              <div className="relative flex-1">
                <div className="flex">
                  {timeSlots.map(time => (
                    <div key={time} className="flex-1 border-l border-zinc-100 px-1 py-1">
                      {`${String(time).padStart(2, '0')}:00`}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {days.filter(d => d.id >= 1 && d.id <= 5).map(day => (
              <div key={day.id} className="flex border-b border-zinc-100 last:border-b-0">
                <div className="w-20 shrink-0 px-2 py-2 text-sm font-medium text-zinc-700">{day.name}</div>
                <div className="relative flex-1 min-h-[60px]">
                  <div className="absolute inset-0 flex">
                    {timeSlots.map(time => (
                      <div key={time} className="flex-1 border-l border-zinc-100"></div>
                    ))}
                  </div>
                  
                  {scheduleData
                    .filter(item => item.day === day.id)
                    .map(item => {
                      const leftPct = getTimeGridPosition(item.startHour);
                      const widthPct = getDurationPct(item.startHour, item.endHour);
                      
                      return (
                        <div 
                          key={item.id} 
                          className={clsx("absolute overflow-hidden rounded-md border px-2 py-1 text-xs leading-tight", item.colorClass)}
                          style={{
                            left: `${leftPct}%`,
                            width: `calc(${widthPct}%)`,
                            top: '4px',
                            height: '52px'
                          }}
                        >
                          <div className="font-medium">{item.courseCode}</div>
                          <div className="truncate text-[11px] opacity-80">{item.courseName}</div>
                          <div className="truncate text-[11px] opacity-70">{item.roomName} · {item.instructorName}</div>
                        </div>
                      );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex justify-between px-12 text-center text-sm">
          <div>
            <div className="mb-8">ลงชื่อ..............................................................</div>
            <div>( .............................................................. )</div>
            <div className="mt-1">อาจารย์ผู้รับผิดชอบ / ผู้จัดตารางสอน</div>
          </div>
          <div>
            <div className="mb-8">ลงชื่อ..............................................................</div>
            <div>( .............................................................. )</div>
            <div className="mt-1">หัวหน้าสาขาวิชา / คณบดี</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sheet;


