import os

with open('components/FichaContent.tsx', 'r') as f:
    code = f.read()

old_logic = """  let productRows = productsDesc.map(p => {
      const match = p.match(/^(\\d+)x\\s+(.+)$/);
      if (match) {
          return { qtd: match[1], desc: match[2].toUpperCase() };
      }
      return { qtd: '1', desc: p.toUpperCase() };
  });

  while (productRows.length < 4) {
      productRows.push({ qtd: '', desc: '' });
  }"""
  
new_logic = """  let productRows: any[] = productsDesc.map((p, idx) => {
      let qtd = '1';
      let desc = p.toUpperCase();
      const match = p.match(/^(\\d+)x\\s+(.+)$/);
      if (match) {
          qtd = match[1];
          desc = match[2].toUpperCase();
      }
      return { 
          qtd, 
          desc,
          valor: idx === 0 ? sale.valor_total : null
      };
  });

  while (productRows.length < 4) {
      productRows.push({ qtd: '', desc: '', valor: null });
  }"""
code = code.replace(old_logic, new_logic)

old_table = """            <table className="w-full text-[9px] border-collapse mb-2 text-center border border-black">
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
            </table>"""

new_table = """            <table className="w-full text-[9px] border-collapse mb-2 text-center border border-black">
                <thead>
                    <tr className="border-b border-black">
                        <th className="font-bold py-1 text-left w-[60%] px-1 border-r border-black">DESCRIÇÃO DO PRODUTO</th>
                        <th className="font-bold py-1 w-[15%] border-r border-black">QUANT</th>
                        <th className="font-bold py-1 w-[25%]">PREÇO (R$)</th>
                    </tr>
                </thead>
                <tbody>
                    {productRows.slice(0, 4).map((row, i) => (
                        <tr key={i} className="border-b border-gray-300">
                            <td className="py-0.5 text-left px-1 truncate max-w-[150px] font-semibold border-r border-black">{row.desc}</td>
                            <td className="py-0.5 font-semibold border-r border-black">{row.qtd}</td>
                            <td className="py-0.5 font-semibold">{row.valor !== null ? row.valor.toFixed(2) : ''}</td>
                        </tr>
                    ))}
                </tbody>
            </table>"""
code = code.replace(old_table, new_table)

with open('components/FichaContent.tsx', 'w') as f:
    f.write(code)
