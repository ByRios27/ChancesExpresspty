import React, { useState } from 'react';
import { X, Zap, ArrowLeftRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore, Entry, GameType } from '../../store/useStore';
import { generateId } from '../../utils/helpers';

interface QuickPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (entries: Entry[]) => void;
  gameMode: GameType;
  isInverted: boolean;
  setIsInverted: (val: boolean) => void;
}

export const QuickPasteModal: React.FC<QuickPasteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  gameMode,
  isInverted,
  setIsInverted
}) => {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { settings } = useStore();

  const handleProcess = () => {
    if (!text.trim()) return;

    // Normalize text: replace commas and newlines with spaces to get a flat list of potential tokens
    const normalizedText = text.replace(/[\n,]/g, ' ');
    const tokens = normalizedText.split(/\s+/).filter(Boolean);
    
    const newEntries: Entry[] = [];
    const pricePerUnit = gameMode === 'BILLETE' 
      ? (settings.billete?.unitPrice || 1) 
      : (gameMode === 'PALÉ' ? 1 : (settings.pricePerTime || 1));

    const requiredDigits = gameMode === 'CHANCE' ? 2 : 4;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      let numStr = '';
      let qtyStr = '';

      // Check if token has an internal separator
      const internalSeparator = /[\/\-\.]/.exec(token);
      
      if (internalSeparator) {
        const parts = token.split(/[\/\-\.]/).filter(Boolean);
        if (parts.length !== 2) {
          setError(`Formato inválido en: "${token}". Use número/cantidad.`);
          return;
        }
        numStr = isInverted ? parts[1] : parts[0];
        qtyStr = isInverted ? parts[0] : parts[1];
      } else {
        // No internal separator, take this token and the next one
        if (i + 1 >= tokens.length) {
          setError(`Falta la cantidad para el número: "${token}".`);
          return;
        }
        numStr = isInverted ? tokens[i+1] : tokens[i];
        qtyStr = isInverted ? tokens[i] : tokens[i+1];
        i++; // Skip the next token as we've consumed it
      }

      // Basic validation
      if (numStr.length !== requiredDigits) {
        setError(`El número "${numStr}" debe tener ${requiredDigits} cifras para ${gameMode}.`);
        return;
      }

      const pieces = parseInt(qtyStr, 10);
      if (isNaN(pieces) || pieces <= 0) {
        setError(`Cantidad inválida: "${qtyStr}" para el número "${numStr}"`);
        return;
      }

      const amount = Number((pieces * pricePerUnit).toFixed(2));

      newEntries.push({
        id: generateId(),
        number: numStr,
        amount,
        pieces,
        type: gameMode,
        status: 'pending'
      });
    }

    onConfirm(newEntries);
    setText('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#121A2B] w-full max-w-md rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary/20 rounded-xl flex items-center justify-center text-brand-primary">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Pegado Rápido</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Modo: {gameMode}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              <ArrowLeftRight size={14} className="text-brand-primary" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Orden: {isInverted ? 'Cantidad / Número' : 'Número / Cantidad'}
              </span>
            </div>
            <button 
              onClick={() => setIsInverted(!isInverted)}
              className="text-[10px] font-black text-brand-primary uppercase tracking-widest hover:underline"
            >
              Invertir
            </button>
          </div>

          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              placeholder={`Ejemplos:\n74-6 47-6 75-7\n74/6, 47/6, 75/7\n74 6 47 6 75 7\n74.6\n47.6`}
              className="w-full h-40 bg-black/20 border border-white/5 rounded-xl p-4 text-sm font-mono text-white placeholder:text-slate-700 focus:outline-none focus:border-brand-primary/30 transition-all resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-400 bg-rose-400/10 p-3 rounded-xl border border-rose-400/20">
              <AlertCircle size={14} />
              <p className="text-[10px] font-bold uppercase tracking-tight">{error}</p>
            </div>
          )}

          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
            Soportamos múltiples jugadas separadas por <span className="text-slate-300">espacios, comas o saltos de línea</span>. 
            Separadores internos: <span className="text-slate-300">/ - . espacio</span>.
          </div>
        </div>

        <div className="p-6 bg-black/20 border-t border-white/5">
          <button
            onClick={handleProcess}
            disabled={!text.trim()}
            className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            Procesar Jugadas
          </button>
        </div>
      </motion.div>
    </div>
  );
};
