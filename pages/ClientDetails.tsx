
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ICONS, ROUTES } from '../constants';
import { Button, Card, Badge, Modal, Input } from '../components/ui';
import { ReceiptModal } from '../components/ReceiptModal';
import { FichaModal } from '../components/FichaModal';
import { ClientFichaModal } from '../components/ClientFichaModal';
import { dataService, authService } from '../services/mockSupabase';
import { Client, Sale, Installment, Product } from '../types';
import { format } from 'date-fns';

const ClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = authService.getSession();
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const [client, setClient] = useState<Client | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]); // New
  const [installmentsMap, setInstallmentsMap] = useState<Record<string, Installment[]>>({});
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  
  // Modals
  const [editInstallment, setEditInstallment] = useState<Installment | null>(null);
  const [payInstallment, setPayInstallment] = useState<Installment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null);
  const [returnSaleId, setReturnSaleId] = useState<string | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editSaleForm, setEditSaleForm] = useState({ total: '', descricao: '' });
  
  // Add Item State
  const [productSearch, setProductSearch] = useState('');
  const [qtyToAdd, setQtyToAdd] = useState(1);

  // Mumbuca Modal State
  const [isMumbucaModalOpen, setIsMumbucaModalOpen] = useState(false);
  const [mumbucaForm, setMumbucaForm] = useState({ cpf: '', password: '' });

  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [isClientFichaOpen, setIsClientFichaOpen] = useState(false);

  // Adjust Debt State
  const [isAdjustDebtOpen, setIsAdjustDebtOpen] = useState(false);
  const [newDebtValue, setNewDebtValue] = useState('');
  const [updateDatesCheck, setUpdateDatesCheck] = useState(true);

  // File Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<{ 
      type: 'SALE' | 'INSTALLMENT', 
      data: any,
      totalValue: number,
      remaining: number,
      description: string,
      history: { date: string, paid: number, remaining: number }[]
  } | null>(null);

  // Ficha Modal State
  const [fichaData, setFichaData] = useState<{
      sale: Sale;
      installments: Installment[];
  } | null>(null);

  // Forms
  const [editForm, setEditForm] = useState({ valor: '', data_vencimento: '' });
  const [clientForm, setClientForm] = useState<Partial<Client>>({});

  const isAdmin = session?.perfil === 'admin';

  const loadData = async () => {
    if (!id) return;
    const clientData = await dataService.getClientById(id);
    const salesData = await dataService.getSalesByClient(id);
    const productsData = await dataService.getProducts(); // Fetch Products
    setClient(clientData || null);
    setSales(salesData);
    setProducts(productsData);

    const map: Record<string, Installment[]> = {};
    for (const sale of salesData) {
      map[sale.id] = await dataService.getInstallmentsBySale(sale.id);
    }
    setInstallmentsMap(map);
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const toggleSale = async (saleId: string) => {
    if (expandedSale === saleId) {
      setExpandedSale(null);
    } else {
      setExpandedSale(saleId);
      const data = await dataService.getInstallmentsBySale(saleId);
      setInstallmentsMap(prev => ({ ...prev, [saleId]: data }));
    }
  };

  // --- RECEIPT CALCULATOR ---
  const openReceipt = (type: 'SALE' | 'INSTALLMENT', dataItem: any, saleId: string, installmentsOverride?: Installment[]) => {
      const currentSale = sales.find(s => s.id === saleId);
      const saleInstallments = installmentsOverride || installmentsMap[saleId] || [];
      
      if (!currentSale) return;

      // 1. Calculate History of Payments (Sort by Date Paid)
      const paidInstallments = saleInstallments
        .filter(i => i.pago)
        .sort((a, b) => {
            const dateA = new Date(a.data_pagamento || a.data_vencimento).getTime();
            const dateB = new Date(b.data_pagamento || b.data_vencimento).getTime();
            return dateA - dateB;
        });

      // CALCULATE DYNAMIC TOTAL (Based on Installments Sum) to handle interest/discounts
      const dynamicTotal = saleInstallments.reduce((acc, curr) => acc + curr.valor, 0);

      let runningBalance = dynamicTotal;
      const history = paidInstallments.map(inst => {
          runningBalance -= inst.valor;
          return {
              date: inst.data_pagamento || new Date().toISOString(),
              paid: inst.valor,
              remaining: Math.max(0, runningBalance)
          };
      });

      // 2. Final Remaining Balance
      const totalPaid = saleInstallments
        .filter(i => i.pago)
        .reduce((acc, curr) => acc + curr.valor, 0);

      const remaining = Math.max(0, dynamicTotal - totalPaid);

      // 3. Determine Description
      let description = currentSale.descricao || "Produtos Diversos";
      if (type === 'INSTALLMENT') {
          description = `Parc. ${dataItem.numero_parcela} - ${description}`;
      }

      setReceiptData({
          type,
          data: dataItem,
          totalValue: dynamicTotal,
          remaining: remaining,
          description: description,
          history: history
      });
  };

  const openFicha = (sale: Sale, saleId: string) => {
      const saleInstallments = installmentsMap[saleId] || [];
      setFichaData({ sale, installments: saleInstallments });
  };

  const handleOpenMumbuca = () => {
      if (!client) return;
      setMumbucaForm({
          cpf: client.cpf || '',
          password: client.mumbuca_password || ''
      });
      setIsMumbucaModalOpen(true);
  };

  const handleSaveMumbuca = async () => {
      if (!client) return;
      setLoading(true);
      try {
          await dataService.updateClient(client.id, {
              cpf: mumbucaForm.cpf,
              mumbuca_password: mumbucaForm.password
          });
          
          // Update local client state immediately
          setClient(prev => prev ? ({ ...prev, cpf: mumbucaForm.cpf, mumbuca_password: mumbucaForm.password }) : null);
          
          setIsMumbucaModalOpen(false);
          alert("Dados Mumbuca atualizados com sucesso!");
      } catch (e) {
          console.error(e);
          alert("Erro ao salvar dados Mumbuca.");
      } finally {
          setLoading(false);
      }
  };

  const handleToggleMumbuca = async (sale: Sale) => {
      setLoading(true);
      try {
          const newValue = !sale.is_mumbuca;
          await dataService.updateSale(sale.id, { is_mumbuca: newValue });
          
          // Se estiver marcando como mumbuca, garante que o cliente também seja marcado
          if (newValue && client && !client.is_mumbuca) {
              await dataService.updateClient(client.id, { is_mumbuca: true });
              setClient(prev => prev ? { ...prev, is_mumbuca: true } : null);
          }
          
          await loadData();
      } catch (e) {
          console.error(e);
          alert("Erro ao atualizar status Mumbuca da venda.");
      } finally {
          setLoading(false);
      }
  };

  const handleOpenEditClient = () => {
      if(client) {
          setClientForm(client);
          setSelectedFile(null);
          setIsEditClientOpen(true);
      }
  };

  const handleOpenEditSale = (sale: Sale) => {
      const installments = installmentsMap[sale.id] || [];
      const currentTotal = installments.reduce((acc, i) => acc + i.valor, 0);
      setEditingSale(sale);
      setEditSaleForm({
          total: currentTotal.toFixed(2),
          descricao: sale.descricao || ''
      });
      setProductSearch('');
      setQtyToAdd(1);
  };

  const handleAddItem = (product: Product) => {
      if (!editingSale) return;
      
      const qty = qtyToAdd > 0 ? qtyToAdd : 1;
      const addedValue = product.valor_parcelado * qty;
      const currentTotal = parseFloat(editSaleForm.total) || 0;
      const newTotal = currentTotal + addedValue;
      
      const itemString = `${qty}x ${product.nome}`;
      const currentDesc = editSaleForm.descricao || '';
      const newDesc = currentDesc ? `${currentDesc}, ${itemString}` : itemString;
      
      setEditSaleForm({
          total: newTotal.toFixed(2),
          descricao: newDesc
      });
      
      setProductSearch('');
      setQtyToAdd(1);
  };

  const handleRemoveItem = (itemString: string) => {
      // itemString format: "2x Nome do Produto"
      const match = itemString.match(/^(\d+)x\s+(.*)$/);
      if (!match) return; // Can't parse, can't auto-remove value
      
      const qty = parseInt(match[1]);
      const name = match[2];
      
      // Try to find product to deduct price
      const product = products.find(p => p.nome.toLowerCase() === name.toLowerCase());
      
      if (product) {
          const deductValue = product.valor_parcelado * qty;
          const currentTotal = parseFloat(editSaleForm.total) || 0;
          const newTotal = Math.max(0, currentTotal - deductValue);
          
          // Remove string from description
          // Need to handle commas correctly
          let newDesc = editSaleForm.descricao;
          // Try exact match with comma before
          newDesc = newDesc.replace(`, ${itemString}`, '');
          // Try exact match with comma after
          newDesc = newDesc.replace(`${itemString}, `, '');
          // Try exact match alone
          newDesc = newDesc.replace(itemString, '');
          
          setEditSaleForm({
              total: newTotal.toFixed(2),
              descricao: newDesc.trim()
          });
      } else {
          // If product not found (name changed or deleted), just remove text
          if (confirm(`Produto "${name}" não encontrado no catálogo. Remover apenas o texto da descrição? (O valor total NÃO será alterado)`)) {
              let newDesc = editSaleForm.descricao;
              newDesc = newDesc.replace(`, ${itemString}`, '');
              newDesc = newDesc.replace(`${itemString}, `, '');
              newDesc = newDesc.replace(itemString, '');
              setEditSaleForm(prev => ({ ...prev, descricao: newDesc.trim() }));
          }
      }
  };

  const getDetectedItems = (desc: string) => {
      if (!desc) return [];
      return desc.split(',').map(s => s.trim()).filter(s => s.match(/^\d+x\s+/));
  };

  const handleSaveSaleEdit = async () => {
    if (!editingSale) return;
    setLoading(true);
    try {
        const newTotal = parseFloat(editSaleForm.total);
        const currentInstallments = installmentsMap[editingSale.id] || [];
        const currentTotal = currentInstallments.reduce((acc, i) => acc + i.valor, 0);
        const diff = newTotal - currentTotal;

        // 1. Update Description
        await dataService.updateSale(editingSale.id, { descricao: editSaleForm.descricao });

        // 2. Update Installments if Total Changed
        if (Math.abs(diff) > 0.01) {
             const unpaid = currentInstallments
                .filter(i => !i.pago)
                .sort((a, b) => b.numero_parcela - a.numero_parcela); // Start from last

             if (unpaid.length === 0) {
                 alert("Não é possível alterar o valor de uma venda totalmente paga.");
                 setLoading(false);
                 return;
             }

             let remainingDiff = diff;
             
             for (const inst of unpaid) {
                 if (Math.abs(remainingDiff) < 0.01) break;

                 const newInstValue = inst.valor + remainingDiff;
                 
                 if (newInstValue < 0) {
                     // Installment becomes 0 (or negative, which we cap at 0)
                     // We consume 'inst.valor' amount of the negative diff
                     remainingDiff += inst.valor; 
                     await dataService.updateInstallment(inst.id, { valor: 0 });
                 } else {
                     // Installment absorbs all remaining diff
                     await dataService.updateInstallment(inst.id, { valor: newInstValue });
                     remainingDiff = 0;
                 }
             }

             if (Math.abs(remainingDiff) > 0.01) {
                 alert("Atenção: O desconto foi maior que o saldo devedor. O valor total foi ajustado para o limite do possível.");
             }
        }

        await loadData();
        setEditingSale(null);
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar alterações.");
    } finally {
        setLoading(false);
    }
  };

  const compressImage = (file: File): Promise<{ base64: string, blob: Blob }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                // Base64
                const base64 = canvas.toDataURL('image/jpeg', 0.7);
                
                // Blob
                canvas.toBlob((blob) => {
                    if(blob) resolve({ base64, blob });
                    else reject(new Error("Blob error"));
                }, 'image/jpeg', 0.7);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProcessingImage(true);
      try {
          const { base64, blob } = await compressImage(file);
          setClientForm(prev => ({ ...prev, foto_url: base64 }));
          setSelectedFile(new File([blob], file.name, { type: 'image/jpeg' }));
      } catch (err) {
          console.error(err);
      } finally {
          setProcessingImage(false);
      }
    }
  };

  const handleSaveClient = async () => {
      if(!client || !id) return;
      if(!clientForm.nome || !clientForm.telefone) {
          alert("Nome e Telefone são obrigatórios.");
          return;
      }
      setLoading(true);
      try {
          let finalPhotoUrl = clientForm.foto_url;

          if (selectedFile) {
              const url = await dataService.uploadClientPhoto(selectedFile, id);
              if (url) {
                  finalPhotoUrl = url;
              }
          }

          const { id: _, ...formFields } = clientForm as any;
          const updates = { ...formFields, foto_url: finalPhotoUrl };
          
          await dataService.updateClient(id, updates);
          await loadData();
          setIsEditClientOpen(false);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleDeleteSale = async () => {
      if (!deleteSaleId) return;
      setLoading(true);
      try {
          await dataService.deleteSale(deleteSaleId);
          await loadData();
          setDeleteSaleId(null);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleReturnSale = async () => {
      if (!returnSaleId) return;
      setLoading(true);
      try {
          await dataService.returnSale(returnSaleId);
          await loadData();
          setReturnSaleId(null);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  const handleOpenEdit = (inst: Installment) => {
    setEditInstallment(inst);
    setEditForm({
      valor: inst.valor.toString(),
      data_vencimento: inst.data_vencimento.split('T')[0]
    });
  };

  const handleSaveEdit = async () => {
    if (!editInstallment) return;
    setLoading(true);
    try {
      await dataService.updateInstallment(editInstallment.id, {
        valor: parseFloat(editForm.valor),
        data_vencimento: new Date(editForm.data_vencimento).toISOString()
      });
      await loadData();
      setEditInstallment(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdjustDebt = async () => {
    if (!client || !session) return;
    const val = parseFloat(newDebtValue);
    if (isNaN(val) || val < 0) {
      alert("Por favor, digite um valor válido para o saldo devedor.");
      return;
    }
    setLoading(true);
    try {
      await dataService.adjustClientDebt(client.id, val, session.id, updateDatesCheck);
      await loadData();
      setIsAdjustDebtOpen(false);
      alert("Saldo devedor e parcelas atualizados com sucesso!");
    } catch (e: any) {
      console.error(e);
      alert("Erro ao atualizar saldo devedor.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPay = (inst: Installment) => {
      setPayInstallment(inst);
      setPaymentAmount(inst.valor.toFixed(2));
  };

  const handlePay = async () => {
    if (!payInstallment || !session || !paymentAmount) return;
    setLoading(true);
    try {
      const actualPaid = parseFloat(paymentAmount);
      await dataService.payInstallment(payInstallment.id, session.id, actualPaid);
      
      // Get FRESH installments to generate correct history for receipt immediately
      const freshInstallments = await dataService.getInstallmentsBySale(payInstallment.venda_id);
      
      // Background update of UI
      loadData(); 
      
      const updatedInst = freshInstallments.find(i => i.id === payInstallment.id);
      
      if (updatedInst) {
        openReceipt('INSTALLMENT', updatedInst, payInstallment.venda_id, freshInstallments);
      }
      
      setPayInstallment(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const allInstallments: Installment[] = (Object.values(installmentsMap) as Installment[][]).reduce((acc, val) => acc.concat(val), [] as Installment[]);
  
  // DYNAMIC CALCULATIONS:
  // Instead of relying on static Sale Value, we calculate based on the actual installments
  // This ensures that if installments are split/increased, the "Total Bought" reflects it.
  const totalPaid = allInstallments.filter(i => i.pago).reduce((acc, i) => acc + i.valor, 0);
  const totalDebt = allInstallments.filter(i => !i.pago).reduce((acc, i) => acc + i.valor, 0);
  const totalBought = totalPaid + totalDebt;

  // Difference Calc for Modal
  const payDiff = payInstallment ? Number((payInstallment.valor - parseFloat(paymentAmount || '0')).toFixed(2)) : 0;

  if (!client) return <div className="p-5 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-[#121212] transition-colors">
      <div className="bg-white dark:bg-[#1E1E1E] p-4 flex items-center gap-4 border-b border-gray-200 dark:border-[#333] sticky top-0 z-10 transition-colors shadow-sm">
        <button onClick={() => navigate(-1)} className="text-gray-900 dark:text-white">
          {ICONS.Left}
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white flex-1 truncate">{client.nome}</h1>
        {isAdmin && (
            <button onClick={handleOpenEditClient} className="text-brand-primary">
                {ICONS.Edit}
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24 space-y-6">
        <Card>
           <div className="flex items-start gap-4 mb-4">
               <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#333] flex items-center justify-center overflow-hidden border-2 border-brand-primary text-gray-500 font-bold text-2xl shrink-0">
                  {client.foto_url ? (
                      <img src={client.foto_url} alt={client.nome} className="w-full h-full object-cover" />
                  ) : (
                      client.nome.charAt(0).toUpperCase()
                  )}
               </div>
               <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{client.nome}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Cliente desde {new Date().getFullYear()}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-1 mt-1">
                     <span className="mt-0.5 opacity-70 shrink-0">{ICONS.Map}</span>
                     <span className="leading-tight">
                        {client.endereco}
                        {client.bairro ? ` - ${client.bairro}` : ''}
                        {client.cidade ? ` - ${client.cidade}` : ''}
                     </span>
                  </p>
               </div>
           </div>
           <div className="flex items-center justify-between border-t border-gray-100 dark:border-[#333] pt-4">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                 {ICONS.Phone} {client.telefone}
              </div>
              <a href={`https://wa.me/55${client.telefone.replace(/\D/g, '')}`} target="_blank" className="bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-500 p-2 rounded-lg">
                {ICONS.Phone}
              </a>
           </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
           <Card className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">Total Comprado</p>
              <p className="text-gray-900 dark:text-white font-bold text-lg">R$ {totalBought.toFixed(2)}</p>
           </Card>
           <Card 
              onClick={() => {
                  setNewDebtValue(totalDebt.toFixed(2));
                  setIsAdjustDebtOpen(true);
              }}
              className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] shadow-sm cursor-pointer hover:border-brand-primary/50 transition-colors relative group"
           >
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">Em Aberto</p>
                      <p className="text-brand-primary font-bold text-lg">R$ {totalDebt.toFixed(2)}</p>
                  </div>
                  <span className="text-[11px] text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded font-bold flex items-center gap-1 mt-0.5 hover:bg-brand-primary/20">
                      {ICONS.Edit} Ajustar
                  </span>
              </div>
           </Card>
        </div>

        <div className="grid grid-cols-3 gap-2">
           <button 
               onClick={() => {
                   const pending = allInstallments.filter(i => !i.pago).sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
                   if (pending.length > 0) {
                       handleOpenPay(pending[0]);
                   } else {
                       alert("Não há parcelas pendentes para este cliente.");
                   }
               }}
               className="bg-brand-primary text-white py-3 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-brand-primary/90 transition-colors"
           >
               {ICONS.Payments} Receber
           </button>
           <button 
               onClick={() => {
                   setNewDebtValue(totalDebt.toFixed(2));
                   setIsAdjustDebtOpen(true);
               }}
               className="bg-amber-500/10 text-amber-600 dark:text-amber-400 py-3 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
           >
               {ICONS.Edit} Ajustar Saldo
           </button>
           <button 
               onClick={() => setIsClientFichaOpen(true)}
               className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 py-3 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-indigo-100 dark:border-indigo-800/30 hover:bg-indigo-100 transition-colors"
           >
               {ICONS.Printer} Imprimir Ficha
           </button>
        </div>

        <h2 className="text-gray-900 dark:text-white font-bold text-lg pt-2">Histórico de Compras</h2>
        <div className="space-y-3">
           {sales.map(sale => {
              const installments = installmentsMap[sale.id] || [];
              const isExpanded = expandedSale === sale.id;
              const isReturned = sale.status === 'DEVOLVIDO';
              
              // Dynamic sale total based on installments
              const saleDynamicTotal = installments.reduce((acc, i) => acc + i.valor, 0);

              return (
                <div key={sale.id} className={`bg-white dark:bg-[#1E1E1E] rounded-2xl overflow-hidden border transition-colors shadow-sm ${isReturned ? 'border-red-200 dark:border-red-900/30 opacity-70' : 'border-gray-200 dark:border-[#333]'}`}>
                   <div 
                      onClick={() => toggleSale(sale.id)}
                      className="p-4 flex justify-between items-center cursor-pointer active:bg-gray-50 dark:active:bg-[#252525]"
                   >
                      <div>
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-900 dark:text-white font-bold">Compra #{sale.id.substring(0,6)}</span>
                            <Badge status={sale.status} />
                         </div>
                         {sale.descricao && (
                             <p className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">
                                 {sale.descricao}
                             </p>
                         )}
                         <div className="flex items-center gap-2">
                             <p className="text-gray-500 dark:text-gray-400 text-xs">
                                {format(new Date(sale.data_venda), 'dd/MM/yyyy')} • {sale.qtd_parcelas} parcelas
                             </p>
                             {sale.is_mumbuca && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleOpenMumbuca(); }}
                                    className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold hover:bg-red-600 transition-colors shadow-sm"
                                >
                                    Mumbuca
                                </button>
                             )}
                         </div>
                      </div>
                      <div className="text-right">
                         <p className={`font-bold ${isReturned ? 'text-gray-400 line-through' : 'text-brand-primary'}`}>
                            R$ {saleDynamicTotal.toFixed(2)}
                         </p>
                         <div className="flex justify-end mt-1 text-gray-500">
                           {isExpanded ? ICONS.Up : ICONS.Down}
                         </div>
                      </div>
                   </div>

                   {isExpanded && (
                      <div className="bg-gray-50 dark:bg-[#121212] border-t border-gray-200 dark:border-[#333] p-3 space-y-2">
                           <div className="flex justify-between px-1 pb-2 gap-2 flex-wrap">
                                <div className="flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); openReceipt('SALE', sale, sale.id); }} className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1 hover:underline">
                                        {ICONS.Printer} Recibo
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); openFicha(sale, sale.id); }} className="text-xs text-indigo-500 dark:text-indigo-400 flex items-center gap-1 hover:underline">
                                        {ICONS.FileText} Ficha
                                    </button>
                                    {isAdmin && !isReturned && (
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenEditSale(sale); }} className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1 hover:underline">
                                            {ICONS.Edit} Editar
                                        </button>
                                    )}
                                    {isAdmin && !isReturned && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleToggleMumbuca(sale); }} 
                                            className={`text-xs flex items-center gap-1 hover:underline ${sale.is_mumbuca ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}
                                        >
                                            {ICONS.Wallet} {sale.is_mumbuca ? 'Remover Mumbuca' : 'Marcar Mumbuca'}
                                        </button>
                                    )}
                                </div>
                                {isAdmin && !isReturned && (
                                    <div className="flex gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); setReturnSaleId(sale.id); }} className="text-xs text-brand-primary dark:text-brand-primary/80 flex items-center gap-1 hover:underline">
                                            {ICONS.Return} Devolver
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setDeleteSaleId(sale.id); }} className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1 hover:underline">
                                            {ICONS.Trash} Excluir
                                        </button>
                                    </div>
                                )}
                           </div>
                           {installments.map(inst => (
                              <div key={inst.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm">
                                 <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${inst.pago ? 'bg-green-500' : 'bg-brand-primary'}`} />
                                    <div>
                                       <p className="text-gray-900 dark:text-white text-sm font-medium">Parcela {inst.numero_parcela}</p>
                                       <p className="text-gray-500 text-xs">{format(new Date(inst.data_vencimento), 'dd/MM/yyyy')}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <span className={`text-sm font-bold ${inst.pago ? 'text-green-600 dark:text-green-500 line-through opacity-70' : 'text-gray-900 dark:text-white'}`}>
                                       R$ {inst.valor.toFixed(2)}
                                    </span>
                                    {inst.pago ? (
                                        <button onClick={() => openReceipt('INSTALLMENT', inst, inst.venda_id)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                                            {ICONS.Printer}
                                        </button>
                                    ) : !isReturned && (
                                       <div className="flex gap-1">
                                         {isAdmin && (
                                             <button onClick={() => handleOpenEdit(inst)} className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                                                {ICONS.Edit}
                                             </button>
                                         )}
                                         <button onClick={() => handleOpenPay(inst)} className="px-2 py-1.5 text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg flex items-center gap-1 font-bold text-xs bg-green-50 dark:bg-green-900/10">
                                            {ICONS.Check} Pagar
                                         </button>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           ))}
                      </div>
                   )}
                </div>
              );
           })}
        </div>
      </div>

      <Modal isOpen={isEditClientOpen} onClose={() => setIsEditClientOpen(false)} title="Editar Cliente">
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
             <div className="relative">
                <div 
                  onClick={() => photoInputRef.current?.click()}
                  className={`w-24 h-24 rounded-full bg-gray-100 dark:bg-[#333] border-2 border-dashed ${processingImage ? 'border-brand-primary animate-pulse' : 'border-gray-300 dark:border-gray-500'} flex items-center justify-center overflow-hidden cursor-pointer hover:border-brand-primary transition-colors`}
                >
                   {clientForm.foto_url ? (
                     <img src={clientForm.foto_url} alt="Foto" className="w-full h-full object-cover" />
                   ) : (
                     <div className="text-gray-400 flex flex-col items-center">
                        {ICONS.Camera}
                        <span className="text-[10px] mt-1">{processingImage ? 'Processando...' : 'Foto'}</span>
                     </div>
                   )}
                </div>
                {clientForm.foto_url && (
                   <button 
                     onClick={() => {
                        setClientForm(prev => ({ ...prev, foto_url: '' }));
                        setSelectedFile(null);
                     }}
                     className="absolute bottom-0 right-0 bg-red-500 text-white p-1 rounded-full shadow-lg"
                     title="Remover foto"
                   >
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                   </button>
                )}
             </div>
             <input type="file" accept="image/*" ref={photoInputRef} className="hidden" onChange={handlePhotoChange} />
          </div>

          <Input label="Nome Completo" value={clientForm.nome || ''} onChange={e => setClientForm({...clientForm, nome: e.target.value})} />
          <Input label="Telefone" type="tel" value={clientForm.telefone || ''} onChange={e => setClientForm({...clientForm, telefone: e.target.value})} />
          <Input label="Endereço" value={clientForm.endereco || ''} onChange={e => setClientForm({...clientForm, endereco: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Bairro" value={clientForm.bairro || ''} onChange={e => setClientForm({...clientForm, bairro: e.target.value})} />
            <Input label="Cidade" value={clientForm.cidade || ''} onChange={e => setClientForm({...clientForm, cidade: e.target.value})} />
          </div>
          <Button fullWidth onClick={handleSaveClient} isLoading={loading} disabled={processingImage}>
            Salvar Alterações
          </Button>
        </div>
      </Modal>

      {/* Edit Installment, Pay, Return, Delete Modals */}
      <Modal isOpen={!!editInstallment} onClose={() => setEditInstallment(null)} title="Editar Parcela">
        <div className="space-y-4">
           <Input label="Valor" type="number" value={editForm.valor} onChange={(e) => setEditForm(prev => ({ ...prev, valor: e.target.value }))} />
           <Input label="Vencimento" type="date" value={editForm.data_vencimento} onChange={(e) => setEditForm(prev => ({ ...prev, data_vencimento: e.target.value }))} />
           <Button fullWidth onClick={handleSaveEdit} isLoading={loading}>Salvar</Button>
        </div>
      </Modal>

      <Modal isOpen={!!payInstallment} onClose={() => setPayInstallment(null)} title="Receber Parcela">
        <div className="text-center space-y-4">
           <p className="text-gray-600 dark:text-gray-300">Confirmar recebimento?</p>
           <Input label="Valor Recebido" type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="text-center font-bold text-xl text-green-600 dark:text-green-500" />
           
           {/* Feedback Logic */}
           {payDiff > 0 && (
               <div className="mt-2 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-2 rounded">
                   Faltam <strong>R$ {payDiff.toFixed(2)}</strong>. Este valor será somado à próxima parcela (ou criado uma nova).
               </div>
           )}
           {payDiff < 0 && (
               <div className="mt-2 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-2 rounded">
                   Pagou <strong>R$ {Math.abs(payDiff).toFixed(2)}</strong> a mais. Este valor será descontado da próxima parcela.
               </div>
           )}

           <div className="grid grid-cols-2 gap-3 pt-2">
             <Button variant="secondary" onClick={() => setPayInstallment(null)}>Cancelar</Button>
             <Button onClick={handlePay} isLoading={loading} className="bg-green-600">Confirmar</Button>
           </div>
        </div>
      </Modal>

      <Modal isOpen={!!returnSaleId} onClose={() => setReturnSaleId(null)} title="Devolver Produto">
         <div className="text-center space-y-4">
             <p className="text-gray-600 dark:text-gray-300">Confirmar devolução?</p>
             <div className="grid grid-cols-2 gap-3">
                 <Button variant="secondary" onClick={() => setReturnSaleId(null)}>Cancelar</Button>
                 <Button variant="primary" onClick={handleReturnSale} isLoading={loading} className="bg-brand-primary">Confirmar</Button>
             </div>
         </div>
      </Modal>

      <Modal isOpen={!!deleteSaleId} onClose={() => setDeleteSaleId(null)} title="Excluir Registro">
         <div className="text-center space-y-4">
             <p className="text-gray-600 dark:text-gray-300">Apagar permanentemente?</p>
             <div className="grid grid-cols-2 gap-3">
                 <Button variant="secondary" onClick={() => setDeleteSaleId(null)}>Cancelar</Button>
                 <Button variant="danger" onClick={handleDeleteSale} isLoading={loading}>Excluir</Button>
             </div>
         </div>
      </Modal>

      <Modal isOpen={isMumbucaModalOpen} onClose={() => setIsMumbucaModalOpen(false)} title="Cartão Mumbuca">
        <div className="space-y-6">
            {/* Credit Card Visual */}
            <div className="bg-gradient-to-br from-red-600 to-brand-primary p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-20 h-20 bg-black/10 rounded-full blur-xl"></div>
                
                <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                            {ICONS.Wallet}
                        </div>
                        <span className="font-bold tracking-wider text-lg">Mumbuca</span>
                    </div>
                    <div className="text-xs font-medium bg-white/20 px-2 py-1 rounded backdrop-blur-sm">Social</div>
                </div>

                <div className="space-y-4 relative z-10">
                    <div>
                        <label className="text-[10px] opacity-80 uppercase tracking-widest block mb-1">Titular</label>
                        <p className="font-bold text-lg truncate tracking-wide">{client?.nome}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] opacity-80 uppercase tracking-widest block mb-1">CPF</label>
                            <input 
                                value={mumbucaForm.cpf}
                                onChange={(e) => setMumbucaForm(prev => ({ ...prev, cpf: e.target.value }))}
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 w-full focus:outline-none focus:bg-white/20 transition-colors font-mono text-sm"
                                placeholder="000.000.000-00"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] opacity-80 uppercase tracking-widest block mb-1">Senha</label>
                            <input 
                                value={mumbucaForm.password}
                                onChange={(e) => setMumbucaForm(prev => ({ ...prev, password: e.target.value }))}
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/40 w-full focus:outline-none focus:bg-white/20 transition-colors font-mono text-sm"
                                placeholder="****"
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            <Button fullWidth onClick={handleSaveMumbuca} isLoading={loading}>
                Salvar Dados
            </Button>
        </div>
      </Modal>

      <Modal isOpen={!!editingSale} onClose={() => setEditingSale(null)} title="Editar Compra">
        <div className="space-y-4">
            {/* --- ADD PRODUCT SECTION --- */}
            <div className="bg-gray-50 dark:bg-[#252525] p-3 rounded-xl border border-dashed border-gray-300 dark:border-[#444]">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Adicionar Produto</p>
                <div className="flex gap-2">
                    <div className="w-20">
                        <Input 
                            type="number" 
                            value={qtyToAdd} 
                            onChange={(e) => setQtyToAdd(Number(e.target.value))}
                            className="text-center px-2"
                            min={1}
                            placeholder="Qtd"
                        />
                    </div>
                    <div className="flex-1 relative">
                        <Input 
                            placeholder="Buscar produto..." 
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="text-sm w-full"
                        />
                        {productSearch && (
                            <div className="absolute top-full left-0 right-0 bg-white dark:bg-[#333] border border-gray-200 dark:border-[#444] rounded-lg shadow-lg z-50 max-h-40 overflow-y-auto mt-1">
                                {products
                                    .filter(p => p.nome.toLowerCase().includes(productSearch.toLowerCase()))
                                    .map(p => (
                                        <div 
                                            key={p.id} 
                                            onClick={() => {
                                                handleAddItem(p);
                                            }}
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-[#444] cursor-pointer text-sm flex justify-between"
                                        >
                                            <span>{p.nome}</span>
                                            <span className="font-bold text-brand-primary">R$ {p.valor_parcelado.toFixed(2)}</span>
                                        </div>
                                    ))
                                }
                                {products.filter(p => p.nome.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                                    <div className="p-2 text-gray-500 text-xs text-center">Nenhum produto encontrado</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- DETECTED ITEMS --- */}
            {getDetectedItems(editSaleForm.descricao).length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {getDetectedItems(editSaleForm.descricao).map((item, idx) => (
                        <div key={idx} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-lg text-xs flex items-center gap-2 border border-blue-100 dark:border-blue-800">
                            <span>{item}</span>
                            <button onClick={() => handleRemoveItem(item)} className="hover:text-red-500 font-bold">×</button>
                        </div>
                    ))}
                </div>
            )}

            <Input 
                label="Descrição (Texto Completo)" 
                value={editSaleForm.descricao} 
                onChange={(e) => setEditSaleForm(prev => ({ ...prev, descricao: e.target.value }))} 
                placeholder="Ex: Cama Box Casal"
            />
            <Input 
                label="Valor Total (R$)" 
                type="number" 
                value={editSaleForm.total} 
                onChange={(e) => setEditSaleForm(prev => ({ ...prev, total: e.target.value }))} 
            />
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-xs text-yellow-700 dark:text-yellow-400">
                <p><strong>Atenção:</strong> Alterar o valor total irá ajustar automaticamente as parcelas <strong>em aberto</strong> (de trás para frente).</p>
            </div>
            <Button fullWidth onClick={handleSaveSaleEdit} isLoading={loading}>
                Salvar Alterações
            </Button>
        </div>
      </Modal>

      <Modal isOpen={isAdjustDebtOpen} onClose={() => setIsAdjustDebtOpen(false)} title="Ajustar Saldo Devedor">
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
            <p className="font-bold mb-1">Como funciona o ajuste:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Se o valor for menor:</strong> Dará baixa (quitará) as parcelas em aberto mais antigas e atualizará a data de pagamento.</li>
              <li><strong>Se o valor for maior:</strong> Diluirá o valor excedente nas parcelas em aberto existentes e atualizará as datas de vencimento.</li>
            </ul>
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#252525] rounded-xl text-sm">
            <span className="text-gray-500 dark:text-gray-400">Saldo Atual em Aberto:</span>
            <span className="font-bold text-gray-900 dark:text-white">R$ {totalDebt.toFixed(2)}</span>
          </div>

          <Input 
            label="Novo Saldo Devedor em Aberto (R$) *" 
            type="number" 
            step="0.01" 
            value={newDebtValue} 
            onChange={(e) => setNewDebtValue(e.target.value)} 
            placeholder="0.00" 
            className="text-lg font-bold text-brand-primary"
          />

          {parseFloat(newDebtValue) !== totalDebt && !isNaN(parseFloat(newDebtValue)) && (
            <div className={`p-3 rounded-xl text-xs font-medium ${parseFloat(newDebtValue) < totalDebt ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
              {parseFloat(newDebtValue) < totalDebt ? (
                <span>O saldo será reduzido em <strong>R$ {(totalDebt - parseFloat(newDebtValue)).toFixed(2)}</strong>. As parcelas mais antigas receberão baixa.</span>
              ) : (
                <span>O saldo será aumentado em <strong>R$ {(parseFloat(newDebtValue) - totalDebt).toFixed(2)}</strong>. O valor será diluído nas parcelas em aberto.</span>
              )}
            </div>
          )}

          <div 
            onClick={() => setUpdateDatesCheck(!updateDatesCheck)}
            className="flex items-center gap-2 cursor-pointer pt-1"
          >
            <input 
              type="checkbox" 
              checked={updateDatesCheck} 
              onChange={() => {}} 
              className="w-4 h-4 text-brand-primary rounded focus:ring-0 cursor-pointer"
            />
            <span className="text-xs text-gray-600 dark:text-gray-300">Atualizar datas de vencimento das parcelas para os próximos meses?</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsAdjustDebtOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAdjustDebt} isLoading={loading}>Atualizar Saldo</Button>
          </div>
        </div>
      </Modal>

      {receiptData && (
          <ReceiptModal 
            isOpen={!!receiptData} 
            onClose={() => setReceiptData(null)} 
            type={receiptData.type} 
            data={receiptData.data} 
            client={client} 
            totalValue={receiptData.totalValue}
            remaining={receiptData.remaining}
            description={receiptData.description}
            history={receiptData.history}
          />
      )}

      {fichaData && (
          <FichaModal
              isOpen={!!fichaData}
              onClose={() => setFichaData(null)}
              client={client}
              sale={fichaData.sale}
              installments={fichaData.installments}
          />
      )}
      <ClientFichaModal isOpen={isClientFichaOpen} onClose={() => setIsClientFichaOpen(false)} client={client} sales={sales} installments={allInstallments} />
    </div>
  );
};

export default ClientDetails;
