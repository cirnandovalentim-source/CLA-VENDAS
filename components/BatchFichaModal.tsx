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
    }
  }, [isOpen]);

  const loadInstallmentsForSale = async (saleId: string) => {
    if (!allInstallments[saleId]) {
      const insts = await dataService.getInstallmentsBySale(saleId);
      setAllInstallments(prev => ({...prev, [saleId]: insts}));
    }
  };

  const handleSelectSale = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const saleId = e.target.value;
    if (saleId && !selectedSales.includes(saleId) && selectedSales.length < 4) {
      setSelectedSales([...selectedSales, saleId]);
      loadInstallmentsForSale(saleId);
    }
    e.target.value = '';
  };

  const removeSale = (saleId: string) => {
    setSelectedSales(selectedSales.filter(id => id !== saleId));
  };

  const handlePrint = async () => {
    if (selectedSales.length === 0) return;
    setIsGenerating(true);
    try {
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const positions = [
            { x: 10, y: 10 },
            { x: 110, y: 10 },
            { x: 10, y: 140 },
            { x: 110, y: 140 }
        ];

        for (let i = 0; i < selectedSales.length; i++) {
            const sid = selectedSales[i];
            const el = document.getElementById(`batch-ficha-${sid}`);
            if (el) {
                const canvas = await html2canvas(el, { scale: 4, useCORS: true, logging: false, backgroundColor: "#ffffff" });
                const imgData = canvas.toDataURL('image/png');
                pdf.addImage(imgData, 'PNG', positions[i].x, positions[i].y, 90, 120);
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
      <div className="flex flex-col items-center">
        
        {/* Hidden Container for rendering */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
            {selectedSales.map(sid => {
                const s = allSales.find(x => x.id === sid);
                const c = s ? allClients[s.cliente_id] : null;
                const insts = allInstallments[sid] || [];
                if (s && c) {
                    return <FichaContent key={sid} id={`batch-ficha-${sid}`} client={c} sale={s} installments={insts} />
                }
                return null;
            })}
        </div>

        {loading ? (
            <p className="py-10 text-gray-500">Carregando dados...</p>
        ) : (
            <div className="w-full text-left">
                <p className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Selecione até 4 clientes/vendas para imprimir em uma folha A4. ({selectedSales.length}/4)
                </p>
                {selectedSales.length < 4 && (
                    <select className="w-full text-sm p-3 rounded border border-gray-300 dark:border-[#444] bg-white dark:bg-[#1E1E1E]" onChange={handleSelectSale} defaultValue="">
                        <option value="" disabled>Selecione uma venda para adicionar...</option>
                        {allSales.filter(s => !selectedSales.includes(s.id)).map(s => (
                            <option key={s.id} value={s.id}>{s.cliente_nome} - {s.descricao}</option>
                        ))}
                    </select>
                )}
                
                {selectedSales.length > 0 ? (
                    <ul className="mt-4 space-y-2">
                        {selectedSales.map((sid, idx) => {
                            const s = allSales.find(x => x.id === sid);
                            return (
                                <li key={sid} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-[#252525] p-3 rounded border border-gray-200 dark:border-[#444]">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-500 w-5">{idx + 1}.</span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{s?.cliente_nome}</span>
                                        <span className="text-gray-500 text-xs">({s?.descricao})</span>
                                    </div>
                                    <button onClick={() => removeSale(sid)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 p-1 rounded font-bold px-2 transition-colors">
                                        Remover
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                ) : (
                    <div className="mt-4 p-8 text-center border-2 border-dashed border-gray-300 dark:border-[#444] rounded text-gray-500 text-sm">
                        Nenhuma venda selecionada ainda.
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
