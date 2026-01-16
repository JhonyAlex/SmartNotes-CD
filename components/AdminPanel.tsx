import React, { useState } from 'react';
import { AppConfig, CategoryDefinition, NoteTypeDefinition, Note, NoteTypeField } from '../types';
import { Plus, Trash2, Edit2, Save, X, GitMerge, AlertTriangle, ChevronRight, Tag, Box, ArrowRight, Activity, ToggleLeft, ToggleRight, Settings } from 'lucide-react';

interface AdminPanelProps {
  config: AppConfig;
  notes: Note[]; // Received notes for impact analysis
  onUpdateConfig: (newConfig: AppConfig) => void;
  onMergeCategories: (fromId: string, toId: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ config, notes, onUpdateConfig, onMergeCategories }) => {
  const [activeTab, setActiveTab] = useState<'categories' | 'types' | 'rules'>('categories');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [tempCatName, setTempCatName] = useState('');
  const [tempSynonyms, setTempSynonyms] = useState('');
  
  // Merge State
  const [isMerging, setIsMerging] = useState(false);
  const [mergeSource, setMergeSource] = useState('');
  const [mergeTarget, setMergeTarget] = useState('');

  // New Category
  const [newCatName, setNewCatName] = useState('');

  // --- Category Handlers ---
  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newCat: CategoryDefinition = {
        id: crypto.randomUUID(),
        name: newCatName,
        color: 'bg-slate-100 text-slate-600',
        synonyms: []
    };
    onUpdateConfig({ ...config, categories: [...config.categories, newCat] });
    setNewCatName('');
  };

  const handleDeleteCategory = (id: string) => {
    const affectedNotes = notes.filter(n => n.category === config.categories.find(c => c.id === id)?.name).length;
    if (window.confirm(`¿Eliminar categoría? Hay ${affectedNotes} notas que perderán esta clasificación.`)) {
        onUpdateConfig({ ...config, categories: config.categories.filter(c => c.id !== id) });
    }
  };

  const handleStartEdit = (cat: CategoryDefinition) => {
      setEditingCatId(cat.id);
      setTempCatName(cat.name);
      setTempSynonyms(cat.synonyms.join(', '));
  };

  const handleSaveEdit = (id: string) => {
      const updatedCats = config.categories.map(c => {
          if (c.id === id) {
              return { 
                  ...c, 
                  name: tempCatName, 
                  synonyms: tempSynonyms.split(',').map(s => s.trim()).filter(s => s.length > 0)
              };
          }
          return c;
      });
      onUpdateConfig({ ...config, categories: updatedCats });
      setEditingCatId(null);
  };

  const handleExecuteMerge = () => {
      if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return;
      onMergeCategories(mergeSource, mergeTarget);
      // Remove source category
      onUpdateConfig({ ...config, categories: config.categories.filter(c => c.id !== mergeSource) });
      setIsMerging(false);
      setMergeSource('');
      setMergeTarget('');
  };

  // --- Types Handlers ---
  const [newTypeName, setNewTypeName] = useState('');
  const handleAddType = () => {
      if(!newTypeName.trim()) return;
      const newType: NoteTypeDefinition = {
          id: crypto.randomUUID(),
          name: newTypeName,
          fields: []
      };
      onUpdateConfig({...config, noteTypes: [...config.noteTypes, newType]});
      setNewTypeName('');
  };

  const handleDeleteType = (id: string) => {
      onUpdateConfig({...config, noteTypes: config.noteTypes.filter(t => t.id !== id)});
  };

  const addFieldToType = (typeId: string) => {
      const newField: NoteTypeField = {
          id: crypto.randomUUID(),
          name: 'Nuevo Campo',
          type: 'text',
          required: false
      };
      const updatedTypes = config.noteTypes.map(t => {
          if (t.id === typeId) {
              return { ...t, fields: [...t.fields, newField] };
          }
          return t;
      });
      onUpdateConfig({...config, noteTypes: updatedTypes});
  };

  const toggleFieldRequired = (typeId: string, fieldId: string) => {
      const updatedTypes = config.noteTypes.map(t => {
          if (t.id === typeId) {
              return { 
                  ...t, 
                  fields: t.fields.map(f => f.id === fieldId ? { ...f, required: !f.required } : f) 
              };
          }
          return t;
      });
      onUpdateConfig({...config, noteTypes: updatedTypes});
  };

  const updateFieldName = (typeId: string, fieldId: string, name: string) => {
       const updatedTypes = config.noteTypes.map(t => {
          if (t.id === typeId) {
              return { 
                  ...t, 
                  fields: t.fields.map(f => f.id === fieldId ? { ...f, name } : f) 
              };
          }
          return t;
      });
      onUpdateConfig({...config, noteTypes: updatedTypes});
  };

  // --- Rules Handlers ---
  const toggleRule = (ruleId: string) => {
      const updatedRules = config.automationRules.map(r => {
          if (r.id === ruleId) return { ...r, isActive: !r.isActive };
          return r;
      });
      onUpdateConfig({ ...config, automationRules: updatedRules });
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Administración</h1>
      <p className="text-slate-500 mb-8">Personaliza la taxonomía, estructura y reglas de negocio.</p>

      {/* TABS */}
      <div className="flex gap-4 border-b border-slate-200 mb-8 overflow-x-auto">
        <button 
            onClick={() => setActiveTab('categories')}
            className={`pb-3 px-4 font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === 'categories' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
        >
            Categorías y Etiquetas
        </button>
        <button 
            onClick={() => setActiveTab('types')}
            className={`pb-3 px-4 font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === 'types' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
        >
            Editor de Estructura (Tipos)
        </button>
        <button 
            onClick={() => setActiveTab('rules')}
            className={`pb-3 px-4 font-medium transition-all border-b-2 whitespace-nowrap ${activeTab === 'rules' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}
        >
            Editor de Flujos (Reglas)
        </button>
      </div>

      {/* CATEGORIES CONTENT */}
      {activeTab === 'categories' && (
        <div className="space-y-8 max-w-4xl">
            
            {/* Create & List */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Tag size={20} /> Categorías Existentes</h2>
                    <button onClick={() => setIsMerging(!isMerging)} className="text-sm flex items-center gap-2 text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                        <GitMerge size={16} /> Fusionar
                    </button>
                </div>

                {isMerging && (
                    <div className="mb-6 bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-bold text-indigo-400">Desde (Se eliminará)</label>
                            <select value={mergeSource} onChange={e => setMergeSource(e.target.value)} className="p-2 rounded border border-indigo-200 text-sm">
                                <option value="">Seleccionar...</option>
                                {config.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <ArrowRight className="text-indigo-300 mt-4" />
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase font-bold text-indigo-400">Hacia (Destino)</label>
                            <select value={mergeTarget} onChange={e => setMergeTarget(e.target.value)} className="p-2 rounded border border-indigo-200 text-sm">
                                <option value="">Seleccionar...</option>
                                {config.categories.filter(c => c.id !== mergeSource).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        
                        {/* Impact Visualization */}
                        {mergeSource && (
                            <div className="text-xs text-indigo-600 bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200 mt-4">
                                <b>Impacto:</b> {notes.filter(n => n.category === config.categories.find(c => c.id === mergeSource)?.name).length} notas serán actualizadas.
                            </div>
                        )}

                        <button 
                            onClick={handleExecuteMerge}
                            disabled={!mergeSource || !mergeTarget}
                            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50 ml-auto"
                        >
                            Confirmar Fusión
                        </button>
                    </div>
                )}

                <div className="space-y-3">
                    {config.categories.map(cat => {
                        const count = notes.filter(n => n.category === cat.name).length;
                        return (
                            <div key={cat.id} className="flex items-center gap-4 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 group">
                                {editingCatId === cat.id ? (
                                    <div className="flex-1 flex gap-2">
                                        <input 
                                            value={tempCatName} 
                                            onChange={e => setTempCatName(e.target.value)}
                                            className="border border-slate-300 rounded px-2 py-1 text-sm font-bold flex-1"
                                            placeholder="Nombre"
                                        />
                                        <input 
                                            value={tempSynonyms} 
                                            onChange={e => setTempSynonyms(e.target.value)}
                                            className="border border-slate-300 rounded px-2 py-1 text-sm flex-[2]"
                                            placeholder="Sinónimos (sep. por comas)"
                                        />
                                        <button onClick={() => handleSaveEdit(cat.id)} className="p-1 bg-green-100 text-green-600 rounded"><Save size={16}/></button>
                                        <button onClick={() => setEditingCatId(null)} className="p-1 bg-slate-100 text-slate-500 rounded"><X size={16}/></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className={`w-3 h-3 rounded-full bg-indigo-500`}></div>
                                        <div className="flex-1">
                                            <p className="font-bold text-slate-700">{cat.name}</p>
                                            {cat.synonyms.length > 0 && <p className="text-xs text-slate-400">Sinónimos: {cat.synonyms.join(', ')}</p>}
                                        </div>
                                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count} notas</span>
                                        <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                                            <button onClick={() => handleStartEdit(cat)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors"><Trash2 size={16}/></button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100 flex gap-2">
                    <input 
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Nueva Categoría..."
                        className="flex-1 border border-slate-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    <button 
                        onClick={handleAddCategory}
                        className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800"
                    >
                        <Plus size={18} /> Crear
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* TYPES CONTENT (Structure Editor) */}
      {activeTab === 'types' && (
         <div className="space-y-8 max-w-4xl">
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Box size={20} /> Tipos de Nota Personalizados</h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {config.noteTypes.map(type => (
                        <div key={type.id} className="p-4 border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors group relative bg-slate-50/50">
                             <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
                                 <div>
                                     <h3 className="font-bold text-slate-800 text-lg">{type.name}</h3>
                                     <p className="text-xs text-slate-400">Definición de estructura</p>
                                 </div>
                                 <button onClick={() => handleDeleteType(type.id)} className="text-slate-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>
                             </div>
                             
                             <div className="space-y-2 mb-4">
                                 {type.fields.length === 0 && <p className="text-xs text-slate-400 italic">Sin campos personalizados.</p>}
                                 {type.fields.map(field => (
                                     <div key={field.id} className="flex items-center gap-2 bg-white p-2 rounded border border-slate-200">
                                         <input 
                                             value={field.name}
                                             onChange={(e) => updateFieldName(type.id, field.id, e.target.value)}
                                             className="flex-1 text-sm font-medium border-none focus:ring-0 p-0"
                                         />
                                         <span className="text-xs text-slate-400 uppercase">{field.type}</span>
                                         <button 
                                            onClick={() => toggleFieldRequired(type.id, field.id)}
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${field.required ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                                         >
                                             {field.required ? 'Obligatorio' : 'Opcional'}
                                         </button>
                                     </div>
                                 ))}
                             </div>

                             <button onClick={() => addFieldToType(type.id)} className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded flex items-center gap-1">
                                 <Plus size={12}/> Añadir Campo
                             </button>
                        </div>
                    ))}
                    
                    {/* Add New Type Card */}
                    <div className="p-4 border border-dashed border-slate-300 rounded-xl flex flex-col justify-center gap-3 bg-white">
                        <input 
                            value={newTypeName}
                            onChange={(e) => setNewTypeName(e.target.value)}
                            placeholder="Nombre del tipo (ej. Bug, Informe)"
                            className="bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-sm"
                        />
                        <button 
                            onClick={handleAddType}
                            className="w-full bg-slate-900 text-white py-1.5 rounded-lg text-sm font-bold hover:bg-slate-800"
                        >
                            + Crear Nuevo Tipo
                        </button>
                    </div>
                </div>
             </div>
         </div>
      )}

      {/* RULES CONTENT (Flow Editor) */}
      {activeTab === 'rules' && (
          <div className="space-y-8 max-w-4xl">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings size={20} /> Reglas y Automatización</h2>
                  </div>
                  
                  <div className="space-y-4">
                      {config.automationRules?.map(rule => (
                          <div key={rule.id} className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${rule.isActive ? 'bg-white border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-75'}`}>
                              <div className="flex items-center gap-4">
                                  <div className={`p-2 rounded-full ${rule.isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
                                      <Activity size={20} />
                                  </div>
                                  <div>
                                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                          <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{rule.trigger}</span>
                                          <ArrowRight size={14} className="text-slate-400"/>
                                          <span>{rule.condition}</span>
                                          <ArrowRight size={14} className="text-slate-400"/>
                                          <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{rule.action}</span>
                                      </div>
                                      <p className="text-xs text-slate-400 mt-1 font-mono">{rule.code}</p>
                                  </div>
                              </div>
                              
                              <button onClick={() => toggleRule(rule.id)}>
                                  {rule.isActive ? <ToggleRight size={32} className="text-indigo-600"/> : <ToggleLeft size={32} className="text-slate-400"/>}
                              </button>
                          </div>
                      ))}
                  </div>

                  <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-400 text-sm italic">
                      Próximamente: Constructor de reglas con lenguaje natural personalizado.
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default AdminPanel;