
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS, COLORS } from '../constants';
import { Card, Badge } from '../components/ui';
import { dataService } from '../services/mockSupabase';
import { DailyReport, User, Sale, CashEntry } from '../types';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Date Filters (default current month)
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  // Seller Filter
  const [sellers, setSellers] = useState<User[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  
  // Data State
  const [salesList, setSalesList] = useState<Sale[]>([]);
  const [receiptsList, setReceiptsList] = useState<CashEntry[]>([]);
  const [dailyData, setDailyData] = useState<DailyReport[]>([]);
  const [summary, setSummary] = useState({ totalSales: 0, totalReceipts: 0 });
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'sales' | 'receipts'>('sales');

  // Load Sellers on mount
  useEffect(() => {
    const fetchSellers = async () => {
      const data = await dataService.getSellers();
      setSellers(data);
    };
    fetchSellers();
  }, []);

  // Load Reports Data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await dataService.getDetailedReports(
        new Date(startDate), 
        new Date(endDate),
        selectedSeller
      );
      setSalesList(data.sales);
      setReceiptsList(data.receipts);
      setDailyData(data.dailyData);
      setSummary(data.summary);
      setLoading(false);
    };
    loadData();
  }, [startDate, endDate, selectedSeller]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#2E2E2E] p-3 border border-gray-200 dark:border-white/10 rounded-lg shadow-xl">
          <p className="text-gray-900 dark:text-white font-bold mb-1">{label}</p>
          {payload.map((p: any, idx: number) => (
             <p key={idx} style={{ color: p.color }} className="text-sm">
               {p.name}: R$ {p.value.toFixed(2)}
             </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col h-screen bg-[#F3F4F6] dark:bg-[#121212] transition-colors">
      <div className="bg-white dark:bg-[#1E1E1E] p-4 flex items-center gap-4 border-b border-gray-100 dark:border-[#333] sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="text-gray-900 dark:text-white">
          {ICONS.Left}
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Relatório Geral</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24 space-y-6">
        
        {/* Filters Section */}
        <div className="grid grid-cols-2 gap-3 bg-white dark:bg-[#262626] p-4 rounded-2xl border border-gray-200 dark:border-white/5 shadow-sm">
           <div className="col-span-2 space-y-1">
             <label className="text-xs text-gray-500 dark:text-gray-400 ml-1">Filtrar por Vendedor</label>
             <select
                className="w-full bg-gray-50 dark:bg-[#2E2E2E] border border-gray-200 dark:border-[#404040] rounded-xl px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#FF7A00]"
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
             >
                <option value="all">Todos os Vendedores</option>
                {sellers.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
             </select>
           </div>
           <div className="space-y-1">
             <label className="text-xs text-gray-500 dark:text-gray-400 ml-1">Início</label>
             <input 
               type="date" 
               className="w-full bg-gray-50 dark:bg-[#2E2E2E] border border-gray-200 dark:border-[#404040] rounded-xl px-3 py-2 text-gray-900 dark:text-white text-sm"
               value={startDate}
               onChange={(e) => setStartDate(e.target.value)}
             />
           </div>
           <div className="space-y-1">
             <label className="text-xs text-gray-500 dark:text-gray-400 ml-1">Fim</label>
             <input 
               type="date" 
               className="w-full bg-gray-50 dark:bg-[#2E2E2E] border border-gray-200 dark:border-[#404040] rounded-xl px-3 py-2 text-gray-900 dark:text-white text-sm"
               value={endDate}
               onChange={(e) => setEndDate(e.target.value)}
             />
           </div>
        </div>

        {/* Global Stats for Filtered Period */}
        <div className="grid grid-cols-2 gap-3">
           <Card className="text-center p-3">
             <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#FF7A00]" />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Total Vendido</p>
             </div>
             <p className="text-gray-900 dark:text-white font-bold text-xl sm:text-2xl">R$ {summary.totalSales.toFixed(0)}</p>
           </Card>
           <Card className="text-center p-3">
             <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Total Recebido</p>
             </div>
             <p className="text-green-600 dark:text-green-500 font-bold text-xl sm:text-2xl">R$ {summary.totalReceipts.toFixed(0)}</p>
           </Card>
        </div>

        {/* Chart: Sales vs Receipts */}
        <Card className="h-72 pb-2 flex flex-col">
           <h3 className="text-gray-900 dark:text-white font-bold mb-2 text-sm px-2">Evolução no Período</h3>
           <div className="flex-1 w-full min-h-[200px]">
             {loading ? (
               <div className="h-full flex items-center justify-center text-gray-500 text-sm">Carregando...</div>
             ) : dailyData.length === 0 ? (
               <div className="h-full flex items-center justify-center text-gray-500 text-sm">Sem dados no período</div>
             ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={dailyData}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                   <XAxis dataKey="data" stroke="#999" fontSize={12} tickLine={false} axisLine={false} />
                   <Tooltip content={<CustomTooltip />} />
                   <Line type="monotone" dataKey="vendas" name="Vendas" stroke={COLORS.primary} strokeWidth={3} dot={false} />
                   <Line type="monotone" dataKey="recebimentos" name="Recebimentos" stroke={COLORS.success} strokeWidth={3} dot={false} />
                 </LineChart>
               </ResponsiveContainer>
             )}
           </div>
        </Card>

        {/* Transaction Lists */}
        <div>
           {/* Tabs */}
           <div className="flex gap-4 mb-4 border-b border-gray-200 dark:border-white/10">
              <button 
                 onClick={() => setActiveTab('sales')}
                 className={`pb-2 px-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'sales' ? 'text-[#FF7A00] border-[#FF7A00]' : 'text-gray-500 border-transparent hover:text-gray-900 dark:hover:text-white'}`}
              >
                 Vendas ({salesList.length})
              </button>
              <button 
                 onClick={() => setActiveTab('receipts')}
                 className={`pb-2 px-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'receipts' ? 'text-[#FF7A00] border-[#FF7A00]' : 'text-gray-500 border-transparent hover:text-gray-900 dark:hover:text-white'}`}
              >
                 Recebimentos ({receiptsList.length})
              </button>
           </div>

           {/* List Content */}
           <div className="space-y-3 min-h-[200px]">
              {loading ? (
                 <p className="text-gray-500 text-center py-4">Carregando dados...</p>
              ) : activeTab === 'sales' ? (
                 salesList.length === 0 ? (
                    <p className="text-gray-500 text-center py-4 text-sm">Nenhuma venda encontrada.</p>
                 ) : (
                    salesList.map(sale => (
                       <Card key={sale.id} className="flex justify-between items-center py-3">
                          <div>
                             <p className="text-gray-900 dark:text-white font-bold">{sale.cliente_nome}</p>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">{format(new Date(sale.data_venda), 'dd/MM/yyyy')}</span>
                                <Badge status={sale.status} />
                             </div>
                          </div>
                          <div className="text-right">
                             <p className="text-[#FF7A00] font-bold">R$ {sale.valor_total.toFixed(2)}</p>
                             <p className="text-[10px] text-gray-500 font-bold uppercase">{sale.qtd_parcelas}x</p>
                          </div>
                       </Card>
                    ))
                 )
              ) : (
                 receiptsList.length === 0 ? (
                    <p className="text-gray-500 text-center py-4 text-sm">Nenhum recebimento encontrado.</p>
                 ) : (
                    receiptsList.map(receipt => (
                       <Card key={receipt.id} className="flex justify-between items-center py-3">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                                {ICONS.Trending}
                             </div>
                             <div>
                                <p className="text-gray-900 dark:text-white font-bold text-sm">{receipt.descricao}</p>
                                <p className="text-xs text-gray-500">{format(new Date(receipt.data), 'dd/MM/yyyy HH:mm')}</p>
                             </div>
                          </div>
                          <p className="text-green-600 dark:text-green-500 font-bold">R$ {receipt.valor.toFixed(2)}</p>
                       </Card>
                    ))
                 )
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
