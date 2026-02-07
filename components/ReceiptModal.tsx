
import React from 'react';
import { Modal, Button } from './ui';
import { Client } from '../types';
import { format } from 'date-fns';
import { ICONS } from '../constants';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'SALE' | 'INSTALLMENT';
  data: any; 
  client: Client;
  totalValue?: number;
  remaining?: number;
  description?: string;
  history?: { date: string, paid: number, remaining: number }[];
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ 
    isOpen, onClose, type, data, client, totalValue, remaining, description, history 
}) => {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsapp = () => {
    const br = "%0A";
    let message = `🧾 *RECIBO CLA VENDAS*${br}${br}`;
    
    message += `*Cliente:* ${client.nome}${br}`;
    
    if (type === 'SALE') {
        message += `*Data da Venda:* ${format(new Date(data.data_venda), 'dd/MM/yyyy')}${br}`;
        message += `*Produto:* ${description || 'Produtos Diversos'}${br}`;
        message += `*Total:* R$ ${data.valor_total.toFixed(2)}${br}`;
        message += `*Plano:* ${data.qtd_parcelas} parcelas${br}`;
    } else {
        message += `*Ref. Parcela:* ${data.numero_parcela}${br}`;
        message += `*Vencimento:* ${format(new Date(data.data_vencimento), 'dd/MM/yyyy')}${br}`;
        message += `*Valor Pago:* R$ ${data.valor.toFixed(2)}${br}`;
        message += `*Resta a Pagar:* R$ ${(remaining || 0).toFixed(2)}${br}`;
        message += `*Data Pagamento:* ${format(new Date(), 'dd/MM/yyyy')}${br}`;
    }

    const phone = client.telefone ? client.telefone.replace(/\D/g, '') : '';
    const whatsappUrl = phone 
        ? `https://wa.me/55${phone}?text=${message}`
        : `https://wa.me/?text=${message}`;

    window.open(whatsappUrl, '_blank');
  };

  // --- Helpers for the "Paper" Layout ---
  const Handwriting: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <span className={`font-handwriting text-[#1e3a8a] text-xl font-bold ml-2 -mb-1 block relative top-[-4px] ${className}`}>
        {children}
    </span>
  );

  const saleDate = type === 'SALE' ? new Date(data.data_venda) : new Date(data.data_vencimento);
  
  // "Preço" in top table is always the Total Value of the Sale (product kit value)
  const displayTotalValue = totalValue || (type === 'SALE' ? data.valor_total : data.valor);

  // Grid Logic
  const gridRows = [1, 2, 3, 4];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Visualizar Recibo">
      <div className="flex flex-col gap-4">
        
        {/* === RECEIPT CONTAINER (The "Paper") === */}
        <div id="receipt-content" className="bg-white text-black p-4 font-sans text-xs border-2 border-black max-w-[400px] mx-auto w-full relative">
           
           {/* HEADER */}
           <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
              <div className="flex gap-2">
                 <div className="flex flex-col justify-center items-center">
                    {/* Logo Simulation */}
                    <div className="border-2 border-black rounded-full w-10 h-10 flex items-center justify-center mb-1">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </div>
                    <span className="font-black text-2xl leading-none">CLA</span>
                 </div>
                 <div className="flex flex-col justify-center">
                    <p className="font-bold text-[10px] leading-tight w-24">ALIMENTAÇÃO E UTILIDADES</p>
                    <p className="font-bold text-xs mt-1">21 96719-0243 {ICONS.Phone}</p>
                 </div>
              </div>
              
              {/* Note in top right */}
              {type === 'SALE' && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 font-handwriting text-[#1e3a8a] text-xl rotate-[-5deg]">
                      {data.qtd_parcelas}x {(data.valor_total / data.qtd_parcelas).toFixed(0)}
                  </div>
              )}

              {/* QR Code Area */}
              <div className="border border-black p-1 w-16 h-16 flex flex-col items-center justify-center">
                 <div className="w-12 h-12 bg-black/10 flex items-center justify-center">
                     <div className="w-full h-full grid grid-cols-4 gap-0.5 p-0.5">
                         {[...Array(16)].map((_,i) => <div key={i} className={`bg-black ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'}`}></div>)}
                     </div>
                 </div>
                 <p className="text-[5px] text-center mt-0.5 uppercase font-bold leading-none">Pague com QR Code</p>
              </div>
           </div>

           {/* CLIENT INFO */}
           <div className="space-y-1 mb-2">
              <div className="flex items-end">
                  <span className="font-bold uppercase whitespace-nowrap">Nome do Cliente</span>
                  <div className="border-b border-black w-full ml-1">
                      <Handwriting>{client.nome}</Handwriting>
                  </div>
              </div>
              <div className="flex items-end">
                  <span className="font-bold uppercase whitespace-nowrap">Endereço</span>
                  <div className="border-b border-black w-full ml-1">
                      <Handwriting className="text-lg">{client.endereco}</Handwriting>
                  </div>
              </div>
              <div className="flex items-end">
                  <span className="font-bold uppercase whitespace-nowrap">Bairro</span>
                  <div className="border-b border-black w-full ml-1">
                      <Handwriting>{client.bairro}</Handwriting>
                  </div>
              </div>
              <div className="flex items-end">
                  <span className="font-bold uppercase whitespace-nowrap">Telefone</span>
                  <div className="border-b border-black w-full ml-1">
                      <Handwriting>{client.telefone}</Handwriting>
                  </div>
              </div>
           </div>

           {/* DATE & TOTAL */}
           <div className="flex gap-2 mb-2">
               <div className="flex items-end w-1/2">
                  <span className="font-bold uppercase mr-1">Data</span>
                  <div className="border-b border-black flex-1 text-center">
                      <Handwriting className="justify-center flex">
                          {format(saleDate, 'dd')} / {format(saleDate, 'MM')} / {format(saleDate, 'yy')}
                      </Handwriting>
                  </div>
               </div>
               <div className="border border-black w-1/2 flex flex-col p-1 relative">
                  <span className="text-[8px] font-bold uppercase absolute top-0 left-1 leading-none">Total Comprado</span>
                  <div className="flex-1 flex items-center justify-end">
                      <Handwriting className="text-2xl mr-2">
                          R$ {displayTotalValue.toFixed(2)}
                      </Handwriting>
                  </div>
               </div>
           </div>

           {/* PRODUCT TABLE */}
           <div className="border-t-2 border-b-2 border-black mb-2">
               <div className="flex border-b border-black text-[9px] font-bold uppercase">
                   <div className="w-[60%] border-r border-black pl-1">Descrição do Produto</div>
                   <div className="w-[15%] border-r border-black text-center">Quant</div>
                   <div className="w-[25%] text-center">Preço</div>
               </div>
               {/* Line 1 - Filled */}
               <div className="flex h-8 border-b border-black relative">
                   <div className="w-[60%] border-r border-black pl-1 relative">
                       <Handwriting className="absolute top-0 leading-tight pt-1">
                           {description || (type === 'SALE' ? 'Produtos Diversos' : `Pagamento Parcela ${data.numero_parcela}`)}
                       </Handwriting>
                   </div>
                   <div className="w-[15%] border-r border-black text-center relative">
                       <Handwriting className="absolute top-0 left-1/2 -translate-x-1/2">1</Handwriting>
                   </div>
                   <div className="w-[25%] text-center relative">
                       <Handwriting className="absolute top-0 right-2">
                           {displayTotalValue.toFixed(2)}
                       </Handwriting>
                   </div>
               </div>
               {/* Line 2 - Empty */}
               <div className="flex h-6">
                   <div className="w-[60%] border-r border-black"></div>
                   <div className="w-[15%] border-r border-black"></div>
                   <div className="w-[25%]"></div>
               </div>
           </div>

           {/* PAYMENT GRID */}
           <div className="border-2 border-black mb-2">
               <div className="flex border-b border-black bg-gray-100 text-[10px] font-bold uppercase">
                   <div className="w-1/3 border-r border-black text-center py-0.5">Data</div>
                   <div className="w-1/3 border-r border-black text-center py-0.5">Pagou</div>
                   <div className="w-1/3 text-center py-0.5">Resta</div>
               </div>
               {gridRows.map((_, idx) => {
                   let dateText = '';
                   let paidText = '';
                   let remainingText = '';
                   
                   // Priority: Use passed History array if available
                   if (history && history[idx]) {
                       dateText = format(new Date(history[idx].date), 'dd/MM');
                       paidText = history[idx].paid.toFixed(2);
                       remainingText = history[idx].remaining.toFixed(2);
                   }
                   // Fallback: If no history but viewing single installment payment (only for 1st row)
                   else if (type === 'INSTALLMENT' && idx === 0 && !history) {
                        dateText = format(new Date(data.data_pagamento || new Date()), 'dd/MM');
                        paidText = data.valor.toFixed(2);
                        if (remaining !== undefined) {
                            remainingText = remaining.toFixed(2);
                        }
                   }

                   return (
                       <div key={idx} className="flex h-7 border-b border-black last:border-b-0">
                           <div className="w-1/3 border-r border-black relative">
                               {dateText && <Handwriting className="ml-4">{dateText}</Handwriting>}
                           </div>
                           <div className="w-1/3 border-r border-black relative">
                               {paidText && <Handwriting className="ml-4">{paidText}</Handwriting>}
                           </div>
                           <div className="w-1/3 relative">
                               {remainingText && <Handwriting className="ml-4">{remainingText}</Handwriting>}
                           </div>
                       </div>
                   );
               })}
           </div>

           {/* FOOTER */}
           <div className="flex items-center gap-2 mb-2 text-[10px] font-bold">
              <span>OPÇÃO PAGAMENTO</span>
              <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border border-black flex items-center justify-center">
                     {type === 'SALE' && data.qtd_parcelas > 1 && <div className="w-2 h-2 bg-black"></div>}
                     {type === 'INSTALLMENT' && <div className="w-2 h-2 bg-black"></div>}
                  </div>
                  <span>PARCELADO</span>
              </div>
              <div className="flex items-center gap-1">
                  <div className="w-3 h-3 border border-black flex items-center justify-center">
                     {type === 'SALE' && data.qtd_parcelas === 1 && <div className="w-2 h-2 bg-black"></div>}
                  </div>
                  <span>À VISTA</span>
              </div>
           </div>

           <div className="border border-black p-1 text-center font-bold text-[10px]">
               CHAVES PIX: 57453624304 - 21967190243
           </div>
        </div>

        {/* ACTIONS */}
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
                WhatsApp
             </Button>
        </div>
      </div>
    </Modal>
  );
};
