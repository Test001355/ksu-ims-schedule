import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

const SupabaseContext = createContext();

export const useSupabase = () => useContext(SupabaseContext);

export const SupabaseProvider = ({ children }) => {
  const [db, setDb] = useState({
    instructors: [],
    courses: [],
    rooms: [],
    sections: [],
    meetings: []
  });
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        { data: teachers },
        { data: subjects },
        { data: rooms },
        { data: groups },
        { data: schedules }
      ] = await Promise.all([
        supabase.from('teachers').select('*'),
        supabase.from('subjects').select('*'),
        supabase.from('rooms').select('*'),
        supabase.from('groups').select('*'),
        supabase.from('schedules').select('*')
      ]);

      const mappedDb = {
        instructors: teachers ? teachers.map(t => ({ id: t.id, name: t.name, department: t.department })) : [],
        rooms: rooms ? rooms.map(r => ({ id: r.id, name: r.name, capacity: r.capacity, type: r.type })) : [],
        sections: groups ? groups.map(g => ({ id: g.id, name: g.name, headcount: g.student_count })) : [],
        courses: subjects ? subjects.map(s => ({
          id: s.id,
          code: s.code,
          name: s.name,
          credits: s.credit,
          theoryHours: s.theory_hours,
          practicalHours: s.practical_hours,
          sectionId: s.section_id, 
          instructorIds: s.instructor_ids || []
        })) : [],
        meetings: schedules ? schedules.map(sc => ({
          id: sc.id,
          courseId: sc.subject_id,
          roomId: sc.room_id,
          day: sc.day_of_week, 
          start: parseInt(sc.start_time.split(':')[0]), 
          end: parseInt(sc.end_time.split(':')[0]),
          type: sc.type || 'ท' 
        })) : []
      };

      setDb(mappedDb);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลจาก Database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user || null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SupabaseContext.Provider value={{ db, setDb, fetchAllData, loading, session, user }}>
      {children}
    </SupabaseContext.Provider>
  );
};
