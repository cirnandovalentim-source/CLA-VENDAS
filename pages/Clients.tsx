
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS, ROUTES } from '../constants';
import { Button, Input, Card, Modal } from '../components/ui';
import { dataService, authService } from '../services/mockSupabase';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { Client } from '../types';

// Sub-componente para tratar Avatar com Fallback de erro
const ClientAvatar: React.FC<{ url?: string; name: string }> = ({ url, name }) => {
  const [error, setError] = useState(false);

  // Reseta o erro se a URL mudar (ex: upload de nova foto)
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
  const session = authService.getSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  
  // State for file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Form State
  const [clientForm, setClientForm] = useState<Partial<Client>>({
    nome: '', telefone: '', endereco: '', bairro: '', cidade: '', foto_url: '', is_mumbuca: false
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState('');

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

  // --- PHOTO HANDLER ---
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
                
                // Get Base64 for Preview
                const base64 = canvas.toDataURL('image/jpeg', 0.7);
                
                // Get Blob for Upload
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
          // Show preview
          setClientForm(prev => ({ ...prev, foto_url: base64 }));
          // Store blob for upload
          setSelectedFile(new File([blob], file.name, { type: 'image/jpeg' }));
      } catch (err) {
          console.error("Erro ao processar imagem", err);
          alert("Erro ao processar a imagem.");
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
      let finalPhotoUrl = clientForm.foto_url;

      // 1. CREATE: Se for novo cliente
      if (!editingId) {
          const newClient = await dataService.createClient({
              ...clientForm,
              vendedor_id: session?.id || 'anon',
              // No modo Supabase, salvamos sem foto primeiro para gerar o ID
              // No modo Offline, já salvamos o Base64
              foto_url: isSupabaseConfigured ? '' : clientForm.foto_url 
          } as Omit<Client, 'id'>);
          finalClientId = newClient.id;
      }

      // 2. UPLOAD: Se tiver arquivo e tivermos o ID (seja novo ou edição)
      if (selectedFile && finalClientId) {
          const publicUrl = await dataService.uploadClientPhoto(selectedFile, finalClientId);
          if (publicUrl) {
              finalPhotoUrl = publicUrl; // Sucesso no upload (Supabase)
          }
          // Se publicUrl for null (Offline ou Erro), finalPhotoUrl mantém o Base64 do formulário
      }

      // 3. UPDATE: Atualiza o registro (para salvar a URL da foto ou o Base64 e os textos)
      if (finalClientId) {
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
    } catch (error) {
      console.error(error);
      alert("Erro ao salvar cliente.");
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

  // --- CSV IMPORT Handlers ---

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
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const nomeIdx = headers.findIndex(h => h.includes('nome'));
      const telIdx = headers.findIndex(h => h.includes('telefone') || h.includes('celular'));
      const endIdx = headers.findIndex(h => h.includes('endereco'));
      const bairroIdx = headers.findIndex(h => h.includes('bairro'));
      const cidIdx = headers.findIndex(h => h.includes('cidade'));

      if (nomeIdx === -1) {
          setImportStatus('Erro: Coluna "Nome" não encontrada.');
          return;
      }

      let count = 0;
      setImportStatus('Importando clientes...');

      for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          
          if (cols[nomeIdx]) {
             const newClient: any = {
                 nome: cols[nomeIdx],
                 telefone: telIdx > -1 ? cols[telIdx] : '',
                 endereco: endIdx > -1 ? cols[endIdx] : '',
                 bairro: bairroIdx > -1 ? cols[bairroIdx] : '',
                 cidade: cidIdx > -1 ? cols[cidIdx] : '',
                 vendedor_id: session?.id || 'anon',
                 is_mumbuca: false
             };
             await dataService.createClient(newClient);
             count++;
          }
      }
      await loadClients();
      setImportStatus(`Sucesso! ${count} clientes importados.`);
      setTimeout(() => { setIsImportModalOpen(false); setImportStatus(''); }, 2000);
  };

  const filteredClients = clients.filter(c => {
    const matchesSearch = c.nome.toLowerCase().includes(search.toLowerCase()) || c.telefone.includes(search);
    return matchesSearch;
  });

  return (
    <div className="p-5 animate-fade-in space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clientes</h1>
        <div className="flex gap-2">
            <Button onClick={() => setIsImportModalOpen(true)} variant="secondary" className="!px-3 !py-2" title="Importar Planilha">
               {ICONS.Upload}
            </Button>
            <Button onClick={handleOpenCreate} className="!px-3 !py-2">
               {ICONS.Add}
            </Button>
        </div>
      </div>

      <div className="relative">
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

      <div className="space-y-3">
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
                className="flex-1 py-2 bg-[#FF7A00]/10 text-[#FF7A00] rounded-lg text-sm font-medium hover:bg-[#FF7A00]/20 z-10 flex justify-center items-center gap-2"
              >
                {ICONS.Sales} Nova Venda
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/55${client.telefone.replace(/\D/g, '')}`, '_blank'); }}
                className="p-2 bg-green-500/10 text-green-600 dark:text-green-500 rounded-lg hover:bg-green-500/20 z-10"
              >
                {ICONS.Phone}
              </button>
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
             <input 
               type="file" 
               accept="image/*" 
               ref={photoInputRef}
               className="hidden" 
               onChange={handlePhotoChange}
             />
          </div>

          <Input 
            label="Nome Completo" 
            value={clientForm.nome || ''} 
            onChange={e => setClientForm({...clientForm, nome: e.target.value})}
          />
          <Input 
            label="Telefone (WhatsApp)" 
            type="tel"
            value={clientForm.telefone || ''} 
            onChange={e => setClientForm({...clientForm, telefone: e.target.value})}
          />
          
          {/* MUMBUCA TOGGLE */}
          <div 
            onClick={() => setClientForm({...clientForm, is_mumbuca: !clientForm.is_mumbuca})}
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
            onChange={e => setClientForm({...clientForm, endereco: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
                label="Bairro" 
                value={clientForm.bairro || ''} 
                onChange={e => setClientForm({...clientForm, bairro: e.target.value})}
            />
            <Input 
                label="Cidade" 
                value={clientForm.cidade || ''} 
                onChange={e => setClientForm({...clientForm, cidade: e.target.value})}
            />
          </div>
          <Button fullWidth onClick={handleSaveClient} isLoading={loading} disabled={processingImage}>
            Salvar
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Importar Clientes (CSV)">
         <div className="space-y-4">
             <div className="bg-blue-500/10 p-4 rounded-xl text-sm text-blue-600 dark:text-blue-300 border border-blue-500/20">
                <p className="font-bold mb-2">Instruções:</p>
                <p className="mb-2">Salve como <strong>.csv</strong>. Primeira linha: cabeçalhos.</p>
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
             <p className="text-gray-600 dark:text-gray-300">Tem certeza que deseja excluir este cliente?</p>
             <div className="grid grid-cols-2 gap-3">
                 <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                 <Button variant="danger" onClick={handleDeleteClient} isLoading={loading}>Excluir</Button>
             </div>
         </div>
      </Modal>
    </div>
  );
};

export default Clients;
