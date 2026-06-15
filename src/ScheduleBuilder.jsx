import React, { useState } from 'react';
import { db, saveDb, days, timeSlots } from './data';
import { Plus, Trash2, Save, Download, Upload, Clock, MapPin, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

function ScheduleBuilder() {
  const [meetings, setMeetings] = useState([...(db.meetings || [])]);
  
  // New Meeting Form State
  const [courseId, setCourseId] = useState(db.courses[0]?.id || '');
  const [roomId, setRoomId] = useState(db.rooms[0]?.id || '');
  const [day, setDay] = useState('MON');
  const [start, setStart] = useState(8);
  const [end, setEnd] = useState(10);

  const handleAddMeeting = (e) => {
    e.preventDefault();
    if (start >= end) {
      alert('เวลาเริ่มต้องน้อยกว่าเวลาเลิกครับ');
      return;
    }
    
    const newMeeting = {
      id: `m_${Date.now()}`,
      courseId,
      roomId,
      day,
      start: parseInt(start),
      end: parseInt(end)
    };
    
    setMeetings([...meetings, newMeeting]);
  };

  const handleRemoveMeeting = (id) => {
    if(confirm('ต้องการลบคาบเรียนนี้ใช่หรือไม่?')) {
      setMeetings(meetings.filter(m => m.id !== id));
    }
  };

  const handleSaveToDb = () => {
    const updatedDb = { ...db, meetings };
    saveDb(updatedDb);
  };

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
            <Clock className="text-[#1e4c7c] dark:text-sky-400" /> จัดตารางสอน
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
          <button onClick={handleSaveToDb} className="flex items-center gap-2 px-4 py-2 bg-[#1e4c7c] hover:bg-[#153658] text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-900/20 text-sm">
            <Save size={16} /> บันทึกตารางทั้งหมด
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-[#121214] p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm sticky top-24">
            <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-zinc-100 flex items-center gap-2">
              <Plus size={20} className="text-[#1e4c7c]" /> เพิ่มคาบเรียนใหม่
            </h3>
            <form onSubmit={handleAddMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">รายวิชา</label>
                <select value={courseId} onChange={e => setCourseId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4c7c]/50 dark:text-zinc-200">
                  {db.courses.map(c => <option key={c.id} value={c.id}>{c.code} {c.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">ห้องเรียน</label>
                <select value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4c7c]/50 dark:text-zinc-200">
                  {db.rooms.map(r => <option key={r.id} value={r.id}>{r.name} (จุ {r.capacity})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">วันในสัปดาห์</label>
                  <select value={day} onChange={e => setDay(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4c7c]/50 dark:text-zinc-200">
                    <option value="MON">จันทร์</option>
                    <option value="TUE">อังคาร</option>
                    <option value="WED">พุธ</option>
                    <option value="THU">พฤหัสบดี</option>
                    <option value="FRI">ศุกร์</option>
                    <option value="SAT">เสาร์</option>
                    <option value="SUN">อาทิตย์</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">เวลาเริ่ม</label>
                  <select value={start} onChange={e => setStart(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4c7c]/50 dark:text-zinc-200">
                    {timeSlots.map(t => <option key={t} value={t}>{t}:00</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">เวลาเลิก</label>
                  <select value={end} onChange={e => setEnd(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4c7c]/50 dark:text-zinc-200">
                    {timeSlots.map(t => <option key={t} value={t}>{t}:00</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full mt-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl font-bold transition-all shadow-md active:scale-95">
                เพิ่มลงตาราง
              </button>
            </form>
          </div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#121214] rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 dark:text-zinc-200">รายการคาบเรียนปัจจุบัน ({meetings.length})</h3>
              <span className="text-xs text-amber-600 bg-amber-100 dark:bg-amber-500/20 px-2 py-1 rounded-full font-medium">อย่าลืมกดบันทึกเมื่อแก้ไขเสร็จ</span>
            </div>
            
            <div className="divide-y divide-slate-100 dark:divide-zinc-800 max-h-[600px] overflow-y-auto">
              {meetings.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-zinc-500">ไม่มีข้อมูลคาบเรียน</div>
              ) : (
                meetings.map(m => {
                  const course = db.courses.find(c => c.id === m.courseId);
                  const room = db.rooms.find(r => r.id === m.roomId);
                  const dayName = {MON:'จันทร์',TUE:'อังคาร',WED:'พุธ',THU:'พฤหัสบดี',FRI:'ศุกร์',SAT:'เสาร์',SUN:'อาทิตย์'}[m.day];
                  
                  return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-12 text-center">
                          <div className="text-xs font-bold text-[#1e4c7c] dark:text-sky-400 uppercase">{dayName}</div>
                          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{m.start}:00<br/>{m.end}:00</div>
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-800 dark:text-zinc-200">{course?.code} {course?.name}</div>
                          <div className="text-xs text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-3">
                            <span className="flex items-center gap-1"><MapPin size={12}/> {room?.name}</span>
                            <span className="flex items-center gap-1"><BookOpen size={12}/> กลุ่ม {course?.sectionId}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveMeeting(m.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors" title="ลบ">
                        <Trash2 size={16} />
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
