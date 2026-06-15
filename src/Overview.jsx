import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import db from './db.json';
import { getSections } from './data';

function Overview({ onEntityClick }) {
  const [viewType, setViewType] = useState('section'); // 'section', 'instructor', 'room'
  
  const sections = getSections();
  const instructors = db.instructors || [];
  const rooms = db.rooms || [];
  const meetings = db.meetings || [];
  
  const entities = 
    viewType === 'section' ? sections :
    viewType === 'instructor' ? instructors :
    rooms;

  // Build a map of entityId -> schedule items
  const scheduleMap = useMemo(() => {
    const map = {};
    entities.forEach(e => {
      map[e.id] = [];
    });

    meetings.forEach(meeting => {
      const course = db.courses.find(c => c.id === meeting.courseId);
      if (!course) return;

      const dayIdx = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].indexOf(meeting.day);
      if (dayIdx < 1 || dayIdx > 5) return; // Only show Mon-Fri

      const item = {
        id: meeting.id,
        dayIdx,
        startHour: meeting.start,
        endHour: meeting.end,
      };

      if (viewType === 'section') {
        if (map[course.sectionId]) map[course.sectionId].push(item);
      } else if (viewType === 'instructor') {
        course.instructorIds.forEach(iId => {
          if (map[iId]) map[iId].push(item);
        });
      } else if (viewType === 'room') {
        if (map[meeting.roomId]) map[meeting.roomId].push(item);
      }
    });
    return map;
  }, [viewType, entities, meetings, db.courses]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#1e4c7c] to-[#3a7ca5] bg-clip-text text-transparent">ภาพรวมตารางสอน</h2>
          <p className="text-sm text-slate-500 mt-1">ดูตารางคร่าวๆ ของทุกกลุ่มเรียน อาจารย์ หรือห้องเรียน</p>
        </div>
        <div className="flex p-1 rounded-xl bg-white/60 backdrop-blur-md shadow-sm border border-slate-200/60">
          <button 
            onClick={() => setViewType('section')}
            className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-300", viewType === 'section' ? "bg-white text-[#1e4c7c] shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50")}
          >กลุ่มเรียน</button>
          <button 
            onClick={() => setViewType('instructor')}
            className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-300", viewType === 'instructor' ? "bg-white text-[#1e4c7c] shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50")}
          >อาจารย์ผู้สอน</button>
          <button 
            onClick={() => setViewType('room')}
            className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-300", viewType === 'room' ? "bg-white text-[#1e4c7c] shadow-sm" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50/50")}
          >ห้องเรียน</button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 pb-10">
        {entities.map((entity) => {
          const schedules = scheduleMap[entity.id] || [];
          return (
            <div 
              key={entity.id} 
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white/60 backdrop-blur-xl shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-sky-200/50 cursor-pointer"
              onClick={() => onEntityClick(viewType, entity.id)}
            >
              <div className="bg-gradient-to-r from-slate-50/50 to-slate-100/30 p-4 border-b border-slate-100/50 group-hover:from-sky-50/50 group-hover:to-pink-50/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800 group-hover:text-[#1e4c7c] transition-colors">{entity.name || entity.id}</h3>
                    <p className="text-xs text-slate-500 mt-1">{schedules.length} คาบสอน</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-white/40 flex-1">
                <div className="relative h-32 w-full rounded-xl border border-slate-200/60 bg-white/60 p-2 shadow-inner">
                  <div className="absolute inset-2 grid grid-cols-5 grid-rows-[14] gap-[1px]">
                    {Array.from({ length: 5 * 14 }).map((_, i) => (
                      <div key={i} className="bg-slate-50/50 rounded-sm"></div>
                    ))}
                    
                    {schedules.map((schedule, idx) => {
                      const col = schedule.dayIdx - 1;
                      const rowStart = schedule.startHour - 8;
                      const rowSpan = schedule.endHour - schedule.startHour;
                      
                      return (
                        <div 
                          key={idx}
                          className="absolute rounded-sm bg-gradient-to-br from-sky-400 to-pink-400 shadow-sm opacity-90 group-hover:opacity-100 transition-opacity"
                          style={{
                            left: `calc(${col * 20}% + 2px)`,
                            width: `calc(20% - 4px)`,
                            top: `calc(${(rowStart / 14) * 100}% + 2px)`,
                            height: `calc(${(rowSpan / 14) * 100}% - 4px)`,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Overview;


