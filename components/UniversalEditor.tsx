import React, { useState, useMemo } from 'react';
import { Note, Task, Entity, KnowledgeItem, EntityType, TaskPriority, AppConfig } from '../types';
import { X, Save, Link, Search, Trash2, Calendar, Hash, Type, CheckCircle, Building, User, Briefcase, ExternalLink, Clock, AlertTriangle, Archive, ArrowRight, GitMerge, FileText, CheckSquare, BookOpen, Zap } from 'lucide-react';

type ItemType = 'note' | 'task' | 'entity' | 'knowledge';

interface UniversalEditorProps {
  item: any;
  type: ItemType;
  allEntities: Entity[];
  allTasks?: Task[]; 
  allKnowledge?: KnowledgeItem[]; 
  config?: AppConfig;
  onSave: (updatedItem: any) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  onMergeEntities?: (sourceId: string, targetId: string) => void;
  onNavigate?: (type: EntityType, id: string) => void; // New Navigation capability
}

const UniversalEditor: React.FC<UniversalEditorProps> = ({ item, type, allEntities, allTasks, allKnowledge, config, onSave, onClose, onDelete, onMergeEntities, onNavigate }) => {
  const [data, setData] = useState({ ...item });
  const [isLinking, setIsLinking] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Merge State (Entity Only)
  const [showMerge, setShowMerge] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState('');

  // --- Derived Data for Notes ---
  const generatedTasks = useMemo(() => {
      if (type !== 'note' || !allTasks) return [];
      return allTasks.filter(t => t.sourceNoteId === data.id);
  }, [data.id, type, allTasks]);

  const generatedKnowledge = useMemo(() => {
      if (type !== 'note' || !allKnowledge) return [];
      return allKnowledge.filter(k => k.sourceNoteId === data.id);
  }, [data.id, type, allKnowledge]);

  // --- Field Handlers ---
  const handleChange = (field: string, value: any) => {
    setData((prev: any) => ({ ...prev, [field]: value }));
    if (validationError) setValidationError(null); // Clear error on change
  };

  // --- Relationship Handlers ---
  const linkedEntityIds = useMemo(() => {
     if (type === 'note') return data.relatedEntityIds || [];
     if (type === 'task') return data.relatedEntityId ? [data.relatedEntityId] : [];
     if (type === 'knowledge') return data.relatedEntityIds || []; // Support Knowledge
     if (type === 'entity' && data.type !== EntityType.PROJECT) return data.parentId ? [data.parentId] : [];
     return [];
  }, [data, type]);

  const availableEntities = useMemo(() => {
      return allEntities.filter(e => 
        !linkedEntityIds.includes(e.id) && 
        e.id !== data.id && 
        e.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [allEntities, linkedEntityIds, data.id, searchTerm]);

  const addLink = (entityId: string) => {
      if (type === 'note') {
          setData((prev: Note) => ({ ...prev, relatedEntityIds: [...prev.relatedEntityIds, entityId] }));
      } else if (type === 'entity') {
          setData((prev: Entity) => ({ ...prev, parentId: entityId }));
      } else if (type === 'task') {
          setData((prev: Task) => ({ ...prev, relatedEntityId: entityId }));
      } else if (type === 'knowledge') {
          setData((prev: KnowledgeItem) => ({ ...prev, relatedEntityIds: [...(prev.relatedEntityIds || []), entityId] }));
      }
      setIsLinking(false);
      setSearchTerm('');
      setValidationError(null);
  };

  const removeLink = (entityId: string) => {
      if (type === 'note') {
          setData((prev: Note) => ({ ...prev, relatedEntityIds: prev.relatedEntityIds.filter((id: string) => id !== entityId) }));
      } else if (type === 'entity') {
           setData((prev: Entity) => ({ ...prev, parentId: undefined }));
      } else if (type === 'task') {
           setData((prev: Task) => ({ ...prev, relatedEntityId: undefined }));
      } else if (type === 'knowledge') {
           setData((prev: KnowledgeItem) => ({ ...prev, relatedEntityIds: (prev.relatedEntityIds || []).filter((id: string) => id !== entityId) }));
      }
  };

  const toggleArchive = () => {
      if (type !== 'entity') return;
      const newStatus = data.status === 'archived' ? 'active' : 'archived';
      handleChange('status', newStatus);
  };

  const handleSave = () => {
      if (type === 'task') {
          const ruleActive = config?.automationRules?.find(r => r.code === 'TASK_REQUIRES_CONTEXT')?.isActive ?? true;
          if (ruleActive && !data.relatedEntityId) {
              setValidationError("Regla Activa: La tarea debe tener un contexto (Empresa/Proyecto) asignado.");
              return;
          }
      }
      onSave(data);
  };

  const handleChipClick = (e: React.MouseEvent, ent: Entity) => {
      if (onNavigate) {
          e.stopPropagation(); // prevent other clicks
          onNavigate(ent.type, ent.id);
      }
  };

  const renderContentEditor = () => {
      switch (type) {
          case 'note':
              return (
                  <div className="space-y-4">
                       <div>
                           <label className="text-xs font-bold text-slate-400 uppercase">Resumen / Título</label>
                           <input 
                              className="w-full text-lg font-bold border-b border-slate-200 focus:border-indigo-500 outline-none py-1 bg-transparent"
                              value={data.summary}
                              onChange={e => handleChange('summary', e.target.value)}
                           />
                       </div>
                       <div>
                           <label className="text-xs font-bold text-slate-400 uppercase">Contenido</label>
                           <textarea 
                              className="w-full h-64 mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                              value={data.content}
                              onChange={e => handleChange('content', e.target.value)}
                           />
                       </div>
                  </div>
              );
          case 'entity':
              return (
                  <div className="space-y-4">
                       {data.status === 'incomplete' && (
                           <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-3">
                               <AlertTriangle className="text-orange-600 mt-1" size={16}/>
                               <div>
                                   <h4 className="font-bold text-orange-800 text-sm">Entidad Incompleta</h4>
                                   <p className="text-xs text-orange-600">El sistema marcó esto como incompleto por falta de datos. Por favor, revisa el nombre y los detalles.</p>
                                   <button 
                                      onClick={() => handleChange('status', 'active')}
                                      className="mt-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded border border-orange-200 font-bold hover:bg-orange-200"
                                   >
                                       Marcar como Completo
                                   </button>
                               </div>
                           </div>
                       )}
                       {data.type === EntityType.PROJECT && (
                           <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-4">
                               <label className="text-xs font-bold text-purple-700 uppercase flex items-center gap-2 mb-2">
                                   <Building size={14}/> Empresa Matriz (Obligatorio)
                               </label>
                               <select 
                                   className="w-full p-2 bg-white border border-purple-200 rounded-lg outline-none text-sm"
                                   value={data.parentId || ''}
                                   onChange={e => handleChange('parentId', e.target.value || undefined)}
                               >
                                   <option value="">-- General / Sin Empresa --</option>
                                   {allEntities.filter(e => e.type === EntityType.COMPANY && e.id !== data.id).map(c => (
                                       <option key={c.id} value={c.id}>{c.name}</option>
                                   ))}
                               </select>
                           </div>
                       )}
                      <div className="flex gap-4">
                           <div className="flex-1">
                               <label className="text-xs font-bold text-slate-400 uppercase">Nombre</label>
                               <input 
                                  className="w-full text-xl font-bold border-b border-slate-200 focus:border-indigo-500 outline-none py-1 bg-transparent"
                                  value={data.name}
                                  onChange={e => handleChange('name', e.target.value)}
                               />
                           </div>
                           <div className="w-1/3">
                               <label className="text-xs font-bold text-slate-400 uppercase">Tipo</label>
                               <select 
                                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                  value={data.type}
                                  onChange={e => handleChange('type', e.target.value)}
                               >
                                   <option value={EntityType.COMPANY}>Empresa</option>
                                   <option value={EntityType.PROJECT}>Proyecto</option>
                                   <option value={EntityType.PERSON}>Persona</option>
                                   <option value={EntityType.OTHER}>Otro</option>
                               </select>
                           </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-xs font-bold text-slate-400 uppercase">Email / Contacto</label>
                              <input 
                                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                  value={data.email || ''}
                                  onChange={e => handleChange('email', e.target.value)}
                                  placeholder="ejemplo@correo.com"
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-400 uppercase">Rol / Cargo</label>
                              <input 
                                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                  value={data.role || ''}
                                  onChange={e => handleChange('role', e.target.value)}
                                  placeholder="Manager, Dev, etc."
                              />
                          </div>
                      </div>
                  </div>
              );
          case 'task':
              return (
                  <div className="space-y-4">
                       <div className="flex items-start gap-3">
                           <button 
                                onClick={() => handleChange('completed', !data.completed)}
                                className={`mt-1 p-2 rounded-full border ${data.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-transparent hover:border-green-500'}`}
                           >
                               <CheckCircle size={20} />
                           </button>
                           <div className="flex-1">
                               <label className="text-xs font-bold text-slate-400 uppercase">Descripción</label>
                               <textarea 
                                  className="w-full text-lg font-medium border-b border-slate-200 focus:border-indigo-500 outline-none py-1 bg-transparent resize-none h-24"
                                  value={data.description}
                                  onChange={e => handleChange('description', e.target.value)}
                               />
                           </div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="text-xs font-bold text-slate-400 uppercase">Prioridad</label>
                               <select 
                                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                  value={data.priority}
                                  onChange={e => handleChange('priority', e.target.value)}
                               >
                                   <option value={TaskPriority.HIGH}>Alta</option>
                                   <option value={TaskPriority.MEDIUM}>Media</option>
                                   <option value={TaskPriority.LOW}>Baja</option>
                               </select>
                           </div>
                           <div>
                               <label className="text-xs font-bold text-slate-400 uppercase">Fecha Sugerida</label>
                               <input 
                                  type="text"
                                  className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                  value={data.suggestedDate || ''}
                                  onChange={e => handleChange('suggestedDate', e.target.value)}
                                  placeholder="ej. Mañana, 25 Oct..."
                               />
                           </div>
                       </div>
                       
                       <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                           {!data.relatedEntityId ? (
                               <div className="flex items-center gap-2 text-orange-600 text-xs font-bold">
                                   <AlertTriangle size={14}/> <span>Sin Contexto (Huérfana)</span>
                               </div>
                           ) : (
                               <div className="flex items-center gap-2 text-slate-600 text-xs">
                                   <Building size={14} className="text-indigo-500"/> 
                                   <span>Asignada a: <b>{allEntities.find(e => e.id === data.relatedEntityId)?.name}</b></span>
                               </div>
                           )}
                           
                           {data.sourceNoteId && (
                               <div className="mt-1 pt-2 border-t border-slate-200">
                                   <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Origen</p>
                                   <div className="flex items-center gap-2 text-xs text-indigo-600 bg-white p-2 rounded border border-indigo-100">
                                       <FileText size={14}/>
                                       <span>Nota original detectada</span>
                                   </div>
                               </div>
                           )}
                       </div>
                  </div>
              );
            case 'knowledge':
                return (
                    <div className="space-y-4">
                        <div>
                           <label className="text-xs font-bold text-slate-400 uppercase">Tópico</label>
                           <input 
                              className="w-full text-lg font-bold border-b border-slate-200 focus:border-indigo-500 outline-none py-1 bg-transparent"
                              value={data.topic}
                              onChange={e => handleChange('topic', e.target.value)}
                           />
                       </div>
                       <div>
                           <label className="text-xs font-bold text-slate-400 uppercase">Contenido</label>
                           <textarea 
                              className="w-full h-64 mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none font-mono text-sm"
                              value={data.content}
                              onChange={e => handleChange('content', e.target.value)}
                           />
                       </div>
                    </div>
                );
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
        <div className="w-full max-w-2xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2 text-slate-500">
                    <span className="uppercase text-xs font-bold tracking-wider border border-slate-200 px-2 py-0.5 rounded bg-white">
                        Editor de {type === 'note' ? 'Nota' : type === 'entity' ? 'Directorio' : type === 'task' ? 'Tarea' : 'Conocimiento'}
                    </span>
                    {(type === 'note' || type === 'knowledge') && (
                        <div className="flex items-center gap-1 text-xs">
                            <Clock size={12} />
                            {new Date(data.createdAt || data.lastUpdated || Date.now()).toLocaleDateString()}
                        </div>
                    )}
                    {type === 'entity' && data.status === 'archived' && (
                        <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs font-bold uppercase">Archivado</span>
                    )}
                </div>
                <div className="flex gap-2">
                    {type === 'entity' && (
                        <button 
                            onClick={() => setShowMerge(!showMerge)}
                            className={`p-2 rounded-full transition-colors ${showMerge ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-indigo-50 text-slate-400 hover:text-indigo-600'}`}
                            title="Fusionar con otra entidad"
                        >
                           <GitMerge size={18} />
                        </button>
                    )}

                    {type === 'entity' && (
                        <button onClick={toggleArchive} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors" title={data.status === 'archived' ? "Restaurar" : "Archivar"}>
                           <Archive size={18} />
                        </button>
                    )}

                    <button onClick={() => onDelete(data.id)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors" title="Eliminar Permanentemente">
                        <Trash2 size={18} />
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 relative">
                
                {validationError && (
                    <div className="absolute top-4 left-4 right-4 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg z-20 flex items-center gap-2 animate-in slide-in-from-top-2">
                        <AlertTriangle size={20}/>
                        <span className="text-sm font-bold">{validationError}</span>
                        <button onClick={() => setValidationError(null)} className="ml-auto p-1 hover:bg-red-200 rounded"><X size={16}/></button>
                    </div>
                )}

                {showMerge && type === 'entity' && onMergeEntities && (
                    <div className="mb-6 bg-indigo-50 border border-indigo-200 rounded-xl p-4 animate-in slide-in-from-top-2">
                        <h4 className="font-bold text-indigo-900 text-sm mb-2 flex items-center gap-2"><GitMerge size={16}/> Fusionar Entidad</h4>
                        <p className="text-xs text-indigo-700 mb-3">
                            Todo el contenido de <b>{data.name}</b> se moverá a la entidad destino, y {data.name} se eliminará.
                        </p>
                        <div className="flex items-center gap-2">
                            <select 
                                className="flex-1 p-2 text-sm rounded border border-indigo-300"
                                value={mergeTargetId}
                                onChange={e => setMergeTargetId(e.target.value)}
                            >
                                <option value="">Seleccionar destino...</option>
                                {allEntities.filter(e => e.id !== data.id && e.type === data.type).map(e => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                            </select>
                            <button 
                                onClick={() => {
                                    if(window.confirm("¿Seguro que deseas fusionar? Esta acción no se puede deshacer.")) {
                                        onMergeEntities(data.id, mergeTargetId);
                                    }
                                }}
                                disabled={!mergeTargetId}
                                className="bg-indigo-600 text-white px-3 py-2 rounded text-sm font-bold disabled:opacity-50"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                )}

                {renderContentEditor()}

                {type === 'note' && (
                    <div className="mt-8">
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <Zap size={16} className="text-amber-500"/> Impacto Generado
                        </h3>
                        
                        {(generatedTasks.length === 0 && generatedKnowledge.length === 0) ? (
                            <p className="text-xs text-slate-400 italic">Esta nota no ha generado tareas ni documentación aún.</p>
                        ) : (
                            <div className="space-y-3">
                                {generatedTasks.map(t => (
                                    <div key={t.id} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                                        <CheckSquare size={14} className={t.completed ? "text-green-500" : "text-slate-400"}/>
                                        <span className={`text-sm ${t.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.description}</span>
                                    </div>
                                ))}
                                {generatedKnowledge.map(k => (
                                    <div key={k.id} className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-lg">
                                        <BookOpen size={14} className="text-blue-500"/>
                                        <span className="text-sm text-blue-900 font-medium">{k.topic}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* --- CONTEXT & CONNECTIONS SECTION --- */}
                {(type === 'note' || type === 'task' || type === 'knowledge' || (type === 'entity' && data.type !== EntityType.PROJECT)) && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <Link size={16} className="text-indigo-500"/> Conexiones (Contexto)
                        </h3>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                            {linkedEntityIds.map((id: string) => {
                                const ent = allEntities.find(e => e.id === id);
                                if (!ent) return null;
                                return (
                                    <span 
                                        key={id} 
                                        onClick={(e) => handleChipClick(e, ent)}
                                        className={`flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-100 ${onNavigate ? 'cursor-pointer hover:bg-indigo-100 hover:border-indigo-300' : ''}`}
                                    >
                                        {ent.type === EntityType.COMPANY ? <Building size={12}/> : ent.type === EntityType.PROJECT ? <Briefcase size={12}/> : <User size={12}/>}
                                        {ent.name}
                                        <button onClick={(e) => { e.stopPropagation(); removeLink(id); }} className="hover:text-red-500 ml-1"><X size={12}/></button>
                                    </span>
                                );
                            })}
                            
                            {(!isLinking && (type === 'note' || type === 'knowledge' || linkedEntityIds.length === 0)) && (
                                <button 
                                    onClick={() => setIsLinking(true)}
                                    className="px-3 py-1 border border-dashed border-slate-300 text-slate-500 rounded-full text-sm hover:border-indigo-400 hover:text-indigo-600 flex items-center gap-1"
                                >
                                    <Link size={12} /> {type === 'task' ? 'Asignar Contexto' : 'Conectar Entidad'}
                                </button>
                            )}
                        </div>

                        {isLinking && (
                            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg animate-in fade-in zoom-in-95">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                                    <Search size={14} className="text-slate-400"/>
                                    <input 
                                        className="flex-1 text-sm outline-none"
                                        placeholder="Buscar persona, empresa o proyecto..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                    <button onClick={() => setIsLinking(false)}><X size={14} className="text-slate-400"/></button>
                                </div>
                                <div className="max-h-40 overflow-y-auto space-y-1">
                                    {availableEntities.length === 0 ? (
                                        <p className="text-xs text-slate-400 text-center py-2">No se encontraron coincidencias</p>
                                    ) : (
                                        availableEntities.map(ent => (
                                            <button 
                                                key={ent.id}
                                                onClick={() => addLink(ent.id)}
                                                className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded text-sm text-slate-700 flex items-center gap-2"
                                            >
                                                {ent.type === EntityType.COMPANY ? <Building size={14} className="text-orange-400"/> : 
                                                 ent.type === EntityType.PROJECT ? <Briefcase size={14} className="text-purple-400"/> : 
                                                 <User size={14} className="text-blue-400"/>}
                                                {ent.name}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-8 pt-4 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-2">
                    <Hash size={12} />
                    <span>ID: {data.id}</span>
                    <span className="mx-2">•</span>
                    {data.sourceNoteId && (
                         <span className="flex items-center gap-1 text-indigo-400 cursor-help" title="Creado a partir de una nota de texto">
                             <ExternalLink size={10} /> Origen: Nota automática
                         </span>
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-slate-500 font-medium hover:bg-slate-50 rounded-lg">Cancelar</button>
                <button 
                    onClick={handleSave}
                    className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 flex items-center gap-2"
                >
                    <Save size={18} /> Guardar Cambios
                </button>
            </div>
        </div>
    </div>
  );
};

export default UniversalEditor;