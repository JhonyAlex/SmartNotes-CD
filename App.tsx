import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import EntityView from './components/EntityView';
import InputArea from './components/InputArea';
import AnalysisModal from './components/AnalysisModal';
import AdminPanel from './components/AdminPanel';
import UniversalEditor from './components/UniversalEditor'; 
import SmartReviewPanel from './components/SmartReviewPanel'; 
import SystemToast from './components/SystemToast'; // New
import { Note, Task, Entity, KnowledgeItem, ViewMode, AnalysisResult, EntityType, AppConfig, CategoryDefinition, Suggestion } from './types';
import { analyzeTextWithGemini } from './services/geminiService';
import { v4 as uuidv4 } from 'uuid'; 

const generateId = () => crypto.randomUUID();

const DEFAULT_CONFIG: AppConfig = {
    categories: [
        { id: '1', name: 'Reunión', color: 'bg-indigo-600', synonyms: ['Meeting', 'Call', 'Llamada'] },
        { id: '2', name: 'Idea', color: 'bg-amber-500', synonyms: ['Inspiración', 'Concepto'] },
        { id: '3', name: 'Proyecto', color: 'bg-purple-600', synonyms: ['Plan', 'Estrategia'] },
        { id: '4', name: 'CRM', color: 'bg-orange-500', synonyms: ['Cliente', 'Venta', 'Lead'] },
        { id: '5', name: 'Personal', color: 'bg-green-500', synonyms: ['Casa', 'Salud'] }
    ],
    noteTypes: [
        { id: 't1', name: 'Reunión', fields: [] },
        { id: 't2', name: 'Bug', fields: [] },
        { id: 't3', name: 'Credencial', fields: [] }
    ],
    quickActions: [],
    automationRules: [
        {
            id: 'r1',
            trigger: 'Al guardar una Tarea',
            condition: 'No tiene contexto (Empresa/Proyecto)',
            action: 'Pedir confirmación / Bloquear',
            isActive: true,
            code: 'TASK_REQUIRES_CONTEXT'
        },
        {
            id: 'r2',
            trigger: 'Al crear Entidad',
            condition: 'El nombre es genérico o vacío',
            action: 'Marcar como "Incompleta"',
            isActive: true,
            code: 'ENTITY_VAGUE_INCOMPLETE'
        }
    ]
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('dashboard');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [systemToast, setSystemToast] = useState<{message: string, type: 'success' | 'warning' | 'info'} | null>(null);
  
  // App Configuration State
  const [appConfig, setAppConfig] = useState<AppConfig>(() => {
      const saved = localStorage.getItem('appConfig');
      return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  // App State
  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [entities, setEntities] = useState<Entity[]>(() => {
    const saved = localStorage.getItem('entities');
    return saved ? JSON.parse(saved) : [];
  });
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>(() => {
    const saved = localStorage.getItem('knowledge');
    return saved ? JSON.parse(saved) : [];
  });

  // Smart Suggestions State
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // UI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [currentInputText, setCurrentInputText] = useState('');
  const [similarNotes, setSimilarNotes] = useState<Note[]>([]);

  // Editing State (For Universal Editor)
  const [editingItem, setEditingItem] = useState<{ item: any, type: 'note' | 'task' | 'entity' | 'knowledge' } | null>(null);

  // Persistence
  useEffect(() => { localStorage.setItem('notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem('entities', JSON.stringify(entities)); }, [entities]);
  useEffect(() => { localStorage.setItem('tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('knowledge', JSON.stringify(knowledge)); }, [knowledge]);
  useEffect(() => { localStorage.setItem('appConfig', JSON.stringify(appConfig)); }, [appConfig]);

  // --- NAVIGATION HANDLER ---
  const handleNavigate = (type: EntityType, id: string) => {
      setEditingItem(null); // Close modal
      setSelectedEntityId(id);
      if (type === EntityType.PROJECT) {
          setView('project_view');
      } else {
          setView('directory');
      }
  };

  // --- SMART AUTONOMY ENGINE ---
  // Run heuristics to generate suggestions
  useEffect(() => {
      const newSuggestions: Suggestion[] = [];

      // 1. Pattern Detection: Frequent Terms not in Directory
      // Simple heuristic: Capitalized words appearing in > 2 notes that aren't entities
      const potentialEntities = new Map<string, number>();
      const existingNames = new Set(entities.map(e => e.name.toLowerCase()));

      notes.forEach(note => {
          // Rudimentary regex for capitalized words (Project Alpha, Acme Corp)
          const caps: string[] = note.content.match(/\b[A-Z][a-zA-Z0-9]+\b/g) || [];
          caps.forEach(word => {
              if (word.length > 3 && !existingNames.has(word.toLowerCase())) {
                  potentialEntities.set(word, (potentialEntities.get(word) || 0) + 1);
              }
          });
      });

      potentialEntities.forEach((count, name) => {
          if (count >= 3) {
              newSuggestions.push({
                  id: `create-${name}`,
                  type: 'CREATE_ENTITY',
                  title: `Crear entidad: "${name}"`,
                  reason: `Mencionada en ${count} notas distintas.`,
                  data: { name }
              });
          }
      });

      // 2. Stale Entity Detection
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      entities.forEach(ent => {
          if (ent.status === 'active') {
             const relatedNotes = notes.filter(n => n.relatedEntityIds.includes(ent.id));
             const lastActivity = relatedNotes.length > 0 
                ? Math.max(...relatedNotes.map(n => n.createdAt)) 
                : 0; // If no notes, very stale
             
             if (lastActivity > 0 && lastActivity < thirtyDaysAgo) {
                 newSuggestions.push({
                     id: `archive-${ent.id}`,
                     type: 'ARCHIVE_ENTITY',
                     title: `Archivar "${ent.name}"`,
                     reason: 'Sin actividad reciente (30+ días).',
                     data: { id: ent.id }
                 });
             }
          }
      });

      setSuggestions(newSuggestions.slice(0, 3)); 
  }, [notes, entities]);

  const handleApplySuggestion = (suggestion: Suggestion) => {
      if (suggestion.type === 'CREATE_ENTITY') {
          handleCreateEntityFromModal(suggestion.data.name, EntityType.PROJECT); 
      } else if (suggestion.type === 'ARCHIVE_ENTITY') {
          setEntities(prev => prev.map(e => e.id === suggestion.data.id ? { ...e, status: 'archived' } : e));
      }
      setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const handleDismissSuggestion = (id: string) => {
      setSuggestions(prev => prev.filter(s => s.id !== id));
  };

  // --- SAFE DELETION HANDLERS (RESPONSIBLE AUTONOMY) ---
  const handleDeleteNote = (id: string) => {
    const dependentTasks = tasks.filter(t => t.sourceNoteId === id);
    const dependentKnowledge = knowledge.filter(k => k.sourceNoteId === id);
    
    let message = "¿Eliminar esta nota?";
    if (dependentTasks.length > 0 || dependentKnowledge.length > 0) {
        message = `⚠️ IMPACTO DETECTADO\n\nEsta nota es fuente de:\n- ${dependentTasks.length} Tareas\n- ${dependentKnowledge.length} Artículos de conocimiento\n\nSi la eliminas, estos elementos perderán su trazabilidad. ¿Proceder?`;
    }

    if (window.confirm(message)) {
        setNotes(prev => prev.filter(n => n.id !== id));
        if (editingItem?.item.id === id) setEditingItem(null);
    }
  };

  const handleDeleteEntity = (id: string) => {
      const entity = entities.find(e => e.id === id);
      if (!entity) return;

      const linkedNotes = notes.filter(n => n.relatedEntityIds.includes(id));
      const linkedTasks = tasks.filter(t => t.relatedEntityId === id);
      const linkedKnowledge = knowledge.filter(k => k.relatedEntityIds?.includes(id));
      const childEntities = entities.filter(e => e.parentId === id);

      if (linkedNotes.length > 0 || linkedTasks.length > 0 || childEntities.length > 0 || linkedKnowledge.length > 0) {
          const impactReport = [
              linkedNotes.length > 0 ? `- ${linkedNotes.length} Notas perderán contexto` : '',
              linkedTasks.length > 0 ? `- ${linkedTasks.length} Tareas quedarán huérfanas` : '',
              linkedKnowledge.length > 0 ? `- ${linkedKnowledge.length} Artículos de conocimiento perderán contexto` : '',
              childEntities.length > 0 ? `- ${childEntities.length} Sub-entidades (Proyectos/Personas) quedarán sin padre` : ''
          ].filter(Boolean).join('\n');

          if (!window.confirm(`⚠️ DETENCIÓN DE SEGURIDAD\n\nNo puedo eliminar "${entity.name}" sin tu permiso explícito debido al siguiente impacto:\n\n${impactReport}\n\nSugerencia: Usa la opción "Archivar" en su lugar.\n\n¿Realmente deseas eliminar permanentemente?`)) {
              return;
          }
      } else {
          if (!window.confirm(`¿Eliminar "${entity.name}"?`)) return;
      }

      setEntities(prev => prev.filter(e => e.id !== id));
      setNotes(prev => prev.map(n => ({ ...n, relatedEntityIds: n.relatedEntityIds.filter(eid => eid !== id) })));
      setTasks(prev => prev.map(t => t.relatedEntityId === id ? { ...t, relatedEntityId: undefined } : t));
      setKnowledge(prev => prev.map(k => k.relatedEntityIds ? { ...k, relatedEntityIds: k.relatedEntityIds.filter(eid => eid !== id) } : k));
      setEntities(prev => prev.map(e => e.parentId === id ? { ...e, parentId: undefined } : e)); 

       if (editingItem?.item.id === id) setEditingItem(null);
       if (selectedEntityId === id) setSelectedEntityId(null);
  };

  const handleDeleteTask = (id: string) => {
      if (window.confirm("¿Eliminar tarea?")) {
          setTasks(prev => prev.filter(t => t.id !== id));
           if (editingItem?.item.id === id) setEditingItem(null);
      }
  };

  const handleDeleteKnowledge = (id: string) => {
      if (window.confirm("¿Eliminar entrada de conocimiento?")) {
          setKnowledge(prev => prev.filter(k => k.id !== id));
           if (editingItem?.item.id === id) setEditingItem(null);
      }
  };

  // --- Entity Merging Logic ---
  const handleMergeEntities = (sourceId: string, targetId: string) => {
      if (sourceId === targetId) return;
      setNotes(prev => prev.map(n => ({ ...n, relatedEntityIds: n.relatedEntityIds.map(id => id === sourceId ? targetId : id).filter((value, index, self) => self.indexOf(value) === index) })));
      setTasks(prev => prev.map(t => ({ ...t, relatedEntityId: t.relatedEntityId === sourceId ? targetId : t.relatedEntityId })));
      setKnowledge(prev => prev.map(k => { if (!k.relatedEntityIds) return k; return { ...k, relatedEntityIds: k.relatedEntityIds.map(id => id === sourceId ? targetId : id).filter((value, index, self) => self.indexOf(value) === index) }}));
      setEntities(prev => prev.map(e => ({ ...e, parentId: e.parentId === sourceId ? targetId : e.parentId })).filter(e => e.id !== sourceId)); 
      if (editingItem?.item.id === sourceId) setEditingItem(null);
      if (selectedEntityId === sourceId) setSelectedEntityId(targetId);
  };

  // --- Note Merging Logic (Smart Review) ---
  const handleMergeNotes = (keepId: string, dropId: string) => {
      const keepNote = notes.find(n => n.id === keepId);
      const dropNote = notes.find(n => n.id === dropId);
      if (!keepNote || !dropNote) return;

      const mergedContent = `${keepNote.content}\n\n--- Contenido fusionado (${new Date().toLocaleDateString()}) ---\n${dropNote.content}`;
      const mergedEntities = [...keepNote.relatedEntityIds, ...dropNote.relatedEntityIds].filter((v, i, a) => a.indexOf(v) === i);
      setTasks(prev => prev.map(t => t.sourceNoteId === dropId ? { ...t, sourceNoteId: keepId } : t));
      setKnowledge(prev => prev.map(k => k.sourceNoteId === dropId ? { ...k, sourceNoteId: keepId } : k));
      const updatedNote: Note = { ...keepNote, content: mergedContent, relatedEntityIds: mergedEntities };
      setNotes(prev => prev.map(n => n.id === keepId ? updatedNote : n).filter(n => n.id !== dropId));
  };

  // --- Update Handlers ---
  const handleSaveItem = (updatedItem: any) => {
      if (!editingItem) return;
      switch(editingItem.type) {
          case 'note': setNotes(prev => prev.map(n => n.id === updatedItem.id ? updatedItem : n)); break;
          case 'entity': setEntities(prev => prev.map(e => e.id === updatedItem.id ? updatedItem : e)); break;
          case 'task': setTasks(prev => prev.map(t => t.id === updatedItem.id ? updatedItem : t)); break;
          case 'knowledge': setKnowledge(prev => prev.map(k => k.id === updatedItem.id ? updatedItem : k)); break;
      }
      setEditingItem(null);
  };
  
  const handleUpdateTask = (task: Task) => setTasks(prev => prev.map(t => t.id === task.id ? task : t));
  const handleUpdateEntity = (entity: Entity) => setEntities(prev => prev.map(e => e.id === entity.id ? entity : e));
  const handleMergeCategories = (fromId: string, toId: string) => {
      const sourceCat = appConfig.categories.find(c => c.id === fromId);
      const targetCat = appConfig.categories.find(c => c.id === toId);
      if (!sourceCat || !targetCat) return;
      setNotes(prev => prev.map(n => { if (n.category === sourceCat.name) { return { ...n, category: targetCat.name }; } return n; }));
  };

  const handleAddCategoryFromModal = (name: string) => {
      const newCat: CategoryDefinition = { id: generateId(), name: name, color: 'bg-slate-500', synonyms: [] };
      setAppConfig(prev => ({...prev, categories: [...prev.categories, newCat]}));
  };

  const handleCreateEntityFromModal = (name: string, type: EntityType, parentId?: string) => {
      findOrCrushEntity(name, type, {}, parentId); // Logic centralized
  };
  
  const findOrCrushEntity = (name: string, type: any, details: any, parentIdCandidate?: string): string => {
    const safeName = name ? name.trim() : "Entidad Desconocida";
    const existing = entities.find(e => e.name.toLowerCase() === safeName.toLowerCase());
    
    if (existing) {
        let hasChanges = false;
        const updated = { ...existing };
        if (details.contact_info && !existing.email) { updated.email = details.contact_info; hasChanges = true; }
        if (details.role && !existing.role) { updated.role = details.role; hasChanges = true; }
        if (parentIdCandidate && !existing.parentId) { updated.parentId = parentIdCandidate; hasChanges = true; }
        if (hasChanges) {
            setEntities(prev => prev.map(e => e.id === existing.id ? updated : e));
        }
        return existing.id;
    }
    const ruleActive = appConfig.automationRules?.find(r => r.code === 'ENTITY_VAGUE_INCOMPLETE')?.isActive ?? true;
    const isVague = safeName === "Entidad Desconocida" || safeName.length < 3; // Stricter check
    const status = (ruleActive && isVague) ? 'incomplete' : 'active';
    const newEntity: Entity = {
        id: generateId(),
        name: safeName,
        type,
        email: details.contact_info,
        role: details.role,
        parentId: parentIdCandidate,
        notes: [],
        status: status
    };
    setEntities(prev => [...prev, newEntity]);
    return newEntity.id;
  };

  const handleAnalyze = async (text: string, image?: { data: string, mimeType: string }) => {
    setIsAnalyzing(true);
    setCurrentInputText(text + (image ? " [Imagen Adjunta]" : ""));
    try {
      const imagePayload = image ? { inlineData: { data: image.data, mimeType: image.mimeType } } : null;
      const result = await analyzeTextWithGemini(text, imagePayload, appConfig);
      const potentialSimilarities = notes.filter(note => {
          const noteKeywords = note.summary.split(' '); 
          return result.keywords?.some(k => k.length > 3 && (noteKeywords.includes(k) || note.content.toLowerCase().includes(k.toLowerCase())));
      });
      setSimilarNotes(potentialSimilarities.slice(0, 4));
      setAnalysisResult(result);
    } catch (error) {
      console.error(error);
      alert("Error analizando el contenido. Verifica tu API Key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmSave = (data: AnalysisResult, linkToNoteIds: string[], knowledgeMerges: Record<string, string>) => {
    const noteId = generateId();
    const relatedEntityIds: string[] = [];
    const createdTaskIds: string[] = [];
    const createdKnowledgeIds: string[] = [];
    const batchEntityMap: Record<string, string> = {}; 
    const sortedEntities = [...data.entities].sort((a, b) => {
        if (a.type === EntityType.COMPANY) return -1;
        if (b.type === EntityType.COMPANY) return 1;
        return 0;
    });

    sortedEntities.forEach(ent => {
        let parentId: string | undefined = undefined;
        if (ent.associated_with) {
            const parentName = ent.associated_with.toLowerCase();
            const existingParent = entities.find(e => e.name.toLowerCase() === parentName);
            if (existingParent) {
                parentId = existingParent.id;
            } else if (batchEntityMap[parentName]) {
                parentId = batchEntityMap[parentName];
            } else {
                const newParentId = findOrCrushEntity(ent.associated_with, EntityType.COMPANY, {});
                parentId = newParentId;
                batchEntityMap[parentName] = newParentId;
            }
        }
        const entId = findOrCrushEntity(ent.name, ent.type, ent, parentId);
        relatedEntityIds.push(entId);
        batchEntityMap[ent.name.toLowerCase()] = entId;
    });

    data.tasks.forEach(t => {
        const taskId = generateId();
        let autoRelatedEntityId: string | undefined = undefined;
        const potentialContexts = relatedEntityIds.filter(id => {
            const entityType = sortedEntities.find(se => batchEntityMap[se.name.toLowerCase()] === id)?.type;
            return entityType === EntityType.COMPANY || entityType === EntityType.PROJECT;
        });

        if (potentialContexts.length === 1) autoRelatedEntityId = potentialContexts[0];
        else if (relatedEntityIds.length === 1) autoRelatedEntityId = relatedEntityIds[0];

        const newTask: Task = {
            id: taskId,
            description: t.description,
            priority: t.priority as any,
            suggestedDate: t.date,
            completed: false,
            sourceNoteId: noteId,
            relatedEntityId: autoRelatedEntityId
        };
        setTasks(prev => [...prev, newTask]);
        createdTaskIds.push(taskId);
    });

    data.knowledge.forEach((k, idx) => {
        const mergeTargetId = knowledgeMerges[idx.toString()];
        if (mergeTargetId) {
            setKnowledge(prev => prev.map(ek => {
                if (ek.id === mergeTargetId) {
                    const newContent = `${ek.content}\n\n--- Actualización (${new Date().toLocaleDateString()}) ---\n${k.content}`;
                    return { ...ek, content: newContent, lastUpdated: Date.now(), history: [...(ek.history || []), { date: Date.now(), sourceNoteId: noteId, action: 'update', summary: 'Content appended from new note' }] };
                }
                return ek;
            }));
            createdKnowledgeIds.push(mergeTargetId);
        } else {
            const kId = generateId();
            const newK: KnowledgeItem = { 
                id: kId, 
                topic: k.topic, 
                content: k.content, 
                tags: data.keywords, 
                sourceNoteId: noteId, 
                relatedEntityIds: relatedEntityIds, 
                lastUpdated: Date.now(), 
                history: [{ date: Date.now(), sourceNoteId: noteId, action: 'create' }] 
            };
            setKnowledge(prev => [...prev, newK]);
            createdKnowledgeIds.push(kId);
        }
    });

    if (linkToNoteIds.length > 0) {
        setNotes(prev => prev.map(n => {
            if (linkToNoteIds.includes(n.id)) {
                return { ...n, relatedNoteIds: n.relatedNoteIds ? [...n.relatedNoteIds, noteId] : [noteId] };
            }
            return n;
        }));
    }

    const newNote: Note = {
        id: noteId,
        content: currentInputText, 
        summary: data.summary,
        category: data.category,
        isSensitive: data.isSensitive || false, 
        createdAt: Date.now(),
        relatedEntityIds,
        relatedNoteIds: linkToNoteIds,
        extractedTaskIds: createdTaskIds,
        extractedKnowledgeIds: createdKnowledgeIds
    };
    
    setNotes(prev => [newNote, ...prev]);
    setAnalysisResult(null);
    setCurrentInputText('');
    setSimilarNotes([]);

    // --- STEP 9: POST-SAVE AUDIT (AUTONOMOUS SYSTEM) ---
    // Check what we just created for inconsistencies
    const incompleteCount = sortedEntities.filter(e => e.name.length < 3).length; // Heuristic
    const contextLessTaskCount = data.tasks.filter(t => !relatedEntityIds.some(id => {
         const ent = entities.find(e => e.id === id) || { type: 'Other' };
         return ent.type === EntityType.COMPANY || ent.type === EntityType.PROJECT;
    })).length;

    if (incompleteCount > 0 || contextLessTaskCount > 0) {
        setSystemToast({
            type: 'warning',
            message: `Nota guardada, pero detecté inconsistencias: ${incompleteCount > 0 ? incompleteCount + ' entidades vagas' : ''} ${contextLessTaskCount > 0 ? contextLessTaskCount + ' tareas sin contexto' : ''}. Revisa el panel de revisión.`
        });
    } else {
        setSystemToast({
            type: 'success',
            message: 'Nota guardada y procesada correctamente. Toda la información está vinculada.'
        });
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <Sidebar currentView={view} setView={setView} />
      
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <div className="flex-1 overflow-hidden">
            {view === 'dashboard' && (
                <Dashboard 
                    notes={notes} 
                    tasks={tasks} 
                    entities={entities} 
                    suggestions={suggestions}
                    onApplySuggestion={handleApplySuggestion}
                    onDismissSuggestion={handleDismissSuggestion}
                    onEditNote={(note) => setEditingItem({ item: note, type: 'note' })}
                />
            )}
            {(view === 'directory' || view === 'project_view') && (
                <EntityView 
                    mode={view === 'directory' ? 'directory' : 'project'} 
                    entities={entities} 
                    notes={notes}
                    tasks={tasks}
                    knowledge={knowledge}
                    selectedEntityId={selectedEntityId} 
                    onSelectEntity={setSelectedEntityId} 
                    onDeleteNote={handleDeleteNote}
                    onEditEntity={(entity) => setEditingItem({ item: entity, type: 'entity' })}
                    onEditNote={(note) => setEditingItem({ item: note, type: 'note' })}
                    onEditTask={(task) => setEditingItem({ item: task, type: 'task' })} // Level 10 Fix
                    onEditKnowledge={(k) => setEditingItem({ item: k, type: 'knowledge' })} // Level 10 Fix
                />
            )}
            {view === 'tasks' && (
                <div className="p-10">
                    <h1 className="text-2xl font-bold mb-6">Todas las Tareas</h1>
                    <div className="space-y-2 max-w-3xl">
                        {tasks.map(t => (
                            <div 
                                key={t.id} 
                                onClick={() => setEditingItem({item: t, type: 'task'})}
                                className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm hover:border-indigo-300 cursor-pointer transition-all"
                            >
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" checked={t.completed} onClick={(e) => e.stopPropagation()} onChange={() => {
                                        setTasks(tasks.map(x => x.id === t.id ? {...x, completed: !x.completed} : x))
                                    }} className="w-5 h-5 accent-indigo-600 cursor-pointer"/>
                                    <span className={t.completed ? 'line-through text-slate-400' : ''}>{t.description}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {t.relatedEntityId && (
                                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded">
                                            {entities.find(e => e.id === t.relatedEntityId)?.name}
                                        </span>
                                    )}
                                    <span className={`text-xs px-2 py-1 rounded font-bold ${t.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                        {t.priority}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {view === 'knowledge' && (
                 <div className="p-10">
                     <h1 className="text-2xl font-bold mb-6">Base de Conocimiento</h1>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {knowledge.map(k => (
                             <div 
                                key={k.id} 
                                onClick={() => setEditingItem({item: k, type: 'knowledge'})}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 cursor-pointer transition-all"
                             >
                                 <h3 className="font-bold text-lg text-indigo-900 mb-2">{k.topic}</h3>
                                 <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap line-clamp-4">{k.content}</p>
                                 <div className="mt-4 flex flex-wrap gap-2 justify-between items-center border-t border-slate-100 pt-3">
                                     <div className="flex gap-2">
                                         {k.tags?.map(tag => (
                                             <span key={tag} className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">#{tag}</span>
                                         ))}
                                     </div>
                                     <span className="text-[10px] text-slate-400">Actualizado: {new Date(k.lastUpdated).toLocaleDateString()}</span>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
            )}
            {view === 'review' && (
                <SmartReviewPanel 
                    notes={notes}
                    tasks={tasks}
                    entities={entities}
                    onEditItem={(item, type) => setEditingItem({item, type})}
                    onUpdateTask={handleUpdateTask}
                    onUpdateEntity={handleUpdateEntity}
                    onDeleteNote={handleDeleteNote}
                    onMergeNotes={handleMergeNotes}
                />
            )}
            {view === 'admin' && (
                <AdminPanel 
                    config={appConfig} 
                    onUpdateConfig={setAppConfig}
                    onMergeCategories={handleMergeCategories}
                    notes={notes} 
                />
            )}
        </div>

        <InputArea onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />

        {/* --- TOAST NOTIFICATIONS --- */}
        {systemToast && (
            <SystemToast 
                message={systemToast.message} 
                type={systemToast.type} 
                onClose={() => setSystemToast(null)} 
            />
        )}

        {/* --- MODALS --- */}

        {editingItem && (
            <UniversalEditor 
                item={editingItem.item}
                type={editingItem.type}
                allEntities={entities}
                allTasks={tasks} 
                allKnowledge={knowledge} 
                config={appConfig} 
                onSave={handleSaveItem}
                onClose={() => setEditingItem(null)}
                onDelete={editingItem.type === 'note' ? handleDeleteNote : editingItem.type === 'entity' ? handleDeleteEntity : editingItem.type === 'task' ? handleDeleteTask : handleDeleteKnowledge}
                onMergeEntities={handleMergeEntities} 
                onNavigate={handleNavigate} 
            />
        )}

        {analysisResult && (
            <AnalysisModal 
                result={analysisResult} 
                existingKnowledge={knowledge}
                allEntities={entities} // PASSED for explicit linking
                config={appConfig} 
                onConfirm={handleConfirmSave} 
                onCancel={() => setAnalysisResult(null)}
                similarNotes={similarNotes}
                onAddCategory={handleAddCategoryFromModal}
                onCreateEntity={handleCreateEntityFromModal}
            />
        )}
      </main>
    </div>
  );
};

export default App;