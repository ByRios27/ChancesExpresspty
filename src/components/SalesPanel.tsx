import React, { useState, useMemo, useRef } from 'react';
import { useStore, Entry, Ticket } from '../store/useStore';
import { cn, formatAMPM, generateId, getCurrentTimeMinutes, normalizePale, toCents, fromCents, formatCurrency, getDrawStatus, formatPlayNumberForDisplay, getCustomerDisplayName } from '../utils/helpers';
import { 
  Menu, 
  LogOut, 
  User, 
  Calendar, 
  ChevronDown, 
  Delete, 
  RotateCcw, 
  Plus, 
  Zap,
  Ticket as TicketIcon,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TicketModal } from './TicketModal';
import { SaleCustomerModal } from './Sales/SaleCustomerModal';
import { QuickPasteModal } from './Sales/QuickPasteModal';
import { ReuseDrawSelectionModal } from './Sales/ReuseDrawSelectionModal';
import { PullToRefresh } from './PullToRefresh';
import { buildDrawEntries, cloneDrawEntryMap, normalizeTicketDrawEntries } from '../utils/ticketUtils';

type InputTarget = 'number' | 'amount';
type GameMode = 'CHANCE' | 'PALÉ' | 'BILLETE';

import { auth } from '../firebase';

export const SalesPanel: React.FC = () => {
  const { 
    draws, 
    addTicket, 
    updateTicket,
    reusedTicket, 
    setReusedTicket, 
    editingTicket,
    setEditingTicket,
    nextTicketSequence, 
    incrementSequence,
    settings,
    currentUser,
    lastSelectedDrawId,
    setLastSelectedDrawId,
  } = useStore();

  const getOperationalSortMinutes = (draw: { closeTimeSort?: number; drawTimeSort?: number; drawTime?: string }) => {
    if (typeof draw.closeTimeSort === 'number') return draw.closeTimeSort;
    if (typeof draw.drawTimeSort === 'number') return draw.drawTimeSort;
    if (draw.drawTime) {
      const [h, m] = draw.drawTime.split(':').map(Number);
      if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m;
    }
    return Number.MAX_SAFE_INTEGER;
  };

  const sortDrawsOperationally = <T extends { name?: string; closeTimeSort?: number; drawTimeSort?: number; drawTime?: string }>(items: T[]) =>
    [...items].sort((a, b) => {
      const diff = getOperationalSortMinutes(a) - getOperationalSortMinutes(b);
      if (diff !== 0) return diff;
      return (a.name || '').localeCompare(b.name || '');
    });
  
  // Sort active draws by time and filter by closing time
  const activeDraws = useMemo(() => {
    const now = getCurrentTimeMinutes();
    // Hide all draws before 12:05 AM of the next day
    if (now < 5) return [];
    
    return sortDrawsOperationally(draws.filter(d => 
      d.isActive && 
      getDrawStatus(d) === 'open'
    ));
  }, [draws]);

  const [isReuseModalOpen, setIsReuseModalOpen] = useState(false);
  const [pendingReusedTicket, setPendingReusedTicket] = useState<Ticket | null>(null);

  const [selectedDrawIds, setSelectedDrawIds] = useState<string[]>(() => {
    if (lastSelectedDrawId && activeDraws.some((draw) => draw.id === lastSelectedDrawId)) {
      return [lastSelectedDrawId];
    }
    return activeDraws[0] ? [activeDraws[0].id] : [];
  });
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [isDrawListOpen, setIsDrawListOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isQuickPasteOpen, setIsQuickPasteOpen] = useState(false);
  const [isInverted, setIsInverted] = useState(false);

  const [gameMode, setGameMode] = useState<GameMode>('CHANCE');
  const [activeInput, setActiveInput] = useState<InputTarget>('number');
  
  const [numberInput, setNumberInput] = useState('');
  const [amountInput, setAmountInput] = useState('1');
  
  const [drawEntryMap, setDrawEntryMap] = useState<Record<string, Entry[]>>({});
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryDrawId, setEditingEntryDrawId] = useState<string | null>(null);
  const [showTicket, setShowTicket] = useState(false);
  const [lastTicket, setLastTicket] = useState<any>(null);
  const [prefilledCustomerName, setPrefilledCustomerName] = useState('');
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const saleSubmissionLockRef = useRef(false);

  const resetEntryState = () => {
    setDrawEntryMap({});
    setEditingEntryDrawId(null);
  };

  const sanitizeEntryForNewSale = (entry: Entry): Entry => ({
    id: generateId(),
    number: entry.number,
    amount: Number(entry.amount),
    pieces: Number(entry.pieces),
    type: entry.type,
    status: 'pending',
  });

  const getTargetDrawIds = (): string[] => {
    if (editingEntryId && editingEntryDrawId) return [editingEntryDrawId];
    if (isMultiMode) return selectedDrawIds;
    return selectedDrawIds[0] ? [selectedDrawIds[0]] : [];
  };

  const handleQuickPaste = (newEntries: Entry[]) => {
    const targetDrawIds = getTargetDrawIds();
    if (targetDrawIds.length === 0) return;

    setDrawEntryMap((prev) => {
      const next = { ...prev };

      targetDrawIds.forEach((drawId) => {
        const updated = [...(next[drawId] || [])];
        newEntries.forEach((entry) => {
          const existing = updated.find((item) => item.number === entry.number && item.type === entry.type);
          if (existing) {
            existing.pieces += entry.pieces;
            existing.amount = Number((existing.amount + entry.amount).toFixed(2));
          } else {
            updated.push({ ...entry, id: generateId() });
          }
        });
        next[drawId] = updated;
      });

      return next;
    });

    setIsQuickPasteOpen(false);
  };

  const getEntryTypeAbbr = (type: Entry['type']): 'CH' | 'PL' | 'BL' => {
    if (type === 'PALÉ') return 'PL';
    if (type === 'BILLETE') return 'BL';
    return 'CH';
  };

  const handleConfirmReuse = (drawIds: string[]) => {
    if (drawIds.length === 0 || !pendingReusedTicket) return;

    const normalizedGroups = normalizeTicketDrawEntries(pendingReusedTicket);
    const fallbackEntries = (normalizedGroups[0]?.entries || pendingReusedTicket.entries || []).map(sanitizeEntryForNewSale);

    setSelectedDrawIds(drawIds);
    setIsMultiMode(drawIds.length > 1);
    setPrefilledCustomerName('');
    setEditingEntryDrawId(null);
    setDrawEntryMap(
      drawIds.reduce<Record<string, Entry[]>>((acc, drawId) => {
        const matched = normalizedGroups.find((group) => group.drawId === drawId);
        acc[drawId] = (matched ? matched.entries : fallbackEntries).map(sanitizeEntryForNewSale);
        return acc;
      }, {})
    );

    setIsReuseModalOpen(false);
    setPendingReusedTicket(null);
  };

  // Handle ticket reuse
  React.useEffect(() => {
    if (reusedTicket) {
      setEditingTicket(null);
      setPendingReusedTicket(reusedTicket);
      setIsReuseModalOpen(true);
      setReusedTicket(null); // Clear after loading
    }
  }, [reusedTicket, setReusedTicket, setEditingTicket]);

  // Handle ticket editing
  React.useEffect(() => {
    if (editingTicket) {
      const normalizedGroups = normalizeTicketDrawEntries(editingTicket);
      const nextDrawIds = normalizedGroups.map((group) => group.drawId);

      setSelectedDrawIds(nextDrawIds);
      setIsMultiMode(nextDrawIds.length > 1);
      setPrefilledCustomerName(editingTicket.customerName);
      setDrawEntryMap(cloneDrawEntryMap(normalizedGroups));
      setEditingEntryDrawId(null);
    }
  }, [editingTicket]);

  // Ensure at least one draw is selected if available
  React.useEffect(() => {
    if (selectedDrawIds.length === 0 && activeDraws.length > 0) {
      setSelectedDrawIds([activeDraws[0].id]);
    }
  }, [activeDraws, selectedDrawIds]);

  // Keep selected draws in sync with currently open draws.
  React.useEffect(() => {
    const activeDrawIdSet = new Set(activeDraws.map((draw) => draw.id));

    setSelectedDrawIds((prev) => {
      const filtered = prev.filter((id) => activeDrawIdSet.has(id));
      if (filtered.length > 0) return filtered;
      if (lastSelectedDrawId && activeDrawIdSet.has(lastSelectedDrawId)) return [lastSelectedDrawId];
      return activeDraws[0] ? [activeDraws[0].id] : [];
    });
  }, [activeDraws, lastSelectedDrawId]);

  React.useEffect(() => {
    setLastSelectedDrawId(selectedDrawIds[0] || null);
  }, [selectedDrawIds, setLastSelectedDrawId]);

  const selectedDraws = useMemo(
    () => sortDrawsOperationally(activeDraws.filter((draw) => selectedDrawIds.includes(draw.id))),
    [activeDraws, selectedDrawIds]
  );

  const mainDraw = useMemo(() => selectedDraws[0], [selectedDraws]);

  // Handle input validation and game mode constraints
  React.useEffect(() => {
    if (!mainDraw) return;
    
    const maxDigits = gameMode === 'PALÉ' ? 4 : mainDraw.digitsMode;
    
    if (numberInput.length > maxDigits) {
      setNumberInput('');
      setActiveInput('number');
    }

    // Reset game mode if not allowed in new draw
    if (gameMode === 'PALÉ' && !mainDraw.allowedSpecialBets.pale) setGameMode('CHANCE');
    if (gameMode === 'BILLETE' && (mainDraw.digitsMode !== 4 || !mainDraw.allowedSpecialBets.billete)) setGameMode('CHANCE');
  }, [mainDraw, numberInput.length, gameMode]);

  const handleSetGameMode = (mode: GameMode) => {
    setGameMode(mode);
    setNumberInput('');
    setAmountInput('1');
    setActiveInput('number');
    setEditingEntryId(null);
  };

  const handleKeypadPress = (val: string) => {
    if (!mainDraw) return;
    
    const maxDigits = gameMode === 'CHANCE' ? 2 : (gameMode === 'PALÉ' ? 4 : mainDraw.digitsMode);

    if (activeInput === 'number') {
      if (numberInput.length < maxDigits) {
        const nextVal = numberInput + val;
        setNumberInput(nextVal);
        
        // Auto-switch to amount ONLY if we reached required digits
        if (nextVal.length === maxDigits) {
          setTimeout(() => {
            setActiveInput('amount');
            setAmountInput(''); // Clear default "1" when auto-switching
          }, 100);
        }
      }
    } else {
      // For amount/quantity, allow manual entry
      setAmountInput(prev => (prev === '0' || prev === '' ? val : prev + val));
    }
  };

  const handleBackspace = () => {
    if (activeInput === 'number') {
      setNumberInput(prev => prev.slice(0, -1));
    } else {
      setAmountInput(prev => (prev.length > 1 ? prev.slice(0, -1) : '1'));
    }
  };

  const handleReset = () => {
    setNumberInput('');
    setAmountInput('1');
    setActiveInput('number');
    setEditingEntryId(null);
    setEditingEntryDrawId(null);
  };

  const handleEditEntry = (entry: Entry) => {
    setEditingEntryId(entry.id || null);
    setNumberInput(entry.number);
    setAmountInput(entry.pieces.toString());
    setGameMode(entry.type);
    setActiveInput('amount');
  };

  const handleEditEntryForDraw = (drawId: string, entry: Entry) => {
    setEditingEntryDrawId(drawId);
    setSelectedDrawIds([drawId]);
    setIsMultiMode(false);
    handleEditEntry(entry);
  };

  const handleRemoveEntryForDraw = (drawId: string, entryId: string) => {
    setDrawEntryMap((prev) => ({
      ...prev,
      [drawId]: (prev[drawId] || []).filter((entry) => entry.id !== entryId),
    }));

    if (editingEntryId === entryId) handleReset();
  };

  const handleAddEntry = async () => {
    if (!mainDraw) return;
    
    const { settings } = useStore.getState();
    const paleSettings = settings.pale || { enabled: false, minAmount: 0, maxAmountPerPlay: 0, globalLimitPerCombination: 0 };

    // Validation for Palé
    if (gameMode === 'PALÉ') {
      if (!paleSettings.enabled) {
        alert('El Palé está desactivado actualmente.');
        return;
      }
      if (numberInput.length !== 4) {
        alert('El Palé requiere exactamente 2 números de 2 cifras (ej. 4578).');
        return;
      }
      const amount = parseFloat(amountInput);
      if (isNaN(amount) || amount < paleSettings.minAmount) {
        alert(`El monto mínimo para Palé es $${formatCurrency(paleSettings.minAmount)}.`);
        return;
      }
      if (amount > paleSettings.maxAmountPerPlay) {
        alert(`El monto máximo por jugada de Palé es $${formatCurrency(paleSettings.maxAmountPerPlay)}.`);
        return;
      }

      /* // If editing, release old limit first
      if (editingEntryId) {
        const oldEntry = entries.find(e => e.id === editingEntryId);
        if (oldEntry && oldEntry.type === 'PALÉ') {
          releasePaleLimit(oldEntry.number, oldEntry.amount);
        }
      }

      // Global Limit Check with Transaction
      const result = await checkAndReservePaleLimit(numberInput, amount, paleSettings.globalLimitPerCombination);
      if (!result.success) {
        // If it failed and we were editing, we should ideally restore the old limit, but it's complex.
        // For now, just alert.
        alert(result.message);
        return;
      } */

      const normalized = normalizePale(numberInput);
      const targetDrawIds = getTargetDrawIds();
      if (targetDrawIds.length === 0) return;

      setDrawEntryMap((prev) => {
        const next = { ...prev };
        targetDrawIds.forEach((drawId) => {
          const newEntries = [...(next[drawId] || [])];
          if (editingEntryId) {
            const idx = newEntries.findIndex((entry) => entry.id === editingEntryId);
            if (idx >= 0) {
              newEntries[idx] = { ...newEntries[idx], number: normalized, amount, pieces: amount, type: 'PALÉ' };
              next[drawId] = newEntries;
              return;
            }
          }

          const existingIndex = newEntries.findIndex((entry) => entry.number === normalized && entry.type === 'PALÉ');
          if (existingIndex >= 0) {
            newEntries[existingIndex].pieces += amount;
            newEntries[existingIndex].amount = Number(newEntries[existingIndex].pieces.toFixed(2));
          } else {
            newEntries.push({
              id: generateId(),
              number: normalized,
              amount,
              pieces: amount,
              type: 'PALÉ',
              status: 'pending',
            });
          }
          next[drawId] = newEntries;
        });
        return next;
      });
      handleReset();
      return;
    }

    // Validation for Billete
    if (gameMode === 'BILLETE') {
      const billeteSettings = settings.billete || { enabled: false, unitPrice: 1.00, globalLimitPerNumber: 0 };
      if (!billeteSettings.enabled) {
        alert('El Billete está desactivado actualmente.');
        return;
      }
      if (mainDraw.digitsMode !== 4) {
        alert('El Billete solo está disponible en sorteos de 4 cifras.');
        return;
      }
      if (numberInput.length !== 4) {
        alert('El Billete requiere un número de exactamente 4 cifras.');
        return;
      }
      
      const units = parseInt(amountInput, 10);
      if (isNaN(units) || units <= 0) {
        alert('Ingrese una cantidad vÃ¡lida de piezas.');
        return;
      }

      /* // If editing, release old limit first
      if (editingEntryId) {
        const oldEntry = entries.find(e => e.id === editingEntryId);
        if (oldEntry && oldEntry.type === 'BILLETE') {
          const oldUnits = Math.round(oldEntry.amount / billeteSettings.unitPrice);
          releaseBilleteLimit(oldEntry.number, oldUnits);
        }
      }

      // Global Limit Check with Transaction
      const result = await checkAndReserveBilleteLimit(numberInput, units, billeteSettings.globalLimitPerNumber);
      if (!result.success) {
        alert(result.message);
        return;
      } */

      const finalAmount = Number((units * billeteSettings.unitPrice).toFixed(2));

      const targetDrawIds = getTargetDrawIds();
      if (targetDrawIds.length === 0) return;

      setDrawEntryMap((prev) => {
        const next = { ...prev };
        targetDrawIds.forEach((drawId) => {
          const newEntries = [...(next[drawId] || [])];
          if (editingEntryId) {
            const idx = newEntries.findIndex((entry) => entry.id === editingEntryId);
            if (idx >= 0) {
              newEntries[idx] = { ...newEntries[idx], number: numberInput, amount: finalAmount, pieces: units, type: 'BILLETE' };
              next[drawId] = newEntries;
              return;
            }
          }

          const existingIndex = newEntries.findIndex((entry) => entry.number === numberInput && entry.type === 'BILLETE');
          if (existingIndex >= 0) {
            newEntries[existingIndex].pieces += units;
            newEntries[existingIndex].amount = Number((newEntries[existingIndex].pieces * billeteSettings.unitPrice).toFixed(2));
          } else {
            newEntries.push({
              id: generateId(),
              number: numberInput,
              amount: finalAmount,
              pieces: units,
              type: 'BILLETE',
              status: 'pending',
            });
          }
          next[drawId] = newEntries;
        });
        return next;
      });
      handleReset();
      return;
    }

    const requiredDigits = gameMode === 'CHANCE' ? 2 : mainDraw.digitsMode;
    if (numberInput.length !== requiredDigits || !amountInput) return;
    
    const number = numberInput;
    const units = parseInt(amountInput, 10);

    if (isNaN(units) || units <= 0) return;

    const pricePerUnit = settings.pricePerTime || 1;
    const amount = Number((units * pricePerUnit).toFixed(2));

    const targetDrawIds = getTargetDrawIds();
    if (targetDrawIds.length === 0) return;

    setDrawEntryMap((prev) => {
      const next = { ...prev };
      targetDrawIds.forEach((drawId) => {
        const newEntries = [...(next[drawId] || [])];
        if (editingEntryId) {
          const idx = newEntries.findIndex((entry) => entry.id === editingEntryId);
          if (idx >= 0) {
            newEntries[idx] = { ...newEntries[idx], number, amount, pieces: units, type: gameMode as any };
            next[drawId] = newEntries;
            return;
          }
        }

        const existingIndex = newEntries.findIndex((entry) => entry.number === number && entry.type === gameMode);
        if (existingIndex >= 0) {
          newEntries[existingIndex].pieces += units;
          newEntries[existingIndex].amount = Number((newEntries[existingIndex].pieces * pricePerUnit).toFixed(2));
        } else {
          newEntries.push({
            id: generateId(),
            number,
            amount,
            pieces: units,
            type: gameMode as any,
            status: 'pending',
          });
        }
        next[drawId] = newEntries;
      });
      return next;
    });

    handleReset();
  };

  const previewGroups = useMemo(() => {
    return sortDrawsOperationally(
      draws.filter((draw) => (drawEntryMap[draw.id] || []).length > 0)
    ).map((draw) => {
      const groupEntries = drawEntryMap[draw.id] || [];
      const subtotalCents = groupEntries.reduce((sum, entry) => sum + toCents(entry.amount), 0);
      return {
        drawId: draw.id,
        drawName: draw.name,
        entries: groupEntries,
        subtotal: fromCents(subtotalCents),
      };
    });
  }, [draws, drawEntryMap]);

  const totalAmount = useMemo(
    () => fromCents(previewGroups.reduce((sum, group) => sum + toCents(group.subtotal), 0)),
    [previewGroups]
  );

  const hasEntries = previewGroups.length > 0;

  const totalLinesInCart = previewGroups.reduce((sum, group) => sum + group.entries.length, 0);

  const handleOpenCustomerModal = () => {
    if (!hasEntries) return;
    setIsCustomerModalOpen(true);
  };

  const handleCancelPlay = () => {
    resetEntryState();
    handleReset();
    setEditingEntryId(null);
  };

  const handleGenerateTicket = async (customerName: string) => {
    if (isProcessingSale || saleSubmissionLockRef.current) return;

    saleSubmissionLockRef.current = true;
    setIsProcessingSale(true);

    try {
      const { settings } = useStore.getState();
      const activeDrawIdSet = new Set(activeDraws.map((draw) => draw.id));
      const drawIdsInCart = Object.keys(drawEntryMap).filter((drawId) => (drawEntryMap[drawId] || []).length > 0);
      const validDrawIds = drawIdsInCart.filter((id) => activeDrawIdSet.has(id));

      if (validDrawIds.length === 0) {
        alert('El sorteo seleccionado ya cerró. Selecciona un sorteo abierto para continuar.');
        return;
      }

      const allDrawNames = validDrawIds.map((id) => draws.find((d) => d.id === id)?.name || '');
      const entryMap = validDrawIds.reduce<Record<string, Entry[]>>((acc, drawId) => {
        acc[drawId] = (drawEntryMap[drawId] || []).map((entry) => sanitizeEntryForNewSale(entry));
        return acc;
      }, {});
      const drawEntries = buildDrawEntries(validDrawIds, allDrawNames, entryMap);
      const total = Number(drawEntries.reduce((sum, group) => sum + group.subtotal, 0).toFixed(2));
      const rate = currentUser?.commission ?? settings.commissionRate;
      const commission = Number((total * rate).toFixed(2));

      if (editingTicket) {
        const fallbackCustomerName = getCustomerDisplayName(
          editingTicket.customerName,
          editingTicket.sequenceNumber,
          editingTicket.id
        );

        const updatedTicket: Partial<Ticket> = {
          drawIds: validDrawIds,
          drawNames: allDrawNames,
          drawEntries,
          entries: drawEntries.flatMap((group) => group.entries.map((entry) => ({ ...entry }))),
          total,
          commission,
          commissionRateApplied: rate,
          customerName: customerName.trim() || fallbackCustomerName,
        };

        try {
          const persistedUpdatedTicket = await updateTicket(editingTicket.id, updatedTicket);

          setLastTicket(persistedUpdatedTicket);
          setShowTicket(true);
          setEditingTicket(null);
          resetEntryState();
          setPrefilledCustomerName('');
          setIsCustomerModalOpen(false);
        } catch (error) {
          console.error('Ticket update failed', error);
          alert('La edición no se guardó. El ticket no fue actualizado.');
        }

        return;
      } else {
        const finalCustomerName = customerName.trim() || getCustomerDisplayName('', nextTicketSequence);

        const newTicket: Ticket = {
          id: generateId(),
          drawIds: validDrawIds,
          drawNames: allDrawNames,
          drawEntries,
          entries: drawEntries.flatMap((group) => group.entries.map((entry) => ({ ...entry }))),
          total,
          commission,
          commissionRateApplied: rate,
          timestamp: Date.now(),
          customerName: finalCustomerName,
          sequenceNumber: nextTicketSequence,
          sellerName: auth.currentUser?.displayName || 'Vendedor',
        };

        try {
          const finalTicket = await addTicket(newTicket);
          
          setLastTicket(finalTicket);
          setShowTicket(true);
          incrementSequence();
          resetEntryState();
          setPrefilledCustomerName('');
          setIsCustomerModalOpen(false);
        } catch (error) {
          console.error('Ticket save failed', error);
          alert('La venta no se guardó. El ticket no fue registrado.');
        }

        return;
      }
    } finally {
      saleSubmissionLockRef.current = false;
      setIsProcessingSale(false);
    }
  };

  const toggleDrawSelection = (id: string) => {
    if (isMultiMode) {
      setSelectedDrawIds(prev => {
        if (prev.includes(id)) {
          if (prev.length === 1) return prev; // Keep at least one
          return prev.filter(dId => dId !== id);
        }
        return [...prev, id];
      });
    } else {
      setSelectedDrawIds([id]);
      setIsDrawListOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-bg text-white select-none">
      <PullToRefresh 
        onRefresh={async () => { window.location.reload(); }}
        className={cn("flex-1 px-3 py-3.5 space-y-3.5", hasEntries ? "pb-40" : "pb-24")}
      >
        {/* Sorteo Activo Card */}
        <div className="relative z-50">
          <div 
            className={cn(
              "bg-card-bg rounded-xl p-3 flex items-center justify-between border border-white/5 shadow-lg transition-all active:scale-[0.99]",
              isDrawListOpen && "rounded-b-none border-b-transparent"
            )}
            onClick={() => setIsDrawListOpen(!isDrawListOpen)}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-brand-primary/20 text-brand-strong rounded-lg flex items-center justify-center">
                <Calendar size={16} />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Sorteo Activo</p>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[13px]">
                    {isMultiMode
                      ? `${selectedDrawIds.length} Sorteos Seleccionados`
                      : `${mainDraw?.name || 'Seleccione Sorteo'} ${mainDraw ? formatAMPM(mainDraw.drawTime) : ''}`}
                  </span>
                  <motion.div animate={{ rotate: isDrawListOpen ? 180 : 0 }}>
                    <ChevronDown size={14} className="text-slate-500" />
                  </motion.div>
                </div>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsMultiMode((prev) => {
                  const next = !prev;
                  if (next) {
                    setIsDrawListOpen(true);
                    return next;
                  }

                  setSelectedDrawIds((current) => (current[0] ? [current[0]] : current));
                  setIsDrawListOpen(false);
                  return next;
                });
              }}
              className={cn(
                "px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter border transition-all",
                isMultiMode 
                  ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20" 
                  : "bg-slate-800 text-slate-400 border-white/5"
              )}
            >
              Multi
            </button>
          </div>

        <AnimatePresence>
          {isDrawListOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 bg-card-bg border-x border-b border-white/5 rounded-b-xl shadow-2xl overflow-hidden"
              >
                <div className="max-h-[200px] overflow-y-auto divide-y divide-white/5">
                  {activeDraws.map((draw) => (
                    <div 
                      key={draw.id}
                      onClick={() => toggleDrawSelection(draw.id)}
                      className={cn(
                        "p-3 flex items-center justify-between active:bg-white/5 transition-colors cursor-pointer",
                        selectedDrawIds.includes(draw.id) && "bg-brand-primary/10"
                      )}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{draw.name}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{formatAMPM(draw.drawTime)}</span>
                      </div>
                      {selectedDrawIds.includes(draw.id) && (
                        <div className="w-5 h-5 bg-brand-primary rounded-full flex items-center justify-center shadow-lg shadow-brand-primary/20">
                          <Check size={12} className="text-white" strokeWidth={4} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
          )}
        </AnimatePresence>

        {isMultiMode && selectedDrawIds.length > 1 && (
          <div className="bg-card-bg rounded-xl p-2 border border-white/5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              Se copiara la jugada en los sorteos seleccionados
            </p>
          </div>
        )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 bg-card-bg p-1 rounded-lg border border-white/5 h-11">
          <button 
            onClick={() => handleSetGameMode('CHANCE')}
            className={cn(
              "flex-1 rounded-md font-bold text-[11px] transition-all",
              gameMode === 'CHANCE' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-slate-500"
            )}
          >
            CHANCE
          </button>
          
          <div className="flex-1 flex gap-1 bg-white/5 p-0.5 rounded-md">
            {mainDraw?.allowedSpecialBets.pale && (
              <button 
                onClick={() => handleSetGameMode('PALÉ')}
                className={cn(
                  "flex-1 rounded-md font-bold text-[9px] transition-all",
                  gameMode === 'PALÉ' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-slate-500"
                )}
              >
                PALÉ
              </button>
            )}
            {mainDraw?.digitsMode === 4 && mainDraw?.allowedSpecialBets.billete && (
              <button 
                onClick={() => handleSetGameMode('BILLETE')}
                className={cn(
                  "flex-1 rounded-md font-bold text-[9px] transition-all",
                  gameMode === 'BILLETE' ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-slate-500"
                )}
              >
                BILLETE
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 my-1">
          <button 
            onClick={() => setActiveInput('number')}
            className={cn(
              "bg-card-bg rounded-xl h-[80px] flex flex-col items-center justify-center border-2 transition-all relative overflow-hidden",
              activeInput === 'number' ? "border-brand-primary bg-brand-primary/5" : "border-transparent"
            )}
          >
            <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Número</p>
            <p className="text-2xl font-black tracking-widest leading-none">
              {gameMode === 'PALÉ' ? (
                numberInput ? (
                  <>
                    {numberInput.substring(0, 2)}
                    {numberInput.length > 2 && <span className="text-brand-primary mx-0.5">-</span>}
                    {numberInput.substring(2)}
                  </>
                ) : '----'
              ) : (
                numberInput || (mainDraw?.digitsMode === 4 ? '----' : '--')
              )}
            </p>
          </button>
          <div 
            className={cn(
              "bg-card-bg rounded-xl h-[80px] flex flex-col items-center justify-center border-2 transition-all relative",
              activeInput === 'amount' ? "border-brand-primary bg-brand-primary/5" : "border-transparent"
            )}
            onClick={() => {
              setActiveInput('amount');
              if (amountInput === '1') setAmountInput('');
            }}
          >
            <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5">Cantidad</p>
            <p className="text-2xl font-black leading-none text-center">
              {amountInput || '0'}
            </p>
            <p className="text-[8px] text-slate-500 mt-0.5 font-medium tracking-tighter">
              ${formatCurrency( (parseInt(amountInput, 10) || 0) * (settings.pricePerTime || 1) )}
            </p>
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 px-1 mt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button key={n} onClick={() => handleKeypadPress(n.toString())} className="keypad-button">
              {n}
            </button>
          ))}
          <button onClick={() => handleKeypadPress('.')} className="keypad-button">.</button>
          <button onClick={() => handleKeypadPress('0')} className="keypad-button">0</button>
          <button onClick={handleBackspace} className="keypad-button text-brand-primary">
            <Delete size={20} />
          </button>
        </div>

        {/* Reset Button */}
        <div className="flex justify-center py-1">
          <button onClick={handleReset} className="text-slate-600 active:rotate-180 transition-transform duration-500">
            <RotateCcw size={20} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className={cn("space-y-2.5", hasEntries ? "pb-24" : "pb-2")}>
          <button 
            onClick={handleAddEntry}
            disabled={!numberInput}
            className={cn(
              "w-full h-13 rounded-xl font-black text-[13px] flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg",
              numberInput ? "bg-brand-primary text-white shadow-brand-primary/20" : "bg-slate-800 text-slate-600",
              editingEntryId && "bg-brand-strong"
            )}
          >
            {editingEntryId ? <Check size={18} strokeWidth={3} /> : <Plus size={18} strokeWidth={3} />}
            {editingEntryId ? 'GUARDAR CAMBIOS' : 'AGREGAR AL TICKET'}
          </button>

          {/* Cart List Section */}
          <AnimatePresence>
            {hasEntries && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2 mt-4"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {selectedDrawIds.length > 1 ? 'Jugadas por Sorteo' : 'Jugadas en Carrito'}
                  </span>
                  <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{totalLinesInCart} Líneas</span>
                </div>
                <div className="space-y-2 max-h-[230px] overflow-y-auto no-scrollbar pb-2">
                  {previewGroups.map((group) => (
                    <div key={group.drawId} className="bg-card-bg border border-white/5 rounded-lg p-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-wide">{group.drawName}</span>
                        <span className="text-[10px] font-black text-brand-primary">${formatCurrency(group.subtotal)}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {group.entries.map((entry) => (
                          <div
                            key={`${group.drawId}-${entry.id}`}
                            onClick={() => handleEditEntryForDraw(group.drawId, entry)}
                            className={cn("min-w-[74px] py-0.5 transition-all active:scale-[0.98] cursor-pointer", editingEntryId === entry.id && "text-brand-primary")}
                          >
                            <div className="flex items-center gap-1">
                              <p className="text-[12px] font-bold text-white leading-none tracking-wide">
                                {formatPlayNumberForDisplay(entry.number, entry.type)}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveEntryForDraw(group.drawId, entry.id!);
                                }}
                                className="text-slate-500 hover:text-red-400 transition-colors"
                              >
                                <Delete size={9} />
                              </button>
                            </div>
                            <p className="text-[9px] text-slate-400 leading-none mt-0.5">
                              x{entry.pieces} <span className="text-brand-primary font-semibold">${formatCurrency(entry.amount)}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setIsQuickPasteOpen(true)}
            className="w-full h-11 rounded-xl bg-card-bg border border-white/5 font-bold text-[10px] text-slate-500 flex items-center justify-center gap-2 active:bg-slate-800"
          >
            <Zap size={14} className="text-brand-glow" />
            PEGADO RÁPIDO
          </button>
          {hasEntries && (
            <button
              onClick={handleCancelPlay}
              className="w-full h-11 rounded-xl bg-red-500/10 border border-red-400/25 text-red-300 font-black text-[10px] uppercase tracking-widest active:scale-[0.98] transition-all"
            >
              CANCELAR JUGADA
            </button>
          )}
        </div>
      </PullToRefresh>

      {/* Floating Ticket Summary */}
      {hasEntries && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-16 left-3 right-3 bg-brand-primary p-3 rounded-xl shadow-2xl flex items-center justify-between z-40 max-w-[376px] mx-auto"
        >
          <div className="flex items-center gap-2.5">
            <div className="bg-white/20 p-1.5 rounded-lg">
              <TicketIcon size={18} />
            </div>
            <div>
              <p className="text-[8px] font-bold opacity-80 uppercase tracking-tighter">Total Acumulado</p>
              <p className="text-base font-black leading-none">${formatCurrency(totalAmount)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editingTicket && (
              <button 
                onClick={() => {
                  setEditingTicket(null);
                  resetEntryState();
                  setPrefilledCustomerName('');
                }}
                className="bg-white/20 text-white px-3 py-1.5 rounded-lg font-black text-[11px] active:scale-95 transition-transform"
              >
                CANCELAR
              </button>
            )}
            <button 
              onClick={handleOpenCustomerModal}
              disabled={selectedDrawIds.length === 0 || isProcessingSale}
              className={cn(
                "bg-white text-brand-primary px-4 py-1.5 rounded-lg font-black text-[11px] shadow-lg active:scale-95 transition-transform",
                (selectedDrawIds.length === 0 || isProcessingSale) && "opacity-50 cursor-not-allowed"
              )}
            >
              {isProcessingSale ? 'PROCESANDO...' : editingTicket ? 'ACTUALIZAR' : 'VENDER'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Quick Paste Modal */}
      <QuickPasteModal 
        isOpen={isQuickPasteOpen}
        onClose={() => setIsQuickPasteOpen(false)}
        onConfirm={handleQuickPaste}
        gameMode={gameMode}
        isInverted={isInverted}
        setIsInverted={setIsInverted}
      />

      {/* Reuse Draw Selection Modal */}
      <ReuseDrawSelectionModal 
        isOpen={isReuseModalOpen}
        onClose={() => {
          setIsReuseModalOpen(false);
          setPendingReusedTicket(null);
        }}
        onConfirm={handleConfirmReuse}
        activeDraws={activeDraws}
      />

      {/* Customer Modal */}
      <SaleCustomerModal 
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onConfirm={handleGenerateTicket}
        isSubmitting={isProcessingSale}
        initialName={prefilledCustomerName}
        previewGroups={previewGroups}
        totalAmount={totalAmount}
        isEditing={!!editingTicket}
      />

      {/* Ticket Modal */}
      {showTicket && lastTicket && (
        <TicketModal 
          ticket={lastTicket} 
          onClose={() => setShowTicket(false)} 
        />
      )}
    </div>
  );
};




