import React, { useMemo } from 'react';
import { Note, Task, Entity, EntityType } from '../types';
import { AlertTriangle, AlertCircle, Link, GitMerge, Check, ArrowRight, Edit3, Trash2, Building } from 'lucide-react';

interface SmartReviewPanelProps {
  notes: Note[];
  tasks: Task[];
  entities: Entity[];
  onEditItem: (item: any, type: 'note' | 'task' | 'entity') => void;
  onUpdateTask: (task: Task) => void;
  onUpdateEntity: (entity: Entity) => void;
  onDeleteNote: (id: string) => void;
  onMergeNotes: (keepId: string, dropId: string) => void;
}

const SmartReviewPanel: React.FC<SmartReviewPanelProps> = ({ 
    notes, tasks, entities, 
    onEditItem, onUpdateTask, onUpdateEntity, onDeleteNote, onMergeNotes 
}) => {

  // 1. Audit: Incomplete Entities
  const incompleteEntities = useMemo(() => entities.filter(e => e.status === 'incomplete'), [entities]);

  // 2. Audit: Tasks without Context
  const contextLessTasks = useMemo(() => tasks.filter(t => !t.completed && !t.relatedEntityId), [tasks]);

  // 3. Audit: Projects without Parent Company
  const orphanProjects = useMemo(() => entities.filter(e => e.type === EntityType.PROJECT && !e.parentId), [entities]);

  // 4. Audit: Duplicate Notes (Similar to Dashboard but centralized)
  const duplicateNotes = useMemo(() => {
    const dupes: { noteA: Note, noteB: Note, score: number }[] = [];
    const checked = new Set<string>();

    notes.forEach((noteA, i) => {
        notes.forEach((noteB, j) => {
            if (i >= j) return;
            if (checked.has(`${noteA.id}-${noteB.id}`)) return;

            // Simple Jaccard similarity for words > 3 chars
            const set1 = new Set(noteA.summary.toLowerCase().split(/\s+/).concat(noteA.content.toLowerCase().split(/\s+/)).filter(w => w.length > 3));
            const set2 = new Set(noteB.summary.toLowerCase().split(/\s+/).concat(noteB.content.toLowerCase().split(/\s+/)).filter(w => w.length > 3));
            const intersection = new Set([...set1].filter(x => set2.has(x)));
            const union = new Set([...set1, ...set2]);
            const score = union.size === 0 ? 0 : intersection.size / union.size;

            if (score > 0.6) { // Strict threshold for review panel
                dupes.push({ noteA, noteB, score });
                checked.add(`${noteA.id}-${noteB.id}`);
            }
        });
    });
    return dupes.sort((a,b) => b.score - a.score);
  }, [notes]);

  const totalIssues = incompleteEntities.length + contextLessTasks.length + orphanProjects.length + duplicateNotes.length;

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
      <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Revisión Inteligente</h1>
            <p className="text-slate-500">El sistema se auto-audita para encontrar inconsistencias.</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
              <span className={`text-2xl font-bold ${totalIssues > 0 ? 'text-orange-500' : 'text-green-500'}`}>{totalIssues}</span>
              <span className="text-xs font-bold text-slate-400 uppercase">Problemas detectados</span>
          </div>
      </div>

      {totalIssues === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Todo está en orden</h2>
              <p className="text-slate-500 mt-2">No se detectaron inconsistencias en tu base de conocimiento.</p>
          </div>
      )}

      <div className="space-y-8 max-w-5xl">
          
          {/* SECTION 1: INCOMPLETE ENTITIES */}
          {incompleteEntities.length > 0 && (
              <section className="bg-white rounded-2xl border border-orange-200 overflow-hidden shadow-sm">
                  <div className="bg-orange-50 p-4 border-b border-orange-100 flex items-center gap-3">
                      <AlertTriangle className="text-orange-600" />
                      <h2 className="font-bold text-orange-900">Entidades Incompletas ({incompleteEntities.length})</h2>
                  </div>
                  <div className="divide-y divide-slate-100">
                      {incompleteEntities.map(entity => (
                          <div key={entity.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                              <div>
                                  <h3 className="font-bold text-slate-800">{entity.name}</h3>
                                  <p className="text-xs text-slate-500">Detectada como vaga o sin información de contacto.</p>
                              </div>
                              <div className="flex gap-2">
                                  <button 
                                    onClick={() => onEditItem(entity, 'entity')}
                                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2"
                                  >
                                      <Edit3 size={14} /> Revisar
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </section>
          )}

          {/* SECTION 2: CONTEXT-LESS TASKS */}
          {contextLessTasks.length > 0 && (
              <section className="bg-white rounded-2xl border border-yellow-200 overflow-hidden shadow-sm">
                  <div className="bg-yellow-50 p-4 border-b border-yellow-100 flex items-center gap-3">
                      <AlertCircle className="text-yellow-600" />
                      <h2 className="font-bold text-yellow-900">Tareas sin Contexto ({contextLessTasks.length})</h2>
                  </div>
                  <div className="divide-y divide-slate-100">
                      {contextLessTasks.map(task => (
                          <div key={task.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50">
                              <div>
                                  <p className="font-medium text-slate-800">{task.description}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${task.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                          {task.priority}
                                      </span>
                                      <span className="text-xs text-slate-400">Creada: {new Date().toLocaleDateString()}</span>
                                  </div>
                              </div>
                              
                              {/* Quick Fix Dropdown */}
                              <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-400 uppercase hidden sm:inline">Asignar a:</span>
                                  <select 
                                      className="text-sm border border-slate-300 rounded-lg p-2 bg-white outline-none focus:border-indigo-500 max-w-[200px]"
                                      onChange={(e) => {
                                          if(e.target.value) {
                                              onUpdateTask({ ...task, relatedEntityId: e.target.value });
                                          }
                                      }}
                                      defaultValue=""
                                  >
                                      <option value="" disabled>Seleccionar...</option>
                                      {entities.map(e => (
                                          <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                                      ))}
                                  </select>
                              </div>
                          </div>
                      ))}
                  </div>
              </section>
          )}

          {/* SECTION 3: DUPLICATES */}
          {duplicateNotes.length > 0 && (
              <section className="bg-white rounded-2xl border border-indigo-200 overflow-hidden shadow-sm">
                  <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex items-center gap-3">
                      <GitMerge className="text-indigo-600" />
                      <h2 className="font-bold text-indigo-900">Posibles Duplicados ({duplicateNotes.length})</h2>
                  </div>
                  <div className="divide-y divide-slate-100">
                      {duplicateNotes.map(({ noteA, noteB, score }, idx) => (
                          <div key={idx} className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                                      Similitud: {Math.round(score * 100)}%
                                  </span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                  <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                                      <h4 className="font-bold text-sm text-slate-700 mb-1">{noteA.summary}</h4>
                                      <p className="text-xs text-slate-500 line-clamp-2">{noteA.content}</p>
                                      <div className="mt-2 text-[10px] text-slate-400">{new Date(noteA.createdAt).toLocaleDateString()}</div>
                                  </div>
                                  <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
                                      <h4 className="font-bold text-sm text-slate-700 mb-1">{noteB.summary}</h4>
                                      <p className="text-xs text-slate-500 line-clamp-2">{noteB.content}</p>
                                      <div className="mt-2 text-[10px] text-slate-400">{new Date(noteB.createdAt).toLocaleDateString()}</div>
                                  </div>
                              </div>
                              <div className="flex justify-end gap-3">
                                  <button 
                                      onClick={() => onDeleteNote(noteB.id)} // Simple delete B
                                      className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                                  >
                                      <Trash2 size={14}/> Eliminar B
                                  </button>
                                  <button 
                                      onClick={() => onMergeNotes(noteA.id, noteB.id)}
                                      className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                                  >
                                      <GitMerge size={14}/> Fusionar (A + Contenido de B)
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </section>
          )}

          {/* SECTION 4: ORPHAN PROJECTS */}
          {orphanProjects.length > 0 && (
              <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="bg-slate-100 p-4 border-b border-slate-200 flex items-center gap-3">
                      <Link className="text-slate-600" />
                      <h2 className="font-bold text-slate-900">Proyectos Huérfanos ({orphanProjects.length})</h2>
                  </div>
                  <div className="divide-y divide-slate-100">
                      {orphanProjects.map(proj => (
                          <div key={proj.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                              <div>
                                  <h3 className="font-bold text-slate-800">{proj.name}</h3>
                                  <p className="text-xs text-slate-500">Proyecto sin empresa matriz asignada.</p>
                              </div>
                              <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-400 uppercase hidden sm:inline">Vincular a:</span>
                                  <select 
                                      className="text-sm border border-slate-300 rounded-lg p-2 bg-white outline-none focus:border-indigo-500 max-w-[200px]"
                                      onChange={(e) => {
                                          if(e.target.value) {
                                              onUpdateEntity({ ...proj, parentId: e.target.value });
                                          }
                                      }}
                                      defaultValue=""
                                  >
                                      <option value="" disabled>Empresa...</option>
                                      {entities.filter(e => e.type === EntityType.COMPANY).map(e => (
                                          <option key={e.id} value={e.id}>{e.name}</option>
                                      ))}
                                  </select>
                              </div>
                          </div>
                      ))}
                  </div>
              </section>
          )}

      </div>
    </div>
  );
};

export default SmartReviewPanel;