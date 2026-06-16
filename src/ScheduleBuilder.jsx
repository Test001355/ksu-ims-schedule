import React, { useState } from 'react';
import { days, timeSlots } from './data';
import { supabase } from './supabaseClient';
import { useSupabase } from './context/SupabaseContext';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Save, Download, Upload, Clock, MapPin, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import Sheet from './Sheet';

function ScheduleBuilder() {
  const { db, fetchAllData } = useSupabase();
  const [meetings, setMeetings] = useState([...(db.meetings || [])]);

  React.useEffect(() => {
    setMeetings([...(db.meetings || [])]);
  }, [db.meetings]);
  
  // New Meeting Form State
  const [courseId, setCourseId] = useState(db.courses[0]?.id || '');
  const [roomId, setRoomId] = useState(db.rooms[0]?.id || '');
  const [day, setDay] = useState('MON');
  const [type, setType] = useState('ไม่ระบุ');
  const [start, setStart] = useState(8);
  const [end, setEnd] = useState(10);
  const [courseSearch, setCourseSearch] = useState('');
  const [meetingSearch, setMeetingSearch] = useState('');
  
  // Preview Mode State
  const [previewMode, setPreviewMode] = useState('section'); // 'section', 'room', 'instructor'
  const [customPreviewEntity, setCustomPreviewEntity] = useState(null);

  const handlePreviewModeChange = (mode) => {
    setPreviewMode(mode);
    setCustomPreviewEntity(null); // Reset custom selection when switching modes
  };

  const handleAddMeeting = async (e) => {
    e.preventDefault();
    if (start >= end) {
      toast.error('เวลาเริ่มต้องน้อยกว่าเวลาเลิกครับ');
      return;
    }
    
    const course = db.courses.find(c => c.id === courseId);
    
    // Strict Conflict Prevention Logic
    const isConflict = meetings.some(m => {
      // 1. Check if same day and overlapping time
      if (m.day === day && start < m.end && end > m.start) {
        // 2. Check if Room conflict
        if (m.roomId === roomId) {
          toast.error(`ไม่สามารถบันทึกได้: ห้องเรียนทับซ้อนกับวิชาอื่นในเวลานี้`);
          return true;
        }
        // 3. Check if Instructor conflict
        const mCourse = db.courses.find(c => c.id === m.courseId);
        const newInstructorId = course?.instructorIds?.[0];
        if (newInstructorId && mCourse?.instructorIds?.includes(newInstructorId)) {
          toast.error(`ไม่สามารถบันทึกได้: ผู้สอนติดสอนวิชาอื่นในเวลานี้แล้ว`);
          return true;
        }
        // 4. Check if Group conflict
        if (course?.sectionId && mCourse?.sectionId === course?.sectionId) {
          toast.error(`ไม่สามารถบันทึกได้: กลุ่มเรียนนี้มีเรียนวิชาอื่นในเวลานี้แล้ว`);
          return true;
        }
      }
      return false;
    });

    if (isConflict) return;
    
    const newMeetingId = uuidv4();
    const newMeeting = {
      id: newMeetingId,
      subject_id: courseId,
      room_id: roomId,
      teacher_id: course?.instructorIds?.[0] || null,
      group_id: course?.sectionId || null,
      day_of_week: day,
      start_time: `${String(start).padStart(2, '0')}:00:00`,
      end_time: `${String(end).padStart(2, '0')}:00:00`,
      type: type !== 'ไม่ระบุ' ? type : null
    };
    
    // Optimistic update
    const uiMeeting = {
      id: newMeetingId,
      courseId,
      roomId,
      day,
      type,
      start: parseInt(start),
      end: parseInt(end)
    };
    setMeetings([...meetings, uiMeeting]);

    // Save to Supabase
    try {
      const { error } = await supabase.from('schedules').insert(newMeeting);
      if (error) throw error;
      toast.success('เพิ่มลงตารางสำเร็จ');
      fetchAllData();
    } catch (err) {
      console.error(err);
      toast.error('ไม่สามารถบันทึกคาบเรียนได้');
      setMeetings(meetings.filter(m => m.id !== newMeetingId)); // revert
    }
  };

  const handleRemoveMeeting = async (id) => {
    if(confirm('ต้องการลบคาบเรียนนี้ใช่หรือไม่?')) {
      const originalMeetings = [...meetings];
      setMeetings(meetings.filter(m => m.id !== id));
      try {
        const { error } = await supabase.from('schedules').delete().eq('id', id);
        if (error) throw error;
        toast.success('ลบคาบเรียนสำเร็จ');
        fetchAllData();
      } catch (err) {
        console.error(err);
        toast.error('ไม่สามารถลบคาบเรียนได้');
        setMeetings(originalMeetings); // revert
      }
    }
  };

  const filteredCourses = db.courses.filter(c => 
    c.name.toLowerCase().includes(courseSearch.toLowerCase()) || 
    c.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.sectionId.toLowerCase().includes(courseSearch.toLowerCase())
  );

  // Auto-select first course when filter changes and current is hidden
  React.useEffect(() => {
    if (filteredCourses.length > 0 && !filteredCourses.find(c => c.id === courseId)) {
      setCourseId(filteredCourses[0].id);
    }
  }, [courseSearch]);

  // Derive entities for preview
  const currentCourse = db.courses.find(c => c.id === courseId);
  const currentSectionId = currentCourse?.sectionId;
  const currentInstructorId = currentCourse?.instructorIds?.[0];
  const currentRoom = db.rooms.find(r => r.id === roomId);
  const currentInstructor = db.instructors.find(i => i.id === currentInstructorId);

  let previewViewType = 'section';
  let previewEntityId = customPreviewEntity || currentSectionId;
  const displaySection = db.sections.find(s => s.id === previewEntityId);
  let previewTitle = `กลุ่มเรียน ${displaySection?.name || previewEntityId?.toUpperCase()}`;

  if (previewMode === 'room') {
    previewViewType = 'room';
    previewEntityId = customPreviewEntity || roomId;
    const displayRoom = db.rooms.find(r => r.id === previewEntityId);
    previewTitle = `ห้องเรียน ${displayRoom?.name || 'ไม่ระบุ'}`;
  } else if (previewMode === 'instructor') {
    previewViewType = 'instructor';
    previewEntityId = customPreviewEntity || currentInstructorId || db.instructors[0]?.id;
    const displayInst = db.instructors.find(i => i.id === previewEntityId);
    previewTitle = `อาจารย์ ${displayInst?.name || 'ไม่ระบุ'}`;
  }

  const handleExportBackup = () => {
    const dataStr = JSON.stringify({ ...db, meetings }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `ksu_db_backup_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedDb = JSON.parse(event.target.result);
        if (importedDb && importedDb.courses && importedDb.meetings) {
          if(confirm('การกู้คืนจะทับข้อมูลเดิมทั้งหมด คุณแน่ใจหรือไม่?')) {
            saveDb(importedDb);
          }
        } else {
          alert('รูปแบบไฟล์ไม่ถูกต้อง ต้องเป็นไฟล์ Backup จากระบบนี้เท่านั้น');
        }
      } catch (err) {
        alert('ไม่สามารถอ่านไฟล์ได้');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <Clock className="text-[#1E3A5F] dark:text-sky-400" /> จัดตารางสอน
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            เพิ่ม/แก้ไขข้อมูลคาบเรียนและบันทึกลงระบบ
          </p>
        </div>
        
        <div className="flex gap-2">
          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl font-medium transition-colors text-sm">
            <Upload size={16} /> กู้คืน (Restore)
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>
          <button onClick={handleExportBackup} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl font-medium transition-colors text-sm">
            <Download size={16} /> สำรองข้อมูล (Backup)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start relative">
        {/* Form Section */}
        <div className="lg:col-span-1 flex flex-col gap-6 lg:sticky lg:top-24">
          <div className="bg-white dark:bg-[#121214] rounded-3xl border border-slate-200 dark:border-zinc-800 p-6 shadow-sm relative overflow-hidden">
            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-zinc-100 flex items-center gap-2">
              <Plus size={20} className="text-[#1E3A5F]" /> เพิ่มคาบเรียนใหม่
            </h3>
            <form onSubmit={handleAddMeeting}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">ค้นหารายวิชา (พิมพ์ชื่อ, รหัส, กลุ่มเรียน)</label>
                <input 
                  type="text" 
                  placeholder="พิมพ์เพื่อค้นหา..." 
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 px-3 py-2 text-sm bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-shadow mb-2 placeholder:text-slate-300 dark:placeholder:text-zinc-600"
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                />
                <select 
                  className="w-full rounded-xl border border-slate-200 dark:border-zinc-700 px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-shadow"
                  value={courseId} 
                  onChange={e => setCourseId(e.target.value)}
                >
                  {filteredCourses.length === 0 && <option value="">-- ไม่พบรายวิชาที่ค้นหา --</option>}
                  {filteredCourses.map(c => (
                    <option key={c.id} value={c.id}>{c.code} {c.name} ({c.sectionId?.toUpperCase()})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">ห้องเรียน</label>
                <select value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 dark:text-zinc-200">
                  {db.rooms.map(r => <option key={r.id} value={r.id}>{r.name} (จุ {r.capacity})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">ประเภทคาบ</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 dark:text-zinc-200">
                      <option value="ท">ทฤษฎี (ท)</option>
                      <option value="ป">ปฏิบัติ (ป)</option>
                      <option value="ไม่ระบุ">ไม่ระบุ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">วันในสัปดาห์</label>
                    <select value={day} onChange={e => setDay(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 dark:text-zinc-200">
                      <option value="MON">จันทร์</option>
                      <option value="TUE">อังคาร</option>
                      <option value="WED">พุธ</option>
                      <option value="THU">พฤหัสบดี</option>
                      <option value="FRI">ศุกร์</option>
                      <option value="SAT">เสาร์</option>
                      <option value="SUN">อาทิตย์</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">เวลาเริ่ม</label>
                  <select value={start} onChange={e => setStart(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 dark:text-zinc-200">
                    {timeSlots.map(t => <option key={t} value={t}>{t}:00</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">เวลาเลิก</label>
                  <select value={end} onChange={e => setEnd(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 dark:text-zinc-200">
                    {timeSlots.map(t => <option key={t} value={t}>{t}:00</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full mt-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl font-bold transition-all shadow-md active:scale-95">
                เพิ่มลงตาราง (บันทึกอัตโนมัติ)
              </button>
            </div>
            </form>
          </div>
        </div>

        {/* Right Section: Live Preview & List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="">
             {currentSectionId ? (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-2 rounded-2xl shadow-sm gap-4">
                    <span className="text-sm font-medium text-slate-500 dark:text-zinc-400 pl-4 flex items-center gap-2">
                      <Clock size={16} /> ตรวจสอบตารางว่าง:
                    </span>
                    <div className="flex flex-wrap items-center bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
                      <button 
                        onClick={() => handlePreviewModeChange('section')}
                        className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition-all", previewMode === 'section' ? "bg-white dark:bg-zinc-700 text-[#1E3A5F] dark:text-sky-400 shadow-sm" : "text-slate-600 dark:text-zinc-400 hover:text-slate-900")}
                      >
                        กลุ่มเรียน
                      </button>
                      <button 
                        onClick={() => handlePreviewModeChange('room')}
                        className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition-all", previewMode === 'room' ? "bg-white dark:bg-zinc-700 text-[#1E3A5F] dark:text-sky-400 shadow-sm" : "text-slate-600 dark:text-zinc-400 hover:text-slate-900")}
                      >
                        ห้องเรียน
                      </button>
                      <button 
                        onClick={() => handlePreviewModeChange('instructor')}
                        className={clsx("px-4 py-1.5 text-sm font-medium rounded-lg transition-all", previewMode === 'instructor' ? "bg-white dark:bg-zinc-700 text-[#1E3A5F] dark:text-sky-400 shadow-sm" : "text-slate-600 dark:text-zinc-400 hover:text-slate-900")}
                      >
                        อาจารย์ผู้สอน
                      </button>
                    </div>
                  </div>
                  
                  {/* Select custom entity for preview */}
                  <div className="flex justify-end px-2">
                    <select 
                      value={previewEntityId || ''} 
                      onChange={e => setCustomPreviewEntity(e.target.value)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 shadow-sm min-w-[200px]"
                    >
                      {previewMode === 'section' && db.sections.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name.toUpperCase() === s.id.toUpperCase() ? s.name : `${s.name} (${s.id.toUpperCase()})`}
                        </option>
                      ))}
                      {previewMode === 'room' && db.rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      {previewMode === 'instructor' && db.instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="bg-white dark:bg-[#121214] rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden p-6 relative">
                    <h4 className="text-center font-bold text-lg mb-6 text-slate-700 dark:text-zinc-200">{previewTitle}</h4>
                    <Sheet customMeetings={meetings} isLivePreview={true} previewViewType={previewViewType} previewEntityId={previewEntityId} />
                  </div>
                </div>
             ) : (
                <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-12 text-center text-slate-500 dark:text-zinc-400">
                  <Clock size={48} className="mx-auto mb-4 text-slate-300 dark:text-zinc-600" />
                  <p>กรุณาเลือกรายวิชาเพื่อดูตารางสอนแบบ Real-time</p>
                </div>
             )}
          </div>

          <div className="bg-white dark:bg-[#121214] rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden mt-8">
            <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h3 className="font-semibold text-slate-800 dark:text-zinc-200">รายการคาบเรียนปัจจุบัน ({meetings.length})</h3>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="🔍 ค้นหาในรายการ (ชื่อ, รหัส, ผู้สอน)..." 
                  className="w-full sm:w-64 rounded-xl border border-slate-200 dark:border-zinc-700 px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-shadow placeholder:text-slate-300 dark:placeholder:text-zinc-600"
                  value={meetingSearch}
                  onChange={e => setMeetingSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="divide-y divide-slate-100 dark:divide-zinc-800 max-h-[600px] overflow-y-auto">
              {meetings.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-zinc-500">ไม่มีข้อมูลคาบเรียน</div>
              ) : (
                meetings.filter(m => {
                  const course = db.courses.find(c => c.id === m.courseId);
                  const room = db.rooms.find(r => r.id === m.roomId);
                  const searchStr = `${course?.code} ${course?.name} ${course?.sectionId} ${room?.name} ${m.type}`.toLowerCase();
                  return searchStr.includes(meetingSearch.toLowerCase());
                }).map(m => {
                  const course = db.courses.find(c => c.id === m.courseId);
                  const room = db.rooms.find(r => r.id === m.roomId);
                  const dayName = {MON:'จันทร์',TUE:'อังคาร',WED:'พุธ',THU:'พฤหัสบดี',FRI:'ศุกร์',SAT:'เสาร์',SUN:'อาทิตย์'}[m.day];
                  
                  return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 text-center shrink-0">
                          <div className="text-xs font-bold text-[#1E3A5F] dark:text-sky-400 uppercase">{dayName}</div>
                          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{m.start}:00<br/>{m.end}:00</div>
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                            {course?.code} {course?.name}
                            {m.type && m.type !== 'ไม่ระบุ' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">{m.type}</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                            <span className="flex items-center gap-1"><MapPin size={12}/> {room?.name}</span>
                            <span className="flex items-center gap-1"><BookOpen size={12}/> กลุ่ม {course?.sectionId?.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveMeeting(m.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors self-end sm:self-auto" title="ลบ">
                        <Trash2 size={16} /> ลบรายวิชานี้
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScheduleBuilder;
