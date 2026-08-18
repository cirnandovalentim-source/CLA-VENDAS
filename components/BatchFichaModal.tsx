import React, { useState, useEffect } from 'react';
import { Modal, Button } from './ui';
import { Client, Sale, Installment } from '../types';
import { ICONS } from '../constants';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FichaContent } from './FichaContent';
import { dataService } from '../services/mockSupabase';

interface BatchFichaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BatchFichaModal: React.FC<BatchFichaModalProps> = ({ isOpen, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [allSales, setAllSales] = useState<Sale[]>([]);
  const [allClients, setAllClients] = useState<Record<string, Client>>({});
  const [allInstallments, setAllInstallments] = useState<Record<string, Installment[]>>({});
  
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const load = async () => {
        setLoading(true);
        const salesData = await dataService.getSales();
        setAllSales(salesData);
        const clientsList = await dataService.getClients();
        const clientsMap: Record<string, Client> = {};
        for(const c of clientsList) {
          clientsMap[c.id] = c;
        }
        setAllClients(clientsMap);
        setLoading(false);
      };
      load();
    } else {
        setSelectedSales([]); // reset on close
        setSearchQuery('');
        setShowDropdown(false);
    }
  }, [isOpen]);

  const loadInstallmentsForSale = async (saleId: string) => {
    if (!allInstallments[saleId]) {
      const insts = await dataService.getInstallmentsBySale(saleId);
      setAllInstallments(prev => ({...prev, [saleId]: insts}));
    }
  };

  const addSale = (saleId: string) => {
    if (saleId && !selectedSales.includes(saleId) && selectedSales.length < 4) {
      setSelectedSales(prev => [...prev, saleId]);
      loadInstallmentsForSale(saleId);
      setSearchQuery('');
      setShowDropdown(false);
    }
  };

  const removeSale = (saleId: string) => {
    setSelectedSales(selectedSales.filter(id => id !== saleId));
  };

  const filteredSales = allSales.filter(s => {
    if (selectedSales.includes(s.id)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = s.cliente_nome ? s.cliente_nome.toLowerCase().includes(q) : false;
    const descMatch = s.descricao ? s.descricao.toLowerCase().includes(q) : false;
    return nameMatch || descMatch;
  });

  const handlePrint = async () => {
    if (selectedSales.length === 0) return;
    setIsGenerating(true);
    try {
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // 85mm x 125mm centered grid on A4 (210mm x 297mm)
        const positions = [
            { x: 12.5, y: 15 },
            { x: 112.5, y: 15 },
            { x: 12.5, y: 152 },
            { x: 112.5, y: 152 }
        ];

        for (let i = 0; i < selectedSales.length; i++) {
            const sid = selectedSales[i];
            const el = document.getElementById(`batch-ficha-print-${sid}`);
            if (el) {
                const canvas = await html2canvas(el, { 
                    scale: 3, 
                    useCORS: true, 
                    logging: false, 
                    backgroundColor: "#ffffff",
                    scrollX: 0,
                    scrollY: 0,
                    onclone: (clonedDoc) => {
                        const clonedEl = clonedDoc.getElementById(`batch-ficha-print-${sid}`);
                        if (clonedEl) {
                            clonedEl.style.position = 'static';
                            clonedEl.style.margin = '0';
                        }
                    }
                });
                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', positions[i].x, positions[i].y, 85, 125);
            }
        }
        
        pdf.save('Fichas_Lote.pdf');
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Não foi possível gerar o PDF das fichas.");
    } finally {
        setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Imprimir Fichas em Lote (4 por página)">
      <div className="flex flex-col items-center w-full">
        {/* Offscreen print elements container */}
        <div style={{ position: 'absolute', left: '-9999px', top: '0', pointerEvents: 'none', width: '700px' }}>
            {selectedSales.map(sid => {
                const s = allSales.find(x => x.id === sid);
                const c = s ? allClients[s.cliente_id] : null;
                const insts = allInstallments[sid] || [];
                if (s && c) {
                    return <FichaContent key={sid} id={`batch-ficha-print-${sid}`} client={c} sale={s} installments={insts} />;
                }
                return null;
            })}
        </div>
        
        {loading ? (
            <p className="py-10 text-gray-500">Carregando dados...</p>
        ) : (
            <div className="w-full text-left space-y-4">
                <div>
                    <p className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        Selecione até 4 clientes/vendas para imprimir em uma folha A4. ({selectedSales.length}/4)
                    </p>
                    {selectedSales.length < 4 && (
                      <div className="relative">
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            className="w-full text-sm p-3 pr-10 rounded-lg border border-gray-300 dark:border-[#444] bg-white dark:bg-[#1E1E1E] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#EA580C] focus:outline-none shadow-sm"
                            placeholder="Digite o nome do cliente ou venda para buscar..."
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && filteredSales.length > 0) {
                                e.preventDefault();
                                addSale(filteredSales[0].id);
                              }
                            }}
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setShowDropdown(false);
                              }}
                              className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold bg-gray-200 dark:bg-[#333] rounded-full w-5 h-5 flex items-center justify-center"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Search Suggestions Dropdown */}
                        {showDropdown && (
                          <>
                            {/* Backdrop to close dropdown on click outside */}
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setShowDropdown(false)} 
                            />
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#444] rounded-lg shadow-xl max-h-56 overflow-y-auto z-50 divide-y divide-gray-100 dark:divide-[#333]">
                              {filteredSales.length > 0 ? (
                                filteredSales.map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => addSale(s.id)}
                                    className="w-full text-left px-3.5 py-2.5 hover:bg-orange-50 dark:hover:bg-[#333] flex flex-col transition-colors cursor-pointer"
                                  >
                                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                                      {s.cliente_nome}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                      {s.descricao} • R$ {s.valor_total.toFixed(2)}
                                    </span>
                                  </button>
                                ))
                              ) : (
                                <div className="p-3 text-xs text-center text-gray-500">
                                  {searchQuery ? 'Nenhum cliente ou venda encontrado com este nome.' : 'Todas as vendas já foram adicionadas.'}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    
                    {selectedSales.length > 0 && (
                        <ul className="mt-3 space-y-2">
                            {selectedSales.map((sid, idx) => {
                                const s = allSales.find(x => x.id === sid);
                                return (
                                    <li key={sid} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-[#252525] p-2.5 rounded border border-gray-200 dark:border-[#444]">
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="font-bold text-gray-500 w-5">{idx + 1}.</span>
                                            <span className="font-semibold text-gray-800 dark:text-gray-200">{s?.cliente_nome}</span>
                                            <span className="text-gray-500 text-xs truncate">({s?.descricao})</span>
                                        </div>
                                        <button onClick={() => removeSale(sid)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 p-1 rounded font-bold px-2 text-xs transition-colors flex-shrink-0">
                                            Remover
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

                {/* VISUAL PREVIEW AREA */}
                {selectedSales.length > 0 ? (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                Pré-visualização das Fichas Selecionadas
                            </span>
                            <span className="text-[11px] text-gray-500">
                                Confira as informações antes de gerar o PDF
                            </span>
                        </div>
                        <div className="bg-zinc-200 dark:bg-[#1a1a1a] p-4 rounded-lg border border-zinc-300 dark:border-[#444] max-h-[50vh] overflow-auto shadow-inner flex flex-wrap gap-4 justify-center">
                            {selectedSales.map(sid => {
                                const s = allSales.find(x => x.id === sid);
                                const c = s ? allClients[s.cliente_id] : null;
                                const insts = allInstallments[sid] || [];
                                if (s && c) {
                                    return (
                                        <div key={sid} className="bg-white rounded shadow border border-zinc-300 p-1 flex justify-center">
                                            <FichaContent id={`batch-ficha-${sid}`} client={c} sale={s} installments={insts} />
                                        </div>
                                    );
                                }
                                return null;
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="p-8 text-center border-2 border-dashed border-gray-300 dark:border-[#444] rounded text-gray-500 text-sm">
                        Nenhuma venda selecionada ainda. Adicione vendas para pré-visualizar as fichas.
                    </div>
                )}
            </div>
        )}

        <div className="mt-6 flex justify-end gap-3 w-full">
            <Button variant="secondary" onClick={onClose} disabled={isGenerating}>Cancelar</Button>
            <Button variant="primary" onClick={handlePrint} disabled={isGenerating || selectedSales.length === 0} className="flex items-center gap-2">
              {isGenerating ? 'Gerando...' : <>{ICONS.Printer} Imprimir {selectedSales.length} Ficha{selectedSales.length !== 1 ? 's' : ''}</>}
            </Button>
        </div>
      </div>
    </Modal>
  );
};
