import os

with open('components/FichaContent.tsx', 'r') as f:
    code = f.read()

old_logic = """  const sortedInstallments = [...installments].sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
  
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
  }"""
  
new_logic = """  const sortedInstallments = [...installments].sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
  
  let remaining = installments.reduce((acc, i) => acc + i.valor, 0);
  let paymentRows = sortedInstallments.map(p => {
      if (p.status === 'pago') remaining -= p.valor;
      return {
          vencimento: format(new Date(p.data_vencimento), 'dd/MM/yyyy'),
          date: p.status === 'pago' && p.data_pagamento ? format(new Date(p.data_pagamento), 'dd/MM/yyyy') : '',
          pagou: p.status === 'pago' ? p.valor : 0,
          resta: remaining
      };
  });

  while (paymentRows.length < 6) {
      paymentRows.push({ vencimento: '', date: '', pagou: 0, resta: 0 });
  }"""
code = code.replace(old_logic, new_logic)

old_table = """            <table className="w-full text-[9px] border-collapse border border-black text-center mb-1">
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
            </table>"""
            
new_table = """            <table className="w-full text-[9px] border-collapse border border-black text-center mb-1">
                <thead>
                    <tr className="border-b border-black">
                        <th className="font-bold py-1 w-[25%] border-r border-black">VENCIMENTO</th>
                        <th className="font-bold py-1 w-[25%] border-r border-black">DATA PAG.</th>
                        <th className="font-bold py-1 w-[25%] border-r border-black">PAGOU</th>
                        <th className="font-bold py-1 w-[25%]">RESTA</th>
                    </tr>
                </thead>
                <tbody>
                    {paymentRows.slice(0, 6).map((row, i) => (
                        <tr key={i} className="h-[14px] border-b border-gray-300">
                            <td className="py-0.5 font-semibold border-r border-black">{row.vencimento}</td>
                            <td className="py-0.5 font-semibold border-r border-black">{row.date}</td>
                            <td className="py-0.5 font-semibold border-r border-black">{row.pagou ? row.pagou.toFixed(2) : ''}</td>
                            <td className="py-0.5 font-semibold text-red-700">{row.pagou || row.resta > 0 ? row.resta.toFixed(2) : (row.vencimento ? row.resta.toFixed(2) : '')}</td>
                        </tr>
                    ))}
                </tbody>
            </table>"""
code = code.replace(old_table, new_table)

with open('components/FichaContent.tsx', 'w') as f:
    f.write(code)
