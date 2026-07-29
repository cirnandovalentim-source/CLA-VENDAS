import os

with open('components/ClientFichaContent.tsx', 'r') as f:
    code = f.read()

# Replace HISTÓRICO DE COMPRAS table header
old_products_th = """                    <tr className="border-b-2 border-black bg-gray-50">
                        <th className="font-bold py-1.5 w-[20%] border-r border-black">DATA</th>
                        <th className="font-bold py-1.5 w-[65%] border-r border-black text-left px-2">DESCRIÇÃO DO PRODUTO</th>
                        <th className="font-bold py-1.5 w-[15%]">QTD</th>
                    </tr>"""
                    
new_products_th = """                    <tr className="border-b-2 border-black bg-gray-50">
                        <th className="font-bold py-1.5 w-[15%] border-r border-black">DATA</th>
                        <th className="font-bold py-1.5 w-[50%] border-r border-black text-left px-2">DESCRIÇÃO DO PRODUTO</th>
                        <th className="font-bold py-1.5 w-[15%] border-r border-black">QTD</th>
                        <th className="font-bold py-1.5 w-[20%]">VALOR (R$)</th>
                    </tr>"""
code = code.replace(old_products_th, new_products_th)

old_products_td = """                    {productRows.slice(0, 8).map((row, i) => (
                        <tr key={i} className="border-b border-gray-300">
                            <td className="py-1 border-r border-black font-semibold">{row.data}</td>
                            <td className="py-1 text-left px-2 truncate max-w-[200px] border-r border-black font-semibold">{row.desc}</td>
                            <td className="py-1 font-semibold">{row.qtd}</td>
                        </tr>
                    ))}"""
                    
new_products_td = """                    {productRows.slice(0, 8).map((row, i) => (
                        <tr key={i} className="border-b border-gray-300">
                            <td className="py-1 border-r border-black font-semibold">{row.data}</td>
                            <td className="py-1 text-left px-2 truncate max-w-[200px] border-r border-black font-semibold">{row.desc}</td>
                            <td className="py-1 border-r border-black font-semibold">{row.qtd}</td>
                            <td className="py-1 font-semibold">{row.valor ? row.valor.toFixed(2) : ''}</td>
                        </tr>
                    ))}"""
code = code.replace(old_products_td, new_products_td)


old_logic = """  // Aggregate all installments
  const sortedInstallments = [...installments].sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
  
  let remaining = sales.reduce((acc, s) => acc + s.valor_total, 0); // start with sum of all sales
  // Actually, remaining should be calculated as we go, or just show the sum of all debts.
  let runningDebt = 0;
  
  // To show chronological history of payments and debts:
  // It's easier to just show the installments list:
  const paymentRows = sortedInstallments.map(p => {
      return {
          vencimento: format(new Date(p.data_vencimento), 'dd/MM/yyyy'),
          pagamento: p.status === 'pago' && p.data_pagamento ? format(new Date(p.data_pagamento), 'dd/MM/yyyy') : '',
          valor: p.valor,
          pago: p.status === 'pago',
      };
  });"""
  
new_logic = """  // Aggregate all installments
  const sortedInstallments = [...installments].sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
  
  let remaining = installments.reduce((acc, i) => acc + i.valor, 0); // Start with total debt from all installments
  
  // To show chronological history of payments and debts:
  const paymentRows = sortedInstallments.map(p => {
      if (p.status === 'pago') remaining -= p.valor;
      return {
          vencimento: format(new Date(p.data_vencimento), 'dd/MM/yyyy'),
          pagamento: p.status === 'pago' && p.data_pagamento ? format(new Date(p.data_pagamento), 'dd/MM/yyyy') : '',
          valor: p.valor,
          pago: p.status === 'pago',
          resta: remaining
      };
  });"""
code = code.replace(old_logic, new_logic)

old_pad = """  // Pad to at least 10 rows
  while (paymentRows.length < 12) {
      paymentRows.push({ vencimento: '', pagamento: '', valor: 0, pago: false });
  }"""
new_pad = """  // Pad to at least 10 rows
  while (paymentRows.length < 12) {
      paymentRows.push({ vencimento: '', pagamento: '', valor: 0, pago: false, resta: 0 });
  }"""
code = code.replace(old_pad, new_pad)


old_payments_th = """                    <tr className="border-b-2 border-black bg-gray-50">
                        <th className="font-bold py-1.5 w-[25%] border-r border-black">VENCIMENTO</th>
                        <th className="font-bold py-1.5 w-[25%] border-r border-black">VALOR</th>
                        <th className="font-bold py-1.5 w-[25%] border-r border-black">DATA PAG.</th>
                        <th className="font-bold py-1.5 w-[25%]">SITUAÇÃO</th>
                    </tr>"""
new_payments_th = """                    <tr className="border-b-2 border-black bg-gray-50">
                        <th className="font-bold py-1.5 w-[20%] border-r border-black">VENCIMENTO</th>
                        <th className="font-bold py-1.5 w-[25%] border-r border-black">DATA PAG.</th>
                        <th className="font-bold py-1.5 w-[20%] border-r border-black">PAGOU (R$)</th>
                        <th className="font-bold py-1.5 w-[20%] border-r border-black">RESTA (R$)</th>
                        <th className="font-bold py-1.5 w-[15%]">SITUAÇÃO</th>
                    </tr>"""
code = code.replace(old_payments_th, new_payments_th)


old_payments_td = """                    {paymentRows.slice(0, 12).map((row, i) => (
                        <tr key={i} className="border-b border-gray-300 h-[20px]">
                            <td className="py-1 border-r border-black font-semibold">{row.vencimento}</td>
                            <td className="py-1 border-r border-black font-semibold">{row.valor ? `R$ ${row.valor.toFixed(2)}` : ''}</td>
                            <td className="py-1 border-r border-black font-semibold">{row.pagamento}</td>
                            <td className="py-1 font-bold">
                                {row.valor > 0 ? (row.pago ? 'PAGO' : 'PENDENTE') : ''}
                            </td>
                        </tr>
                    ))}"""
new_payments_td = """                    {paymentRows.slice(0, 12).map((row, i) => (
                        <tr key={i} className="border-b border-gray-300 h-[20px]">
                            <td className="py-1 border-r border-black font-semibold">{row.vencimento}</td>
                            <td className="py-1 border-r border-black font-semibold">{row.pagamento}</td>
                            <td className="py-1 border-r border-black font-semibold">{row.pago ? row.valor.toFixed(2) : ''}</td>
                            <td className="py-1 border-r border-black font-semibold text-red-700">{row.valor > 0 && row.pago ? row.resta.toFixed(2) : (row.valor > 0 ? row.resta.toFixed(2) : '')}</td>
                            <td className="py-1 font-bold">
                                {row.valor > 0 ? (row.pago ? 'PAGO' : 'PENDENTE') : ''}
                            </td>
                        </tr>
                    ))}"""
code = code.replace(old_payments_td, new_payments_td)

with open('components/ClientFichaContent.tsx', 'w') as f:
    f.write(code)
