
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ICONS, ROUTES } from '../constants';
import { Button, Card, Modal, Input } from '../components/ui';
import { dataService, authService } from '../services/mockSupabase';
import { User, Sale, CashEntry } from '../types';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const SellerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = authService.getSession();
  
  const [seller, setSeller] = useState<User | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  // Data State
  const [sales, setSales] = useState<Sale[]>([]);
  const [cashFlow, setCashFlow] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'sales' | 'extract'>('sales');

  // Modals
  const [showValeModal, setShowValeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [transactionForm, setTransactionForm] = useState({ valor: '', descricao: '' });

  // 1. Security Check
  useEffect(() => {
      if (!session || session.perfil !== 'admin') {
          alert("Acesso restrito a administradores.");
          navigate(ROUTES.DASHBOARD);
      }
  }, [session, navigate]);

  // 2. Load Initial Data
  useEffect(() => {
      const init = async () => {
          if (!id) return;
          const user = await dataService.getUserById(id);
          if (user) setSeller(user);
          else navigate(ROUTES.SELLERS);
      };
      init();
  }, [id]);

  // 3. Fetch Financial Data
  const loadFinancials = async () => {
      if (!id) return;
      setLoading(true);
      try {
          const start = new Date(startDate);
          start.setHours(0,0,0,0);
          const end = new Date(endDate);
          end.setHours(23,59,59,999);

          // Get All Data filtered manually
          const [allSales, allCash] = await Promise.all([
              dataService.getSales(),
              dataService.getCashFlow(id) // Pass ID to get cash flow for THIS seller
          ]);

          const filteredSales = allSales.filter(s => 
              s.vendedor_id === id && 
              isWithinInterval(new Date(s.data_venda), { start, end })
          );

          // For cash flow, we want entries where this seller is involved
          // Note: In mockSupabase, addExpense uses the ID passed as `vendedor_id`.
          const filteredCash = allCash.filter(c => 
              c.vendedor_id === id && 
              isWithinInterval(new Date(c.data), { start, end })
          );

          setSales(filteredSales);
          setCashFlow(filteredCash);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      loadFinancials();
  }, [startDate, endDate, id]);

  // --- Calculations ---
  const totalSold = sales.reduce((acc, s) => acc + s.valor_total, 0);
  const commissionRate = seller?.comissao_porcentagem || 0;
  const commissionEarned = (totalSold * commissionRate) / 100;

  // "Vales" e "Pagamentos" são SAÍDAS no caixa vinculadas a este vendedor
  const deductions = cashFlow
      .filter(c => c.tipo === 'SAIDA')
      .reduce((acc, c) => acc + c.valor, 0);

  const balanceToPay = commissionEarned - deductions;

  // --- Handlers ---
  const handleAddTransaction = async (type: 'VALE' | 'PAGAMENTO') => {
      if (!id || !transactionForm.valor) return;
      setLoading(true);
      try {
          const val = parseFloat(transactionForm.valor);
          const desc = type === 'VALE' 
              ? `[VALE] ${transactionForm.descricao || 'Adiantamento'}` 
              : `[PGTO COMISSÃO] ${transactionForm.descricao || 'Fechamento de Conta'}`;
          
          await dataService.addExpense(desc, val, id);
          
          await loadFinancials();
          setShowValeModal(false);
          setShowPaymentModal(false);
          setTransactionForm({ valor: '', descricao: '' });
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  if (!seller) return null;

  return (
    <div className="flex flex-col h-screen bg-[#F3F4F6] dark:bg-[#121212] transition-colors">
      
      {/* Header */}
      <div className="bg-white dark:bg-[#1E1E1E] p-4 flex items-center gap-4 border-b border-gray-100 dark:border-[#333] sticky top-0 z-10 shadow-sm">
        <button 
            onClick={() => navigate(-1)} 
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#333] text-gray-900 dark:text-white transition-colors"
        >
          {ICONS.Left}
        </button>
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#333] flex items-center justify-center text-gray-500 font-bold border border-gray-200 dark:border-white/10">
                {seller.nome.charAt(0).toUpperCase()}
            </div>
            <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{seller.nome}</h1>
                <p className="text-xs text-gray-500">Gestão Financeira</p>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24 space-y-4">
         
         {/* Date Filter */}
         <div className="grid grid-cols-2 gap-3 bg-white dark:bg-[#1E1E1E] p-3 rounded-2xl border border-gray-200 dark:border-[#333] shadow-sm">
             <div>
                 <label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Início</label>
                 <input 
                   type="date" 
                   className="w-full bg-gray-50 dark:bg-[#2E2E2E] border border-gray-200 dark:border-[#404040] rounded-xl px-2 py-2 text-gray-900 dark:text-white text-xs font-bold"
                   value={startDate}
                   onChange={(e) => setStartDate(e.target.value)}
                 />
             </div>
             <div>
                 <label className="text-[10px] font-bold text-gray-400 ml-1 uppercase">Fim</label>
                 <input 
                   type="date" 
                   className="w-full bg-gray-50 dark:bg-[#2E2E2E] border border-gray-200 dark:border-[#404040] rounded-xl px-2 py-2 text-gray-900 dark:text-white text-xs font-bold"
                   value={endDate}
                   onChange={(e) => setEndDate(e.target.value)}
                 />
             </div>
         </div>

         {/* Summary Cards */}
         <div className="grid grid-cols-2 gap-3">
             <Card className="flex flex-col justify-between">
                 <p className="text-xs text-gray-500 font-bold uppercase">Total Vendido</p>
                 <p className="text-lg font-black text-gray-900 dark:text-white">R$ {totalSold.toFixed(2)}</p>
             </Card>
             <Card className="flex flex-col justify-between border-l-4 border-l-brand-primary">
                 <div className="flex justify-between items-center">
                    <p className="text-xs text-brand-primary font-bold uppercase">Comissão ({commissionRate}%)</p>
                 </div>
                 <p className="text-lg font-black text-brand-primary">R$ {commissionEarned.toFixed(2)}</p>
             </Card>
             <Card className="flex flex-col justify-between border-l-4 border-l-red-500">
                 <p className="text-xs text-red-500 font-bold uppercase">Vales / Pagos</p>
                 <p className="text-lg font-black text-red-600 dark:text-red-400">- R$ {deductions.toFixed(2)}</p>
             </Card>
             <Card className={`flex flex-col justify-between border-l-4 ${balanceToPay >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
                 <p className="text-xs text-gray-500 font-bold uppercase">Saldo a Pagar</p>
                 <p className={`text-lg font-black ${balanceToPay >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                     R$ {balanceToPay.toFixed(2)}
                 </p>
             </Card>
         </div>

         {/* Actions */}
         <div className="flex gap-2">
             <Button 
                variant="danger" 
                className="flex-1 text-xs py-3" 
                onClick={() => { setTransactionForm({ valor: '', descricao: '' }); setShowValeModal(true); }}
             >
                 {ICONS.Money} Cadastrar Vale
             </Button>
             <Button 
                className="flex-1 text-xs py-3 bg-green-600 hover:bg-green-700" 
                onClick={() => { setTransactionForm({ valor: Math.max(0, balanceToPay).toFixed(2), descricao: '' }); setShowPaymentModal(true); }}
             >
                 {ICONS.Check} Pagar Comissão
             </Button>
         </div>

         {/* List Section */}
         <div>
             <div className="flex border-b border-gray-200 dark:border-[#333] mb-2">
                 <button 
                    onClick={() => setActiveTab('sales')}
                    className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'sales' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-400'}`}
                 >
                    Vendas ({sales.length})
                 </button>
                 <button 
                    onClick={() => setActiveTab('extract')}
                    className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'extract' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-400'}`}
                 >
                    Extrato ({cashFlow.filter(c => c.tipo === 'SAIDA').length})
                 </button>
             </div>

             <div className="space-y-2">
                 {activeTab === 'sales' && sales.map(sale => (
                     <div key={sale.id} className="bg-white dark:bg-[#1E1E1E] p-3 rounded-xl border border-gray-100 dark:border-[#333] flex justify-between items-center">
                         <div>
                             <p className="font-bold text-gray-900 dark:text-white text-sm">{sale.cliente_nome}</p>
                             <p className="text-xs text-gray-500">{format(new Date(sale.data_venda), 'dd/MM/yyyy')}</p>
                         </div>
                         <div className="text-right">
                             <p className="font-bold text-brand-primary">R$ {sale.valor_total.toFixed(2)}</p>
                             <p className="text-[10px] text-gray-400 font-bold uppercase">Comissão: R$ {(sale.valor_total * commissionRate / 100).toFixed(2)}</p>
                         </div>
                     </div>
                 ))}

                 {activeTab === 'extract' && cashFlow.filter(c => c.tipo === 'SAIDA').map(entry => (
                     <div key={entry.id} className="bg-white dark:bg-[#1E1E1E] p-3 rounded-xl border border-gray-100 dark:border-[#333] flex justify-between items-center">
                         <div>
                             <p className="font-bold text-gray-900 dark:text-white text-sm">{entry.descricao}</p>
                             <p className="text-xs text-gray-500">{format(new Date(entry.data), 'dd/MM/yyyy HH:mm')}</p>
                         </div>
                         <p className="font-bold text-red-500">- R$ {entry.valor.toFixed(2)}</p>
                     </div>
                 ))}
                 
                 {(activeTab === 'sales' ? sales.length : cashFlow.filter(c => c.tipo === 'SAIDA').length) === 0 && (
                     <p className="text-center text-gray-400 text-sm py-4">Nenhum registro no período.</p>
                 )}
             </div>
         </div>
      </div>

      {/* --- Modals --- */}
      <Modal isOpen={showValeModal} onClose={() => setShowValeModal(false)} title="Cadastrar Vale">
          <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-900/30 text-xs text-yellow-700 dark:text-yellow-400">
                  Isso será registrado como uma SAÍDA no caixa vinculada a este vendedor.
              </div>
              <Input 
                  label="Valor (R$)"
                  type="number"
                  value={transactionForm.valor}
                  onChange={(e) => setTransactionForm({ ...transactionForm, valor: e.target.value })}
              />
              <Input 
                  label="Descrição (Opcional)"
                  placeholder="Ex: Adiantamento semanal"
                  value={transactionForm.descricao}
                  onChange={(e) => setTransactionForm({ ...transactionForm, descricao: e.target.value })}
              />
              <Button fullWidth onClick={() => handleAddTransaction('VALE')} isLoading={loading} variant="danger">
                  Confirmar Desconto
              </Button>
          </div>
      </Modal>

      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Pagar Comissão">
          <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-900/30 text-xs text-green-700 dark:text-green-400">
                  Confirme o valor para zerar o saldo pendente.
              </div>
              <Input 
                  label="Valor a Pagar (R$)"
                  type="number"
                  value={transactionForm.valor}
                  onChange={(e) => setTransactionForm({ ...transactionForm, valor: e.target.value })}
              />
              <Input 
                  label="Observação (Opcional)"
                  placeholder="Ex: Ref. mês de Agosto"
                  value={transactionForm.descricao}
                  onChange={(e) => setTransactionForm({ ...transactionForm, descricao: e.target.value })}
              />
              <Button fullWidth onClick={() => handleAddTransaction('PAGAMENTO')} isLoading={loading} className="bg-green-600 hover:bg-green-700">
                  Confirmar Pagamento
              </Button>
          </div>
      </Modal>

    </div>
  );
};

export default SellerDetails;
