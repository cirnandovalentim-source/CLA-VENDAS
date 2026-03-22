
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';
import { Button, Input, Card, Modal } from '../components/ui';
import { dataService, authService } from '../services/mockSupabase';
import { Product } from '../types';

const Products: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const session = authService.getSession();

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  // Form State
  const [form, setForm] = useState<Partial<Product>>({
    nome: '',
    categoria: '',
    valor_avista: 0,
    valor_parcelado: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isAdmin = session?.perfil === 'admin';

  const loadProducts = async () => {
    const data = await dataService.getProducts();
    setProducts(data);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({ nome: '', categoria: '', valor_avista: '', valor_parcelado: '' } as any);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(product.id);
    setForm({ ...product });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.valor_parcelado) return;
    setLoading(true);
    try {
      const productData = {
        ...form,
        valor_avista: Number(form.valor_avista),
        valor_parcelado: Number(form.valor_parcelado)
      };

      if (editingId) {
        await dataService.updateProduct(editingId, productData);
      } else {
        await dataService.createProduct(productData as Omit<Product, 'id'>);
      }
      await loadProducts();
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setLoading(true);
    try {
      await dataService.deleteProduct(deletingId);
      await loadProducts();
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // --- CSV IMPORT Handlers (UPDATED: Match by Name + Ignore ID/Images) ---
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
      
      // FILTRO DE IGNORAR COLUNAS (NOVO)
      const isIgnored = (h: string) => {
          // Ignora ID PRODUTOS (para não confundir com Nome do Produto)
          if (h.includes('id') && (h.includes('produto') || h.includes('prod') || h.includes('item'))) return true;
          // Ignora Imagens/Fotos
          if (h.includes('imagem') || h.includes('foto') || h.includes('img') || h.includes('url')) return true;
          return false;
      };

      const findIndex = (keywords: string[]) => headers.findIndex(h => {
          if (isIgnored(h)) return false;
          return keywords.some(k => h.includes(k));
      });

      const nomeIdx = findIndex(['descricao', 'produto', 'nome', 'item']);
      const catIdx = findIndex(['categoria', 'grupo', 'tipo']);
      const avistaIdx = findIndex(['vista', 'preco_avista', 'dinheiro']);
      let parcIdx = findIndex(['parcelado', 'prazo']);
      if (parcIdx === -1) {
          parcIdx = findIndex(['preco', 'valor', 'unitario']);
      }

      if (nomeIdx === -1) {
          setImportStatus('Erro: Coluna "Descrição" ou "Nome" não encontrada (ID ignorado).');
          return;
      }

      setImportStatus('Processando dados...');

      // 1. Load Existing for Upsert
      const existingProducts = await dataService.getProducts();

      const parsePrice = (val: string) => {
          if (!val) return 0;
          let clean = val.replace(/[R$\s]/g, '').trim();
          if (clean.includes(',') && !clean.includes('.')) {
              clean = clean.replace(',', '.');
          } else if (clean.includes(',') && clean.includes('.')) {
              clean = clean.replace('.', '').replace(',', '.');
          }
          return parseFloat(clean) || 0;
      };

      let created = 0;
      let updated = 0;

      for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const cols = line.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
          
          if (cols[nomeIdx]) {
             const name = cols[nomeIdx];
             const valorParcelado = parcIdx > -1 ? parsePrice(cols[parcIdx]) : 0;
             const valorAvista = avistaIdx > -1 ? parsePrice(cols[avistaIdx]) : valorParcelado;

             // Check Exists
             const existing = existingProducts.find(p => normalize(p.nome) === normalize(name));

             const prodData = {
                 nome: name,
                 categoria: catIdx > -1 ? cols[catIdx] : (existing?.categoria || 'Geral'),
                 valor_avista: valorAvista,
                 valor_parcelado: valorParcelado,
                 ativo: true
             };

             if (existing) {
                 await dataService.updateProduct(existing.id, prodData);
                 updated++;
             } else {
                 await dataService.createProduct(prodData);
                 created++;
             }
          }
      }

      await loadProducts();
      setImportStatus(`Sucesso! ${created} novos, ${updated} atualizados.`);
      setTimeout(() => {
          setIsImportModalOpen(false);
          setImportStatus('');
      }, 3000);
  };

  const filteredProducts = products.filter(p => 
    p.nome.toLowerCase().includes(search.toLowerCase()) || 
    p.categoria.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-[#F3F4F6] dark:bg-[#121212] transition-colors">
      <div className="bg-white dark:bg-[#1E1E1E] p-4 flex items-center gap-4 border-b border-gray-100 dark:border-[#333] sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="text-gray-900 dark:text-white">
          {ICONS.Left}
        </button>
        <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">Produtos</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{products.length} itens cadastrados</p>
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex gap-2">
            {isAdmin && (
                <Button onClick={() => setIsImportModalOpen(true)} variant="secondary" className="px-3" title="Importar Produtos">
                   {ICONS.Upload}
                </Button>
            )}
            <Button onClick={handleOpenCreate} fullWidth icon={ICONS.Product}>
              Novo Produto
            </Button>
        </div>

        <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {ICONS.Search}
            </div>
            <Input 
              placeholder="Buscar produto..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
        </div>

        <div className="space-y-3 pb-20">
          {filteredProducts.map(product => (
            <Card key={product.id} className="relative group hover:border-brand-primary transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                   <span className="text-[10px] text-gray-500 uppercase tracking-wide bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-lg font-bold">{product.categoria}</span>
                   <h3 className="text-gray-900 dark:text-white font-bold text-lg mt-2">{product.nome}</h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                 <div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase">À Vista</p>
                    <p className="text-green-600 dark:text-green-500 font-bold">R$ {product.valor_avista.toFixed(2)}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Parcelado</p>
                    <p className="text-brand-primary font-bold">R$ {product.valor_parcelado.toFixed(2)}</p>
                 </div>
              </div>
              
              {isAdmin && (
                  <div className="flex gap-2 pt-3 mt-2 border-t border-gray-100 dark:border-white/5">
                    <button 
                      onClick={(e) => handleOpenEdit(product, e)}
                      className="flex-1 py-2 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 flex justify-center items-center gap-2 text-sm font-medium"
                    >
                        {ICONS.Edit} Editar
                    </button>
                    <button 
                      onClick={(e) => handleOpenDelete(product.id, e)}
                      className="flex-1 py-2 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 flex justify-center items-center gap-2 text-sm font-medium"
                    >
                        {ICONS.Trash} Excluir
                    </button>
                  </div>
              )}
            </Card>
          ))}
          {filteredProducts.length === 0 && (
            <div className="text-center py-10 opacity-70">
                <div className="text-gray-300 mb-2 flex justify-center scale-150">{ICONS.Product}</div>
                <p className="text-gray-500 font-medium">Nenhum produto encontrado.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Produto" : "Novo Produto"}>
        <div className="space-y-4">
          <Input 
            label="Nome do Produto" 
            value={form.nome} 
            onChange={e => setForm({...form, nome: e.target.value})}
          />
          <Input 
            label="Categoria" 
            placeholder="Ex: Cama, Mesa, Banho"
            value={form.categoria} 
            onChange={e => setForm({...form, categoria: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
                label="Valor à Vista (R$)" 
                type="number"
                step="0.01"
                value={form.valor_avista} 
                onChange={e => setForm({...form, valor_avista: e.target.value as any})}
            />
            <Input 
                label="Valor Parcelado (R$)" 
                type="number"
                step="0.01"
                value={form.valor_parcelado} 
                onChange={e => setForm({...form, valor_parcelado: e.target.value as any})}
            />
          </div>
          <Button fullWidth onClick={handleSave} isLoading={loading}>
            Salvar
          </Button>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Importar Produtos (CSV)">
         <div className="space-y-4">
             <div className="bg-blue-500/10 p-4 rounded-xl text-sm text-blue-600 dark:text-blue-300 border border-blue-500/20">
                <p className="font-bold mb-2">Instruções:</p>
                <p>1. Salve sua planilha como <strong>.csv</strong>.</p>
                <p>2. O sistema identificará pelo <strong>Nome/Descrição</strong> para atualizar o preço.</p>
                <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Colunas ignoradas: ID Produto, Imagem, Foto.</p>
             </div>

             <div className="py-4">
                 <input 
                    type="file" 
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden" 
                 />
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

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Excluir Produto">
         <div className="text-center space-y-4">
             <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto">
                {ICONS.Trash}
             </div>
             <p className="text-gray-600 dark:text-gray-300">Tem certeza que deseja excluir este produto?</p>
             <div className="grid grid-cols-2 gap-3">
                 <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                 <Button variant="danger" onClick={handleDelete} isLoading={loading}>Excluir</Button>
             </div>
         </div>
      </Modal>
    </div>
  );
};

export default Products;
