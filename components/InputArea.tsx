import React, { useState, useRef, useCallback } from 'react';
import { Send, Loader2, Mic, Image as ImageIcon, X, Upload } from 'lucide-react';

interface InputAreaProps {
  onAnalyze: (text: string, image?: { data: string, mimeType: string }) => Promise<void>;
  isAnalyzing: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onAnalyze, isAnalyzing }) => {
  const [text, setText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ preview: string, data: string, mimeType: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim() && !selectedImage) return;
    
    // Clean inputs
    const imagePayload = selectedImage ? { data: selectedImage.data, mimeType: selectedImage.mimeType } : undefined;
    
    onAnalyze(text, imagePayload);
    
    setText('');
    setSelectedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSend();
    }
  };

  const processFile = (file: File) => {
      if (!file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          const base64String = reader.result as string;
          // Extract just the data part (remove "data:image/jpeg;base64,")
          const base64Data = base64String.split(',')[1];
          
          setSelectedImage({
              preview: base64String,
              data: base64Data,
              mimeType: file.type
          });
      };
      reader.readAsDataURL(file);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          processFile(file);
      }
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      for (const item of items) {
          if (item.type.indexOf('image') !== -1) {
              const file = item.getAsFile();
              if (file) {
                  processFile(file);
                  e.preventDefault(); // Prevent pasting the filename/dummy text
              }
          }
      }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) {
          processFile(file);
      }
  }, []);

  return (
    <div className="bg-white border-t border-slate-200 p-4 shadow-lg z-10">
      <div className="max-w-4xl mx-auto relative">
        
        {/* Image Preview */}
        {selectedImage && (
            <div className="absolute -top-24 left-0 animate-in slide-in-from-bottom-5 fade-in">
                <div className="relative group">
                    <img 
                        src={selectedImage.preview} 
                        alt="Preview" 
                        className="h-20 w-auto rounded-lg border-2 border-indigo-200 shadow-md bg-white object-cover"
                    />
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600 transition-colors"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>
        )}

        <div 
            className={`relative rounded-2xl transition-all duration-200 ${isDragging ? 'ring-4 ring-indigo-100 bg-indigo-50' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-indigo-50/90 rounded-2xl border-2 border-dashed border-indigo-400 pointer-events-none">
                    <div className="text-center text-indigo-600 animate-pulse">
                        <Upload size={32} className="mx-auto mb-2" />
                        <span className="font-bold">Suelta la imagen aquí</span>
                    </div>
                </div>
            )}

            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Escribe, pega (Ctrl+V) una imagen o arrastra un archivo aquí... (Ctrl + Enter para enviar)"
                className={`w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 pr-32 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none min-h-[80px] text-slate-700 shadow-inner ${isDragging ? 'opacity-50' : ''}`}
            />
            
            <div className="absolute right-3 bottom-3 flex gap-2 z-10">
                <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageSelect}
                />
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2 rounded-full transition-colors ${selectedImage ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`} 
                    title="Subir imagen"
                >
                    <ImageIcon size={20} />
                </button>
                <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="Dictado (Simulado)">
                    <Mic size={20} />
                </button>
                <button 
                    onClick={handleSend}
                    disabled={isAnalyzing || (!text.trim() && !selectedImage)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-200"
                >
                    {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {isAnalyzing ? 'Procesando...' : 'Procesar'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default InputArea;