import React, { useState } from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username) {
      onLogin({ username, role });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#09090b] p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        className="w-full max-w-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/60 dark:border-zinc-800 overflow-hidden"
      >
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-[#1e4c7c] to-[#3a7ca5] rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-600/20 mb-4">
              <span className="text-3xl">📅</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-zinc-100">เข้าสู่ระบบ</h1>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">ระบบจัดตารางเรียนตารางสอน (IMS)</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">ชื่อผู้ใช้งาน</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                placeholder="admin"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">รหัสผ่าน</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-slate-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600/50"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1">สิทธิ์การเข้าใช้งาน (Role)</label>
              <div className="grid grid-cols-3 gap-2">
                {['admin', 'instructor', 'student'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={clsx(
                      "py-2 rounded-xl text-xs font-medium border transition-all",
                      role === r 
                        ? "bg-blue-600/10 border-blue-600 text-[#1e4c7c] dark:text-sky-400 dark:bg-blue-600/20" 
                        : "border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    )}
                  >
                    {r === 'admin' ? 'วิชาการ' : r === 'instructor' ? 'อาจารย์' : 'นักศึกษา'}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit" className="w-full py-3 px-4 bg-gradient-to-r from-[#1e4c7c] to-[#3a7ca5] hover:from-sky-600 hover:to-[#2b5e8a] text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-600/25 active:scale-[0.98]">
              เข้าสู่ระบบ
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-slate-400 dark:text-zinc-500">
            Graduation Project © 2026<br/>
            Faculty of Engineering / Computer Science
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default Login;

