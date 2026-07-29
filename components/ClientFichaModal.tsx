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

        const elPrimary = document.getElementById('client-ficha-content');
        if (elPrimary) {
            // scale: 4 for high quality
            const canvas = await html2canvas(elPrimary, { scale: 4, useCORS: true, logging: false, backgroundColor: "#ffffff" });
            const imgData = canvas.toDataURL('image/png');
            
            // Centralize the 14x19cm ficha on A4
            // A4 width: 210mm, Ficha width: 140mm -> margin: (210-140)/2 = 35mm
            // A4 height: 297mm, Ficha height: 190mm -> margin: (297-190)/2 = 53.5mm
            pdf.addImage(imgData, 'PNG', 35, 20, 140, 190);
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
      <div className="flex flex-col items-center">
        
        {/* Visible preview of the Ficha */}
        <ClientFichaContent id="client-ficha-content" client={client} sales={sales} installments={installments} />

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
