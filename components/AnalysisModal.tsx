import React, { useState, useEffect } from 'react';
import { AnalysisResult, EntityType, Note, TaskPriority, KnowledgeItem, AppConfig, Entity } from '../types';
import { X, Check, ArrowRight, Link, Layers, AlertTriangle, Building, User, Calendar, BookOpen, CheckSquare, ChevronDown, ChevronUp, RefreshCw, ShieldAlert, Eye, EyeOff, Plus, Briefcase, Tag, Search } from 'lucide-react';

interface AnalysisModalProps {
  result: AnalysisResult;
  existingKnowledge: KnowledgeItem[];
  allEntities: Entity[]; // New Prop for Explicit Relationships
  config: AppConfig; 
  onConfirm: (finalData: AnalysisResult, linkToNoteIds: string[], knowledgeMerges: Record<string, string>) => void; 
  onCancel: () => void;
  similarNotes: Note[];
  onAddCategory: (name: string) => void;
  onCreateEntity: (name: string, type: EntityType, parentId?: string) => void;
}

const AnalysisModal: React.FC<AnalysisModalProps> = ({ 
    result, 
    existingKnowledge, 
    allEntities,
    config, 
    onConfirm, 
    onCancel, 
    similarNotes,
    onAddCategory,
    onCreateEntity
}) => {
  const [data, setData] = useState<AnalysisResult>(result);
  const [selectedSimilar, setSelectedSimilar] = useState<string[]>([]);
  const [knowledgeMerges, setKnowledgeMerges] = useState<Record<string, string>>({}); 
  
  // Quick Toggles
  const [saveEntities, setSaveEntities] = useState(result.entities.length > 0);
  const [saveTasks, setSaveTasks] = useState(result.tasks.length > 0);
  const [saveKnowledge, setSaveKnowledge] = useState(result.knowledge.length > 0);

  // New Creation UI States
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Entity Creation State
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityType, setNewEntityType] = useState<EntityType>(EntityType.COMPANY);
  const [newEntityParent, setNewEntityParent] = useState<string>(''); // For Projects
  const [entitySearch, setEntitySearch] = useState('');

  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    const merges: Record<string, string> = {};
    result.knowledge.forEach((k, idx) => {
        const newWords = k.topic.toLowerCase().split(' ').filter(w => w.length > 3);
        const match = existingKnowledge.find(ek => {
            const existingWords = ek.topic.toLowerCase().split(' ');
            const overlap = newWords.filter(w => existingWords.includes(w));
            return overlap.length >= Math.min(newWords.length, 2) || ek.topic.toLowerCase().includes(k.topic.toLowerCase()) || k.topic.toLowerCase().includes(ek.topic.toLowerCase());
        });
        if (match) {
            merges[idx.toString()] = match.id;
        }
    });
    setKnowledgeMerges(merges);
  }, [result, existingKnowledge]);

  const handleConfirm = () => {
    const finalData = {
        ...data,
        entities: saveEntities ? data.entities : [],
        tasks: saveTasks ? data.tasks : [],
        knowledge: saveKnowledge ? data.knowledge : []
    };
    onConfirm(finalData, selectedSimilar, knowledgeMerges);
  };

  const toggleSimilar = (id: string) => {
    setSelectedSimilar(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const getMergeName = (idx: number) => {
     const id = knowledgeMerges[idx.toString()];
     if (!id) return null;
     return existingKnowledge.find(k => k.id === id)?.topic;
  };

  // --- Handlers for "Create on the fly" ---
  const handleAddNewCategory = () => {
      if (!newCatName.trim()) return;
      onAddCategory(newCatName);
      setData({...data, category: newCatName});
      setNewCatName('');
      setIsAddingCat(false);
  };

  const handleCreateNewEntity = () => {
      if (!newEntityName.trim()) return;
      
      // Auto-Admin Rule: If Project, require parent or warn
      onCreateEntity(newEntityName, newEntityType, newEntityParent || undefined);
      
      const newEntObj = {
          name: newEntityName,
          type: newEntityType,
          associated_with: newEntityParent ? allEntities.find(e => e.id === newEntityParent)?.name : undefined
      };
      setData(prev => ({...prev, entities: [...prev.entities, newEntObj]}));
      setSaveEntities(true); 
      
      // Reset
      setNewEntityName('');
      setNewEntityParent('');
  };

  const handleLinkExistingEntity = (entity: Entity) => {
      // Check if already in list
      if (data.entities.some(e => e.name === entity.name && e.type === entity.type)) return;
      
      const entObj = {
          name: entity.name,
          type: entity.type,
          role: 'Vinculado Manualmente'
      };
      setData(prev => ({...prev, entities: [...prev.entities, entObj]}));
      setSaveEntities(true);
      setEntitySearch('');
  };

  const handleRemoveEntity = (idx: number) => {
      setData(prev => ({...prev, entities: prev.entities.filter((_, i) => i !== idx)}));
  };

  const handleAddTag = () => {
      if(!newTagName.trim()) return;
      setData(prev => ({...prev, keywords: [...prev.keywords, newTagName]}));
      setNewTagName('');
  };

  // Filter for existing search
  const filteredExistingEntities = allEntities.filter(e => 
      e.name.toLowerCase().includes(entitySearch.toLowerCase()) && 
      !data.entities.some(de => de.name === e.name) // Don't show already linked
  ).slice(0, 5);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-50 w-full max-w-4xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* 1. Header */}
        <div className="bg-white p-6 border-b border-slate-200">
            {data.isSensitive && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                    <ShieldAlert className="text-red-600 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="font-bold text-red-700 text-sm">Información Sensible Detectada</h4>
                        <p className="text-xs text-red-600 mt-1">
                            El sistema ha detectado posibles contraseñas o datos confidenciales. 
                            El contenido se guardará oculto por defecto.
                        </p>
                    </div>
                </div>
            )}
           <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Resumen (Editable)</label>
                  <input 
                      type="text" 
                      value={data.summary} 
                      onChange={(e) => setData({...data, summary: e.target.value})}
                      className="w-full text-2xl font-bold text-slate-800 border-none focus:ring-0 p-0 bg-transparent placeholder-slate-300"
                      autoFocus
                  />
              </div>
              <button onClick={onCancel} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} />
              </button>
           </div>
           
           {/* DYNAMIC CATEGORY BUTTONS */}
           <div className="mt-4 flex gap-2 items-center overflow-x-auto pb-2 scrollbar-thin">
               {config.categories.map(cat => (
                   <button 
                    key={cat.id}
                    onClick={() => setData({...data, category: cat.name})}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${
                        data.category === cat.name 
                        ? 'bg-indigo-600 text-white border-indigo-600' 
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}
                   >
                       {cat.name}
                   </button>
               ))}
               
               {/* New Category Input */}
               {isAddingCat ? (
                   <div className="flex items-center gap-1 bg-white rounded-full border border-indigo-300 pl-3 pr-1 py-0.5 animate-in fade-in slide-in-from-left-2">
                       <input 
                         className="w-24 text-sm outline-none bg-transparent"
                         placeholder="Nueva..."
                         value={newCatName}
                         onChange={e => setNewCatName(e.target.value)}
                         onKeyDown={e => e.key === 'Enter' && handleAddNewCategory()}
                         autoFocus
                       />
                       <button onClick={handleAddNewCategory} className="p-1 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200">
                           <Check size={12}/>
                       </button>
                   </div>
               ) : (
                   <button onClick={() => setIsAddingCat(true)} className="px-2 py-1.5 rounded-full text-sm font-medium border border-dashed border-slate-300 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 flex items-center gap-1">
                       <Plus size={14}/> <span>Crear</span>
                   </button>
               )}
           </div>
        </div>

        {/* 2. Action Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* A. TASKS CARD */}
                {data.tasks.length > 0 && (
                    <div className={`bg-white rounded-xl border-2 transition-all ${saveTasks ? 'border-indigo-500 shadow-md' : 'border-slate-200 opacity-70'}`}>
                        <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setSaveTasks(!saveTasks)}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${saveTasks ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <CheckSquare size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Crear {data.tasks.length} Tareas</h3>
                                    <p className="text-xs text-slate-500">Detectadas en el texto</p>
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${saveTasks ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                {saveTasks && <Check size={14} className="text-white" />}
                            </div>
                        </div>
                    </div>
                )}

                {/* B. DIRECTORY CARD (RELATIONSHIPS) */}
                <div className={`bg-white rounded-xl border-2 transition-all ${saveEntities ? 'border-orange-500 shadow-md' : 'border-slate-200 opacity-70'}`}>
                    <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setSaveEntities(!saveEntities)}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${saveEntities ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                                <User size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Contexto ({data.entities.length})</h3>
                                <p className="text-xs text-slate-500">Relaciones y Entidades</p>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${saveEntities ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>
                            {saveEntities && <Check size={14} className="text-white" />}
                        </div>
                    </div>
                    
                    {saveEntities && (
                        <div className="border-t border-slate-100 p-3 bg-slate-50 rounded-b-lg space-y-3">
                            {/* Existing List */}
                            <div className="space-y-1">
                                {data.entities.map((ent, idx) => (
                                    <div key={idx} className="flex items-center justify-between gap-2 text-sm text-slate-700 p-1.5 bg-slate-100/50 rounded hover:bg-slate-100">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${ent.type === EntityType.COMPANY ? 'bg-orange-400' : ent.type === EntityType.PROJECT ? 'bg-purple-400' : 'bg-blue-400'}`}></div>
                                            <span className="font-medium">{ent.name}</span> 
                                            <span className="text-[10px] text-slate-400 border border-slate-200 px-1 rounded uppercase">{ent.type}</span>
                                        </div>
                                        <button onClick={() => handleRemoveEntity(idx)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-slate-200 pt-3">
                                {/* Explicit Linking Search */}
                                <div className="mb-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1">
                                        <Search size={12}/> Vincular Existente
                                    </div>
                                    <input 
                                        className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 focus:border-indigo-500 outline-none"
                                        placeholder="Buscar Proyecto, Empresa..."
                                        value={entitySearch}
                                        onChange={e => setEntitySearch(e.target.value)}
                                    />
                                    {entitySearch && filteredExistingEntities.length > 0 && (
                                        <div className="mt-1 bg-white border border-slate-200 rounded shadow-sm overflow-hidden">
                                            {filteredExistingEntities.map(e => (
                                                <button 
                                                    key={e.id}
                                                    onClick={() => handleLinkExistingEntity(e)}
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                     <div className={`w-2 h-2 rounded-full ${e.type === EntityType.COMPANY ? 'bg-orange-400' : e.type === EntityType.PROJECT ? 'bg-purple-400' : 'bg-blue-400'}`}></div>
                                                     {e.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                {/* Create New Entity Input */}
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1">
                                        <Plus size={12}/> Crear Nuevo
                                    </div>
                                    <div className="flex gap-2 mb-2">
                                        <input 
                                            className="flex-1 text-sm border border-slate-200 rounded px-2 py-1.5 focus:border-indigo-500 outline-none"
                                            placeholder="Nombre..."
                                            value={newEntityName}
                                            onChange={e => setNewEntityName(e.target.value)}
                                        />
                                        <select 
                                            className="text-xs border border-slate-200 rounded px-1 bg-white outline-none"
                                            value={newEntityType}
                                            onChange={e => setNewEntityType(e.target.value as EntityType)}
                                        >
                                            <option value={EntityType.COMPANY}>Empresa</option>
                                            <option value={EntityType.PROJECT}>Proyecto</option>
                                            <option value={EntityType.PERSON}>Persona</option>
                                        </select>
                                    </div>
                                    
                                    {/* Conditional Parent Input for Projects (Orphan Prevention) */}
                                    {newEntityType === EntityType.PROJECT && (
                                        <div className="mb-2 animate-in slide-in-from-top-1">
                                            <select 
                                                className="w-full text-xs border border-purple-200 bg-purple-50 text-purple-700 rounded px-2 py-1.5 outline-none"
                                                value={newEntityParent}
                                                onChange={e => setNewEntityParent(e.target.value)}
                                            >
                                                <option value="">-- Seleccionar Empresa Matriz (Recomendado) --</option>
                                                {allEntities.filter(e => e.type === EntityType.COMPANY).map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <button 
                                        onClick={handleCreateNewEntity}
                                        disabled={!newEntityName}
                                        className="w-full py-1.5 bg-slate-100 text-slate-600 rounded text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 transition-colors"
                                    >
                                        Añadir a la lista
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* C. KEYWORDS / TAGS CARD (New) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:col-span-2">
                    <div className="flex items-center gap-2 mb-3">
                         <Tag size={16} className="text-slate-400" />
                         <h3 className="font-bold text-slate-700 text-sm">Etiquetas</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {data.keywords.map((tag, idx) => (
                            <span key={idx} className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-medium border border-slate-200">
                                {tag}
                                <button onClick={() => setData(prev => ({...prev, keywords: prev.keywords.filter((_, i) => i !== idx)}))} className="text-slate-400 hover:text-red-500">
                                    <X size={12}/>
                                </button>
                            </span>
                        ))}
                        <div className="flex items-center gap-1 bg-white border border-dashed border-slate-300 px-2 py-1 rounded-md">
                            <input 
                                className="w-20 text-xs outline-none bg-transparent"
                                placeholder="+ Etiqueta"
                                value={newTagName}
                                onChange={e => setNewTagName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                            />
                            <button onClick={handleAddTag} className="text-slate-400 hover:text-indigo-600"><Plus size={12}/></button>
                        </div>
                    </div>
                </div>

                {/* D. SIMILARITY CARD */}
                {similarNotes.length > 0 && (
                     <div className="md:col-span-2 bg-amber-50 rounded-xl border-2 border-amber-200 overflow-hidden">
                        <div className="p-4 flex items-center gap-3">
                             <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                 <Link size={24} />
                             </div>
                             <div className="flex-1">
                                 <h3 className="font-bold text-slate-800">Se parece a {similarNotes.length} notas anteriores</h3>
                             </div>
                        </div>
                        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {similarNotes.map(note => (
                                <button 
                                    key={note.id}
                                    onClick={() => toggleSimilar(note.id)}
                                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                        selectedSimilar.includes(note.id) 
                                        ? 'bg-amber-100 border-amber-400 text-amber-900' 
                                        : 'bg-white border-amber-100 text-slate-600 hover:bg-white/80'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${selectedSimilar.includes(note.id) ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`}>
                                        {selectedSimilar.includes(note.id) && <Check size={12} className="text-white"/>}
                                    </div>
                                    <div className="overflow-hidden">
                                        <div className="font-semibold text-sm truncate">{note.summary}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                     </div>
                )}

                {/* E. KNOWLEDGE CARD (Smarter) */}
                {data.knowledge.length > 0 && (
                    <div className={`md:col-span-2 bg-white rounded-xl border-2 transition-all ${saveKnowledge ? 'border-blue-500 shadow-md' : 'border-slate-200 opacity-70'}`}>
                        <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setSaveKnowledge(!saveKnowledge)}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${saveKnowledge ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <BookOpen size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">Documentación ({data.knowledge.length})</h3>
                                    <p className="text-xs text-slate-500">
                                        {Object.keys(knowledgeMerges).length > 0 ? 
                                            `${Object.keys(knowledgeMerges).length} actualizaciones sugeridas` : 
                                            "Nuevos artículos"}
                                    </p>
                                </div>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${saveKnowledge ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                                {saveKnowledge && <Check size={14} className="text-white" />}
                            </div>
                        </div>
                        {saveKnowledge && (
                            <div className="border-t border-slate-100 p-3 bg-slate-50 rounded-b-lg space-y-2">
                                {data.knowledge.map((k, idx) => {
                                    const mergeId = knowledgeMerges[idx.toString()];
                                    const mergeName = getMergeName(idx);
                                    return (
                                        <div key={idx} className={`p-3 rounded-lg border flex items-start gap-3 ${mergeId ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                                            <div className="mt-1">
                                                {mergeId ? <RefreshCw size={16} className="text-blue-600"/> : <CheckSquare size={16} className="text-green-500"/>}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <span className="text-sm font-bold text-slate-800">
                                                        {mergeId ? `Actualizar: "${mergeName}"` : `Nuevo: "${k.topic}"`}
                                                    </span>
                                                    {mergeId && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Fusión</span>}
                                                </div>
                                                <p className="text-xs text-slate-600 mt-1 line-clamp-2">{k.content}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>

        {/* 3. Footer */}
        <div className="p-6 border-t border-slate-200 bg-white flex flex-col md:flex-row gap-4 items-center justify-between">
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-sm font-medium">
                Cancelar
            </button>
            <div className="flex gap-3 w-full md:w-auto">
                 <button className="flex-1 md:flex-none px-6 py-3 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                    Editar
                </button>
                <button 
                    onClick={handleConfirm}
                    className="flex-1 md:flex-none px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transform active:scale-95 transition-all"
                >
                    <Check size={20} />
                    Guardar Todo
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;