import React, { useMemo, useState } from 'react';
import { Note, Task, Entity, EntityType, Suggestion } from '../types';
import { 
  ArrowUpRight, Clock, Hash, ShieldAlert, Eye, EyeOff, 
  Inbox, AlertCircle, GitMerge, Zap, CheckCircle2, UserPlus, ArrowRight, AlertTriangle, Lightbulb, X, Archive
} from 'lucide-react';

interface DashboardProps {
  notes: Note[];
  tasks: Task[];
  entities: Entity[];
  suggestions: Suggestion[]; // New Prop
  onApplySuggestion: (s: Suggestion) => void;
  onDismissSuggestion: (id: string) => void;
  onEditNote: (note: Note) => void;
}

// Helper to calculate text similarity (Jaccard Index)
const calculateSimilarity = (str1: string, str2: string) => {
  const set1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const set2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
};

const NoteCard: React.FC<{ note: Note; isDuplicate?: boolean; onEdit: () => void }> = ({ note, isDuplicate, onEdit }) => {
    const [revealed, setRevealed] = useState(false);

    return (
        <div 
            onClick={onEdit}
            className={`bg-white p-4 rounded-xl border shadow-sm transition-colors cursor-pointer group relative overflow-hidden ${isDuplicate ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200 hover:border-indigo-300'}`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${note.category === 'General' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-50 text-indigo-600'}`}>
                    {note.category || 'General'}
                </span>
                <span className="text-[10px] text-slate-400">{new Date(note.createdAt).toLocaleDateString()}</span>
            </div>
            <h3 className="font-bold text-sm text-slate-800 mb-2 group-hover:text-indigo-600 flex items-center gap-2">
                {note.summary}
                {note.isSensitive && (
                    <span title="Información Sensible">
                        <ShieldAlert size={14} className="text-red-500" />
                    </span>
                )}
            </h3>
            
            <div className="relative">
                <p className={`text-slate-500 text-xs line-clamp-2 transition-all duration-300 ${note.isSensitive && !revealed ? 'blur-sm select-none' : ''}`}>
                    {note.content}
                </p>
                {note.isSensitive && !revealed && (
                    <div className="absolute inset-0 flex items-center justify-center z-10" onClick={(e) => { e.stopPropagation(); setRevealed(true); }}>
                        <button className="flex items-center gap-2 px-2 py-1 bg-white/90 shadow-sm border border-slate-200 rounded-full text-[10px] font-bold text-slate-600 hover:text-indigo-600">
                            <Eye size={12} /> Ver
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ notes, tasks, entities, suggestions, onApplySuggestion, onDismissSuggestion, onEditNote }) => {
  const ONE_DAY = 24 * 60 * 60 * 1000;

  // 1. Unclassified Notes (Inbox)
  const unclassifiedNotes = useMemo(() => 
    notes.filter(n => !n.category || n.category === 'General' || n.category === 'Personal'), 
  [notes]);

  // 2. High Priority Pending Tasks
  const urgentTasks = useMemo(() => 
    tasks.filter(t => !t.completed && t.priority === 'High'), 
  [tasks]);

  // 3. Recent Directory Changes
  const newEntities = useMemo(() => {
    const recentNoteIds = notes.filter(n => (Date.now() - n.createdAt) < ONE_DAY).map(n => n.id);
    return entities.filter(e => e.notes.some(nId => recentNoteIds.includes(nId)));
  }, [entities, notes]);

  // 4. Duplicate Detection
  const potentialDuplicates = useMemo(() => {
    const dupes: { noteA: Note, noteB: Note, score: number }[] = [];
    const checked = new Set<string>();

    notes.forEach((noteA, i) => {
        notes.forEach((noteB, j) => {
            if (i >= j) return; // Avoid double check and self check
            if (checked.has(`${noteA.id}-${noteB.id}`)) return;

            const score = calculateSimilarity(noteA.summary + " " + noteA.content, noteB.summary + " " + noteB.content);
            if (score > 0.4) { // 40% similarity threshold
                dupes.push({ noteA, noteB, score });
                checked.add(`${noteA.id}-${noteB.id}`);
            }
        });
    });
    return dupes.sort((a,b) => b.score - a.score).slice(0, 3);
  }, [notes]);

  // 5. Incomplete Items Detection (New Rule)
  const incompleteEntities = useMemo(() => entities.filter(e => e.status === 'incomplete'), [entities]);
  const contextLessTasks = useMemo(() => tasks.filter(t => !t.completed && !t.relatedEntityId), [tasks]);

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Buenos días";
      if (hour < 18) return "Buenas tardes";
      return "Buenas noches";
  };

  return (
    <div className="p-6 md:p-8 space-y-8 overflow-y-auto h-full pb-20 bg-slate-50/50">
      <header className="flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">{getGreeting()}</h1>
            <p className="text-slate-500 mt-1">Aquí tienes tu briefing diario.</p>
        </div>
        <div className="text-right hidden md:block">
            <p className="text-3xl font-bold text-indigo-600">{tasks.filter(t => !t.completed).length}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tareas Activas</p>
        </div>
      </header>

      {/* --- SMART AUTONOMY WIDGET (NEW) --- */}
      {suggestions.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg animate-in slide-in-from-top-4">
              <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur rounded-xl">
                      <Lightbulb size={24} className="text-yellow-300" />
                  </div>
                  <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">Sugerencia Inteligente</h3>
                      <p className="text-indigo-100 text-sm mb-4">
                          He notado algunos patrones en tus notas recientes.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {suggestions.map(s => (
                              <div key={s.id} className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-3 flex justify-between items-center">
                                  <div>
                                      <p className="font-bold text-sm">{s.title}</p>
                                      <p className="text-xs text-indigo-200">{s.reason}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => onApplySuggestion(s)}
                                        className="px-3 py-1.5 bg-white text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-colors"
                                      >
                                          Aplicar
                                      </button>
                                      <button 
                                        onClick={() => onDismissSuggestion(s.id)}
                                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                                      >
                                          <X size={14} />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ALERT SECTION FOR INCOMPLETE ITEMS */}
      {(incompleteEntities.length > 0 || contextLessTasks.length > 0) && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col md:flex-row gap-6 animate-in slide-in-from-top-4">
              {incompleteEntities.length > 0 && (
                  <div className="flex-1">
                      <h3 className="text-orange-800 font-bold flex items-center gap-2 text-sm mb-2">
                          <AlertTriangle size={16}/> Entidades Incompletas ({incompleteEntities.length})
                      </h3>
                      <p className="text-orange-600 text-xs mb-2">El sistema detectó nombres vagos. Necesitan revisión.</p>
                      <div className="flex flex-wrap gap-2">
                          {incompleteEntities.slice(0, 3).map(e => (
                              <span key={e.id} className="px-2 py-1 bg-white border border-orange-200 rounded text-xs text-orange-700 font-medium">
                                  {e.name}
                              </span>
                          ))}
                      </div>
                  </div>
              )}
              {contextLessTasks.length > 0 && (
                  <div className="flex-1">
                      <h3 className="text-orange-800 font-bold flex items-center gap-2 text-sm mb-2">
                          <AlertTriangle size={16}/> Tareas sin Contexto ({contextLessTasks.length})
                      </h3>
                      <p className="text-orange-600 text-xs mb-2">Estas tareas no tienen Empresa o Proyecto asignado.</p>
                      <div className="flex flex-col gap-1">
                          {contextLessTasks.slice(0, 2).map(t => (
                              <span key={t.id} className="truncate px-2 py-1 bg-white border border-orange-200 rounded text-xs text-orange-700">
                                  {t.description}
                              </span>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COL 1: INBOX & CLASSIFICATION */}
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Inbox size={20}/></div>
                    <h2 className="font-bold text-slate-800">Bandeja de Entrada</h2>
                    <span className="ml-auto text-xs font-bold bg-slate-100 px-2 py-1 rounded-full text-slate-500">{unclassifiedNotes.length}</span>
                </div>
                {unclassifiedNotes.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Todo está organizado.</p>
                ) : (
                    <div className="space-y-3">
                        {unclassifiedNotes.slice(0, 3).map(note => (
                            <NoteCard key={note.id} note={note} onEdit={() => onEditNote(note)} />
                        ))}
                        {unclassifiedNotes.length > 3 && (
                            <button className="w-full py-2 text-xs text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors">
                                Ver {unclassifiedNotes.length - 3} más
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* DUPLICATES ALERT */}
            {potentialDuplicates.length > 0 && (
                 <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm p-5">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><GitMerge size={20}/></div>
                        <h2 className="font-bold text-amber-900">Posibles Duplicados</h2>
                    </div>
                    <div className="space-y-4">
                        {potentialDuplicates.map((dupe, idx) => (
                            <div key={idx} className="bg-white/80 p-3 rounded-xl border border-amber-100 text-sm">
                                <p className="text-amber-800 text-xs font-bold mb-2 flex justify-between">
                                    <span>Similitud: {Math.round(dupe.score * 100)}%</span>
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => onEditNote(dupe.noteA)}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                        <span className="truncate text-slate-600 font-medium hover:text-indigo-600">{dupe.noteA.summary}</span>
                                    </div>
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => onEditNote(dupe.noteB)}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                        <span className="truncate text-slate-600 font-medium hover:text-indigo-600">{dupe.noteB.summary}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
            )}
        </div>

        {/* COL 2: ACTION ITEMS */}
        <div className="space-y-6">
             <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Zap size={20}/></div>
                    <h2 className="font-bold text-slate-800">Atención Requerida</h2>
                    <span className="ml-auto text-xs font-bold bg-red-100 px-2 py-1 rounded-full text-red-600">{urgentTasks.length}</span>
                </div>
                {urgentTasks.length === 0 ? (
                    <div className="text-center py-6">
                        <CheckCircle2 className="mx-auto text-green-500 mb-2" size={32} />
                        <p className="text-sm text-slate-500">Estás al día con lo urgente.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {urgentTasks.map(task => (
                             <div key={task.id} className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-start gap-3">
                                <div className="mt-0.5 w-4 h-4 rounded border-2 border-red-300 flex items-center justify-center bg-white cursor-pointer hover:border-red-500"></div>
                                <div>
                                    <p className="text-sm font-medium text-slate-800">{task.description}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                         <span className="text-xs text-red-500 font-bold uppercase tracking-wider">Prioridad Alta</span>
                                         {!task.relatedEntityId && <span className="text-[10px] text-orange-500 flex items-center gap-1"><AlertTriangle size={10}/> Sin Contexto</span>}
                                    </div>
                                </div>
                             </div>
                        ))}
                    </div>
                )}
             </div>

             {/* STATS MINI */}
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-slate-400 text-xs font-bold uppercase mb-1">Total Notas</div>
                    <div className="text-2xl font-bold text-slate-800">{notes.length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                     <div className="text-slate-400 text-xs font-bold uppercase mb-1">Directorio</div>
                    <div className="text-2xl font-bold text-slate-800">{entities.length}</div>
                </div>
             </div>
        </div>

        {/* COL 3: INTELLIGENCE & UPDATES */}
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><UserPlus size={20}/></div>
                    <h2 className="font-bold text-slate-800">Cambios Recientes</h2>
                </div>
                {newEntities.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No hubo cambios en el directorio en las últimas 24h.</p>
                ) : (
                    <div className="space-y-3">
                        {newEntities.map(ent => (
                            <div key={ent.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                    ent.type === EntityType.COMPANY ? 'bg-orange-100 text-orange-600' : 
                                    ent.type === EntityType.PROJECT ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                    {ent.name.charAt(0)}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-bold text-slate-700 truncate">{ent.name}</p>
                                    <p className="text-[10px] text-slate-400 uppercase">{ent.type}</p>
                                </div>
                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Nuevo</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="font-bold text-lg mb-2">Resumen Diario</h3>
                    <p className="text-indigo-200 text-sm mb-4">
                        Tienes <span className="text-white font-bold">{unclassifiedNotes.length}</span> notas sin organizar y <span className="text-white font-bold">{urgentTasks.length}</span> tareas urgentes esperando.
                    </p>
                    <button className="bg-white text-indigo-900 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-50 transition-colors">
                        Empezar a organizar <ArrowRight size={14}/>
                    </button>
                </div>
                {/* Decorative blob */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500 rounded-full blur-2xl opacity-50"></div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;