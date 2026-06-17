import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = 'https://adicpdcfynptzdmxkymb.supabase.co';
const supabaseKey = 'sb_publishable_Ab4xgIeGjeYhUPPaCYUUUQ_HSkHyE3c';
const supabase = createClient(supabaseUrl, supabaseKey);

const jsonPath = 'C:\\Users\\Pro\'Bank\\Downloads\\tms-dataset-2026-06-16.json';

async function migrate() {
  console.log('Starting migration...');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  const idMap = {};
  
  // 1. Teachers
  const teachers = data.instructors || [];
  const mappedTeachers = teachers.map(t => {
    const newId = uuidv4();
    idMap[t.id] = newId;
    return { id: newId, name: t.name, department: t.department };
  });
  
  if (mappedTeachers.length > 0) {
    const { error } = await supabase.from('teachers').upsert(mappedTeachers);
    if (error) throw error;
    console.log(`Inserted ${mappedTeachers.length} teachers`);
  }

  // 2. Rooms
  const rooms = data.rooms || [];
  const mappedRooms = rooms.map(r => {
    const newId = uuidv4();
    idMap[r.id] = newId;
    return { id: newId, name: r.name, capacity: r.capacity, type: r.type };
  });

  if (mappedRooms.length > 0) {
    const { error } = await supabase.from('rooms').upsert(mappedRooms);
    if (error) throw error;
    console.log(`Inserted ${mappedRooms.length} rooms`);
  }

  // 3. Groups (Sections)
  const sections = data.sections || [];
  const mappedGroups = sections.map(s => {
    const newId = uuidv4();
    idMap[s.id] = newId;
    return { id: newId, name: s.name, student_count: s.headcount };
  });

  if (mappedGroups.length > 0) {
    const { error } = await supabase.from('groups').upsert(mappedGroups);
    if (error) throw error;
    console.log(`Inserted ${mappedGroups.length} groups`);
  }

  // 4. Subjects (Courses)
  const courses = data.courses || [];
  const mappedSubjects = courses.map(c => {
    const newId = uuidv4();
    idMap[c.id] = newId;
    
    // map instructor ids
    const instIds = (c.instructorIds || []).map(oldId => idMap[oldId]).filter(Boolean);
    
    return {
      id: newId,
      code: c.code,
      name: c.name,
      credit: c.credits,
      theory_hours: c.theoryHours,
      practical_hours: c.practicalHours,
      section_id: idMap[c.sectionId] || null,
      instructor_ids: instIds
    };
  });

  if (mappedSubjects.length > 0) {
    const { error } = await supabase.from('subjects').upsert(mappedSubjects);
    if (error) throw error;
    console.log(`Inserted ${mappedSubjects.length} subjects`);
  }

  // 5. Schedules (Meetings)
  const meetings = data.meetings || [];
  const mappedSchedules = meetings.map(m => {
    const course = courses.find(c => c.id === m.courseId);
    let teacherId = null;
    let groupId = null;
    
    if (course) {
        teacherId = idMap[course.instructorIds?.[0]] || null;
        groupId = idMap[course.sectionId] || null;
    }

    return {
      id: uuidv4(),
      subject_id: idMap[m.courseId] || null,
      room_id: idMap[m.roomId] || null,
      teacher_id: teacherId,
      group_id: groupId,
      day_of_week: m.day,
      start_time: `${String(m.start).padStart(2, '0')}:00:00`,
      end_time: `${String(m.end).padStart(2, '0')}:00:00`
    };
  });

  if (mappedSchedules.length > 0) {
    const { error } = await supabase.from('schedules').upsert(mappedSchedules);
    if (error) throw error;
    console.log(`Inserted ${mappedSchedules.length} schedules`);
  }

  console.log('Migration completed successfully!');
}

migrate().catch(console.error);
