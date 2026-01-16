
export enum EntityType {
    PERSON = 'Person',
    COMPANY = 'Company',
    PROJECT = 'Project',
    OTHER = 'Other'
  }
  
  export enum TaskPriority {
    HIGH = 'High',
    MEDIUM = 'Medium',
    LOW = 'Low'
  }
  
  export interface Entity {
    id: string;
    name: string;
    type: EntityType;
    email?: string;
    phone?: string;
    role?: string;
    parentId?: string; // ID of the Company or Project this belongs to
    notes: string[]; // IDs of related notes
    status: 'active' | 'archived' | 'incomplete'; // New Rule: Safe Deletion & Incomplete handling
  }
  
  export interface Task {
    id: string;
    description: string;
    priority: TaskPriority;
    suggestedDate?: string;
    completed: boolean;
    sourceNoteId: string;
    relatedEntityId?: string; // New Rule: Context-less Tasks prevention
  }
  
  export interface KnowledgeHistory {
    date: number;
    sourceNoteId: string;
    action: 'create' | 'update';
    summary?: string;
  }

  export interface KnowledgeItem {
    id: string;
    topic: string;
    content: string;
    tags: string[];
    sourceNoteId: string;
    relatedEntityIds?: string[]; // New: Context linking
    history: KnowledgeHistory[];
    lastUpdated: number;
  }
  
  export interface AnalysisResult {
    summary: string;
    category: string;
    isSensitive: boolean;
    entities: {
      name: string;
      type: EntityType;
      contact_info?: string;
      role?: string;
      associated_with?: string; 
    }[];
    tasks: {
      description: string;
      priority: TaskPriority;
      date?: string;
    }[];
    knowledge: {
      topic: string;
      content: string;
    }[];
    keywords: string[];
  }
  
  export interface Note {
    id: string;
    content: string;
    summary: string;
    category: string;
    isSensitive: boolean;
    createdAt: number;
    relatedEntityIds: string[];
    relatedNoteIds: string[];
    extractedTaskIds: string[];
    extractedKnowledgeIds: string[];
  }

  // --- ADMIN & CONFIG TYPES ---

  export interface CategoryDefinition {
    id: string;
    name: string;
    parentId?: string; // For subcategories
    color: string;
    synonyms: string[]; // e.g. ["Cliente", "Comprador"] for "Ventas"
  }

  export interface NoteTypeField {
    id: string;
    name: string;
    type: 'text' | 'date' | 'boolean' | 'number';
    required: boolean;
  }

  export interface NoteTypeDefinition {
    id: string;
    name: string; // e.g., "Reunión", "Bug", "Credencial"
    fields: NoteTypeField[];
    iconName?: string;
  }

  export interface AutomationRule {
    id: string;
    trigger: string; // e.g. "Al crear Tarea"
    condition: string; // e.g. "No tiene proyecto asignado"
    action: string; // e.g. "Bloquear guardado"
    isActive: boolean;
    code: 'TASK_REQUIRES_CONTEXT' | 'ENTITY_VAGUE_INCOMPLETE'; 
  }

  export interface AppConfig {
    categories: CategoryDefinition[];
    noteTypes: NoteTypeDefinition[];
    quickActions: string[]; // IDs of NoteTypes to show as buttons
    automationRules: AutomationRule[];
  }
  
  export type ViewMode = 'dashboard' | 'directory' | 'tasks' | 'knowledge' | 'project_view' | 'admin' | 'review';

  // --- AUTONOMY TYPES ---
  export interface Suggestion {
      id: string;
      type: 'CREATE_ENTITY' | 'ARCHIVE_ENTITY' | 'MERGE_NOTES';
      title: string;
      reason: string;
      data: any; // Dynamic data for the action
  }
