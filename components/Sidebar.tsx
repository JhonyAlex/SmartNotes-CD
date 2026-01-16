import React from 'react';
import { LayoutDashboard, Users, CheckSquare, Book, Briefcase, Settings, ClipboardCheck } from 'lucide-react';
import { ViewMode } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  setView: (view: ViewMode) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const menuItems = [
    { id: 'dashboard' as ViewMode, icon: LayoutDashboard, label: 'Inicio' },
    { id: 'review' as ViewMode, icon: ClipboardCheck, label: 'Revisión' },
    { id: 'directory' as ViewMode, icon: Users, label: 'Directorio' },
    { id: 'project_view' as ViewMode, icon: Briefcase, label: 'Proyectos' },
    { id: 'tasks' as ViewMode, icon: CheckSquare, label: 'Tareas' },
    { id: 'knowledge' as ViewMode, icon: Book, label: 'Conocimiento' },
  ];

  return (
    <div className="w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0 transition-all duration-300">
      <div className="p-6 flex items-center gap-3 border-b border-slate-100">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
        </div>
        <span className="font-bold text-slate-800 text-xl hidden md:block">SmartNotes</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors duration-200 ${
                isActive 
                  ? 'bg-indigo-50 text-indigo-700' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium hidden md:block">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 space-y-2">
        <button
            onClick={() => setView('admin')}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors duration-200 ${
                currentView === 'admin'
                ? 'bg-slate-100 text-slate-800' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
        >
            <Settings size={20} />
            <span className="font-medium hidden md:block">Admin</span>
        </button>
        <div className="text-xs text-slate-400 text-center md:text-left px-3">
           <span className="hidden md:inline">Powered by Gemini 3 Flash</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;