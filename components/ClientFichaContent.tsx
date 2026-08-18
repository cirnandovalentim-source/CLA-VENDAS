import React from 'react';
import { Client, Sale, Installment } from '../types';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';

interface ClientFichaContentProps {
  id: string;
  client: Client;
  sales: Sale[];
  installments: Installment[];
}

export const ClientFichaContent: React.FC<ClientFichaContentProps> = ({ id, client, sales, installments }) => {
  // Aggregate all products
  const productRows: { data: string; desc: string; qtd: string; valor: number }[] = [];
  sales.forEach(sale => {
      const prods = sale.descricao ? sale.descricao.split(', ') : [];
      prods.forEach(p => {
          let qtd = '1';
          let desc = p.toUpperCase();
          const match = p.match(/^(\d+)x\s+(.+)$/);
          if (match) {
              qtd = match[1];
              desc = match[2].toUpperCase();
          }
          productRows.push({ 
              data: format(new Date(sale.data_venda), 'dd/MM/yyyy'),
              desc, 
              qtd,
              valor: sale.valor_total
          });
      });
  });

  productRows.sort((a, b) => {
      const [d1, m1, y1] = a.data.split('/');
      const [d2, m2, y2] = b.data.split('/');
      return new Date(`${y1}-${m1}-${d1}`).getTime() - new Date(`${y2}-${m2}-${d2}`).getTime();
  });

  while (productRows.length < 5) {
      productRows.push({ data: '', desc: '', qtd: '', valor: 0 });
  }

  // Aggregate all installments
  const sortedInstallments = [...installments].sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
  
  let remaining = installments.reduce((acc, i) => acc + i.valor, 0);
  
  const paymentRows = sortedInstallments.map(p => {
      if (p.pago) remaining -= p.valor;
      return {
          vencimento: format(new Date(p.data_vencimento), 'dd/MM/yyyy'),
          pagamento: p.pago && p.data_pagamento ? format(new Date(p.data_pagamento), 'dd/MM/yyyy') : '',
          valor: p.valor,
          pago: p.pago,
          resta: remaining
      };
  });

  while (paymentRows.length < 5) {
      paymentRows.push({ vencimento: '', pagamento: '', valor: 0, pago: false, resta: 0 });
  }

  const pixKey = "57453624304";
  
  const totalComprado = sales.reduce((acc, s) => acc + s.valor_total, 0);
  const lastInstallment = sortedInstallments.length > 0 ? sortedInstallments[0].valor : 0;

  return (
    <div 
        id={id} 
        className="bg-white text-black relative font-sans p-4 overflow-hidden flex-shrink-0 flex flex-col justify-between box-border border-2 border-black rounded-none shadow-none"
        style={{ width: '13cm', height: '18cm' }}
    >
      <div className="flex flex-col justify-start overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-center pb-2 border-b border-black">
            <div>
                <div className="flex items-center gap-1.5">
                    <span className="font-black text-[22px] tracking-tight text-black leading-none">CLA</span>
                    <div className="w-5 h-5 border border-black rounded-full flex items-center justify-center text-black p-0.5">
                        <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L7 13" />
                            <path d="m7 21 1.6-1.4c.4-.4.4-1 0-1.4l-2.2-2.2c-.4-.4-1-.4-1.4 0L2 19" />
                            <path d="M17 11h-2a2 2 0 1 0 0 4h3c.6 0 1.1-.2 1.4-.6L21 13" />
                            <path d="m17 3-1.6 1.4c-.4.4-.4 1 0 1.4l2.2 2.2c.4.4 1 .4 1.4 0L22 5" />
                        </svg>
                    </div>
                    <span className="font-black text-[22px] tracking-tight text-black leading-none">VENDAS</span>
                </div>
                
                <div className="flex items-center gap-1 text-[10px] text-black font-bold mt-1">
                    <svg className="w-3 h-3 text-black fill-current" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.35 5L2 22l5.15-1.32C8.59 21.52 10.25 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.52 0-2.96-.4-4.21-1.11l-.3-.17-3.04.78.81-2.96-.2-.31C4.34 14.98 3.8 13.54 3.8 12c0-4.52 3.68-8.2 8.2-8.2 4.52 0 8.2 3.68 8.2 8.2 0 4.52-3.68 8.2-8.2 8.2z"/>
                    </svg>
                    <span className="font-semibold text-[9px]">WhatsApp</span>
                    <span className="font-bold text-[10px]">21 96719-0243</span>
                </div>
            </div>

            <div className="p-0.5 border border-black flex flex-col items-center bg-white">
               <QRCodeSVG value={`pix:${pixKey}`} size={36} />
            </div>
        </div>

        {/* CLIENT DETAILS */}
        <div className="space-y-2 text-[9px] my-2.5">
            <div>
                <span className="font-black text-black text-[8px] uppercase block leading-none mb-1">NOME DO CLIENTE</span>
                <div className="border border-black px-2.5 py-1 font-bold text-black text-[11px] min-h-[24px] flex items-center leading-normal text-left bg-white box-border">
                    {client?.nome ? client.nome.toUpperCase() : ''}
                </div>
            </div>

            <div>
                <span className="font-black text-black text-[8px] uppercase block leading-none mb-1">TELEFONE</span>
                <div className="border border-black px-2.5 py-1 font-bold text-black text-[10px] min-h-[22px] flex items-center leading-normal text-left bg-white box-border">
                    {client?.telefone || ''}
                </div>
            </div>

            <div>
                <span className="font-black text-black text-[8px] uppercase block leading-none mb-1">ENDEREÇO</span>
                <div className="border border-black px-2.5 py-1 font-semibold text-black text-[10px] min-h-[22px] flex items-center leading-normal text-left bg-white box-border">
                    {client?.endereco ? client.endereco.toUpperCase() : ''}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <span className="font-black text-black text-[8px] uppercase block leading-none mb-1">BAIRRO</span>
                    <div className="border border-black px-2.5 py-1 font-semibold text-black text-[10px] min-h-[22px] flex items-center leading-normal text-left bg-white box-border">
                        {client?.bairro ? client.bairro.toUpperCase() : ''}
                    </div>
                </div>
                <div>
                    <span className="font-black text-black text-[8px] uppercase block leading-none mb-1">CIDADE</span>
                    <div className="border border-black px-2.5 py-1 font-semibold text-black text-[10px] min-h-[22px] flex items-center leading-normal text-left bg-white box-border">
                        {client?.cidade ? client.cidade.toUpperCase() : 'MARICÁ'}
                    </div>
                </div>
            </div>
        </div>

        {/* PRODUCTS TABLE */}
        <div className="mb-2.5 border border-black bg-white">
            <table className="w-full text-[9.5px] border-collapse text-center table-fixed">
                <thead>
                    <tr className="border-b border-black text-black font-black bg-white">
                        <th className="py-1.5 text-left px-2.5 w-[55%] align-middle leading-normal border-r border-black whitespace-nowrap">DESCRIÇÃO DO PRODUTO</th>
                        <th className="py-1.5 text-center px-1.5 w-[20%] align-middle leading-normal border-r border-black whitespace-nowrap">QUANT</th>
                        <th className="py-1.5 text-center px-1.5 w-[25%] align-middle leading-normal whitespace-nowrap">PREÇO</th>
                    </tr>
                </thead>
                <tbody>
                    {productRows.slice(0, 4).map((row, i) => (
                        <tr key={i} className="border-b border-zinc-300 last:border-b-0 bg-white">
                            <td className="align-middle text-left px-2.5 py-1 font-semibold text-black leading-normal border-r border-zinc-300 break-words">{row.desc}</td>
                            <td className="align-middle text-center px-1.5 py-1 font-semibold text-black leading-normal border-r border-zinc-300">{row.qtd}</td>
                            <td className="align-middle text-center px-1.5 py-1 font-semibold text-black leading-normal">{row.valor ? `R$ ${row.valor.toFixed(2)}` : ''}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* TOTAL BAR AT BOTTOM OF PRODUCT TABLE */}
            <div className="border-t border-black bg-white px-2.5 py-1.5 flex justify-between items-center text-[10.5px] font-black text-black">
                <span className="leading-none uppercase">VALOR TOTAL</span>
                <div className="border border-black text-black px-2.5 py-1 font-black text-[11px] min-w-[75px] text-center flex items-center justify-center leading-none bg-white box-border">
                    R$ {totalComprado.toFixed(2)}
                </div>
            </div>
        </div>

        {/* PAYMENTS TABLE */}
        <div className="mb-2 border border-black bg-white">
            <table className="w-full text-[9.5px] border-collapse text-center table-fixed">
                <thead>
                    <tr className="border-b border-black text-black font-black bg-white">
                        <th className="py-1.5 text-center px-1.5 w-[33%] align-middle leading-normal border-r border-black whitespace-nowrap">DATA</th>
                        <th className="py-1.5 text-center px-1.5 w-[33%] align-middle leading-normal border-r border-black whitespace-nowrap">PAGOU</th>
                        <th className="py-1.5 text-center px-1.5 w-[34%] align-middle leading-normal whitespace-nowrap">RESTA</th>
                    </tr>
                </thead>
                <tbody>
                    {paymentRows.slice(0, 4).map((row, i) => (
                        <tr key={i} className="border-b border-zinc-300 last:border-b-0 bg-white">
                            <td className="align-middle text-center px-1.5 py-1 font-semibold text-black leading-normal border-r border-zinc-300">{row.pagamento || row.vencimento}</td>
                            <td className="align-middle text-center px-1.5 py-1 font-semibold text-black leading-normal border-r border-zinc-300">{row.pago ? `R$ ${row.valor.toFixed(2)}` : ''}</td>
                            <td className="align-middle text-center px-1.5 py-1 font-semibold text-black leading-normal">{row.pago || row.resta > 0 ? `R$ ${row.resta.toFixed(2)}` : (row.vencimento ? `R$ ${row.resta.toFixed(2)}` : '')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* FOOTER */}
      <div className="pt-2 mt-auto border-t border-black">
        <div className="flex justify-between items-center text-[9.5px]">
            <div className="font-black text-black leading-none">
                DATA _____ / _____ / _________
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-black text-black text-[9.5px] leading-none uppercase">VALOR DA PARCELA</span>
                <div className="border border-black px-2.5 py-1 font-black text-black text-[10.5px] min-w-[65px] text-center flex items-center justify-center leading-none bg-white box-border">
                    R$ {lastInstallment ? lastInstallment.toFixed(2) : '0.00'}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

