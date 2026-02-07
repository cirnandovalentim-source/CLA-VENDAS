
import React from 'react';
import { Modal, Button } from './ui';
import { Client, Sale, Installment } from '../types';
import { format } from 'date-fns';
import { ICONS } from '../constants';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'SALE' | 'INSTALLMENT';
  data: any; // Sale or Installment
  client: Client;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, type, data, client }) => {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsapp = () => {
    const br = "%0A"; // Quebra de linha para URL
    let message = "";

    if (type === 'SALE') {
        message = `🛍️ *COMPROVANTE DE VENDA*${br}*CLA VENDAS*${br}${br}`;
        message += `*Cliente:* ${client.nome}${br}`;
        message += `*Data:* ${format(new Date(data.data_venda), 'dd/MM/yyyy')}${br}`;
        message += `*Cód Venda:* #${data.id.substring(0, 6)}${br}`;
        message += `*Total:* R$ ${data.valor_total.toFixed(2)}${br}`;
        message += `*Plano:* ${data.qtd_parcelas}x${br}`;
    } else {
        message = `🧾 *COMPROVANTE DE PAGAMENTO*${br}*CLA VENDAS*${br}${br}`;
        message += `*Cliente:* ${client.nome}${br}`;
        message += `*Parcela:* ${data.numero_parcela}${br}`;
        message += `*Vencimento:* ${format(new Date(data.data_vencimento), 'dd/MM/yyyy')}${br}`;
        message += `*Pagamento:* ${data.data_pagamento ? format(new Date(data.data_pagamento), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}${br}`;
        message += `*VALOR PAGO:* R$ ${data.valor.toFixed(2)}${br}`;
    }

    message += `${br}_Obrigado pela preferência!_`;

    // Remove caracteres não numéricos do telefone
    const phone = client.telefone ? client.telefone.replace(/\D/g, '') : '';
    
    // Se tiver telefone, abre direto no número, senão abre para escolher contato
    const whatsappUrl = phone 
        ? `https://wa.me/55${phone}?text=${message}`
        : `https://wa.me/?text=${message}`;

    window.open(whatsappUrl, '_blank');
  };

  const today = new Date();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Visualizar Recibo">
      <div className="flex flex-col gap-4">
        
        {/* Receipt Container - This ID is used by the @media print CSS */}
        <div id="receipt-content" className="bg-white text-black p-6 rounded-lg shadow-inner font-mono text-sm border-t-8 border-[#FF7A00]">
           
           {/* Header */}
           <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
             <h2 className="text-xl font-bold uppercase tracking-wider">CLA VENDAS</h2>
             <p className="text-xs text-gray-500">Comprovante de {type === 'SALE' ? 'Venda' : 'Pagamento'}</p>
             <p className="text-xs text-gray-400 mt-1">{format(today, 'dd/MM/yyyy HH:mm')}</p>
           </div>

           {/* Content */}
           <div className="space-y-4 mb-6">
             
             {/* Client Info */}
             <div>
                <p className="font-bold text-xs uppercase text-gray-500">Cliente</p>
                <p className="font-bold text-lg">{client.nome}</p>
                <p className="text-xs">{client.telefone}</p>
             </div>

             {type === 'INSTALLMENT' && (
                <div className="bg-gray-100 p-3 rounded border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Parcela</span>
                        <span className="font-bold">{data.numero_parcela}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Vencimento</span>
                        <span>{format(new Date(data.data_vencimento), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Data Pagamento</span>
                        <span>{data.data_pagamento ? format(new Date(data.data_pagamento), 'dd/MM/yyyy') : 'Hoje'}</span>
                    </div>
                    <div className="border-t border-gray-300 my-2"></div>
                    <div className="flex justify-between items-center text-lg">
                        <span className="font-bold">VALOR PAGO</span>
                        <span className="font-bold">R$ {data.valor.toFixed(2)}</span>
                    </div>
                </div>
             )}

             {type === 'SALE' && (
                <div className="bg-gray-100 p-3 rounded border border-gray-200">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Código Venda</span>
                        <span className="font-bold">#{data.id.substring(0, 6)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Data Venda</span>
                        <span>{format(new Date(data.data_venda), 'dd/MM/yyyy')}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Plano</span>
                        <span>{data.qtd_parcelas}x Parcelas</span>
                    </div>
                    <div className="border-t border-gray-300 my-2"></div>
                    <div className="flex justify-between items-center text-lg">
                        <span className="font-bold">TOTAL VENDA</span>
                        <span className="font-bold">R$ {data.valor_total.toFixed(2)}</span>
                    </div>
                </div>
             )}

             <div className="text-center pt-8">
                 <div className="border-t border-black w-3/4 mx-auto mb-2"></div>
                 <p className="text-xs uppercase">Assinatura / Responsável</p>
             </div>
           </div>

           {/* Footer */}
           <div className="text-center text-xs text-gray-400 border-t-2 border-dashed border-gray-300 pt-4">
              <p>Obrigado pela preferência!</p>
              <p>Documento sem valor fiscal.</p>
           </div>
        </div>

        <div className="flex gap-2 pt-2">
             <Button 
                variant="secondary" 
                onClick={handlePrint} 
                icon={ICONS.Printer}
                className="flex-1"
             >
                Imprimir
             </Button>
             <Button 
                onClick={handleShareWhatsapp} 
                icon={ICONS.Share} 
                className="flex-[2] bg-green-600 hover:bg-green-700 border-none shadow-lg shadow-green-600/20"
             >
                Enviar no WhatsApp
             </Button>
        </div>
      </div>
    </Modal>
  );
};
