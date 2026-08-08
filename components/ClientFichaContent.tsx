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
        className="bg-white text-zinc-900 border-2 border-zinc-400 relative font-sans p-3.5 overflow-hidden flex-shrink-0 flex flex-col justify-between box-border"
        style={{ width: '14cm', height: '19cm' }}
    >
      <div className="flex flex-col justify-start overflow-hidden">
        {/* HEADER */}
        <div className="flex justify-between items-start pb-1">
            <div>
                <div className="flex items-center gap-1.5">
                    <span className="font-black text-[20px] tracking-tight text-zinc-900 leading-none">CLA</span>
                    <div className="w-5 h-5 rounded-full bg-[#EA580C] flex items-center justify-center text-white p-0.5">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L7 13" />
                            <path d="m7 21 1.6-1.4c.4-.4.4-1 0-1.4l-2.2-2.2c-.4-.4-1-.4-1.4 0L2 19" />
                            <path d="M17 11h-2a2 2 0 1 0 0 4h3c.6 0 1.1-.2 1.4-.6L21 13" />
                            <path d="m17 3-1.6 1.4c-.4.4-.4 1 0 1.4l2.2 2.2c.4.4 1 .4 1.4 0L22 5" />
                        </svg>
                    </div>
                    <span className="font-black text-[20px] tracking-tight text-[#EA580C] leading-none">VENDAS</span>
                </div>
                
                <div className="flex items-center gap-1 text-[10px] text-zinc-800 font-bold mt-1">
                    <svg className="w-3 h-3 text-[#EA580C] fill-current" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.82.49 3.53 1.35 5L2 22l5.15-1.32C8.59 21.52 10.25 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.52 0-2.96-.4-4.21-1.11l-.3-.17-3.04.78.81-2.96-.2-.31C4.34 14.98 3.8 13.54 3.8 12c0-4.52 3.68-8.2 8.2-8.2 4.52 0 8.2 3.68 8.2 8.2 0 4.52-3.68 8.2-8.2 8.2z"/>
                    </svg>
                    <span className="font-semibold text-[9px]">WhatsApp</span>
                    <span className="font-bold text-[10px]">21 96719-0243</span>
                </div>
            </div>

            <div className="border border-zinc-800 p-0.5 rounded bg-white">
               <QRCodeSVG value={`pix:${pixKey}`} size={36} />
            </div>
        </div>

        {/* Orange Line */}
        <div className="h-[2.5px] bg-[#EA580C] w-full my-1.5" />

        {/* CLIENT DETAILS BOXES */}
        <div className="space-y-1 text-[9px] mb-2">
            <div>
                <label className="font-extrabold text-zinc-900 text-[8.5px] uppercase block mb-0.5 leading-tight">NOME DO CLIENTE</label>
                <div className="border border-zinc-400 rounded px-2 py-0.5 bg-zinc-50 font-bold text-zinc-900 text-[10px] min-h-[22px] flex items-center leading-tight break-words text-left">
                    {client?.nome ? client.nome.toUpperCase() : ''}
                </div>
            </div>

            <div>
                <label className="font-extrabold text-zinc-900 text-[8.5px] uppercase block mb-0.5 leading-tight">TELEFONE</label>
                <div className="border border-zinc-400 rounded px-2 py-0.5 bg-zinc-50 font-bold text-zinc-900 text-[9.5px] min-h-[20px] flex items-center leading-tight break-words text-left">
                    {client?.telefone || ''}
                </div>
            </div>

            <div>
                <label className="font-extrabold text-zinc-900 text-[8.5px] uppercase block mb-0.5 leading-tight">ENDEREÇO</label>
                <div className="border border-zinc-400 rounded px-2 py-0.5 bg-zinc-50 font-semibold text-zinc-900 text-[9.5px] min-h-[20px] flex items-center leading-tight break-words text-left">
                    {client?.endereco ? client.endereco.toUpperCase() : ''}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
                <div>
                    <label className="font-extrabold text-zinc-900 text-[8.5px] uppercase block mb-0.5 leading-tight">BAIRRO</label>
                    <div className="border border-zinc-400 rounded px-2 py-0.5 bg-zinc-50 font-semibold text-zinc-900 text-[9.5px] min-h-[20px] flex items-center leading-tight break-words text-left">
                        {client?.bairro ? client.bairro.toUpperCase() : ''}
                    </div>
                </div>
                <div>
                    <label className="font-extrabold text-zinc-900 text-[8.5px] uppercase block mb-0.5 leading-tight">CIDADE</label>
                    <div className="border border-zinc-400 rounded px-2 py-0.5 bg-zinc-50 font-semibold text-zinc-900 text-[9.5px] min-h-[20px] flex items-center leading-tight break-words text-left">
                        {client?.cidade ? client.cidade.toUpperCase() : 'MARICÁ'}
                    </div>
                </div>
            </div>
        </div>

        {/* PRODUCTS TABLE */}
        <div className="border border-zinc-800 rounded overflow-hidden mb-2">
            <table className="w-full text-[9px] border-collapse text-center table-fixed">
                <thead>
                    <tr className="bg-black text-white font-extrabold border-b border-zinc-800">
                        <th className="py-1 text-left px-2 w-[58%] border-r border-zinc-700 align-middle leading-tight">DESCRIÇÃO DO PRODUTO</th>
                        <th className="py-1 text-center w-[18%] border-r border-zinc-700 align-middle leading-tight">QUANT</th>
                        <th className="py-1 text-center w-[24%] align-middle leading-tight">PREÇO</th>
                    </tr>
                </thead>
                <tbody>
                    {productRows.slice(0, 4).map((row, i) => (
                        <tr key={i} className="border-b border-zinc-300">
                            <td className="align-middle text-left px-2 py-0.5 font-semibold text-zinc-900 leading-tight break-words border-r border-zinc-300 min-h-[18px]">{row.desc}</td>
                            <td className="align-middle text-center font-semibold text-zinc-900 border-r border-zinc-300 py-0.5 leading-tight">{row.qtd}</td>
                            <td className="align-middle text-center font-semibold text-zinc-900 py-0.5 leading-tight">{row.valor ? `R$ ${row.valor.toFixed(2)}` : ''}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* TOTAL BAR AT BOTTOM OF PRODUCT TABLE */}
            <div className="bg-black text-white px-2.5 py-1 flex justify-between items-center text-[10px] font-extrabold">
                <span className="leading-tight">VALOR TOTAL</span>
                <div className="bg-white text-zinc-900 px-2.5 py-0.5 rounded font-black text-[10.5px] min-w-[70px] text-center border border-zinc-300 flex items-center justify-center leading-tight">
                    R$ {totalComprado.toFixed(2)}
                </div>
            </div>
        </div>

        {/* PAYMENTS TABLE */}
        <div className="border border-zinc-800 rounded overflow-hidden mb-2">
            <table className="w-full text-[9px] border-collapse text-center table-fixed">
                <thead>
                    <tr className="bg-[#EA580C] text-white font-extrabold border-b border-[#c2410c]">
                        <th className="py-1 text-center w-[33%] border-r border-orange-500 align-middle leading-tight">DATA</th>
                        <th className="py-1 text-center w-[33%] border-r border-orange-500 align-middle leading-tight">PAGOU</th>
                        <th className="py-1 text-center w-[34%] align-middle leading-tight">RESTA</th>
                    </tr>
                </thead>
                <tbody>
                    {paymentRows.slice(0, 4).map((row, i) => (
                        <tr key={i} className="border-b border-zinc-300">
                            <td className="align-middle text-center font-semibold text-zinc-900 border-r border-zinc-300 py-0.5 leading-tight">{row.pagamento || row.vencimento}</td>
                            <td className="align-middle text-center font-semibold text-zinc-900 border-r border-zinc-300 py-0.5 leading-tight">{row.pago ? `R$ ${row.valor.toFixed(2)}` : ''}</td>
                            <td className="align-middle text-center font-semibold text-zinc-900 py-0.5 leading-tight">{row.pago || row.resta > 0 ? `R$ ${row.resta.toFixed(2)}` : (row.vencimento ? `R$ ${row.resta.toFixed(2)}` : '')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* FOOTER */}
      <div className="pt-1.5 border-t border-zinc-300 mt-auto">
        <div className="flex justify-between items-center text-[9px]">
            <div className="font-extrabold text-zinc-900 leading-tight">
                DATA _____ / _____ / _________
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="font-extrabold text-zinc-900 text-[9px] leading-tight">VALOR DA PARCELA</span>
                <div className="border border-zinc-800 rounded px-2 py-0.5 bg-zinc-50 font-black text-zinc-900 text-[10px] min-w-[60px] text-center flex items-center justify-center leading-tight">
                    R$ {lastInstallment ? lastInstallment.toFixed(2) : '0.00'}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

