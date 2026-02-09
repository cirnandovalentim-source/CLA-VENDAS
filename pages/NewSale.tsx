
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ICONS, ROUTES } from '../constants';
import { Button, Input, Card, Modal } from '../components/ui';
import { dataService, authService } from '../services/mockSupabase';
import { Client, Product, CartItem, Installment } from '../types';
import { addMonths, format } from 'date-fns';

const NewSale: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const session = authService.getSession();
  
  const [step, setStep] = useState<1|2|3>(1);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Search States
  const [clientSearch, setClientSearch] = useState('');
  
  // Sale State
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Payment Logic State
  const [paymentType, setPaymentType] = useState<'AVISTA' | 'PARCELADO'>('PARCELADO');
  const [calcMethod, setCalcMethod] = useState<'QTD' | 'VALOR'>('QTD'); // QTD = Escolher 1x, 2x... | VALOR = Escolher R$ por mês
  const [targetInstallmentValue, setTargetInstallmentValue] = useState(''); // Valor alvo da parcela

  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [generatedInstallments, setGeneratedInstallments] = useState<Omit<Installment, 'id' | 'venda_id'>[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Mumbuca State
  const [isMumbuca, setIsMumbuca] = useState(false);

  // New Product Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    nome: '',
    categoria: '',
    valor_avista: '',
    valor_parcelado: ''
  });

  // 1. Session Check (Crucial for standalone pages)
  useEffect(() => {
    if (!session) {
        alert("Sessão expirada. Faça login novamente.");
        navigate(ROUTES.LOGIN);
    }
  }, [session, navigate]);

  useEffect(() => {
    const init = async () => {
      const [c, p] = await Promise.all([dataService.getClients(), dataService.getProducts()]);
      setClients(c);
      setProducts(p);

      // Handle pre-selected client from navigation state
      const state = location.state as { client?: Client };
      if (state?.client) {
        setSelectedClient(state.client);
        setStep(2);
      }
    };
    init();
  }, [location.state]);

  // -- FILTER LOGIC --
  const normalizeText = (text: string) => {
    return (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };
  
  const cleanPhone = (phone: string) => {
    return (phone || '').replace(/\D/g, '');
  };

  const filteredClients = clients.filter(c => {
    const searchNorm = normalizeText(clientSearch);
    const searchPhone = cleanPhone(clientSearch);
    
    const nameMatch = normalizeText(c.nome).includes(searchNorm);
    const phoneMatch = searchPhone.length > 0 && cleanPhone(c.telefone).includes(searchPhone);
    
    return nameMatch || phoneMatch;
  });

  // -- STEP 1: Select Client --
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setStep(2);
  };

  // -- STEP 2: Products --
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(p => p.id !== productId));
  };

  // Calculations for Totals
  const cartTotalAvista = cart.reduce((acc, item) => acc + (item.valor_avista * item.quantity), 0);
  const cartTotalParcelado = cart.reduce((acc, item) => acc + (item.valor_parcelado * item.quantity), 0);
  
  // Active Total based on Payment Type
  const activeTotal = paymentType === 'AVISTA' ? cartTotalAvista : cartTotalParcelado;

  // -- STEP 2.5: New Product on the fly --
  const handleOpenNewProduct = () => {
      setNewProductForm({ nome: '', categoria: '', valor_avista: '', valor_parcelado: '' });
      setIsProductModalOpen(true);
  };

  const handleSaveNewProduct = async () => {
      if (!newProductForm.nome || !newProductForm.valor_parcelado) return;
      setLoading(true);
      try {
          await dataService.createProduct({
              nome: newProductForm.nome,
              categoria: newProductForm.categoria || 'Geral',
              valor_avista: Number(newProductForm.valor_avista) || 0,
              valor_parcelado: Number(newProductForm.valor_parcelado),
              ativo: true
          });
          
          const updatedProducts = await dataService.getProducts();
          setProducts(updatedProducts);
          setIsProductModalOpen(false);
      } catch (e) {
          console.error(e);
          alert("Erro ao criar produto.");
      } finally {
          setLoading(false);
      }
  };

  // -- STEP 3: Installments Logic --
  
  // Effect: Auto-calculate installments count if user sets a Target Value
  useEffect(() => {
     if (step === 3 && paymentType === 'PARCELADO' && calcMethod === 'VALOR') {
         const val = parseFloat(targetInstallmentValue);
         if (val > 0) {
             const count = Math.ceil(activeTotal / val);
             // Limit between 1 and 24 to avoid crashes
             const safeCount = Math.max(1, Math.min(count, 24));
             setInstallmentsCount(safeCount);
         }
     }
  }, [targetInstallmentValue, activeTotal, paymentType, calcMethod, step]);

  // Effect: Reset to 1 installment if AVISTA
  useEffect(() => {
      if (paymentType === 'AVISTA') {
          setInstallmentsCount(1);
      }
  }, [paymentType]);

  const generateInstallments = () => {
    const list: Omit<Installment, 'id' | 'venda_id'>[] = [];
    const today = new Date();

    // Logic 1: À Vista or Parcelado by Quantity (Even split)
    if (paymentType === 'AVISTA' || (paymentType === 'PARCELADO' && calcMethod === 'QTD')) {
        const baseValue = Math.floor((activeTotal / installmentsCount) * 100) / 100;
        const remainder = Math.round((activeTotal - (baseValue * installmentsCount)) * 100) / 100;
        
        for (let i = 0; i < installmentsCount; i++) {
            let val = baseValue;
            if (i === installmentsCount - 1) val += remainder;

            list.push({
                numero_parcela: i + 1,
                valor: val,
                data_vencimento: addMonths(today, i + 1).toISOString(),
                pago: false
            });
        }
    } 
    // Logic 2: Parcelado by Value (Fixed Installment Value)
    else if (paymentType === 'PARCELADO' && calcMethod === 'VALOR') {
        const fixedVal = parseFloat(targetInstallmentValue) || 0;
        let currentTotal = activeTotal;

        if (fixedVal <= 0) return; // Invalid input

        for (let i = 0; i < installmentsCount; i++) {
            let val = fixedVal;
            // If it's the last one, it takes the remaining (can be smaller)
            if (i === installmentsCount - 1) {
                val = Math.round(currentTotal * 100) / 100;
            }
            
            // Safety check: if remaining is 0 or less, break (should happen at last iteration)
            if (val <= 0.01 && i > 0) break; 

            currentTotal -= val;

            list.push({
                numero_parcela: i + 1,
                valor: val,
                data_vencimento: addMonths(today, i + 1).toISOString(),
                pago: false
            });
        }
    }
    
    setGeneratedInstallments(list);
  };

  useEffect(() => {
    if (step === 3) generateInstallments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installmentsCount, step, paymentType, activeTotal]);

  const handleFinishSale = async () => {
    // 2. Explicit Validation
    if (!session) {
        alert("Erro de autenticação. Faça login novamente.");
        return;
    }
    if (!selectedClient) {
        alert("Erro: Nenhum cliente selecionado.");
        return;
    }
    if (cart.length === 0) {
        alert("Erro: Carrinho vazio.");
        return;
    }

    setLoading(true);
    try {
      // 3. Generate Description
      const description = cart.map(item => `${item.quantity}x ${item.nome}`).join(', ');

      await dataService.createSale({
        cliente_id: selectedClient.id,
        vendedor_id: session.id,
        valor_total: activeTotal,
        qtd_parcelas: installmentsCount,
        data_venda: new Date().toISOString(),
        is_mumbuca: isMumbuca,
        descricao: description
      }, generatedInstallments);
      
      // Success Feedback
      navigate(ROUTES.SALES);
    } catch (e: any) {
      console.error("Erro venda:", e);
      let msg = e.message || "Erro desconhecido";
      
      if (msg.includes('descricao') && msg.includes('does not exist')) {
          msg = "Erro no Banco de Dados: Coluna 'Descrição' não existe. Vá em Configurações > Banco de Dados > Corrigir Erros.";
      }
      
      alert(`Falha ao finalizar venda:\n${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // --- RENDER ---

  return (
    <div className="flex flex-col h-screen bg-[#F3F4F6] dark:bg-[#121212] text-gray-900 dark:text-white transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-[#1E1E1E] p-4 pt-12 flex items-center gap-4 border-b border-gray-100 dark:border-[#333] transition-colors shadow-sm sticky top-0 z-30">
        <button onClick={() => step > 1 ? setStep(prev => prev - 1 as any) : navigate(-1)} className="text-gray-900 dark:text-white">
          {ICONS.Left}
        </button>
        <h1 className="text-lg font-bold">
          {step === 1 ? 'Selecionar Cliente' : step === 2 ? 'Adicionar Produtos' : 'Pagamento'}
        </h1>
        <div className="ml-auto text-xs bg-[#FF7A00]/10 text-[#FF7A00] font-bold px-3 py-1.5 rounded-full">Passo {step}/3</div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {step === 1 && (
          <div className="space-y-4">
             <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10 pointer-events-none">
                    {ICONS.Search}
                </div>
                <Input 
                  placeholder="Buscar por nome ou telefone..." 
                  className="pl-12 py-4 shadow-sm"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  autoFocus
                />
                {clientSearch && (
                  <button 
                    onClick={() => setClientSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {ICONS.Close}
                  </button>
                )}
             </div>
             
             <div className="space-y-3 pb-20">
                 {filteredClients.map(c => (
                   <Card key={c.id} onClick={() => handleClientSelect(c)} className="flex items-center justify-between hover:border-[#FF7A00] cursor-pointer transition-colors group">
                     <div className="flex items-center gap-3">
                       <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#333] flex items-center justify-center text-gray-500 font-bold overflow-hidden border border-gray-200 dark:border-white/10">
                          {c.foto_url ? <img src={c.foto_url} className="w-full h-full object-cover" /> : c.nome.charAt(0)}
                       </div>
                       <div>
                         <p className="font-bold text-gray-900 dark:text-white group-hover:text-[#FF7A00] transition-colors text-lg">{c.nome}</p>
                         <p className="text-gray-500 text-sm">{c.bairro || 'Endereço não informado'}</p>
                       </div>
                     </div>
                     <div className="text-gray-300 group-hover:text-[#FF7A00]">{ICONS.Right}</div>
                   </Card>
                 ))}
                 {filteredClients.length === 0 && (
                     <div className="text-center py-10 opacity-70">
                         <div className="text-gray-300 mb-2 flex justify-center scale-150">{ICONS.Search}</div>
                         <p className="text-gray-500 font-medium">Nenhum cliente encontrado.</p>
                         {clientSearch && <p className="text-xs text-gray-400 mt-1">Tente buscar por outro termo.</p>}
                     </div>
                 )}
             </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                  <h3 className="text-gray-500 text-sm font-bold uppercase">Produtos Disponíveis</h3>
                  <button 
                    onClick={handleOpenNewProduct}
                    className="text-xs bg-[#FF7A00] text-white px-3 py-2 rounded-xl font-bold flex items-center gap-1 shadow-lg shadow-orange-500/20"
                  >
                    {ICONS.Add} Cadastrar Novo
                  </button>
              </div>
              
              <div className="space-y-2 pb-6">
                {products.length === 0 && (
                    <p className="text-gray-500 text-center py-4 text-sm">Nenhum produto cadastrado.</p>
                )}
                {products.map(p => (
                  <div key={p.id} className="bg-white dark:bg-[#1E1E1E] p-4 rounded-3xl flex justify-between items-center border border-gray-100 dark:border-[#333] shadow-sm">
                    <div>
                      <p className="text-gray-900 dark:text-white font-bold">{p.nome}</p>
                      <div className="flex gap-2">
                          <p className="text-[#FF7A00] font-bold text-sm">Prazo: R$ {p.valor_parcelado.toFixed(2)}</p>
                          <p className="text-green-600 font-bold text-sm">Vista: R$ {p.valor_avista.toFixed(2)}</p>
                      </div>
                    </div>
                    <Button variant="secondary" onClick={() => addToCart(p)} className="!p-3 rounded-2xl">
                      {ICONS.Add}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {cart.length > 0 && (
              <div className="border-t-2 border-dashed border-gray-200 dark:border-[#333] pt-6 pb-24">
                <h3 className="text-gray-900 dark:text-white font-bold mb-4">Carrinho</h3>
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center mb-3 bg-white dark:bg-[#1E1E1E] p-3 rounded-2xl border border-gray-100 dark:border-[#333]">
                    <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">{item.quantity}x {item.nome}</span>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                          <p className="text-gray-900 dark:text-white font-bold text-sm">Prazo: R$ {(item.valor_parcelado * item.quantity).toFixed(2)}</p>
                          <p className="text-green-600 font-bold text-xs">Vista: R$ {(item.valor_avista * item.quantity).toFixed(2)}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-red-400 bg-red-50 p-2 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                        {ICONS.Close}
                      </button>
                    </div>
                  </div>
                ))}
                <div className="mt-4 flex justify-between items-center bg-[#FF7A00]/10 p-4 rounded-2xl border border-[#FF7A00]/20">
                  <span className="text-[#FF7A00] font-bold">Total (Prazo)</span>
                  <span className="text-[#FF7A00] font-black text-xl">R$ {cartTotalParcelado.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
           <div className="space-y-6">
             {/* Payment Type Selection */}
             <div className="flex p-1 bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[#333]">
                <button 
                  onClick={() => setPaymentType('PARCELADO')}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex flex-col items-center gap-1 ${paymentType === 'PARCELADO' ? 'bg-[#FF7A00] text-white shadow-md' : 'text-gray-500'}`}
                >
                  <span>PARCELADO</span>
                  <span className="text-xs opacity-80">R$ {cartTotalParcelado.toFixed(2)}</span>
                </button>
                <button 
                  onClick={() => setPaymentType('AVISTA')}
                  className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex flex-col items-center gap-1 ${paymentType === 'AVISTA' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500'}`}
                >
                  <span>À VISTA</span>
                  <span className="text-xs opacity-80">R$ {cartTotalAvista.toFixed(2)}</span>
                </button>
             </div>

             <Card className="text-center py-6 bg-white dark:bg-[#1E1E1E]">
               <p className="text-gray-400 text-xs font-bold uppercase mb-1">Valor Final da Venda</p>
               <h2 className={`text-4xl font-black mb-2 ${paymentType === 'AVISTA' ? 'text-green-600' : 'text-[#FF7A00]'}`}>
                   R$ {activeTotal.toFixed(2)}
               </h2>
               <div className="inline-block bg-gray-100 dark:bg-[#333] px-3 py-1 rounded-full text-xs text-gray-600 dark:text-gray-300 font-bold">
                  Cliente: {selectedClient?.nome}
               </div>
             </Card>

             {/* MUMBUCA TOGGLE */}
             <div 
                onClick={() => setIsMumbuca(!isMumbuca)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${isMumbuca ? 'bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-500' : 'bg-white border-gray-100 dark:bg-[#1E1E1E] dark:border-[#333]'}`}
             >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMumbuca ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400 dark:bg-[#333]'}`}>
                        {ICONS.Wallet}
                    </div>
                    <div>
                        <p className={`font-bold ${isMumbuca ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>Moeda Social Mumbuca</p>
                        <p className="text-xs text-gray-500">Marcar esta venda com pagamento social</p>
                    </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isMumbuca ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
                    {isMumbuca && <span className="text-white text-xs font-bold">✓</span>}
                </div>
             </div>

             {/* INSTALLMENTS CONFIGURATION */}
             {paymentType === 'PARCELADO' && (
                <div className="space-y-3">
                   <div className="flex justify-between items-center">
                       <h3 className="text-gray-700 dark:text-gray-300 font-bold">Configurar Parcelas</h3>
                       <div className="flex bg-gray-200 dark:bg-[#333] rounded-lg p-0.5 text-[10px] font-bold">
                          <button 
                             onClick={() => setCalcMethod('QTD')} 
                             className={`px-2 py-1 rounded-md transition-all ${calcMethod === 'QTD' ? 'bg-white dark:bg-[#555] shadow-sm' : 'text-gray-500'}`}
                          >
                             Quantidade
                          </button>
                          <button 
                             onClick={() => setCalcMethod('VALOR')} 
                             className={`px-2 py-1 rounded-md transition-all ${calcMethod === 'VALOR' ? 'bg-white dark:bg-[#555] shadow-sm' : 'text-gray-500'}`}
                          >
                             Valor Fixo
                          </button>
                       </div>
                   </div>
                   
                   {calcMethod === 'QTD' ? (
                       <div className="grid grid-cols-4 gap-2">
                         {[1,2,3,4,5,6,10,12].map(num => (
                           <button 
                            key={num}
                            onClick={() => setInstallmentsCount(num)}
                            className={`h-12 rounded-2xl font-bold transition-all shadow-sm ${installmentsCount === num ? 'bg-[#FF7A00] text-white shadow-orange-500/30 translate-y-[-2px]' : 'bg-white dark:bg-[#1E1E1E] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-[#333]'}`}
                           >
                             {num}x
                           </button>
                         ))}
                       </div>
                   ) : (
                       <div className="bg-white dark:bg-[#1E1E1E] p-4 rounded-2xl border border-gray-200 dark:border-[#333]">
                           <Input 
                              label="Qual valor o cliente quer pagar por mês?"
                              type="number"
                              placeholder="Ex: 100.00"
                              value={targetInstallmentValue}
                              onChange={(e) => setTargetInstallmentValue(e.target.value)}
                           />
                           <p className="text-xs text-gray-500 mt-2 text-center">
                               Isso gerará aprox. <strong>{installmentsCount}</strong> parcelas.
                           </p>
                       </div>
                   )}
                </div>
             )}

             <div className="space-y-3 pb-24">
               <h3 className="text-gray-900 dark:text-white font-bold ml-1">Resumo das Parcelas</h3>
               {generatedInstallments.map((inst, idx) => (
                 <div key={idx} className="flex justify-between items-center p-4 bg-white dark:bg-[#1E1E1E] rounded-2xl border border-gray-100 dark:border-[#333] shadow-sm">
                   <div className="flex flex-col">
                      <span className="text-gray-900 dark:text-white font-bold text-sm">Parcela {inst.numero_parcela}/{installmentsCount}</span>
                      <span className="text-gray-400 text-xs">{format(new Date(inst.data_vencimento), 'dd/MM/yyyy')}</span>
                   </div>
                   <span className="text-[#FF7A00] font-bold text-lg">R$ {inst.valor.toFixed(2)}</span>
                 </div>
               ))}
             </div>
           </div>
        )}
      </div>

      <div className="p-4 bg-white dark:bg-[#1E1E1E] border-t border-gray-100 dark:border-[#333] sticky bottom-0 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] rounded-t-[20px]">
        {step === 2 && (
          <Button 
            fullWidth 
            onClick={() => setStep(3)} 
            disabled={cart.length === 0}
            className="py-4 text-lg"
          >
            Continuar para Pagamento
          </Button>
        )}
        {step === 3 && (
          <Button fullWidth onClick={handleFinishSale} isLoading={loading} className="py-4 text-lg">
            Finalizar Venda {isMumbuca && '(Mumbuca)'}
          </Button>
        )}
      </div>

      <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Novo Produto Rápido">
         <div className="space-y-4">
            <Input 
                label="Nome do Produto"
                value={newProductForm.nome}
                onChange={(e) => setNewProductForm({...newProductForm, nome: e.target.value})}
            />
            <Input 
                label="Categoria (Opcional)"
                value={newProductForm.categoria}
                onChange={(e) => setNewProductForm({...newProductForm, categoria: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="Valor à Vista"
                    type="number"
                    value={newProductForm.valor_avista}
                    onChange={(e) => setNewProductForm({...newProductForm, valor_avista: e.target.value})}
                />
                <Input 
                    label="Valor Parcelado *"
                    type="number"
                    value={newProductForm.valor_parcelado}
                    onChange={(e) => setNewProductForm({...newProductForm, valor_parcelado: e.target.value})}
                />
            </div>
            <Button fullWidth onClick={handleSaveNewProduct} isLoading={loading}>
                Cadastrar e Adicionar
            </Button>
         </div>
      </Modal>

    </div>
  );
};

export default NewSale;
