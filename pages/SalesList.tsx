
import React, { useEffect, useState } from 'react';
import { ICONS } from '../constants';
import { Card, Badge } from '../components/ui';
import { dataService } from '../services/mockSupabase';
import { Sale } from '../types';
import { format } from 'date-fns';

const SalesList: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);

  useEffect(() => {
    const load = async () => {
      const data = await dataService.getSales();
      setSales(data);
    };
    load();
  }, []);

  return (
    <div className="p-5 animate-fade-in space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Histórico de Vendas</h1>
      
      <div className="space-y-3">
        {sales.map(sale => (
          <Card key={sale.id} className="relative overflow-hidden border border-gray-100 dark:border-[#333]">
             <div className="flex justify-between items-start mb-2">
               <div>
                 <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                    {sale.cliente_nome}
                    {sale.is_mumbuca && (
                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Mumbuca
                        </span>
                    )}
                 </h3>
                 <p className="text-gray-500 text-xs">{format(new Date(sale.data_venda), 'dd/MM/yyyy')}</p>
               </div>
               <Badge status={sale.status} />
             </div>
             <div className="flex justify-between items-end mt-4">
               <div>
                 <p className="text-gray-400 dark:text-gray-500 text-xs uppercase font-bold">Total</p>
                 <p className="text-[#FF7A00] font-black text-xl">R$ {sale.valor_total.toFixed(2)}</p>
               </div>
               <div className="text-right">
                 <p className="text-gray-400 dark:text-gray-500 text-xs uppercase font-bold">Plano</p>
                 <p className="text-gray-700 dark:text-gray-200 font-medium">{sale.qtd_parcelas}x Parcelas</p>
               </div>
             </div>
          </Card>
        ))}
        {sales.length === 0 && (
          <div className="text-center py-10 opacity-70">
              <div className="text-gray-300 mb-2 flex justify-center scale-150">{ICONS.Sales}</div>
              <p className="text-gray-500 font-medium">Nenhuma venda registrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesList;
