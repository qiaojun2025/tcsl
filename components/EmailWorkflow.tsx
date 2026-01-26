
import React, { useState } from 'react';

interface EmailWorkflowProps {
  onVerified: (email: string) => void;
}

const EmailWorkflow: React.FC<EmailWorkflowProps> = ({ onVerified }) => {
  const [step, setStep] = useState<'input' | 'confirm' | 'sent'>('input');
  const [email, setEmail] = useState('');

  const handleSendEmail = () => {
    if (!email.includes('@')) {
      alert('请输入有效的邮件地址');
      return;
    }
    setStep('sent');
  };

  const handleVerificationClick = () => {
    onVerified(email);
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-8 bg-white text-center">
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-8">
        <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
      </div>

      {step === 'input' && (
        <div className="w-full space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">欢迎加入</h1>
          <p className="text-gray-500 text-sm">系统提示：请先绑定您的邮箱以成为 VIB 节点用户。</p>
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="您的电子邮箱" 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button 
              onClick={() => setStep('confirm')}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform"
            >
              验证邮件
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && (
        <div className="w-full space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">确认发送？</h1>
          <p className="text-gray-500 text-sm">系统提示：邮件确认。我们将发送验证链接至 {email}</p>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setStep('input')}
              className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-xl active:bg-gray-200 transition-colors"
            >
              修改
            </button>
            <button 
              onClick={handleSendEmail}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform"
            >
              发送邮件
            </button>
          </div>
        </div>
      )}

      {step === 'sent' && (
        <div className="w-full space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">邮件已发送</h1>
          <p className="text-gray-500 text-sm">系统提示：请点击邮件中的验证链接完成 VIB 用户激活。</p>
          <div className="bg-blue-50 p-4 rounded-xl text-left border border-blue-100 mb-6">
            <p className="text-xs font-bold text-blue-800 mb-2">邮件模拟预览：</p>
            <p className="text-sm text-blue-600 mb-4">来自：Web3 Task Agent<br/>内容：点击下方按钮完成验证</p>
            <button 
              onClick={handleVerificationClick}
              className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow"
            >
              模拟点击邮件链接 (完成验证)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailWorkflow;
