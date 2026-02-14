
import React from 'react';
import { UserStats } from '../types.ts';

interface ProfileViewProps {
  stats: UserStats;
  onUpgrade: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ stats, onUpgrade }) => {
  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] text-black overflow-y-auto pb-24">
      {/* Header */}
      <div className="h-14 flex items-center justify-center px-4 relative mt-2 shrink-0">
        <h1 className="text-lg font-bold tracking-tight">设置</h1>
        <button className="absolute right-4 w-8 h-8 flex items-center justify-center bg-black/5 rounded-full active:scale-90 transition-transform">
           <svg className="w-4 h-4 text-black/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round"/></svg>
        </button>
      </div>

      <div className="px-4 space-y-8 mt-4">
        {/* Account Group */}
        <section>
          <h2 className="text-[12px] font-medium text-[#8E8E93] uppercase ml-4 mb-2 tracking-wide">账户</h2>
          <div className="bg-white rounded-[16px] overflow-hidden divide-y divide-black/[0.05] border border-black/[0.02] shadow-sm">
            <MenuItem icon={<EmailIcon />} label="电子邮箱" value={stats.email} />
            <MenuItem 
              icon={<SubIcon />} 
              label="订阅" 
              onClick={onUpgrade}
              badge={stats.plan === 'Free' ? "升级" : stats.plan}
            />
            <MenuItem icon={<ArchiveIcon />} label="归档聊天" showArrow />
            <MenuItem icon={<ManageIcon />} label="账号管理" showArrow />
          </div>
        </section>

        {/* App Group */}
        <section>
          <h2 className="text-[12px] font-medium text-[#8E8E93] uppercase ml-4 mb-2 tracking-wide">应用</h2>
          <div className="bg-white rounded-[16px] overflow-hidden divide-y divide-black/[0.05] border border-black/[0.02] shadow-sm">
            <MenuItem icon={<AppearanceIcon />} label="外观" value="浅色" showSelector />
            <MenuItem icon={<LanguageIcon />} label="语言" value="简体中文" showSelector />
            <MenuItem icon={<NotifyIcon />} label="通知" showArrow />
          </div>
        </section>

        {/* About Group */}
        <section>
          <h2 className="text-[12px] font-medium text-[#8E8E93] uppercase ml-4 mb-2 tracking-wide">关于</h2>
          <div className="bg-white rounded-[16px] overflow-hidden divide-y divide-black/[0.05] border border-black/[0.02] shadow-sm">
            <MenuItem icon={<DocIcon />} label="服务条款" showArrow />
            <MenuItem icon={<PrivacyIcon />} label="隐私政策" showArrow />
            <MenuItem icon={<DeviceIcon />} label="VIB iOS版" value="v1.8.4" />
          </div>
        </section>

        {/* Logout Button */}
        <button className="w-full bg-white text-[#FF3B30] font-bold py-4 rounded-[16px] border border-black/[0.02] shadow-sm active:scale-[0.98] transition-all flex items-center justify-center space-x-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span className="text-[15px]">退出登录</span>
        </button>
      </div>
    </div>
  );
};

const MenuItem = ({ icon, label, value, badge, showArrow, showSelector, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`flex items-center px-4 py-4 space-x-3 active:bg-black/[0.02] transition-colors cursor-pointer ${onClick ? '' : 'pointer-events-none'}`}
  >
    <div className="w-6 h-6 flex items-center justify-center shrink-0 text-[#007AFF]">
      {icon}
    </div>
    <span className="flex-1 text-[15px] font-semibold text-black/90">{label}</span>
    {badge && (
      <div className="flex items-center space-x-1 border border-[#FF1B6B] rounded-full px-2.5 py-0.5 mr-1 bg-[#FF1B6B]/10">
        <svg className="w-2.5 h-2.5 text-[#FF1B6B]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        <span className="text-[10px] font-black text-[#FF1B6B] leading-none uppercase tracking-wider">{badge}</span>
      </div>
    )}
    {value && <span className="text-[14px] text-[#8E8E93] font-medium">{value}</span>}
    {showArrow && <svg className="w-4 h-4 text-black/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
    {showSelector && (
      <div className="flex flex-col items-center justify-center -space-y-1 text-black/10">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 15l7-7 7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
    )}
    {onClick && !showArrow && !badge && !showSelector && !value && <svg className="w-4 h-4 text-black/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
  </div>
);

// Icons
const EmailIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SubIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ArchiveIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ManageIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const AppearanceIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const LanguageIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 11.37 9.19 15.183 5 17.094" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const NotifyIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const DocIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const PrivacyIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const DeviceIcon = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;

export default ProfileView;
