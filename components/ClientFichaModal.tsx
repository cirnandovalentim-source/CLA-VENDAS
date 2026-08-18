import React, { useState } from 'react';
import { Modal, Button } from './ui';
import { Client, Sale, Installment } from '../types';
import { ICONS } from '../constants';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ClientFichaContent } from './ClientFichaContent';

interface ClientFichaModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  sales: Sale[];
  installments: Installment[];
}

export const ClientFichaModal: React.FC<ClientFichaModalProps> = ({ 
    isOpen, onClose, client, sales, installments 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handlePrint = async () => {
    setIsGenerating(true);
    try {
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const elPrint = document.getElementById('client-ficha-content-print');
        if (elPrint) {
            const canvas = await html2canvas(elPrint, { 
                scale: 3, 
                useCORS: true, 
                logging: false, 
                backgroundColor: "#ffffff",
                scrollX: 0,
                scrollY: 0,
                onclone: (clonedDoc) => {
                    const clonedEl = clonedDoc.getElementById('client-ficha-content-print');
                    if (clonedEl) {
                        clonedEl.style.position = 'static';
                        clonedEl.style.margin = '0';
                    }
                }
            });
            const imgData = canvas.toDataURL('image/png');
            
            // Centralize the 13x18cm ficha on A4
            // A4 width: 210mm, Ficha width: 130mm -> margin: (210-130)/2 = 40mm
            pdf.addImage(imgData, 'PNG', 40, 20, 130, 180);
        }

        pdf.save(`Ficha_${client.nome.replace(/\s+/g, '_')}_Completa.pdf`);
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Não foi possível gerar o PDF da ficha.");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Imprimir Ficha Completa">
      <div className="flex flex-col items-center w-full">
        {/* Dedicated Offscreen Element for Pristine PDF Capture */}
        <div style={{ position: 'absolute', left: '-9999px', top: '0', pointerEvents: 'none', width: '491px', height: '680px', overflow: 'hidden' }}>
          <ClientFichaContent id="client-ficha-content-print" client={client} sales={sales} installments={installments} />
        </div>
        <div className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-2.5 rounded-lg border border-blue-200 dark:border-blue-800/40 mb-4 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
            <span>Confira as informações da ficha no quadro abaixo antes de imprimir o PDF.</span>
        </div>
        
        {/* Visible preview of the Ficha */}
        <div className="bg-zinc-200 dark:bg-[#1a1a1a] p-4 rounded-lg border border-zinc-300 dark:border-[#444] max-h-[60vh] overflow-auto shadow-inner flex justify-center w-full">
          <ClientFichaContent id="client-ficha-content" client={client} sales={sales} installments={installments} />
        </div>

        <div className="mt-6 flex justify-end gap-3 w-full">
            <Button variant="secondary" onClick={onClose} disabled={isGenerating}>Cancelar</Button>
            <Button variant="primary" onClick={handlePrint} disabled={isGenerating} className="flex items-center gap-2">
              {isGenerating ? 'Gerando...' : <>{ICONS.Printer} Imprimir PDF</>}
            </Button>
        </div>
      </div>
    </Modal>
  );
};
