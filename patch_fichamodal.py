import os

code = """import React, { useState } from 'react';
import { Modal, Button } from './ui';
import { Client, Sale, Installment } from '../types';
import { ICONS } from '../constants';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FichaContent } from './FichaContent';

interface FichaModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  sale: Sale | null;
  installments: Installment[];
}

export const FichaModal: React.FC<FichaModalProps> = ({ 
    isOpen, onClose, client, sale, installments 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen || !sale) return null;

  const handlePrint = async () => {
    setIsGenerating(true);
    try {
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const elPrimary = document.getElementById('ficha-content-primary');
        if (elPrimary) {
            // scale: 4 for better quality
            const canvas = await html2canvas(elPrimary, { scale: 4, useCORS: true, logging: false, backgroundColor: "#ffffff" });
            const imgData = canvas.toDataURL('image/png');
            pdf.addImage(imgData, 'PNG', 10, 10, 90, 120);
        }

        pdf.save(`Ficha_${client.nome.replace(/\\s+/g, '_')}.pdf`);
    } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Não foi possível gerar o PDF da ficha.");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Imprimir Ficha do Cliente">
      <div className="flex flex-col items-center">
        
        {/* Visible preview of the Ficha */}
        <FichaContent id="ficha-content-primary" client={client} sale={sale} installments={installments} />

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
"""

with open('components/FichaModal.tsx', 'w') as f:
    f.write(code)
