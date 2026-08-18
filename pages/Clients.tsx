
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ICONS, ROUTES } from '../constants';
import { Button, Input, Card, Modal } from '../components/ui';
import { dataService, authService } from '../services/mockSupabase';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { Client, User } from '../types';

// Sub-componente para tratar Avatar com Fallback de erro
const ClientAvatar: React.FC<{ url?: string; name: string }> = ({ url, name }) => {
  const [error, setError] = useState(false);

  useEffect(() => {
     setError(false);
  }, [url]);

  if (url && !error) {
    return (
      <img 
        src={url} 
        alt={name} 
        className="w-full h-full object-cover" 
        onError={() => setError(true)}
      />
    );
  }

  return (
    <span className="text-gray-500 dark:text-gray-400 font-bold text-lg select-none">
      {name.charAt(0).toUpperCase()}
    </span>
  );
};

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const session = authService.getSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [filterMumbucaOnly, setFilterMumbucaOnly] = useState(location.state?.filterMumbuca || false);
  const [loading, setLoading] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  
  // State for file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Adjust Debt State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustClient, setAdjustClient] = useState<Client | null>(null);
  const [adjustDebtVal, setAdjustDebtVal] = useState('');
  const [currentDebtVal, setCurrentDebtVal] = useState(0);
  const [updateDatesCheck, setUpdateDatesCheck] = useState(true);
  
  // Form State
  const [clientForm, setClientForm] = useState<Partial<Client>>({
    nome: '', telefone: '', endereco: '', bairro: '', cidade: '', foto_url: '', is_mumbuca: false
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState('');

  const isAdmin = session?.perfil === 'admin';

  const loadClients = async () => {
    const data = await dataService.getClients();
    setClients(data);
  };

  useEffect(() => {
    loadClients();
  }, []);

  // --- CRUD Handlers ---

  const handleOpenCreate = () => {
    setEditingId(null);
    setSelectedFile(null);
    setClientForm({ nome: '', telefone: '', endereco: '', bairro: '', cidade: '', foto_url: '', is_mumbuca: false });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop card click
    setEditingId(client.id);
    setSelectedFile(null);
    setClientForm({
        nome: client.nome || '',
        telefone: client.telefone || '',
        endereco: client.endereco || '',
        bairro: client.bairro || '',
        cidade: client.cidade || '',
        foto_url: client.foto_url || '',
        is_mumbuca: client.is_mumbuca || false
    });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop card click
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const handleOpenAdjust = async (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setAdjustClient(client);
    setLoading(true);
    try {
      const sales = await dataService.getSalesByClient(client.id);
      const activeSales = sales.filter(s => s.status !== 'DEVOLVIDO');
      let total = 0;
      for (const sale of activeSales) {
        const insts = await dataService.getInstallmentsBySale(sale.id);
        total += insts.filter(i => !i.pago).reduce((acc, curr) => acc + curr.valor, 0);
      }
      setCurrentDebtVal(total);
      setAdjustDebtVal(total.toFixed(2));
      setIsAdjustModalOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdjust = async () => {
    if (!adjustClient || !session) return;
    const val = parseFloat(adjustDebtVal);
    if (isNaN(val) || val < 0) {
      alert("Por favor, informe um valor válido.");
      return;
    }
    setLoading(true);
    try {
      await dataService.adjustClientDebt(adjustClient.id, val, session.id, updateDatesCheck);
      await loadClients();
      setIsAdjustModalOpen(false);
      alert("Saldo devedor atualizado com sucesso!");
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar saldo.");
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
                
                const base64 = canvas.toDataURL('image/jpeg', 0.7);
                
                canvas.toBlob((blob) => {
                    if (blob) resolve({ base64, blob });
                    else reject(new Error("Canvas blob error"));
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
          console.error("Erro ao processar imagem", err);
          alert("Erro ao processar a imagem. Tente uma foto menor.");
      } finally {
          setProcessingImage(false);
      }
    }
  };

  const handleSaveClient = async () => {
    if (!clientForm.nome || !clientForm.telefone) {
        alert("Por favor, preencha o Nome e o Telefone.");
        return;
    }
    setLoading(true);
    try {
      let finalClientId = editingId;
      let finalPhotoUrl = clientForm.foto_url || '';

      if (!editingId) {
          const newClientPayload = {
              nome: clientForm.nome || '',
              telefone: clientForm.telefone || '',
              endereco: clientForm.endereco || '',
              bairro: clientForm.bairro || '',
              cidade: clientForm.cidade || '',
              observacoes: clientForm.observacoes || '',
              vendedor_id: session?.id || '',
              foto_url: isSupabaseConfigured ? '' : finalPhotoUrl,
              is_mumbuca: clientForm.is_mumbuca || false
          };
          const newClient = await dataService.createClient(newClientPayload);
          finalClientId = newClient.id;
      }

      if (selectedFile && finalClientId && isSupabaseConfigured) {
          const publicUrl = await dataService.uploadClientPhoto(selectedFile, finalClientId);
          if (publicUrl) {
              finalPhotoUrl = publicUrl; 
          }
      }

      const shouldUpdate = editingId || (isSupabaseConfigured && selectedFile);

      if (finalClientId && shouldUpdate) {
           const updates = {
               nome: clientForm.nome,
               telefone: clientForm.telefone,
               endereco: clientForm.endereco,
               bairro: clientForm.bairro,
               cidade: clientForm.cidade,
               foto_url: finalPhotoUrl,
               is_mumbuca: clientForm.is_mumbuca
           };
           await dataService.updateClient(finalClientId, updates);
      }

      await loadClients();
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Save Client Error:", error);
      alert("Erro ao salvar cliente. Verifique o Setup.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!deletingId) return;
    setLoading(true);
    try {
      await dataService.deleteClient(deletingId);
      await loadClients();
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- CSV IMPORT Handlers (UPDATED: Ignore ID, CPF, Map, Photo, Trigger) ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setImportStatus('Lendo arquivo...');
    
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const text = event.target?.result as string;
            await processCSV(text);
        } catch (err) {
            console.error(err);
            setImportStatus('Erro ao processar arquivo.');
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    reader.readAsText(file);
  };

  const processCSV = async (csvText: string) => {
      const lines = csvText.split('\n');
      if (lines.length < 2) {
          setImportStatus('Arquivo vazio ou sem cabeçalho.');
          return;
      }
      
      const headerLine = lines[0];
      const separator = (headerLine.match(/;/g) || []).length > (headerLine.match(/,/g) || []).length ? ';' : ',';
      
      const normalize = (t: string) => t.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/"/g, '');
      const headers = headerLine.split(separator).map(normalize);

      // FILTRO DE IGNORAR COLUNAS (SOLICITADO)
      const isIgnored = (h: string) => {
          // Ignora ID CLIENTES (que contem 'cliente' e atrapalha o match de Nome)
          if (h.includes('id') && (h.includes('cliente') || h.includes('cli'))) return true;
          if (h.includes('cpf')) return true;
          if (h.includes('mapa')) return true;
          if (h.includes('foto')) return true;
          if (h.includes('gatilho')) return true;
          return false;
      };
      
      const findIndex = (keywords: string[]) => headers.findIndex(h => {
          if (isIgnored(h)) return false;
          return keywords.some(k => h.includes(k));
      });

      const nomeIdx = findIndex(['nome', 'cliente', 'name']);
      const telIdx = findIndex(['telefone', 'celular', 'whatsapp', 'tel', 'fone']);
      const endIdx = findIndex(['endereco', 'endereço', 'rua', 'logradouro']);
      const bairroIdx = findIndex(['bairro', 'distrito']);
      const cidIdx = findIndex(['cidade', 'municipio']);
      const vendIdx = findIndex(['vendedor', 'responsavel']); 

      if (nomeIdx === -1) {
          setImportStatus('Erro: Coluna "Nome" não encontrada (ID Clientes foi ignorado).');
          return;
      }

      setImportStatus('Processando dados...');
      
      const existingClients = await dataService.getClients();
      let sellers: User[] = [];
      if (isAdmin && vendIdx > -1) {
         sellers = await dataService.getSellers();
      }

      let created = 0;
      let updated = 0;

      for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = line.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
          
          if (cols[nomeIdx]) {
             const name = cols[nomeIdx];
             const phone = telIdx > -1 ? cols[telIdx] : '';
             
             // Determine Seller
             let vId = session?.id || 'anon';
             if (isAdmin && vendIdx > -1 && cols[vendIdx]) {
                 const sName = normalize(cols[vendIdx]);
                 const foundSeller = sellers.find(s => normalize(s.nome) === sName);
                 if (foundSeller) vId = foundSeller.id;
             }

             // Check if exists by Name (UPSERT LOGIC)
             const existing = existingClients.find(c => normalize(c.nome) === normalize(name));

             const clientData = {
                 nome: name,
                 telefone: phone,
                 endereco: endIdx > -1 ? cols[endIdx] : (existing?.endereco || ''),
                 bairro: bairroIdx > -1 ? cols[bairroIdx] : (existing?.bairro || ''),
                 cidade: cidIdx > -1 ? cols[cidIdx] : (existing?.cidade || ''),
                 vendedor_id: existing ? existing.vendedor_id : vId, // Keep original seller if exists
                 is_mumbuca: false
             };

             if (existing) {
                 await dataService.updateClient(existing.id, clientData);
                 updated++;
             } else {
                 await dataService.createClient(clientData);
                 created++;
             }
          }
      }
      await loadClients();
      setImportStatus(`Sucesso! ${created} novos, ${updated} atualizados.`);
      setTimeout(() => { setIsImportModalOpen(false); setImportStatus(''); }, 3000);
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.nome.toLowerCase().includes(search.toLowerCase()) || c.telefone.includes(search);
    const matchesMumbuca = filterMumbucaOnly ? c.is_mumbuca : true;
    return matchesSearch && matchesMumbuca;
  });

  return (
    <div className="p-5 animate-fade-in space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{filteredClients.length} cadastrados</p>
        </div>
        <div className="flex gap-2">
            {isAdmin && (
                <Button onClick={() => setIsImportModalOpen(true)} variant="secondary" className="!px-3 !py-2" title="Importar Planilha">
                   {ICONS.Upload}
                </Button>
            )}
            <Button onClick={handleOpenCreate} className="!px-3 !py-2">
               {ICONS.Add}
            </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            {ICONS.Search}
          </div>
          <Input 
            placeholder="Buscar cliente..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
            onClick={() => setFilterMumbucaOnly(!filterMumbucaOnly)}
            className={`px-3 rounded-xl border flex items-center justify-center transition-colors ${filterMumbucaOnly ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-[#1E1E1E] text-gray-400 border-gray-200 dark:border-[#333]'}`}
            title="Filtrar por Mumbuca"
        >
            {ICONS.Wallet}
        </button>
      </div>

      <div className="space-y-3 pb-24">
        {filteredClients.map(client => (
          <Card 
            key={client.id} 
            className="group cursor-pointer active:bg-gray-50 dark:active:bg-[#252525] relative pr-10 hover:border-gray-300 dark:hover:border-[#555] transition-colors"
            onClick={() => navigate(ROUTES.CLIENT_DETAILS.replace(':id', client.id))}
          >
            <div className="flex justify-between items-center">
               <div className="flex items-center gap-3">
                  <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-[#333] flex items-center justify-center overflow-hidden border border-gray-200 dark:border-white/10 shrink-0">
                          <ClientAvatar url={client.foto_url} name={client.nome} />
                      </div>
                      {client.is_mumbuca && (
                          <div className="absolute -bottom-1 -right-1 bg-red-500 text-white p-1 rounded-full border-2 border-white dark:border-[#1E1E1E]" title="Cliente Mumbuca">
                             <div className="w-2.5 h-2.5 flex items-center justify-center">
                                <svg width="100%" height="100%" viewBox="0 0 24 24" fill="currentColor"><path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h9v-4h-9v4z"/></svg>
                             </div>
                          </div>
                      )}
                  </div>
                  <div>
                    <h3 className="text-gray-900 dark:text-white font-semibold flex items-center gap-2">
                        {client.nome}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{client.telefone}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{client.bairro} - {client.cidade}</p>
                  </div>
               </div>
            </div>

            <div className="flex gap-2 items-center mt-3 border-t border-gray-100 dark:border-[#333] pt-2 pl-[60px]">
              <button 
                onClick={(e) => { e.stopPropagation(); navigate(ROUTES.NEW_SALE, { state: { client } }); }}
                className="flex-1 py-2 bg-brand-primary/10 text-brand-primary rounded-lg text-sm font-medium hover:bg-brand-primary/20 z-10 flex justify-center items-center gap-2"
              >
                {ICONS.Sales} Nova Venda
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/55${client.telefone.replace(/\D/g, '')}`, '_blank'); }}
                className="p-2 bg-green-500/10 text-green-600 dark:text-green-500 rounded-lg hover:bg-green-500/20 z-10"
                title="WhatsApp"
              >
                {ICONS.Phone}
              </button>
              
              <button 
                onClick={(e) => handleOpenAdjust(client, e)}
                className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-500/20 z-10"
                title="Ajustar Saldo Devedor"
              >
                {ICONS.Edit}
              </button>
              
              {/* RESTRICTED ACTIONS */}
              {isAdmin && (
                  <>
                      <button 
                        onClick={(e) => handleOpenEdit(client, e)}
                        className="p-2 bg-gray-200 dark:bg-[#333] text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-300 dark:hover:bg-[#404040] z-10"
                      >
                        {ICONS.Edit}
                      </button>
                      <button 
                        onClick={(e) => handleOpenDelete(client.id, e)}
                        className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 z-10"
                      >
                        {ICONS.Trash}
                      </button>
                  </>
              )}
            </div>
            <div className="absolute right-4 top-4 text-gray-400 dark:text-gray-500">{ICONS.Right}</div>
          </Card>
        ))}
        {filteredClients.length === 0 && (
            <div className="text-center py-10 opacity-70">
                <div className="text-gray-300 mb-2 flex justify-center scale-150">{ICONS.Search}</div>
                <p className="text-gray-500 font-medium">Nenhum cliente encontrado.</p>
            </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Cliente" : "Novo Cliente"}>
        <div className="space-y-4 pb-10">
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
             <input 
               type="file" 
               accept="image/*" 
               ref={photoInputRef}
               className="hidden" 
               onChange={handlePhotoChange}
             />
          </div>

          <Input 
            label="Nome Completo *" 
            value={clientForm.nome || ''} 
            onChange={e => setClientForm(prev => ({...prev, nome: e.target.value}))}
          />
          <Input 
            label="Telefone (WhatsApp) *" 
            type="tel"
            value={clientForm.telefone || ''} 
            onChange={e => setClientForm(prev => ({...prev, telefone: e.target.value}))}
          />
          
          <div 
            onClick={() => setClientForm(prev => ({...prev, is_mumbuca: !prev.is_mumbuca}))}
            className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-colors ${clientForm.is_mumbuca ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-500/30' : 'bg-gray-50 border-gray-200 dark:bg-[#252525] dark:border-[#333]'}`}
          >
             <div className="flex items-center gap-3">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center ${clientForm.is_mumbuca ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-[#333]'}`}>
                    {ICONS.Wallet}
                 </div>
                 <div>
                    <p className={`text-sm font-bold ${clientForm.is_mumbuca ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>Cliente Mumbuca</p>
                 </div>
             </div>
             <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${clientForm.is_mumbuca ? 'border-red-500 bg-red-500' : 'border-gray-300'}`}>
                {clientForm.is_mumbuca && <span className="text-white text-[10px] font-bold">✓</span>}
             </div>
          </div>

          <Input 
            label="Endereço" 
            value={clientForm.endereco || ''} 
            onChange={e => setClientForm(prev => ({...prev, endereco: e.target.value}))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
                label="Bairro" 
                value={clientForm.bairro || ''} 
                onChange={e => setClientForm(prev => ({...prev, bairro: e.target.value}))}
            />
            <Input 
                label="Cidade" 
                value={clientForm.cidade || ''} 
                onChange={e => setClientForm(prev => ({...prev, cidade: e.target.value}))}
            />
          </div>
          <Button fullWidth onClick={handleSaveClient} isLoading={loading} disabled={processingImage}>
            {processingImage ? 'Processando Imagem...' : 'Salvar'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Importar Clientes (CSV)">
         <div className="space-y-4">
             <div className="bg-blue-500/10 p-4 rounded-xl text-sm text-blue-600 dark:text-blue-300 border border-blue-500/20">
                <p className="font-bold mb-2">Instruções:</p>
                <p className="mb-2">Salve como <strong>.csv</strong>. Use vírgula ou ponto-e-vírgula.</p>
                <p className="text-xs">O sistema identificará clientes pelo <strong>Nome</strong> para atualizar dados existentes.</p>
                <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Colunas ignoradas: ID Clientes, CPF, Mapa, Foto, Gatilho.</p>
             </div>
             <div className="py-4">
                 <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                 <Button fullWidth onClick={() => fileInputRef.current?.click()} isLoading={loading}>
                    Selecionar Arquivo CSV
                 </Button>
             </div>
             {importStatus && (
                 <div className={`text-center text-sm p-2 rounded ${importStatus.includes('Erro') ? 'text-red-400 bg-red-500/10' : 'text-green-400 bg-green-500/10'}`}>
                     {importStatus}
                 </div>
             )}
         </div>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Excluir Cliente">
         <div className="text-center space-y-4">
             <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto">
                {ICONS.Trash}
             </div>
             <p className="text-gray-600 dark:text-gray-300">Tem certeza? Isso apagará todas as vendas e histórico deste cliente.</p>
             <div className="grid grid-cols-2 gap-3">
                 <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                 <Button variant="danger" onClick={handleDeleteClient} isLoading={loading}>Excluir</Button>
             </div>
         </div>
      </Modal>

      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title={`Ajustar Saldo - ${adjustClient?.nome || ''}`}>
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
            <p className="font-bold mb-1">Ajuste Rápido de Dívida:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Se menor:</strong> Dará baixa nas parcelas mais antigas.</li>
              <li><strong>Se maior:</strong> Diluirá o acréscimo nas parcelas em aberto e atualizará as datas.</li>
            </ul>
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#252525] rounded-xl text-sm">
            <span className="text-gray-500 dark:text-gray-400">Saldo Atual em Aberto:</span>
            <span className="font-bold text-gray-900 dark:text-white">R$ {currentDebtVal.toFixed(2)}</span>
          </div>

          <Input 
            label="Novo Saldo Devedor em Aberto (R$) *" 
            type="number" 
            step="0.01" 
            value={adjustDebtVal} 
            onChange={(e) => setAdjustDebtVal(e.target.value)} 
            placeholder="0.00" 
            className="text-lg font-bold text-brand-primary"
          />

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
            <span className="text-xs text-gray-600 dark:text-gray-300">Atualizar datas de vencimento?</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="secondary" onClick={() => setIsAdjustModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAdjust} isLoading={loading}>Salvar Saldo</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Clients;
