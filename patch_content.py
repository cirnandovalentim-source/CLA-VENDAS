import os

code = """import React from 'react';
import { Client, Sale, Installment, Product } from '../types';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';

interface FichaContentProps {
  id: string;
  client: Client;
  sale: Sale;
  installments: Installment[];
}

export const FichaContent: React.FC<FichaContentProps> = ({ id, client, sale, installments }) => {
  const productsDesc = sale.produtos ? sale.produtos.split(', ') : [];
  let productRows = productsDesc.map(p => {
      const match = p.match(/^(\\d+)x\\s+(.+)$/);
      if (match) {
          return { qtd: match[1], desc: match[2].toUpperCase() };
      }
      return { qtd: '1', desc: p.toUpperCase() };
  });

  while (productRows.length < 4) {
      productRows.push({ qtd: '', desc: '' });
  }

  const sortedInstallments = [...installments].sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
  
  let remaining = sale.valor_total;
  let paymentRows = sortedInstallments.map(p => {
      if (p.status === 'pago') remaining -= p.valor;
      return {
          date: p.data_pagamento ? format(new Date(p.data_pagamento), 'dd/MM/yyyy') : '',
          pagou: p.status === 'pago' ? p.valor : 0,
          resta: remaining
      };
  });

  while (paymentRows.length < 6) {
      paymentRows.push({ date: '', pagou: 0, resta: 0 });
  }

  const pixKey = "57453624304";

  return (
        <div 
            id={id} 
            className="bg-white text-black border border-black relative font-sans p-2 overflow-hidden flex-shrink-0"
            style={{ width: '9cm', height: '12cm', boxSizing: 'border-box' }}
        >
            <div className="flex justify-between items-start border-b border-black pb-1 mb-2">
                <div className="flex items-center gap-1">
                    <div className="border border-black p-1 rounded flex items-center justify-center bg-gray-200" style={{width:'36px', height:'28px'}}>
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </div>
                    <div>
                        <h1 className="font-bold text-[13px] leading-tight m-0 p-0">CLA</h1>
                        <p className="text-[9px] leading-tight m-0 p-0">21 96719-0243</p>
                        <p className="text-[9px] font-bold leading-tight m-0 p-0 uppercase">Alimentação e Utilidades</p>
                    </div>
                </div>
                <div className="flex flex-col items-center">
                    <div className="border border-black p-0.5">
                       <QRCodeSVG value={`pix:${pixKey}`} size={36} />
                    </div>
                    <span className="text-[6px] font-bold mt-0.5">PAGUE COM QR COD</span>
                </div>
            </div>

            <div className="text-[9px] space-y-1 mb-2">
                <div className="flex pb-0.5">
                    <span className="font-bold w-[95px]">NOME DO CLIENTE</span>
                    <span className="flex-1 px-1 font-semibold">{client.nome.toUpperCase()}</span>
                </div>
                <div className="flex pb-0.5">
                    <span className="font-bold w-[55px]">ENDEREÇO</span>
                    <span className="flex-1 px-1 font-semibold truncate">{client.endereco ? client.endereco.toUpperCase() : ''}</span>
                </div>
                <div className="flex pb-0.5">
                    <span className="font-bold w-[45px]">BAIRRO</span>
                    <span className="flex-1 px-1 font-semibold">{client.bairro ? client.bairro.toUpperCase() : ''}</span>
                </div>
                <div className="flex pb-0.5">
                    <span className="font-bold w-[55px]">TELEFONE</span>
                    <span className="flex-1 px-1 font-semibold">{client.telefone || ''}</span>
                </div>
            </div>

            <div className="text-[9px] flex justify-between items-end mb-2">
                <div className="flex items-end">
                    <span className="font-bold mr-1">DATA</span>
                    <span className="border-b border-black w-[65px] text-center inline-block font-semibold">
                        {format(new Date(sale.data_venda), 'dd/MM/yyyy')}
                    </span>
                </div>
                <div className="flex items-center">
                    <span className="font-bold mr-1 leading-tight text-right w-[50px]">TOTAL<br/>COMPRADO</span>
                    <span className="border border-black w-[55px] h-[16px] inline-flex items-center justify-center font-bold">
                        {sale.valor_total.toFixed(2)}
                    </span>
                </div>
            </div>

            <table className="w-full text-[9px] border-collapse mb-2 text-center border border-black">
                <thead>
                    <tr className="border-b border-black">
                        <th className="font-bold py-1 text-left w-[60%] px-1">DESCRIÇÃO DO PRODUTO</th>
                        <th className="font-bold py-1 w-[15%]">QUANT</th>
                        <th className="font-bold py-1 w-[25%]">PREÇO</th>
                    </tr>
                </thead>
                <tbody>
                    {productRows.slice(0, 4).map((row, i) => (
                        <tr key={i} className="">
                            <td className="py-0.5 text-left px-1 truncate max-w-[150px] font-semibold">{row.desc}</td>
                            <td className="py-0.5 font-semibold">{row.qtd}</td>
                            <td className="py-0.5"></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <table className="w-full text-[9px] border-collapse border border-black text-center mb-1">
                <thead>
                    <tr className="border-b border-black">
                        <th className="font-bold py-1 w-[33%]">DATA</th>
                        <th className="font-bold py-1 w-[33%]">PAGOU</th>
                        <th className="font-bold py-1 w-[33%]">RESTA</th>
                    </tr>
                </thead>
                <tbody>
                    {paymentRows.slice(0, 6).map((row, i) => (
                        <tr key={i} className="h-[14px]">
                            <td className="py-0.5 font-semibold">{row.date}</td>
                            <td className="py-0.5 font-semibold">{row.pagou ? row.pagou.toFixed(2) : ''}</td>
                            <td className="py-0.5 font-semibold">{row.pagou || row.resta > 0 ? row.resta.toFixed(2) : ''}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="absolute bottom-2 left-0 w-full px-2 text-[8px] text-center">
                <div className="flex justify-center items-center gap-2 mb-1.5">
                    <span className="font-bold">OPÇÃO PAGAMENTO</span>
                    <label className="flex items-center gap-0.5">
                        <div className="w-3 h-3 border border-black flex items-center justify-center font-bold">
                            {sale.qtd_parcelas > 1 ? 'X' : ''}
                        </div> 
                        <span className="font-semibold">PARCELADO</span>
                    </label>
                    <label className="flex items-center gap-0.5">
                        <div className="w-3 h-3 border border-black flex items-center justify-center font-bold">
                            {sale.qtd_parcelas === 1 ? 'X' : ''}
                        </div> 
                        <span className="font-semibold">À VISTA</span>
                    </label>
                </div>
                <div className="border border-black inline-block px-3 py-1 font-bold text-[9px]">
                    CHAVES PIX: 57453624304 - 21967190243
                </div>
            </div>
        </div>
  );
};
"""

with open('components/FichaContent.tsx', 'w') as f:
    f.write(code)
