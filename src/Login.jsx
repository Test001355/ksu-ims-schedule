import React, { useState } from 'react';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { supabase } from './supabaseClient';
import { toast } from 'sonner';

function Login({ onCancel }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    
    if (error) {
      toast.error('เข้าสู่ระบบล้มเหลว', { description: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
      setLoading(false);
    } else {
      toast.success('เข้าสู่ระบบสำเร็จ');
      // App.jsx will automatically react to auth state change
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full relative z-0 bg-[#F4F6F9] overflow-hidden">
      {/* Background Image Setup */}
      <div 
        className="absolute inset-0 z-0" 
        style={{ 
          backgroundImage: 'url("/bg-4.png")', 
          backgroundSize: 'cover', 
          backgroundPosition: 'right center', 
          backgroundRepeat: 'no-repeat' 
        }}
      >
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px]"></div>
      </div>
      
      {/* KSU Header Logo */}
      <div className="absolute top-0 left-0 w-full px-6 py-4 flex items-center gap-4 z-20">
        <img src="/ksu-logo.png" alt="KSU" className="w-12 h-12 drop-shadow-md"/>
        <div className="drop-shadow-md">
          <div className="text-slate-800 font-bold text-base tracking-wide">มหาวิทยาลัยกาฬสินธุ์</div>
          <div className="text-[#1E3A5F] font-medium text-sm">Kalasin University</div>
        </div>
      </div>

      <div className="flex-1 flex justify-center items-center px-4 relative z-10 w-full min-h-screen py-20">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          className="w-full max-w-md bg-white/95 backdrop-blur-2xl p-8 md:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white"
        >
          <div className="flex flex-col items-center mb-8">
            <img src="/ksu-logo.png" alt="มหาวิทยาลัยกาฬสินธุ์" className="w-20 h-20 mb-4 drop-shadow-sm"/>
            <h1 className="text-xl font-bold text-[#1E3A5F]">ระบบจัดตารางเรียนตารางสอน</h1>
            <p className="text-[#5C6B7A] mt-2 text-sm text-center leading-relaxed">
              คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม<br/>
              สาขาวิชาวิศวกรรมคอมพิวเตอร์และระบบอัตโนมัติ
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col w-full gap-5 text-gray-800">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1E3A5F]">อีเมล (Email)</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#D8DEE6] bg-[#F8F9FB] focus:bg-white focus:ring-2 focus:ring-[#6B9DC2] focus:border-[#6B9DC2] outline-none transition-all text-sm"
                placeholder="admin@ksu.ac.th"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1E3A5F]">รหัสผ่าน</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-xl border border-[#D8DEE6] bg-[#F8F9FB] focus:bg-white focus:ring-2 focus:ring-[#6B9DC2] focus:border-[#6B9DC2] outline-none transition-all text-sm"
                placeholder="••••••••"
                required
              />
            </div>
            <div className="flex gap-3 mt-2">
              {onCancel && (
                <button type="button" onClick={onCancel} className="w-1/3 bg-white text-[#5C6B7A] border border-[#D8DEE6] hover:bg-[#F8F9FB] py-3.5 rounded-full text-base font-bold transition-all shadow-sm flex justify-center items-center">
                  กลับ
                </button>
              )}
              <button disabled={loading} type="submit" className="flex-1 bg-[#1E3A5F] hover:bg-[#152943] text-white py-3.5 rounded-full text-base font-bold transition-all active:scale-[0.98] shadow-lg shadow-[#1E3A5F]/25 flex justify-center items-center disabled:opacity-70">
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </div>
          </form>
          
          <div className="text-center mt-8 pt-6 border-t border-[#D8DEE6]/50 text-xs text-[#5C6B7A]">
            <p>© 2026 มหาวิทยาลัยกาฬสินธุ์ — สงวนลิขสิทธิ์</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Login;

