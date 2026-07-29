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
              valor: sale.valor_total // this is simplistic, but good enough for reference
          });
      });
  });

  // Sort by date (newest first for products? or oldest? let's do chronological)
  productRows.sort((a, b) => {
      const [d1, m1, y1] = a.data.split('/');
      const [d2, m2, y2] = b.data.split('/');
      return new Date(`${y1}-${m1}-${d1}`).getTime() - new Date(`${y2}-${m2}-${d2}`).getTime();
  });

  // Pad to at least 6 rows
  while (productRows.length < 8) {
      productRows.push({ data: '', desc: '', qtd: '', valor: 0 });
  }

  // Aggregate all installments
  const sortedInstallments = [...installments].sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
  
  let remaining = installments.reduce((acc, i) => acc + i.valor, 0); // Start with total debt from all installments
  
  // To show chronological history of payments and debts:
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

  // Pad to at least 10 rows
  while (paymentRows.length < 12) {
      paymentRows.push({ vencimento: '', pagamento: '', valor: 0, pago: false, resta: 0 });
  }

  const pixKey = "57453624304";
  
  const totalComprado = sales.reduce((acc, s) => acc + s.valor_total, 0);
  const totalPago = sortedInstallments.filter(i => i.pago).reduce((acc, i) => acc + i.valor, 0);
  const totalResta = sortedInstallments.filter(i => !i.pago).reduce((acc, i) => acc + i.valor, 0);

  return (
        <div 
            id={id} 
            className="bg-white text-black border-2 border-black relative font-sans p-4 overflow-hidden flex-shrink-0"
            style={{ width: '14cm', height: '19cm', boxSizing: 'border-box' }}
        >
            {/* HEADER */}
            <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
                <div className="flex items-center gap-2">
                    <div className="border-2 border-black p-1 rounded flex items-center justify-center bg-gray-200" style={{width:'48px', height:'36px'}}>
                       <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </div>
                    <div>
                        <h1 className="font-bold text-[18px] leading-tight m-0 p-0">CLA</h1>
                        <p className="text-[12px] leading-tight m-0 p-0">21 96719-0243</p>
                        <p className="text-[11px] font-black leading-tight m-0 p-0 uppercase">Alimentação e Utilidades</p>
                    </div>
                </div>
                <div className="flex flex-col items-center">
                    <div className="border-2 border-black p-1">
                       <QRCodeSVG value={`pix:${pixKey}`} size={48} />
                    </div>
                    <span className="text-[8px] font-bold mt-1 tracking-wider">PAGUE COM PIX</span>
                </div>
            </div>

            {/* CLIENT INFO */}
            <div className="text-[12px] space-y-1.5 mb-3">
                <div className="flex pb-1 border-b border-gray-300 border-dashed">
                    <span className="font-bold w-[130px]">NOME DO CLIENTE:</span>
                    <span className="flex-1 px-1 font-bold text-[13px]">{client.nome.toUpperCase()}</span>
                </div>
                <div className="flex pb-1 border-b border-gray-300 border-dashed">
                    <span className="font-bold w-[130px]">ENDEREÇO:</span>
                    <span className="flex-1 px-1 font-semibold">{client.endereco ? client.endereco.toUpperCase() : ''}</span>
                </div>
                <div className="flex pb-1 border-b border-gray-300 border-dashed">
                    <span className="font-bold w-[130px]">BAIRRO:</span>
                    <span className="flex-1 px-1 font-semibold">{client.bairro ? client.bairro.toUpperCase() : ''}</span>
                </div>
                <div className="flex pb-1 border-b border-gray-300 border-dashed">
                    <span className="font-bold w-[130px]">TELEFONE:</span>
                    <span className="flex-1 px-1 font-bold">{client.telefone || ''}</span>
                </div>
            </div>

            {/* TOTALS */}
            <div className="flex justify-between items-center mb-3 bg-gray-100 p-2 border border-black">
                <div className="text-center">
                    <span className="font-bold text-[10px] block">TOTAL COMPRADO</span>
                    <span className="font-black text-[14px]">R$ {totalComprado.toFixed(2)}</span>
                </div>
                <div className="text-center border-l border-r border-black px-4">
                    <span className="font-bold text-[10px] block">TOTAL PAGO</span>
                    <span className="font-black text-[14px] text-green-700">R$ {totalPago.toFixed(2)}</span>
                </div>
                <div className="text-center">
                    <span className="font-bold text-[10px] block">RESTA A PAGAR</span>
                    <span className="font-black text-[14px] text-red-700">R$ {totalResta.toFixed(2)}</span>
                </div>
            </div>

            {/* PRODUCTS */}
            <h2 className="font-bold text-[12px] mb-1 bg-black text-white px-2 py-0.5">HISTÓRICO DE COMPRAS</h2>
            <table className="w-full text-[11px] border-collapse mb-3 text-center border-2 border-black">
                <thead>
                    <tr className="border-b-2 border-black bg-gray-50">
                        <th className="font-bold py-1.5 w-[15%] border-r border-black">DATA</th>
                        <th className="font-bold py-1.5 w-[50%] border-r border-black text-left px-2">DESCRIÇÃO DO PRODUTO</th>
                        <th className="font-bold py-1.5 w-[15%] border-r border-black">QTD</th>
                        <th className="font-bold py-1.5 w-[20%]">VALOR (R$)</th>
                    </tr>
                </thead>
                <tbody>
                    {productRows.slice(0, 8).map((row, i) => (
                        <tr key={i} className="border-b border-gray-300">
                            <td className="py-1 border-r border-black font-semibold">{row.data}</td>
                            <td className="py-1 text-left px-2 truncate max-w-[200px] border-r border-black font-semibold">{row.desc}</td>
                            <td className="py-1 border-r border-black font-semibold">{row.qtd}</td>
                            <td className="py-1 font-semibold">{row.valor ? row.valor.toFixed(2) : ''}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* PAYMENTS */}
            <h2 className="font-bold text-[12px] mb-1 bg-black text-white px-2 py-0.5">HISTÓRICO DE PARCELAS / PAGAMENTOS</h2>
            <table className="w-full text-[11px] border-collapse border-2 border-black text-center mb-2">
                <thead>
                    <tr className="border-b-2 border-black bg-gray-50">
                        <th className="font-bold py-1.5 w-[20%] border-r border-black">VENCIMENTO</th>
                        <th className="font-bold py-1.5 w-[25%] border-r border-black">DATA PAG.</th>
                        <th className="font-bold py-1.5 w-[20%] border-r border-black">PAGOU (R$)</th>
                        <th className="font-bold py-1.5 w-[20%] border-r border-black">RESTA (R$)</th>
                        <th className="font-bold py-1.5 w-[15%]">SITUAÇÃO</th>
                    </tr>
                </thead>
                <tbody>
                    {paymentRows.slice(0, 12).map((row, i) => (
                        <tr key={i} className="border-b border-gray-300 h-[20px]">
                            <td className="py-1 border-r border-black font-semibold">{row.vencimento}</td>
                            <td className="py-1 border-r border-black font-semibold">{row.pagamento}</td>
                            <td className="py-1 border-r border-black font-semibold">{row.pago ? row.valor.toFixed(2) : ''}</td>
                            <td className="py-1 border-r border-black font-semibold text-red-700">{row.valor > 0 && row.pago ? row.resta.toFixed(2) : (row.valor > 0 ? row.resta.toFixed(2) : '')}</td>
                            <td className="py-1 font-bold">
                                {row.valor > 0 ? (row.pago ? 'PAGO' : 'PENDENTE') : ''}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* FOOTER */}
            <div className="absolute bottom-3 left-0 w-full px-4 text-[10px] text-center">
                <div className="border-2 border-black inline-block px-4 py-1.5 font-bold text-[11px] bg-gray-100">
                    CHAVES PIX: 57453624304 - 21967190243
                </div>
            </div>
        </div>
  );
};
