
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ICONS, ROUTES } from '../constants';
import { Button, Card, Badge, Modal, Input } from '../components/ui';
import { ReceiptModal } from '../components/ReceiptModal';
import { dataService, authService } from '../services/mockSupabase';
import { Client, Sale, Installment } from '../types';
import { format } from 'date-fns';

const ClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = authService.getSession();
  const photoInputRef = useRef<HTMLInputElement>(null);
  
  const [client, setClient] = useState<Client | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [installmentsMap, setInstallmentsMap] = useState<Record<string, Installment[]>>({});
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  
  // Modals
  const [editInstallment, setEditInstallment] = useState<Installment | null>(null);
  const [payInstallment, setPayInstallment] = useState<Installment | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null);
  const [returnSaleId, setReturnSaleId] = useState<string | null>(null);
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);

  // File Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<{ type: 'SALE' | 'INSTALLMENT', data: any } | null>(null);

  // Forms
  const [editForm, setEditForm] = useState({ valor: '', data_vencimento: '' });
  const [clientForm, setClientForm] = useState<Partial<Client>>({});

  const loadData = async () => {
    if (!id) return;
    const clientData = await dataService.getClientById(id);
    const salesData = await dataService.getSalesByClient(id);
    setClient(clientData || null);
    setSales(salesData);

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

  const handleOpenEditClient = () => {
      if(client) {
          setClientForm(client);
          setSelectedFile(null);
          setIsEditClientOpen(true);
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

          // If file selected, try upload
          if (selectedFile) {
              const url = await dataService.uploadClientPhoto(selectedFile, id);
              if (url) {
                  finalPhotoUrl = url;
              }
              // If url is null (Offline), finalPhotoUrl keeps the Base64 from handlePhotoChange
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
      await loadData();
      const updatedInst = { 
          ...payInstallment, 
          pago: true, 
          data_pagamento: new Date().toISOString(),
          valor: actualPaid 
      };
      setReceiptData({ type: 'INSTALLMENT', data: updatedInst });
      setPayInstallment(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalBought = sales.filter(s => s.status !== 'DEVOLVIDO').reduce((acc, s) => acc + s.valor_total, 0);
  const allInstallments: Installment[] = (Object.values(installmentsMap) as Installment[][]).reduce((acc, val) => acc.concat(val), [] as Installment[]);
  const totalDebt = allInstallments.filter(i => !i.pago).reduce((acc, i) => acc + i.valor, 0);

  if (!client) return <div className="p-5 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-[#121212] transition-colors">
      <div className="bg-white dark:bg-[#1E1E1E] p-4 flex items-center gap-4 border-b border-gray-200 dark:border-[#333] sticky top-0 z-10 transition-colors shadow-sm">
        <button onClick={() => navigate(-1)} className="text-gray-900 dark:text-white">
          {ICONS.Left}
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white flex-1 truncate">{client.nome}</h1>
        <button onClick={handleOpenEditClient} className="text-[#FF7A00]">
            {ICONS.Edit}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-24 space-y-6">
        <Card>
           <div className="flex items-center gap-4 mb-4">
               <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#333] flex items-center justify-center overflow-hidden border-2 border-[#FF7A00] text-gray-500 font-bold text-2xl">
                  {client.foto_url ? (
                      <img src={client.foto_url} alt={client.nome} className="w-full h-full object-cover" />
                  ) : (
                      client.nome.charAt(0).toUpperCase()
                  )}
               </div>
               <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{client.nome}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Cliente desde {new Date().getFullYear()}</p>
               </div>
           </div>
           <div className="flex items-start justify-between border-t border-gray-100 dark:border-[#333] pt-4">
              <div className="space-y-2">
                 <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    {ICONS.Phone} {client.telefone}
                 </div>
                 <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                    {ICONS.Map} {client.bairro}, {client.cidade}
                 </div>
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
           <Card className="bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#333] shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">Em Aberto</p>
              <p className="text-[#FF7A00] font-bold text-lg">R$ {totalDebt.toFixed(2)}</p>
           </Card>
        </div>

        <h2 className="text-gray-900 dark:text-white font-bold text-lg pt-2">Histórico de Compras</h2>
        <div className="space-y-3">
           {sales.map(sale => {
              const installments = installmentsMap[sale.id] || [];
              const isExpanded = expandedSale === sale.id;
              const isReturned = sale.status === 'DEVOLVIDO';

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
                         <div className="flex items-center gap-2">
                             <p className="text-gray-500 dark:text-gray-400 text-xs">
                                {format(new Date(sale.data_venda), 'dd/MM/yyyy')} • {sale.qtd_parcelas} parcelas
                             </p>
                             {sale.is_mumbuca && (
                                <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                                    Mumbuca
                                </span>
                             )}
                         </div>
                      </div>
                      <div className="text-right">
                         <p className={`font-bold ${isReturned ? 'text-gray-400 line-through' : 'text-[#FF7A00]'}`}>
                            R$ {sale.valor_total.toFixed(2)}
                         </p>
                         <div className="flex justify-end mt-1 text-gray-500">
                           {isExpanded ? ICONS.Up : ICONS.Down}
                         </div>
                      </div>
                   </div>

                   {isExpanded && (
                      <div className="bg-gray-50 dark:bg-[#121212] border-t border-gray-200 dark:border-[#333] p-3 space-y-2">
                           <div className="flex justify-between px-1 pb-2 gap-2 flex-wrap">
                                <button onClick={(e) => { e.stopPropagation(); setReceiptData({ type: 'SALE', data: sale }); }} className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1 hover:underline">
                                    {ICONS.Printer} Recibo
                                </button>
                                {!isReturned && (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); setReturnSaleId(sale.id); }} className="text-xs text-orange-500 dark:text-orange-400 flex items-center gap-1 hover:underline">
                                            {ICONS.Return} Devolver
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setDeleteSaleId(sale.id); }} className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1 hover:underline">
                                            {ICONS.Trash} Excluir
                                        </button>
                                    </>
                                )}
                           </div>
                           {installments.map(inst => (
                              <div key={inst.id} className="flex items-center justify-between p-3 bg-white dark:bg-[#1E1E1E] rounded-xl border border-gray-200 dark:border-[#333] shadow-sm">
                                 <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${inst.pago ? 'bg-green-500' : 'bg-[#FF7A00]'}`} />
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
                                        <button onClick={() => setReceiptData({ type: 'INSTALLMENT', data: inst })} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg">
                                            {ICONS.Printer}
                                        </button>
                                    ) : !isReturned && (
                                       <div className="flex gap-1">
                                         <button onClick={() => handleOpenEdit(inst)} className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                                            {ICONS.Edit}
                                         </button>
                                         <button onClick={() => handleOpenPay(inst)} className="p-1.5 text-green-600 dark:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg">
                                            {ICONS.Check}
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
                  className={`w-24 h-24 rounded-full bg-gray-100 dark:bg-[#333] border-2 border-dashed ${processingImage ? 'border-[#FF7A00] animate-pulse' : 'border-gray-300 dark:border-gray-500'} flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#FF7A00] transition-colors`}
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

      {/* Edit Installment, Pay, Return, Delete Modals (Same as before) */}
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
                 <Button variant="primary" onClick={handleReturnSale} isLoading={loading} className="bg-orange-600">Confirmar</Button>
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

      {receiptData && <ReceiptModal isOpen={!!receiptData} onClose={() => setReceiptData(null)} type={receiptData.type} data={receiptData.data} client={client} />}
    </div>
  );
};

export default ClientDetails;
