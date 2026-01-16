import React, { useEffect } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface SystemToastProps {
  message: string;
  type: 'success' | 'warning' | 'info';
  onClose: () => void;
}

const SystemToast: React.FC<SystemToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in">
      <div className={`flex items-start gap-3 p-4 rounded-xl shadow-xl border backdrop-blur-md ${
        type === 'warning' 
          ? 'bg-orange-50/90 border-orange-200 text-orange-900' 
          : 'bg-slate-900/90 border-slate-700 text-white'
      }`}>
        <div className={`mt-0.5 p-1 rounded-full ${type === 'warning' ? 'bg-orange-200 text-orange-700' : 'bg-green-500/20 text-green-400'}`}>
           {type === 'warning' ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
        </div>
        <div className="flex-1 mr-4">
            <h4 className="text-sm font-bold mb-1">Sistema Autónomo</h4>
            <p className="text-xs opacity-90 leading-relaxed">{message}</p>
        </div>
        <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity">
            <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default SystemToast;