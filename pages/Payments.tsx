
import React, { useEffect, useState } from 'react';
import { ICONS, COLORS } from '../constants';
import { Card, Badge, Modal, Button, Input } from '../components/ui';
import { dataService, authService } from '../services/mockSupabase';
import { Installment, CashEntry } from '../types';
import { format, isToday, isPast, addDays, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Payments: React.FC = () => {
  const session = authService.getSession();
  const [view, setView] = useState<'due' | 'cash'>('due');
  
  // Due List (Route) State
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dueList, setDueList] = useState<(Installment & { cliente_nome: string, venda_id: string, is_mumbuca?: boolean })[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [showOverdue, setShowOverdue] = useState(false);
  const [showMumbucaOnly, setShowMumbucaOnly] = useState(false);

  // Cash Flow State
  const [cashFlow, setCashFlow] = useState<CashEntry[]>([]);
  const [cashPeriod, setCashPeriod] = useState<'day' | 'week' | 'month'>('day');
  
  const [loading, setLoading] = useState(false);
  
  // Modals state
  const [confirmItem, setConfirmItem] = useState<(Installment & { cliente_nome: string }) | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [deleteCashId, setDeleteCashId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({ descricao: '', valor: '', categoria: '' });

  const loadData = async () => {
    // 1. Load Route (Daily Collection)
    const routeData = await dataService.getInstallmentsByDate(selectedDate);
    
    if (showOverdue) {
        const allDue = await dataService.getDueInstallments();
        setDueList(allDue);
    } else {
        setDueList(routeData.daily);
    }
    setOverdueCount(routeData.overdueCount);

    // 2. Load Cash
    const flow = await dataService.getCashFlow();
    setCashFlow(flow);
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, showOverdue]);

  const handleOpenPayment = (item: Installment & { cliente_nome: string, venda_id: string }) => {
      setConfirmItem(item);
      setPaymentAmount(item.valor.toFixed(2));
  };

  const handlePay = async () => {
    if (!confirmItem || !session || !paymentAmount) return;
    setLoading(true);
    try {
      await dataService.payInstallment(confirmItem.id, session.id, parseFloat(paymentAmount));
      await loadData();
      setConfirmItem(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.descricao || !expenseForm.valor || !session) return;
    setLoading(true);
    try {
      await dataService.addExpense(expenseForm.descricao, parseFloat(expenseForm.valor), session.id, expenseForm.categoria);
      await loadData();
      setShowExpenseModal(false);
      setExpenseForm({ descricao: '', valor: '', categoria: '' });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCashEntry = async () => {
      if (!deleteCashId) return;
      setLoading(true);
      try {
          await dataService.deleteCashEntry(deleteCashId);
          await loadData();
          setDeleteCashId(null);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  // Date Navigation Helpers
  const nextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const prevDay = () => setSelectedDate(subDays(selectedDate, 1));

  // Calculations
  const filteredDueList = dueList.filter(item => !showMumbucaOnly || item.is_mumbuca);
  const totalDoDia = filteredDueList.reduce((acc, i) => acc + i.valor, 0);

  // Cash Flow Calculations based on Period
  const getFilteredCashFlow = () => {
      const now = new Date();
      let start, end;

      switch (cashPeriod) {
          case 'day':
              start = startOfDay(now);
              end = endOfDay(now);
              break;
          case 'week':
              start = startOfWeek(now, { weekStartsOn: 1 }); // Segunda-feira
              end = endOfWeek(now, { weekStartsOn: 1 });
              break;
          case 'month':
              start = startOfMonth(now);
              end = endOfMonth(now);
              break;
      }

      return cashFlow.filter(entry => 
          isWithinInterval(new Date(entry.data), { start, end })
      );
  };

  const filteredCash = getFilteredCashFlow();
  const cashEntradas = filteredCash.filter(c => c.tipo === 'ENTRADA').reduce((acc, c) => acc + c.valor, 0);
  const cashSaidas = filteredCash.filter(c => c.tipo === 'SAIDA').reduce((acc, c) => acc + c.valor, 0);
  const cashSaldo = cashEntradas - cashSaidas;

  // Logic to show adjustment message
  const difference = confirmItem ? Number((confirmItem.valor - parseFloat(paymentAmount || '0')).toFixed(2)) : 0;

  return (
    <div className="p-5 animate-fade-in pb-24">
      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setView('due')}
          className={`flex-1 pb-2 font-bold text-lg transition-colors border-b-2 ${view === 'due' ? 'text-brand-primary border-brand-primary' : 'text-gray-400 dark:text-gray-500 border-transparent'}`}
        >
          A Receber
        </button>
        <button 
          onClick={() => setView('cash')}
          className={`flex-1 pb-2 font-bold text-lg transition-colors border-b-2 ${view === 'cash' ? 'text-brand-primary border-brand-primary' : 'text-gray-400 dark:text-gray-500 border-transparent'}`}
        >
          Caixa
        </button>
      </div>

      {view === 'due' && (
        <div className="space-y-4">
          {/* Date Navigator */}
          <div className="bg-white dark:bg-[#1E1E1E] p-3 rounded-2xl flex items-center justify-between border border-gray-200 dark:border-[#333] shadow-sm">
             <button onClick={prevDay} className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5 rounded-lg">
                {ICONS.Left}
             </button>
             
             <div className="flex flex-col items-center">
                <input 
                  type="date" 
                  className="bg-transparent text-gray-900 dark:text-white font-bold text-center text-lg focus:outline-none"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
                />
                <span className="text-xs text-gray-500 capitalize">
                   {isToday(selectedDate) ? 'Hoje' : format(selectedDate, 'EEEE', { locale: ptBR })}
                </span>
             </div>

             <button onClick={nextDay} className="p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5 rounded-lg">
                {ICONS.Right}
             </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
             <button 
               onClick={() => setShowMumbucaOnly(!showMumbucaOnly)}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-colors whitespace-nowrap border ${showMumbucaOnly ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-[#1E1E1E] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#333]'}`}
             >
                {ICONS.Wallet} Apenas Mumbuca {showMumbucaOnly && '✓'}
             </button>
          </div>
          
          {/* Summary for the day */}
          <div className="flex justify-between items-center px-2">
             <span className="text-gray-500 dark:text-gray-400 text-sm">Total da Rota:</span>
             <span className="text-gray-900 dark:text-white font-bold text-lg">R$ {totalDoDia.toFixed(2)}</span>
          </div>
          
          {/* Overdue Alert */}
          {overdueCount > 0 && !showOverdue && (
             <div 
                onClick={() => setShowOverdue(true)}
                className="bg-red-50 border border-red-100 dark:bg-red-900/10 dark:border-red-500/20 p-3 rounded-xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform"
             >
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                   {ICONS.Alert}
                   <span>Existem <strong>{overdueCount}</strong> parcelas atrasadas anteriores.</span>
                </div>
                <div className="text-red-600 dark:text-red-400 text-xs font-bold underline">Ver Todas</div>
             </div>
          )}
          
          {/* Back to Day View button if Overdue is showing */}
          {showOverdue && (
              <Button variant="secondary" onClick={() => setShowOverdue(false)} fullWidth className="mb-2">
                 Voltar para Rota do Dia ({format(selectedDate, 'dd/MM')})
              </Button>
          )}

          {/* List */}
          {filteredDueList.length === 0 ? (
            <div className="text-center text-gray-500 py-10">
              <div className="mb-2 opacity-50 flex justify-center">{ICONS.Check}</div>
              <p>Nenhuma cobrança {showOverdue ? 'pendente' : 'para esta data'}.</p>
            </div>
          ) : (
            filteredDueList.map(item => {
              const overdue = isPast(new Date(item.data_vencimento)) && !isToday(new Date(item.data_vencimento));
              return (
                <Card key={item.id} className={`flex justify-between items-center border-l-4 ${overdue ? 'border-l-red-500' : 'border-l-brand-primary'}`}>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {item.cliente_nome}
                        {item.is_mumbuca && (
                            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                Mumbuca
                            </span>
                        )}
                    </h4>
                    <p className="text-sm text-gray-500">Parcela {item.numero_parcela}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {overdue && <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-bold">Atrasado</span>}
                      <span className="text-xs text-gray-500 dark:text-gray-400">{format(new Date(item.data_vencimento), 'dd/MM/yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-bold text-lg text-gray-900 dark:text-white">R$ {item.valor.toFixed(2)}</span>
                    <button 
                      onClick={() => handleOpenPayment(item)}
                      className="text-xs bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-500/20 active:bg-green-200 dark:active:bg-green-500/20 font-medium"
                    >
                      Receber
                    </button>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {view === 'cash' && (
        <div className="space-y-6">
          
          {/* Period Selector */}
          <div className="flex p-1 bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[#333]">
              <button 
                onClick={() => setCashPeriod('day')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${cashPeriod === 'day' ? 'bg-brand-primary text-white shadow-md' : 'text-gray-500'}`}
              >
                Hoje
              </button>
              <button 
                onClick={() => setCashPeriod('week')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${cashPeriod === 'week' ? 'bg-brand-primary text-white shadow-md' : 'text-gray-500'}`}
              >
                Semana
              </button>
              <button 
                onClick={() => setCashPeriod('month')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all ${cashPeriod === 'month' ? 'bg-brand-primary text-white shadow-md' : 'text-gray-500'}`}
              >
                Mês
              </button>
          </div>

          {/* Caixa Detalhado Summary */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded-2xl border border-gray-200 dark:border-[#333] col-span-2 shadow-sm">
                <p className="text-gray-500 text-sm">
                    Saldo 
                    {cashPeriod === 'day' ? ' do Dia' : cashPeriod === 'week' ? ' Semanal' : ' Mensal'}
                </p>
                <h2 className={`text-3xl font-bold ${cashSaldo >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-500'}`}>
                  R$ {cashSaldo.toFixed(2)}
                </h2>
             </div>
             <div className="bg-white dark:bg-[#1E1E1E] p-3 rounded-xl border border-gray-200 dark:border-[#333] shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-2 h-2 rounded-full bg-green-500"></div>
                   <p className="text-xs text-gray-500">Entradas</p>
                </div>
                <p className="text-green-600 dark:text-green-500 font-bold">R$ {cashEntradas.toFixed(2)}</p>
             </div>
             <div className="bg-white dark:bg-[#1E1E1E] p-3 rounded-xl border border-gray-200 dark:border-[#333] shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-2 h-2 rounded-full bg-red-500"></div>
                   <p className="text-xs text-gray-500">Saídas</p>
                </div>
                <p className="text-red-600 dark:text-red-400 font-bold">R$ {cashSaidas.toFixed(2)}</p>
             </div>
          </div>

          <div className="flex justify-between items-center">
             <h3 className="text-gray-900 dark:text-white font-bold">Movimentações ({filteredCash.length})</h3>
             <button 
                onClick={() => setShowExpenseModal(true)}
                className="text-xs bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg font-medium hover:bg-red-200 dark:hover:bg-red-500/20 flex items-center gap-1"
             >
                {ICONS.Add} Despesa
             </button>
          </div>

          <div className="space-y-3">
            {filteredCash.map(entry => (
               <div key={entry.id} className="flex justify-between items-center p-3 bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${entry.tipo === 'ENTRADA' ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-500' : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-500'}`}>
                      {entry.tipo === 'ENTRADA' ? ICONS.Trending : ICONS.Alert}
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-medium">{entry.descricao}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-gray-500">{format(new Date(entry.data), 'dd/MM HH:mm')}</p>
                        {entry.categoria && (
                          <span className="text-[10px] bg-gray-100 dark:bg-[#333] text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                            {entry.categoria}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-bold ${entry.tipo === 'ENTRADA' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {entry.tipo === 'ENTRADA' ? '+' : '-'} R$ {entry.valor.toFixed(2)}
                    </span>
                    <button 
                        onClick={() => setDeleteCashId(entry.id)}
                        className="text-xs text-gray-400 hover:text-red-500"
                    >
                        {ICONS.Trash}
                    </button>
                  </div>
               </div>
            ))}
            {filteredCash.length === 0 && (
              <p className="text-center text-gray-500 py-4 text-sm">
                  Nenhuma movimentação {cashPeriod === 'day' ? 'hoje' : 'neste período'}.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal isOpen={!!confirmItem} onClose={() => setConfirmItem(null)} title="Confirmar Recebimento">
        <div className="space-y-6 text-center">
           <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center text-green-600 dark:text-green-500 mx-auto">
             {ICONS.Check}
           </div>
           <div>
             {confirmItem && (
               <>
                 <p className="text-gray-600 dark:text-gray-300">Receber de <strong className="text-gray-900 dark:text-white">{confirmItem.cliente_nome}</strong>?</p>
                 <p className="text-xs text-gray-500 mt-2 mb-4">Parcela {confirmItem.numero_parcela} • Vencimento {format(new Date(confirmItem.data_vencimento), 'dd/MM/yyyy')}</p>
                 
                 <div className="text-left bg-gray-50 dark:bg-[#121212] p-3 rounded-lg border border-gray-200 dark:border-[#333]">
                     <Input 
                        label="Valor Recebido (R$)" 
                        type="number"
                        step="0.01"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="text-center font-bold text-xl text-green-600 dark:text-green-500"
                     />
                     
                     {/* Feedback Logic */}
                     {difference > 0 && (
                         <div className="mt-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 rounded">
                             Faltam <strong>R$ {difference.toFixed(2)}</strong>. Este valor será somado à próxima parcela (ou criado uma nova).
                         </div>
                     )}
                     {difference < 0 && (
                         <div className="mt-2 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-2 rounded">
                             Pagou <strong>R$ {Math.abs(difference).toFixed(2)}</strong> a mais. Este valor será descontado da próxima parcela.
                         </div>
                     )}
                 </div>
               </>
             )}
           </div>
           <div className="grid grid-cols-2 gap-3">
             <Button variant="secondary" onClick={() => setConfirmItem(null)}>Cancelar</Button>
             <Button onClick={handlePay} isLoading={loading} className="bg-green-600 hover:bg-green-700 border-none shadow-green-900/20">
               Confirmar
             </Button>
           </div>
        </div>
      </Modal>

      {/* Add Expense Modal */}
      <Modal isOpen={showExpenseModal} onClose={() => setShowExpenseModal(false)} title="Nova Despesa">
         <div className="space-y-4">
            <Input 
               label="Descrição" 
               placeholder="Ex: Combustível, Almoço..."
               value={expenseForm.descricao}
               onChange={(e) => setExpenseForm(prev => ({ ...prev, descricao: e.target.value }))}
            />
            <div className="space-y-1">
               <label className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">Categoria</label>
               <select
                  className="w-full bg-white dark:bg-[#2E2E2E] border border-gray-300 dark:border-[#404040] rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:border-brand-primary dark:focus:border-brand-primary transition-colors"
                  value={expenseForm.categoria}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, categoria: e.target.value }))}
               >
                  <option value="">Selecione uma categoria (opcional)</option>
                  <option value="Alimentação">Alimentação</option>
                  <option value="Combustível">Combustível</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Material de Escritório">Material de Escritório</option>
                  <option value="Outros">Outros</option>
               </select>
            </div>
            <Input 
               label="Valor (R$)" 
               type="number"
               step="0.01"
               placeholder="0,00"
               value={expenseForm.valor}
               onChange={(e) => setExpenseForm(prev => ({ ...prev, valor: e.target.value }))}
            />
            <Button 
               fullWidth 
               onClick={handleAddExpense} 
               isLoading={loading}
               variant="danger"
               className="mt-2"
            >
               Lançar Saída
            </Button>
         </div>
      </Modal>

      {/* Delete Cash Entry Modal */}
      <Modal isOpen={!!deleteCashId} onClose={() => setDeleteCashId(null)} title="Excluir Lançamento">
         <div className="text-center space-y-4">
             <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto">
                {ICONS.Trash}
             </div>
             <p className="text-gray-600 dark:text-gray-300">Tem certeza que deseja excluir este lançamento do caixa? O saldo será recalculado.</p>
             <div className="grid grid-cols-2 gap-3">
                 <Button variant="secondary" onClick={() => setDeleteCashId(null)}>Cancelar</Button>
                 <Button variant="danger" onClick={handleDeleteCashEntry} isLoading={loading}>Excluir</Button>
             </div>
         </div>
      </Modal>
    </div>
  );
};

export default Payments;
