import React, { useState, useEffect, useCallback } from 'react';
import { User, OrganizationProfile } from '../types';
import { ArrowRight, User as UserIcon, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

interface LoginScreenProps {
  users: User[];
  onLogin: (user: User) => void;
  orgProfile?: OrganizationProfile | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ users, onLogin, orgProfile }) => {
  const [step, setStep] = useState<'initials' | 'pin'>('initials');
  const [initialsInput, setInitialsInput] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const logoSrc = orgProfile?.logoUrl || '/logo.png';
  const orgName = orgProfile?.name || 'Kent Owl Academy';

  const handleInitialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (users.length === 0) {
        setError('Registry loading...');
        return;
    }

    const cleanInitials = initialsInput.trim().toUpperCase();
    const user = users.find(u => u.initials.toUpperCase() === cleanInitials);
    
    if (user) {
        if (user.active === false) {
            setError('Account Suspended');
            setTimeout(() => setError(''), 3000);
            return;
        }
        setSelectedUser(user);
        setStep('pin');
        setError('');
    } else {
        setError('User not found');
        setTimeout(() => setError(''), 2000);
    }
  };

  const handlePinInput = useCallback((input: string) => {
      if (!selectedUser) return;

      if (input === 'DEL') {
          setPin(prev => prev.slice(0, -1));
          return;
      }

      if (input === 'CLR') {
          setPin('');
          return;
      }

      // Handle numbers
      setPin(prev => {
          if (prev.length < 4) {
              const newPin = prev + input;
              if (newPin.length === 4) {
                  // Validate immediately after state update would reflect
                  setTimeout(() => {
                      if (newPin === selectedUser.pin) {
                          onLogin(selectedUser);
                      } else {
                          setError('Invalid PIN');
                          setPin('');
                          setTimeout(() => setError(''), 2000);
                      }
                  }, 200);
              }
              return newPin;
          }
          return prev;
      });
  }, [selectedUser, onLogin]);

  // Keyboard Event Listener
  useEffect(() => {
      if (step !== 'pin') return;

      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key >= '0' && e.key <= '9') {
              handlePinInput(e.key);
          } else if (e.key === 'Backspace') {
              handlePinInput('DEL');
          } else if (e.key === 'Escape' || e.key === 'Delete') {
              handlePinInput('CLR');
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, handlePinInput]);

  return (
    <div className="fixed inset-0 bg-slate-100 flex items-center justify-center p-6">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 blur-[150px] rounded-full pointer-events-none"></div>
         
         <div className="bg-white border border-slate-200 p-8 md:p-12 rounded-3xl shadow-2xl w-full max-w-sm relative z-10 text-center animate-in zoom-in-95 duration-500">
             
             <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                <img src={logoSrc} alt="Logo" className="w-auto h-12" />
             </div>
             
             <h1 className="text-xl font-bold text-slate-800 mb-1">{orgName}</h1>
             <p className="text-emerald-600 mb-8 text-[10px] font-black uppercase tracking-widest">Institutional Management System</p>

             {step === 'initials' ? (
                 <form onSubmit={handleInitialsSubmit} className="space-y-4">
                    <p className="text-slate-500 text-sm font-medium">Enter your staff initials to begin.</p>
                    <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                        <input 
                            type="text" value={initialsInput} onChange={(e) => setInitialsInput(e.target.value)}
                            className="w-full bg-white border-2 border-slate-200 text-slate-800 text-center text-xl font-bold py-4 rounded-xl focus:outline-none focus:border-emerald-500 transition-all uppercase pl-10 tracking-[0.2em]"
                            placeholder="XX" maxLength={3} autoFocus
                            disabled={users.length === 0}
                        />
                    </div>
                    <button type="submit" disabled={users.length === 0} className="w-full bg-slate-900 text-white font-black uppercase text-xs tracking-widest py-4 rounded-xl hover:bg-black transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 active:scale-95 disabled:bg-slate-400 disabled:shadow-none">
                        {users.length === 0 ? <Loader2 className="animate-spin" size={18} /> : 'Validate Credentials'} {users.length > 0 && <ArrowRight size={18} />}
                    </button>
                    {error && (
                        <div className="flex items-center justify-center gap-2 text-rose-500 text-xs font-bold animate-in fade-in slide-in-from-top-1 mt-2">
                            <AlertCircle size={14}/> {error}
                        </div>
                    )}
                    {users.length === 0 && !error && (
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse mt-2">Connecting to Staff Registry...</p>
                    )}
                 </form>
             ) : (
                 <div className="space-y-6 animate-in slide-in-from-right-4">
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-white font-black text-xs">{selectedUser?.initials}</div>
                        <div className="text-left">
                            <p className="text-slate-800 font-bold text-sm truncate uppercase tracking-tight">{selectedUser?.name}</p>
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">{selectedUser?.jobPosition || selectedUser?.role}</span>
                        </div>
                        <button onClick={() => { setStep('initials'); setPin(''); }} className="ml-auto text-[9px] font-black text-slate-400 uppercase hover:text-slate-800 transition-colors">Switch</button>
                    </div>

                    <p className="text-slate-500 text-sm font-medium">Enter your 4-digit PIN.</p>
                    <div className="flex justify-center gap-4">
                        {[0,1,2,3].map(i => (
                            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-emerald-500 scale-110' : 'bg-slate-200'}`} />
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        {[1,2,3,4,5,6,7,8,9, 'CLR', 0, 'DEL'].map(val => (
                            <button 
                                key={val} type="button" 
                                onClick={() => handlePinInput(val.toString())}
                                className={`py-4 rounded-xl font-black text-lg transition-all active:scale-95 border-b-4 ${
                                    typeof val === 'number' ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50' : 'bg-slate-200 text-slate-500 border-slate-300 text-[10px] uppercase font-black tracking-widest'
                                }`}
                            >
                                {val}
                            </button>
                        ))}
                    </div>
                    {error && <p className="text-rose-500 text-xs font-bold animate-pulse">{error}</p>}
                 </div>
             )}

             <div className="mt-8 flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 <ShieldCheck size={14} /> Statutory Secure Environment
             </div>
         </div>
    </div>
  );
};

export default LoginScreen;