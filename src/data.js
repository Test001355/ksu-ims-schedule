import initialDb from './db.json';

let db = initialDb;
try {
  const localDb = localStorage.getItem('ksu_db');
  if (localDb) {
    db = JSON.parse(localDb);
  }
} catch (e) {
  console.error("Failed to load DB from localStorage", e);
}

export const saveDb = (newDb) => {
  try {
    localStorage.setItem('ksu_db', JSON.stringify(newDb));
    window.location.reload();
  } catch (e) {
    console.error("Failed to save DB", e);
    alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล (Storage Full?)");
  }
}

export { db };
export const sections = db.sections || [];
export const instructors = db.instructors || [];
export const rooms = db.rooms || [];

const dayMap = {
  'MON': { id: 1, name: 'จันทร์' },
  'TUE': { id: 2, name: 'อังคาร' },
  'WED': { id: 3, name: 'พุธ' },
  'THU': { id: 4, name: 'พฤหัสบดี' },
  'FRI': { id: 5, name: 'ศุกร์' },
  'SAT': { id: 6, name: 'เสาร์' },
  'SUN': { id: 0, name: 'อาทิตย์' }
};

export const days = [
  { id: 1, name: 'จันทร์', short: 'จ.' },
  { id: 2, name: 'อังคาร', short: 'อ.' },
  { id: 3, name: 'พุธ', short: 'พ.' },
  { id: 4, name: 'พฤหัสบดี', short: 'พฤ.' },
  { id: 5, name: 'ศุกร์', short: 'ศ.' },
  { id: 6, name: 'เสาร์', short: 'ส.' },
  { id: 0, name: 'อาทิตย์', short: 'อา.' },
];

export const timeSlots = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 to 21:00

// Glassmorphism Tag Colors
const colors = [
  'bg-sky-50/80 text-sky-700 border border-sky-200/60 shadow-sm backdrop-blur-sm',
  'bg-pink-50/80 text-pink-700 border border-pink-200/60 shadow-sm backdrop-blur-sm',
  'bg-indigo-50/80 text-indigo-700 border border-indigo-200/60 shadow-sm backdrop-blur-sm',
  'bg-emerald-50/80 text-emerald-700 border border-emerald-200/60 shadow-sm backdrop-blur-sm',
  'bg-purple-50/80 text-purple-700 border border-purple-200/60 shadow-sm backdrop-blur-sm',
  'bg-amber-50/80 text-amber-700 border border-amber-200/60 shadow-sm backdrop-blur-sm',
  'bg-rose-50/80 text-rose-700 border border-rose-200/60 shadow-sm backdrop-blur-sm',
  'bg-cyan-50/80 text-cyan-700 border border-cyan-200/60 shadow-sm backdrop-blur-sm',
];

function getStringHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export const getSections = () => db.sections || [];

export const getScheduleForEntity = (viewType, entityId) => {
  if (!db.courses || !db.meetings) return [];

  // Filter courses based on viewType
  const relevantCourseIds = db.courses.filter(c => {
    if (viewType === 'section') return c.sectionId === entityId;
    if (viewType === 'instructor') return c.instructorIds.includes(entityId);
    return true; // For room, we filter by meeting later
  }).map(c => c.id);
  
  // Filter meetings based on viewType
  const entityMeetings = db.meetings.filter(m => {
    if (viewType === 'room') return m.roomId === entityId;
    if (viewType === 'instructor' || viewType === 'section') {
      return relevantCourseIds.includes(m.courseId);
    }
    return false;
  });
  
  // Map to format suitable for UI
  return entityMeetings.map(meeting => {
    const course = db.courses.find(c => c.id === meeting.courseId);
    const room = db.rooms.find(r => r.id === meeting.roomId);
    
    // Resolve instructors
    const instructors = course.instructorIds
      .map(id => db.instructors.find(i => i.id === id)?.name || 'Unknown')
      .join(', ');
      
    // Color assignment
    const colorIndex = getStringHash(course.code) % colors.length;
                    
    const startStr = String(meeting.start).padStart(2, '0');
    const endStr = String(meeting.end).padStart(2, '0');
    const durationHours = meeting.end - meeting.start;
    
    const title = `${course.code} ${course.name}
2: เวลา ${startStr}:00–${endStr}:00 (${durationHours} ชม.)
3: หน่วยชั่วโมง ท${course.theoryHours} + ป${course.practicalHours}
4: ห้อง ${room?.name || 'Unknown'}
5: ผู้สอน ${instructors}`;

    return {
      id: meeting.id,
      day: dayMap[meeting.day].id,
      startTime: `${startStr}:00`,
      endTime: `${endStr}:00`,
      courseCode: course.code,
      courseName: course.name,
      roomName: room?.name || 'Unknown',
      instructorName: instructors,
      sectionName: db.sections.find(s => s.id === course.sectionId)?.name || course.sectionId || 'Unknown',
      colorClass: colors[colorIndex],
      startHour: meeting.start,
      endHour: meeting.end,
      title: title
    };
  });
};
