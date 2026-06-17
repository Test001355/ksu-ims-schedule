import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://adicpdcfynptzdmxkymb.supabase.co';
const supabaseKey = 'sb_publishable_Ab4xgIeGjeYhUPPaCYUUUQ_HSkHyE3c';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Starting type update...');
  
  // 1. Read legacy data
  const legacyData = JSON.parse(fs.readFileSync('C:\\Users\\Pro\'Bank\\Downloads\\tms-dataset-2026-06-16.json', 'utf8'));
  const legacyCourses = legacyData.courses || [];
  const legacyMeetings = legacyData.meetings || [];
  
  // 2. Fetch subjects from Supabase to map course codes to subject_ids
  const { data: subjects, error: subjErr } = await supabase.from('subjects').select('id, code');
  if (subjErr) throw subjErr;
  
  // 3. Fetch schedules from Supabase
  const { data: schedules, error: schedErr } = await supabase.from('schedules').select('*');
  if (schedErr) throw schedErr;
  
  let updateCount = 0;
  
  for (const schedule of schedules) {
    // Find the subject code for this schedule
    const subject = subjects.find(s => s.id === schedule.subject_id);
    if (!subject) continue;
    
    // Find the legacy course id
    const legacyCourse = legacyCourses.find(c => c.code === subject.code);
    if (!legacyCourse) continue;
    
    // Convert time
    const startHour = parseInt(schedule.start_time.split(':')[0], 10);
    const endHour = parseInt(schedule.end_time.split(':')[0], 10);
    
    // Find the matching legacy meeting
    const legacyMeeting = legacyMeetings.find(m => 
      m.courseId === legacyCourse.id &&
      m.day === schedule.day_of_week &&
      m.start === startHour &&
      m.end === endHour
    );
    
    if (legacyMeeting && legacyMeeting.type) {
      // Update in Supabase
      const { error: updateErr } = await supabase
        .from('schedules')
        .update({ type: legacyMeeting.type })
        .eq('id', schedule.id);
        
      if (updateErr) {
        console.error(`Failed to update schedule ${schedule.id}:`, updateErr);
      } else {
        updateCount++;
      }
    }
  }
  
  console.log(`Successfully updated ${updateCount} schedules with type.`);
}

run().catch(console.error);
