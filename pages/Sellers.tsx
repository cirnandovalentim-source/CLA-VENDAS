
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS } from '../constants';
import { Button, Input, Card, Modal, Toast } from '../components/ui';
import { dataService } from '../services/mockSupabase';
import { User } from '../types';

const Sellers: React.FC = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Toast State
  const [toast, setToast] = useState({ show: false, message: '' });

  const [form, setForm] = useState<Partial<User>>({
    nome: '',
    email: '',
    comissao_porcentagem: 0
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadSellers = async () => {
    const data = await dataService.getSellers();
    setSellers(data);
  };

  useEffect(() => {
    loadSellers();
  }, []);

  const showToast = (msg: string) => {
      setToast({ show: true, message: msg });
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm({ nome: '', email: '', comissao_porcentagem: 0 });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (seller: User) => {
    setEditingId(seller.id);
    setForm({ ...seller });
    setIsModalOpen(true);
  };

  const handleOpenDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome || !form.email) return;
    setLoading(true);
    try {
      if (editingId) {
        await dataService.updateSeller(editingId, form);
        showToast('Vendedor atualizado com sucesso!');
      } else {
        await dataService.createSeller({
          nome: form.nome,
          email: form.email,
          perfil: 'vendedor',
          ativo: true,
          comissao_porcentagem: Number(form.comissao_porcentagem) || 0
        });
        showToast('Vendedor cadastrado com sucesso!');
      }
      await loadSellers();
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
          await dataService.deleteSeller(deletingId);
          await loadSellers();
          setIsDeleteModalOpen(false);
          showToast('Vendedor removido com sucesso!');
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F3F4F6] dark:bg-[#121212] transition-colors">
      <div className="bg-white dark:bg-[#1E1E1E] p-4 flex items-center gap-4 border-b border-gray-100 dark:border-[#333] sticky top-0 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="text-gray-900 dark:text-white">
          {ICONS.Left}
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Vendedores</h1>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        <Button onClick={handleOpenCreate} fullWidth icon={ICONS.UserPlus}>
          Novo Vendedor
        </Button>

        <div className="space-y-3 pb-20">
          {sellers.map(seller => (
            <Card key={seller.id} className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-gray-900 dark:text-white font-bold flex items-center gap-2">
                    {seller.nome}
                    {seller.perfil === 'admin' && <span className="bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded-full border border-red-500/20">ADMIN</span>}
                    </h3>
                    <p className="text-gray-500 text-sm">{seller.email}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-400 font-bold uppercase">Comissão</p>
                    <p className="text-[#FF7A00] font-bold">{seller.comissao_porcentagem}%</p>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-white/5">
                <button 
                  onClick={() => handleOpenEdit(seller)}
                  className="flex-1 py-2 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 flex justify-center items-center gap-2 text-sm font-medium"
                >
                    {ICONS.Edit} Editar
                </button>
                <button 
                  onClick={() => handleOpenDelete(seller.id)}
                  className="flex-1 py-2 bg-red-50 dark:bg-red-500/10 text-red-500 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 flex justify-center items-center gap-2 text-sm font-medium"
                >
                    {ICONS.Trash} Excluir
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Editar Vendedor" : "Cadastrar Vendedor"}>
        <div className="space-y-4">
          <Input 
            label="Nome Completo" 
            value={form.nome} 
            onChange={e => setForm({...form, nome: e.target.value})}
          />
          <Input 
            label="E-mail" 
            type="email"
            value={form.email} 
            onChange={e => setForm({...form, email: e.target.value})}
            disabled={!!editingId} // Prevent changing email on edit to keep it simple
          />
          <Input 
            label="Comissão (%)" 
            type="number"
            placeholder="Ex: 5"
            value={form.comissao_porcentagem} 
            onChange={e => setForm({...form, comissao_porcentagem: Number(e.target.value)})}
          />
          {!editingId && <p className="text-xs text-gray-500">* Senha padrão inicial: 123456</p>}
          <Button fullWidth onClick={handleSave} isLoading={loading}>
            Salvar
          </Button>
        </div>
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Excluir Vendedor">
         <div className="text-center space-y-4">
             <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto">
                {ICONS.Trash}
             </div>
             <p className="text-gray-600 dark:text-gray-300">Tem certeza? O acesso deste vendedor será revogado.</p>
             <div className="grid grid-cols-2 gap-3">
                 <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</Button>
                 <Button variant="danger" onClick={handleDelete} isLoading={loading}>Excluir</Button>
             </div>
         </div>
      </Modal>

      <Toast 
        message={toast.message} 
        isVisible={toast.show} 
        onClose={() => setToast(prev => ({ ...prev, show: false }))} 
      />
    </div>
  );
};

export default Sellers;
