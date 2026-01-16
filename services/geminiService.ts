import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, EntityType, TaskPriority, AppConfig } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeTextWithGemini = async (text: string, image: { inlineData: { data: string, mimeType: string } } | null, config: AppConfig): Promise<AnalysisResult> => {
  const model = "gemini-3-flash-preview";

  // Dynamic Prompt Construction
  const categoryList = config.categories.map(c => `${c.name} (Sinónimos: ${c.synonyms.join(', ')})`).join('\n- ');
  const typeList = config.noteTypes.map(t => t.name).join(', ');
  
  // Construct parts for Multimodal request
  const parts: any[] = [];
  
  // 1. Add Image if present
  if (image) {
      parts.push(image);
  }

  // 2. Add System Prompt and Text
  const prompt = `Analiza el contenido proporcionado (Texto e Imagen si la hay) para un sistema de gestión empresarial inteligente (Second Brain / ERP).
    
    SI HAY UNA IMAGEN:
    - Describe brevemente su contenido en el resumen.
    - Si contiene texto (OCR), léelo y procésalo como si fuera texto introducido.
    - Si es una captura de pantalla de software, extrae la intención (ej. un Bug, una configuración).
    - Si es una foto de una pizarra/reunión, extrae los diagramas o listas como Tareas o Conocimiento.
    
    SEGURIDAD DE DATOS (CRÍTICO):
    - Analiza si el contenido (texto o imagen) contiene información sensible: contraseñas, claves API, tarjetas de crédito, datos médicos.
    - Marca 'isSensitive': true si detectas algo de esto.
    
    ESTRUCTURA RELACIONAL:
    - Detecta Empresas, Proyectos y Personas.
    - Identifica relaciones jerárquicas (associated_with).
    
    CLASIFICACIÓN PERSONALIZADA:
    - Categoriza la nota usando SOLAMENTE una de las siguientes categorías:
      - ${categoryList}
    - Si aplica, sugiere uno de los siguientes TIPOS DE NOTA en el resumen o categoría: ${typeList}
    
    BASE DE CONOCIMIENTO (Documentation Engine):
    - Si el contenido explica un proceso, decisión o "cómo hacer algo": extráelo como conocimiento.
    
    EXTRAE:
    1. Resumen corto (Título).
    2. Categoría.
    3. isSensitive (Booleano).
    4. Entidades.
    5. Tareas (Prioridad y Fechas).
    6. Conocimiento.
    7. Keywords.

    Contexto de texto adicional: "${text}"`;

  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          category: { type: Type.STRING },
          isSensitive: { type: Type.BOOLEAN },
          keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          entities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                type: { type: Type.STRING, enum: [EntityType.PERSON, EntityType.COMPANY, EntityType.PROJECT, EntityType.OTHER] },
                contact_info: { type: Type.STRING },
                role: { type: Type.STRING },
                associated_with: { type: Type.STRING }
              }
            }
          },
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                priority: { type: Type.STRING, enum: [TaskPriority.HIGH, TaskPriority.MEDIUM, TaskPriority.LOW] },
                date: { type: Type.STRING }
              }
            }
          },
          knowledge: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                content: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text) as AnalysisResult;
  }
  
  throw new Error("No response from AI");
};

export const suggestMerges = async (newNote: string, oldNotes: {id: string, summary: string}[]) => {
    return []; 
}