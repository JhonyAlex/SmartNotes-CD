import React from 'react';
import { Entity, Note, Task, EntityType, KnowledgeItem } from '../types';
import { Building, User, Folder, Phone, Mail, FileText, CheckCircle, Book, Layers, Briefcase, ArrowRight, Trash2, ShieldAlert, Eye, EyeOff, Edit3 } from 'lucide-react';

interface EntityViewProps {
  entities: Entity[];
  notes: Note[];
  tasks: Task[];
  knowledge: KnowledgeItem[];
  mode: 'directory' | 'project';
  selectedEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
  onDeleteNote: (id: string) => void;
  onEditEntity: (entity: Entity) => void; 
  onEditNote: (note: Note) => void; 
  onEditTask: (task: Task) => void; // New: Interactive editing
  onEditKnowledge: (k: KnowledgeItem) => void; // New: Interactive editing
}

const NoteItem: React.FC<{ note: Note; onDelete: () => void; onEdit: () => void }> = ({ note, onDelete, onEdit }) => {
    const [revealed, setRevealed] = React.useState(false);

    return (
        <div 
            onClick={onEdit}
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 group hover:border-indigo-300 transition-all relative cursor-pointer"
        >
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="font-bold text-lg text-slate-800 group-hover:text-indigo-700 transition-colors flex items-center gap-2">
                        {note.summary}
                        {note.isSensitive && (
                            <span title="Sensible">
                                <ShieldAlert size={16} className="text-red-500" />
                            </span>
                        )}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{note.category}</span>
                        <span className="text-xs text-slate-400">{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar nota"
                >
                    <Trash2 size={16} />
                </button>
            </div>
            
            <div className="relative">
                <p className={`text-slate-600 text-sm leading-relaxed whitespace-pre-wrap ${note.isSensitive && !revealed ? 'blur-sm select-none' : ''}`}>
                    {note.content}
                </p>
                {note.isSensitive && !revealed && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setRevealed(true); }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/90 shadow-sm border border-slate-200 rounded-full text-xs font-bold text-slate-600 hover:text-indigo-600"
                        >
                            <Eye size={14} /> Mostrar Contenido Sensible
                        </button>
                    </div>
                )}
                {note.isSensitive && revealed && (
                     <button className="absolute top-0 right-0 p-1 bg-slate-100 rounded hover:bg-slate-200 text-slate-500" onClick={(e) => { e.stopPropagation(); setRevealed(false); }} title="Ocultar">
                         <EyeOff size={12} />
                     </button>
                )}
            </div>
        </div>
    );
};

const EntityView: React.FC<EntityViewProps> = ({ 
    entities, notes, tasks, knowledge, mode, selectedEntityId, 
    onSelectEntity, onDeleteNote, onEditEntity, onEditNote, onEditTask, onEditKnowledge 
}) => {
  const [filterType, setFilterType] = React.useState<EntityType | 'ALL'>('ALL');

  // Helper to get hierarchy
  const getChildEntities = (parentId: string) => entities.filter(e => e.parentId === parentId);
  
  // Aggregate data for a company (including its children)
  const getAggregatedData = (entityId: string) => {
      const children = getChildEntities(entityId);
      const allIds = [entityId, ...children.map(c => c.id)];
      
      const aggNotes = notes.filter(n => n.relatedEntityIds.some(id => allIds.includes(id)));
      const aggTasks = tasks.filter(t => {
          // Direct or via Note
          const parentNote = notes.find(n => n.id === t.sourceNoteId);
          const viaNote = parentNote?.relatedEntityIds.some(id => allIds.includes(id));
          const direct = t.relatedEntityId ? allIds.includes(t.relatedEntityId) : false;
          return viaNote || direct;
      });
      const aggKnowledge = knowledge.filter(k => {
          // Direct or via Note
          const parentNote = notes.find(n => n.id === k.sourceNoteId);
          const viaNote = parentNote?.relatedEntityIds.some(id => allIds.includes(id));
          const direct = k.relatedEntityIds ? k.relatedEntityIds.some(id => allIds.includes(id)) : false;
          return viaNote || direct;
      });

      return { children, aggNotes, aggTasks, aggKnowledge };
  };

  const selectedEntity = entities.find(e => e.id === selectedEntityId);
  const { children, aggNotes, aggTasks, aggKnowledge } = selectedEntity 
    ? getAggregatedData(selectedEntity.id) 
    : { children: [], aggNotes: [], aggTasks: [], aggKnowledge: [] };

  const childProjects = children.filter(c => c.type === EntityType.PROJECT);
  const childTeam = children.filter(c => c.type === EntityType.PERSON);

  // Filter list
  const listEntities = entities.filter(e => {
      if (filterType !== 'ALL' && e.type !== filterType) return false;
      if (mode === 'directory') return true; 
      if (mode === 'project') return e.type === EntityType.PROJECT;
      return true;
  });

  return (
    <div className="flex h-full bg-white">
      {/* Sidebar List */}
      <div className="w-80 border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            {mode === 'project' ? 'Proyectos' : 'Organización'}
          </h2>
          {mode === 'directory' && (
              <div className="flex gap-2">
                  <button onClick={() => setFilterType('ALL')} className={`px-3 py-1 text-xs rounded-full border ${filterType === 'ALL' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600'}`}>Todo</button>
                  <button onClick={() => setFilterType(EntityType.COMPANY)} className={`px-3 py-1 text-xs rounded-full border ${filterType === EntityType.COMPANY ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-600'}`}>Empresas</button>
                  <button onClick={() => setFilterType(EntityType.PROJECT)} className={`px-3 py-1 text-xs rounded-full border ${filterType === EntityType.PROJECT ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600'}`}>Proyectos</button>
              </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {listEntities.map(entity => (
            <div 
              key={entity.id} 
              onClick={() => onSelectEntity(entity.id)}
              className={`p-4 cursor-pointer border-b border-slate-100 hover:bg-slate-100 transition-colors ${selectedEntityId === entity.id ? 'bg-white border-l-4 border-l-indigo-600 shadow-sm' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    entity.type === EntityType.COMPANY ? 'bg-orange-100 text-orange-600' : 
                    entity.type === EntityType.PROJECT ? 'bg-purple-100 text-purple-600' : 
                    'bg-blue-100 text-blue-600'
                }`}>
                    {entity.type === EntityType.COMPANY ? <Building size={16}/> : 
                     entity.type === EntityType.PROJECT ? <Briefcase size={16}/> : <User size={16}/>}
                </div>
                <div className="overflow-hidden">
                   <h3 className="font-semibold text-slate-800 text-sm truncate">{entity.name}</h3>
                   <p className="text-xs text-slate-500 truncate">{entity.role || entity.type}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Detail View */}
      <div className="flex-1 overflow-y-auto bg-slate-50/50">
        {selectedEntity ? (
          <div className="max-w-5xl mx-auto p-8 space-y-8">
            
            {/* Header Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 relative group">
                <button 
                    onClick={() => onEditEntity(selectedEntity)}
                    className="absolute top-4 right-4 p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                    <Edit3 size={18} />
                </button>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${
                             selectedEntity.type === EntityType.COMPANY ? 'bg-orange-50 text-orange-500' : 
                             selectedEntity.type === EntityType.PROJECT ? 'bg-purple-50 text-purple-500' : 
                             'bg-blue-50 text-blue-500'
                        }`}>
                            {selectedEntity.type === EntityType.COMPANY ? <Building /> : 
                             selectedEntity.type === EntityType.PROJECT ? <Briefcase /> : <User />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                                    {selectedEntity.type}
                                </span>
                                {selectedEntity.parentId && (
                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                        <ArrowRight size={10} /> Pertenece a {entities.find(e => e.id === selectedEntity.parentId)?.name}
                                    </span>
                                )}
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900">{selectedEntity.name}</h1>
                            <div className="flex gap-4 mt-2 text-sm text-slate-500">
                                {selectedEntity.email && <span className="flex items-center gap-1"><Mail size={14}/> {selectedEntity.email}</span>}
                                {selectedEntity.phone && <span className="flex items-center gap-1"><Phone size={14}/> {selectedEntity.phone}</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hierarchical Children (Only for Companies) */}
            {(selectedEntity.type === EntityType.COMPANY) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Projects Column */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <Briefcase size={16} className="text-purple-500"/> Proyectos Activos
                        </h3>
                        {childProjects.length > 0 ? (
                            <div className="grid gap-2">
                                {childProjects.map(p => (
                                    <div key={p.id} onClick={() => onSelectEntity(p.id)} className="bg-white p-3 rounded-xl border border-slate-200 hover:border-purple-300 cursor-pointer transition-colors flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-purple-50 text-purple-600 flex items-center justify-center"><Folder size={14}/></div>
                                        <span className="font-medium text-slate-700">{p.name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-sm text-slate-400">Sin proyectos</div>}
                    </div>

                    {/* Team Column */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <User size={16} className="text-blue-500"/> Equipo
                        </h3>
                         {childTeam.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {childTeam.map(p => (
                                    <div key={p.id} onClick={() => onSelectEntity(p.id)} className="bg-white p-2 rounded-xl border border-slate-200 hover:border-blue-300 cursor-pointer transition-colors flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs"><User size={12}/></div>
                                        <div className="overflow-hidden">
                                            <div className="font-medium text-slate-700 text-sm truncate">{p.name}</div>
                                            <div className="text-[10px] text-slate-400 truncate">{p.role}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-sm text-slate-400">Sin miembros</div>}
                    </div>
                </div>
            )}

            <div className="border-t border-slate-200 my-6"></div>

            {/* Aggregated Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Tasks & Knowledge */}
                <div className="space-y-8">
                     <section>
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <CheckCircle size={18} className="text-green-600"/> Tareas ({aggTasks.filter(t => !t.completed).length})
                        </h3>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                            {aggTasks.length === 0 && <p className="p-4 text-xs text-slate-400 text-center">No hay tareas</p>}
                            {aggTasks.map(t => (
                                <div 
                                    key={t.id} 
                                    onClick={() => onEditTask(t)}
                                    className="p-3 flex items-start gap-3 hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${t.completed ? 'bg-slate-300' : t.priority === 'High' ? 'bg-red-500' : 'bg-green-500'}`} />
                                    <div className="flex-1">
                                        <p className={`text-sm ${t.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>{t.description}</p>
                                        {t.suggestedDate && <p className="text-[10px] text-slate-400 mt-0.5">{t.suggestedDate}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <Book size={18} className="text-blue-600"/> Base de Conocimiento
                        </h3>
                        <div className="space-y-2">
                            {aggKnowledge.length === 0 && <p className="text-xs text-slate-400 italic">No hay documentación.</p>}
                            {aggKnowledge.map(k => (
                                <div 
                                    key={k.id} 
                                    onClick={() => onEditKnowledge(k)}
                                    className="bg-white border border-slate-200 p-3 rounded-lg hover:border-blue-300 transition-colors shadow-sm cursor-pointer group"
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{k.topic}</h4>
                                        <span className="text-[10px] text-slate-400">{new Date(k.lastUpdated || Date.now()).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 line-clamp-3">{k.content}</p>
                                    {k.history && k.history.length > 0 && (
                                        <div className="mt-2 text-[10px] text-blue-500 bg-blue-50 inline-block px-1.5 py-0.5 rounded">
                                            v{k.history.length + 1}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right Column: Timeline of Notes */}
                <div className="lg:col-span-2">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <FileText size={18} className="text-indigo-600"/> Historial de Notas ({aggNotes.length})
                    </h3>
                    <div className="space-y-4">
                        {aggNotes.length === 0 && (
                            <div className="bg-slate-100 rounded-xl p-8 text-center text-slate-400">
                                No hay notas relacionadas con esta entidad o sus dependencias.
                            </div>
                        )}
                        {aggNotes.sort((a,b) => b.createdAt - a.createdAt).map(note => (
                            <NoteItem key={note.id} note={note} onDelete={() => onDeleteNote(note.id)} onEdit={() => onEditNote(note)} />
                        ))}
                    </div>
                </div>
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
             <Layers size={64} className="mb-6 opacity-20" />
             <p className="text-lg font-medium">Selecciona una {mode === 'directory' ? 'organización' : 'proyecto'}</p>
             <p className="text-sm">para ver su ecosistema completo.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntityView;