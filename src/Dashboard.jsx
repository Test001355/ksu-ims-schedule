import React, { useMemo } from 'react';
import { useSupabase } from './context/SupabaseContext';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

function Dashboard() {
  const { db } = useSupabase();
  // --- Analytics Logic ---
  const stats = useMemo(() => {
    const totalCourses = db.courses.length;
    const totalInstructors = db.instructors.length;
    const totalRooms = db.rooms.length;
    const totalSections = db.sections.length;
    
    // Scheduled vs Unscheduled
    let scheduledCoursesCount = 0;
    db.courses.forEach(course => {
      const courseMeetings = db.meetings.filter(m => m.courseId === course.id);
      let theoryScheduled = 0;
      let practicalScheduled = 0;
      courseMeetings.forEach(m => {
        const hours = m.end - m.start;
        if(m.type === 'ท') theoryScheduled += hours;
        if(m.type === 'ป') practicalScheduled += hours;
      });
      if(theoryScheduled >= course.theoryHours && practicalScheduled >= course.practicalHours) {
        scheduledCoursesCount++;
      }
    });

    const schedulingProgress = Math.round((scheduledCoursesCount / totalCourses) * 100) || 0;

    // Room Utilization (Assuming 8 hours/day * 5 days = 40 hours max per room per week)
    const roomUsage = db.rooms.map(room => {
      const roomMeetings = db.meetings.filter(m => m.roomId === room.id);
      const totalHours = roomMeetings.reduce((sum, m) => sum + (m.end - m.start), 0);
      return {
        name: room.name,
        hours: totalHours,
        utilization: Math.round((totalHours / 40) * 100)
      };
    }).sort((a, b) => b.hours - a.hours);

    // Instructor Workload
    const instructorWorkload = db.instructors.map(inst => {
      // Find courses for this instructor
      const instCourses = db.courses.filter(c => c.instructorIds.includes(inst.id));
      const instCourseIds = instCourses.map(c => c.id);
      const instMeetings = db.meetings.filter(m => instCourseIds.includes(m.courseId));
      const totalHours = instMeetings.reduce((sum, m) => sum + (m.end - m.start), 0);
      return {
        name: inst.name.split(' ')[0], // short name
        hours: totalHours
      };
    }).sort((a, b) => b.hours - a.hours).slice(0, 5); // top 5

    // Hours by Type
    let totalTheoryHours = 0;
    let totalPracticalHours = 0;
    let totalUnknownHours = 0;
    db.meetings.forEach(m => {
      const hours = m.end - m.start;
      if (m.type === 'ท') totalTheoryHours += hours;
      else if (m.type === 'ป') totalPracticalHours += hours;
      else totalUnknownHours += hours;
    });

    return {
      totalCourses,
      totalInstructors,
      totalRooms,
      totalSections,
      schedulingProgress,
      scheduledCoursesCount,
      roomUsage,
      instructorWorkload,
      totalTheoryHours,
      totalPracticalHours,
      totalUnknownHours
    };
  }, [db]);

  const COLORS = ['#0ea5e9', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b'];

  const typeData = [
    { name: 'ทฤษฎี (ท)', value: stats.totalTheoryHours, color: '#6366f1' }, // indigo-500
    { name: 'ปฏิบัติ (ป)', value: stats.totalPracticalHours, color: '#10b981' }, // emerald-500
    ...(stats.totalUnknownHours > 0 ? [{ name: 'ไม่ระบุ', value: stats.totalUnknownHours, color: '#94a3b8' }] : [])
  ];

  const StatCard = ({ title, value, subtitle, icon, delay }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/60 dark:border-zinc-800"
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{title}</p>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-zinc-100 mt-2">{value}</h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2">{subtitle}</p>
        </div>
        <div className="w-12 h-12 bg-sky-50 dark:bg-blue-600/10 rounded-2xl flex items-center justify-center text-2xl">
          {icon}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#1E3A5F] to-[#6B9DC2] bg-clip-text text-transparent dark:from-[#6B9DC2] dark:to-[#1E3A5F]">Dashboard & Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">ภาพรวมการใช้งานและสถิติข้อมูลระบบ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="ความคืบหน้า" value={`${stats.schedulingProgress}%`} subtitle={`จัดแล้ว ${stats.scheduledCoursesCount}/${stats.totalCourses} รายวิชา`} icon="📊" delay={0.1} />
        <StatCard title="อาจารย์" value={stats.totalInstructors} subtitle="จำนวนอาจารย์ทั้งหมด" icon="👨‍🏫" delay={0.2} />
        <StatCard title="ห้องเรียน" value={stats.totalRooms} subtitle="ห้องเรียนที่พร้อมใช้งาน" icon="🏫" delay={0.3} />
        <StatCard title="กลุ่มเรียน" value={stats.totalSections} subtitle="จำนวนกลุ่มเรียนทั้งหมด" icon="👥" delay={0.4} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/60 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-zinc-100 mb-6">สัดส่วนชั่วโมงสอน (ทฤษฎี vs ปฏิบัติ)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#0f172a', fontWeight: '500' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Bar Chart - Workload */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/60 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-zinc-100 mb-6">ภาระงานอาจารย์สูงสุด (Top 5)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.instructorWorkload}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} interval={0} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} />
                <RechartsTooltip 
                  cursor={{ fill: 'rgba(14, 165, 233, 0.05)' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)' }}
                />
                <Bar dataKey="hours" name="ชั่วโมงสอน/สัปดาห์" radius={[8, 8, 0, 0]}>
                  {stats.instructorWorkload.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Room Utilization Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-3xl p-6 shadow-sm border border-slate-200/60 dark:border-zinc-800">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-zinc-100 mb-6">อัตราการใช้งานห้องเรียน</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-zinc-800 text-left text-slate-500 dark:text-zinc-400">
                <th className="pb-3 font-medium">ชื่อห้อง</th>
                <th className="pb-3 font-medium">ใช้งานจริง (ชม./สัปดาห์)</th>
                <th className="pb-3 font-medium">อัตราการใช้งาน</th>
                <th className="pb-3 font-medium w-1/3">ความหนาแน่น</th>
              </tr>
            </thead>
            <tbody>
              {stats.roomUsage.map((room, idx) => (
                <tr key={idx} className="border-b border-slate-50 dark:border-zinc-800/50 last:border-0">
                  <td className="py-3 font-medium text-slate-700 dark:text-zinc-300">{room.name}</td>
                  <td className="py-3 text-slate-600 dark:text-zinc-400">{room.hours} ชม.</td>
                  <td className="py-3 text-slate-600 dark:text-zinc-400">{room.utilization}%</td>
                  <td className="py-3">
                    <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className={`h-2.5 rounded-full ${room.utilization > 80 ? 'bg-rose-500' : room.utilization > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min(room.utilization, 100)}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

export default Dashboard;


