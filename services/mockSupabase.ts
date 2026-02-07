
import { User, Client, Product, Sale, Installment, CashEntry, SaleStatus, DailyReport } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// --- MOCK DATA (Fallback) ---
const MOCK_USERS: User[] = [
  { id: 'user-1', email: 'admin@cla.com', nome: 'Carlos Admin', perfil: 'admin', ativo: true, comissao_porcentagem: 0 },
  { id: 'user-2', email: 'joao@cla.com', nome: 'João Vendedor', perfil: 'vendedor', ativo: true, comissao_porcentagem: 5 }
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', nome: 'Kit Cama Casal', categoria: 'Cama', valor_avista: 180, valor_parcelado: 220, ativo: true },
  { id: 'p2', nome: 'Jogo de Panelas', categoria: 'Cozinha', valor_avista: 250, valor_parcelado: 300, ativo: true },
];

const INITIAL_CLIENTS: Client[] = [
  { id: 'c1', nome: 'Maria Silva', telefone: '11999999999', endereco: 'Rua A, 123', bairro: 'Centro', cidade: 'São Paulo', vendedor_id: 'user-2' },
];

// Local Storage Helpers
const getStorage = <T>(key: string, initial: T): T => {
  const stored = localStorage.getItem(`cla_${key}`);
  if (!stored) {
    localStorage.setItem(`cla_${key}`, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(stored);
};

const setStorage = <T>(key: string, data: T) => {
  localStorage.setItem(`cla_${key}`, JSON.stringify(data));
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- HELPER: USER CONTEXT ---
const getCurrentUser = (): User | null => {
  const session = localStorage.getItem('cla_session');
  return session ? JSON.parse(session) : null;
};

// Returns the ID to filter by, or NULL if admin (sees all)
const getUserFilter = (): string | null => {
  const user = getCurrentUser();
  if (!user) return null;
  return user.perfil === 'admin' ? null : user.id;
};

// --- AUTH SERVICE ---
export const authService = {
  login: async (email: string, pass: string): Promise<{ user: User | null; error: string | null }> => {
    // 1. Try Supabase
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .eq('senha', pass)
          .single();

        if (error) {
            if (error.code === 'PGRST116') return { user: null, error: 'Usuário não encontrado.' };
            if (error.code === '42P01') return { user: null, error: 'Tabela de usuários não existe no Supabase.' };
            return { user: null, error: error.message };
        }
        if (!data) return { user: null, error: 'Credenciais inválidas' };
        if (!data.ativo) return { user: null, error: 'Usuário desativado' };

        const user: User = data;
        localStorage.setItem('cla_session', JSON.stringify(user));
        return { user, error: null };
      } catch (e) {
        console.error("Supabase Login Error:", e);
        return { user: null, error: 'Erro de conexão com Supabase' };
      }
    } 
    
    // 2. Fallback to Mock
    await delay(500);
    const users = getStorage<User[]>('users', MOCK_USERS);
    const user = users.find(u => u.email === email && pass === '123456'); // Mock password check
    
    if (user) {
      localStorage.setItem('cla_session', JSON.stringify(user));
      return { user, error: null };
    }
    return { user: null, error: 'Credenciais inválidas (Demo: use senha 123456)' };
  },

  register: async (name: string, email: string, pass: string): Promise<{ user: User | null; error: string | null }> => {
    // 1. Try Supabase
    if (isSupabaseConfigured) {
      try {
        const { data: existing } = await supabase.from('users').select('id').eq('email', email).single();
        if (existing) {
          return { user: null, error: 'E-mail já cadastrado.' };
        }

        const newUser = {
          nome: name,
          email: email,
          senha: pass,
          perfil: 'vendedor', // Default to vendedor for self-register
          ativo: true,
          comissao_porcentagem: 0
        };

        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        
        if (error) {
          console.error(error);
          return { user: null, error: 'Erro ao criar conta.' };
        }
        
        const user: User = data;
        localStorage.setItem('cla_session', JSON.stringify(user));
        return { user, error: null };

      } catch (e) {
        return { user: null, error: 'Erro de conexão.' };
      }
    }

    // 2. Mock
    await delay(500);
    const users = getStorage<User[]>('users', MOCK_USERS);
    if (users.find(u => u.email === email)) {
      return { user: null, error: 'E-mail já cadastrado.' };
    }

    const newUser: User = {
      id: uuidv4(),
      nome: name,
      email: email,
      perfil: 'vendedor',
      ativo: true,
      comissao_porcentagem: 0
    };
    
    setStorage('users', [...users, newUser]);
    localStorage.setItem('cla_session', JSON.stringify(newUser));
    return { user: newUser, error: null };
  },
  
  logout: async () => {
    localStorage.removeItem('cla_session');
  },
  
  getSession: getCurrentUser
};

// --- DATA SERVICE ---
export const dataService = {
  // Users
  getSellers: async (): Promise<User[]> => {
    const filterId = getUserFilter();
    
    if (isSupabaseConfigured) {
        let query = supabase.from('users').select('*').order('nome');
        if (filterId) query = query.eq('id', filterId);
        const { data } = await query;
        return data || [];
    }
    await delay(300);
    const users = getStorage<User[]>('users', MOCK_USERS);
    if (filterId) return users.filter(u => u.id === filterId);
    return users;
  },
  
  createSeller: async (userData: Omit<User, 'id'>): Promise<void> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('users').insert([{ ...userData, senha: '123456' }]);
        if (error) throw error;
        return;
    }
    await delay(300);
    const users = getStorage<User[]>('users', MOCK_USERS);
    setStorage('users', [...users, { ...userData, id: uuidv4(), ativo: true, senha: '123456' } as any]);
  },

  updateSeller: async (id: string, updates: Partial<User>): Promise<void> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('users').update(updates).eq('id', id);
        if (error) throw error;
        return;
    }
    await delay(300);
    const users = getStorage<User[]>('users', MOCK_USERS);
    const idx = users.findIndex(u => u.id === id);
    if (idx > -1) {
        users[idx] = { ...users[idx], ...updates };
        setStorage('users', users);
    }
  },

  deleteSeller: async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        return;
    }
    await delay(300);
    const users = getStorage<User[]>('users', MOCK_USERS);
    setStorage('users', users.filter(u => u.id !== id));
  },

  // --- CLIENTS ---

  getClients: async (): Promise<Client[]> => {
    const filterId = getUserFilter();
    if (isSupabaseConfigured) {
        let query = supabase.from('clients').select('*').order('nome');
        if (filterId) query = query.eq('vendedor_id', filterId);
        const { data } = await query;
        return data || [];
    }
    await delay(300);
    let clients = getStorage<Client[]>('clients', INITIAL_CLIENTS);
    if (filterId) clients = clients.filter(c => c.vendedor_id === filterId);
    return clients;
  },

  getClientById: async (id: string): Promise<Client | undefined> => {
    if (isSupabaseConfigured) {
        const { data } = await supabase.from('clients').select('*').eq('id', id).single();
        return data || undefined;
    }
    await delay(200);
    return getStorage<Client[]>('clients', INITIAL_CLIENTS).find(c => c.id === id);
  },

  // -- STORAGE HANDLER --
  uploadClientPhoto: async (file: File | Blob, clientId: string): Promise<string | null> => {
    if (isSupabaseConfigured) {
        // Supabase Storage Logic
        try {
            // Path: clientes/{clientId}.jpg (or original extension)
            // Using timestamp to bust cache if updating
            const timestamp = Date.now();
            const path = `clientes/${clientId}.jpg`;
            
            // Upload
            const { error: uploadError } = await supabase.storage
                .from('clientes-fotos')
                .upload(path, file, { upsert: true });

            if (uploadError) {
                // Check specifically for missing bucket or RLS errors
                const errMsg = uploadError.message || (uploadError as any).error || '';
                const isBucketError = errMsg.includes('Bucket not found') || errMsg.includes('not found') || errMsg.includes('The resource was not found');
                const isRlsError = errMsg.includes('row-level security') || errMsg.includes('policy');

                if (isBucketError || isRlsError) {
                    alert("⚠️ CONFIGURAÇÃO NECESSÁRIA\n\nErro no upload da foto: " + (isRlsError ? "Permissão negada (RLS)." : "Bucket não encontrado.") + "\n\nSOLUÇÃO:\n1. Vá em 'Configurações' > 'Banco de Dados'.\n2. Copie e execute o 'Script de Correção' no Supabase.");
                    return null; // Return null so we don't block the client text update
                } else {
                    console.error("Erro upload:", uploadError);
                }
                throw uploadError;
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('clientes-fotos')
                .getPublicUrl(path);
            
            // Append timestamp param to force refresh on frontend
            return `${publicUrl}?t=${timestamp}`;

        } catch (e) {
            console.error("Upload Failed", e);
            // Return null to avoid crashing the save process
            return null;
        }
    } else {
        // Offline/Mock Logic: Return Base64
        // In the mock version, the "upload" is just passing back the base64 string
        // The calling component handles base64 conversion before saving
        return null; 
    }
  },

  createClient: async (client: Omit<Client, 'id'>): Promise<Client> => {
    const user = getCurrentUser();
    const clientWithUser = { ...client, vendedor_id: user?.id || 'anon' };

    if (isSupabaseConfigured) {
        const { data, error } = await supabase.from('clients').insert([clientWithUser]).select().single();
        if (error) throw error;
        return data;
    }
    await delay(300);
    const clients = getStorage<Client[]>('clients', INITIAL_CLIENTS);
    const newClient = { ...clientWithUser, id: uuidv4() };
    setStorage('clients', [newClient, ...clients]);
    return newClient;
  },

  updateClient: async (id: string, updates: Partial<Client>): Promise<void> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('clients').update(updates).eq('id', id);
        if (error) throw error;
        return;
    }
    await delay(300);
    const clients = getStorage<Client[]>('clients', INITIAL_CLIENTS);
    const idx = clients.findIndex(c => c.id === id);
    if (idx > -1) {
        clients[idx] = { ...clients[idx], ...updates };
        setStorage('clients', clients);
    }
  },

  deleteClient: async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) throw error;
        return;
    }
    await delay(300);
    const clients = getStorage<Client[]>('clients', INITIAL_CLIENTS);
    setStorage('clients', clients.filter(c => c.id !== id));
  },

  // Products
  getProducts: async (): Promise<Product[]> => {
    if (isSupabaseConfigured) {
        const { data } = await supabase.from('products').select('*').eq('ativo', true).order('nome');
        return data || [];
    }
    await delay(300);
    return getStorage<Product[]>('products', INITIAL_PRODUCTS);
  },

  createProduct: async (productData: Omit<Product, 'id'>): Promise<void> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('products').insert([productData]);
        if (error) throw error;
        return;
    }
    await delay(300);
    const products = getStorage<Product[]>('products', INITIAL_PRODUCTS);
    setStorage('products', [...products, { ...productData, id: uuidv4(), ativo: true }]);
  },

  updateProduct: async (id: string, updates: Partial<Product>): Promise<void> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('products').update(updates).eq('id', id);
        if (error) throw error;
        return;
    }
    await delay(300);
    const products = getStorage<Product[]>('products', INITIAL_PRODUCTS);
    const idx = products.findIndex(p => p.id === id);
    if (idx > -1) {
        products[idx] = { ...products[idx], ...updates };
        setStorage('products', products);
    }
  },

  deleteProduct: async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
        return;
    }
    await delay(300);
    const products = getStorage<Product[]>('products', INITIAL_PRODUCTS);
    setStorage('products', products.filter(p => p.id !== id));
  },

  // Sales
  getSales: async (): Promise<Sale[]> => {
    const filterId = getUserFilter();

    if (isSupabaseConfigured) {
        let query = supabase.from('sales').select('*, clients(nome)').order('data_venda', { ascending: false });
        if (filterId) query = query.eq('vendedor_id', filterId);
        
        const { data } = await query;
        return (data || []).map((s: any) => ({ ...s, cliente_nome: s.clients?.nome || 'Desconhecido' }));
    }
    await delay(300);
    let sales = getStorage<Sale[]>('sales', []);
    const clients = getStorage<Client[]>('clients', INITIAL_CLIENTS);
    
    if (filterId) sales = sales.filter(s => s.vendedor_id === filterId);

    return sales.map(s => ({
      ...s,
      cliente_nome: clients.find(c => c.id === s.cliente_id)?.nome || 'Cliente Desconhecido'
    })).sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime());
  },

  getSalesByClient: async (clientId: string): Promise<Sale[]> => {
    const filterId = getUserFilter();
    if (isSupabaseConfigured) {
        let query = supabase.from('sales').select('*').eq('cliente_id', clientId).order('data_venda', { ascending: false });
        if (filterId) query = query.eq('vendedor_id', filterId);
        const { data } = await query;
        return data || [];
    }
    await delay(300);
    let sales = getStorage<Sale[]>('sales', []);
    if (filterId) sales = sales.filter(s => s.vendedor_id === filterId);
    return sales.filter(s => s.cliente_id === clientId).sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime());
  },

  createSale: async (saleData: Omit<Sale, 'id' | 'status'>, installmentsData: Omit<Installment, 'id' | 'venda_id'>[]): Promise<void> => {
    if (isSupabaseConfigured) {
        const { data: sale, error: saleError } = await supabase.from('sales').insert([{ ...saleData, status: 'ABERTA' }]).select().single();
        if (saleError || !sale) throw saleError;
        const installmentsWithId = installmentsData.map(i => ({ ...i, venda_id: sale.id }));
        const { error: instError } = await supabase.from('installments').insert(installmentsWithId);
        if (instError) throw instError;
        return;
    }
    await delay(800);
    const sales = getStorage<Sale[]>('sales', []);
    const installments = getStorage<Installment[]>('installments', []);
    const newSaleId = uuidv4();
    const newSale = { ...saleData, id: newSaleId, status: 'ABERTA' as SaleStatus };
    const newInstallments = installmentsData.map(i => ({ ...i, id: uuidv4(), venda_id: newSaleId, pago: false, data_pagamento: null }));
    setStorage('sales', [newSale, ...sales]);
    setStorage('installments', [...installments, ...newInstallments]);
  },

  deleteSale: async (saleId: string): Promise<void> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('sales').delete().eq('id', saleId);
        if (error) throw error;
        return;
    }
    await delay(400);
    const sales = getStorage<Sale[]>('sales', []);
    const installments = getStorage<Installment[]>('installments', []);
    setStorage('sales', sales.filter(s => s.id !== saleId));
    setStorage('installments', installments.filter(i => i.venda_id !== saleId));
  },
  
  returnSale: async (saleId: string): Promise<void> => {
      if (isSupabaseConfigured) {
          await supabase.from('sales').update({ status: 'DEVOLVIDO' }).eq('id', saleId);
          await supabase.from('installments').delete().eq('venda_id', saleId);
          await supabase.from('cash_flow').delete().eq('venda_id', saleId);
          return;
      }
      await delay(500);
      let sales = getStorage<Sale[]>('sales', []);
      let installments = getStorage<Installment[]>('installments', []);
      let cash = getStorage<CashEntry[]>('cash', []);
      const saleIdx = sales.findIndex(s => s.id === saleId);
      if (saleIdx > -1) {
          sales[saleIdx].status = 'DEVOLVIDO';
      }
      installments = installments.filter(i => i.venda_id !== saleId);
      cash = cash.filter(c => c.venda_id !== saleId);
      setStorage('sales', sales);
      setStorage('installments', installments);
      setStorage('cash', cash);
  },

  // Installments
  getInstallmentsBySale: async (saleId: string): Promise<Installment[]> => {
    if (isSupabaseConfigured) {
        const { data } = await supabase.from('installments').select('*').eq('venda_id', saleId).order('numero_parcela');
        return data || [];
    }
    await delay(200);
    return getStorage<Installment[]>('installments', []).filter(i => i.venda_id === saleId).sort((a, b) => a.numero_parcela - b.numero_parcela);
  },

  updateInstallment: async (id: string, updates: Partial<Pick<Installment, 'valor' | 'data_vencimento'>>): Promise<void> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('installments').update(updates).eq('id', id);
        if (error) throw error;
        return;
    }
    await delay(200);
    const installments = getStorage<Installment[]>('installments', []);
    const index = installments.findIndex(i => i.id === id);
    if (index > -1) {
        installments[index] = { ...installments[index], ...updates };
        setStorage('installments', installments);
    }
  },

  getInstallmentsByDate: async (date: Date): Promise<{ 
     daily: (Installment & { cliente_nome: string, venda_id: string, is_mumbuca?: boolean })[], 
     overdueCount: number 
  }> => {
    const filterId = getUserFilter();
    const start = startOfDay(date).toISOString();
    const end = endOfDay(date).toISOString();
    
    if (isSupabaseConfigured) {
        // Updated query to fetch is_mumbuca from sales
        let query = supabase
            .from('installments')
            .select('*, sales!inner(id, vendedor_id, is_mumbuca, clients(nome))')
            .eq('pago', false)
            .gte('data_vencimento', start)
            .lte('data_vencimento', end)
            .order('data_vencimento');
        
        if (filterId) {
             query = query.eq('sales.vendedor_id', filterId);
        }

        const { data: daily } = await query;

        let overdueQuery = supabase
            .from('installments')
            .select('*, sales!inner(vendedor_id)', { count: 'exact', head: true })
            .eq('pago', false)
            .lt('data_vencimento', startOfDay(new Date()).toISOString());

        if (filterId) {
            overdueQuery = overdueQuery.eq('sales.vendedor_id', filterId);
        }

        const { count: overdueCount } = await overdueQuery;

        return {
           daily: (daily || []).map((i: any) => ({ 
               ...i, 
               cliente_nome: i.sales?.clients?.nome || 'Desconhecido', 
               venda_id: i.venda_id,
               is_mumbuca: i.sales?.is_mumbuca
           })),
           overdueCount: overdueCount || 0
        };
    }

    await delay(300);
    const installments = getStorage<Installment[]>('installments', []);
    const sales = getStorage<Sale[]>('sales', []);
    const clients = getStorage<Client[]>('clients', INITIAL_CLIENTS);

    const visibleSales = filterId ? sales.filter(s => s.vendedor_id === filterId) : sales;
    const visibleSaleIds = visibleSales.map(s => s.id);

    const daily = installments
      .filter(i => visibleSaleIds.includes(i.venda_id) && !i.pago && isSameDay(new Date(i.data_vencimento), date))
      .map(i => {
        const sale = sales.find(s => s.id === i.venda_id);
        const client = clients.find(c => c.id === sale?.cliente_id);
        return { 
            ...i, 
            cliente_nome: client?.nome || 'Desconhecido', 
            venda_id: i.venda_id,
            is_mumbuca: sale?.is_mumbuca 
        };
      });

    const overdueCount = installments.filter(i => visibleSaleIds.includes(i.venda_id) && !i.pago && new Date(i.data_vencimento) < startOfDay(new Date())).length;

    return { daily, overdueCount };
  },

  getDueInstallments: async (): Promise<(Installment & { cliente_nome: string, venda_id: string, is_mumbuca?: boolean })[]> => {
    const filterId = getUserFilter();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (isSupabaseConfigured) {
        // Updated query to fetch is_mumbuca from sales
        let query = supabase
            .from('installments')
            .select('*, sales!inner(id, vendedor_id, is_mumbuca, clients(nome))')
            .eq('pago', false)
            .lte('data_vencimento', today.toISOString())
            .order('data_vencimento');
        if (filterId) query = query.eq('sales.vendedor_id', filterId);
        const { data } = await query;
        return (data || []).map((i: any) => ({ 
            ...i, 
            cliente_nome: i.sales?.clients?.nome || 'Desconhecido', 
            venda_id: i.venda_id,
            is_mumbuca: i.sales?.is_mumbuca
        }));
    }

    await delay(300);
    const installments = getStorage<Installment[]>('installments', []);
    const sales = getStorage<Sale[]>('sales', []);
    const clients = getStorage<Client[]>('clients', INITIAL_CLIENTS);
    const visibleSales = filterId ? sales.filter(s => s.vendedor_id === filterId) : sales;
    const visibleSaleIds = visibleSales.map(s => s.id);

    return installments
      .filter(i => visibleSaleIds.includes(i.venda_id) && !i.pago && new Date(i.data_vencimento) <= today)
      .map(i => {
        const sale = sales.find(s => s.id === i.venda_id);
        const client = clients.find(c => c.id === sale?.cliente_id);
        return { 
            ...i, 
            cliente_nome: client?.nome || 'Desconhecido', 
            venda_id: i.venda_id,
            is_mumbuca: sale?.is_mumbuca
        };
      })
      .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
  },

  payInstallment: async (installmentId: string, vendedorId: string, actualAmountPaid?: number): Promise<void> => {
    let currentInst: Installment | null = null;

    if (isSupabaseConfigured) {
        const { data: inst } = await supabase.from('installments').select('*').eq('id', installmentId).single();
        if (!inst || inst.pago) return;
        currentInst = inst;

        const paidValue = actualAmountPaid !== undefined ? actualAmountPaid : inst.valor;
        const difference = inst.valor - paidValue;

        await supabase.from('installments').update({ 
            pago: true, 
            data_pagamento: new Date().toISOString(),
            valor: paidValue 
        }).eq('id', installmentId);
        
        await supabase.from('cash_flow').insert([{ 
            tipo: 'ENTRADA', 
            valor: paidValue, 
            descricao: `Pagamento Parcela ${inst.numero_parcela}`, 
            vendedor_id: vendedorId, 
            venda_id: inst.venda_id,
            data: new Date().toISOString() 
        }]);

        if (Math.abs(difference) > 0.01) {
            const { data: next } = await supabase
                .from('installments')
                .select('*')
                .eq('venda_id', inst.venda_id)
                .gt('numero_parcela', inst.numero_parcela)
                .order('numero_parcela')
                .limit(1)
                .single();
            if (next) {
                await supabase.from('installments').update({
                    valor: next.valor + difference
                }).eq('id', next.id);
            }
        }
         
        const { data: allInst } = await supabase.from('installments').select('pago').eq('venda_id', inst.venda_id);
        if (allInst) {
             const allPaid = allInst.every((i: any) => i.pago);
             const somePaid = allInst.some((i: any) => i.pago);
             let status: SaleStatus = 'ABERTA';
             if (allPaid) status = 'QUITADA';
             else if (somePaid) status = 'PARCIAL';
             await supabase.from('sales').update({ status }).eq('id', inst.venda_id);
        }
        return;
    }

    await delay(500);
    let installments = getStorage<Installment[]>('installments', []);
    let sales = getStorage<Sale[]>('sales', []);
    let cash = getStorage<CashEntry[]>('cash', []);

    const instIndex = installments.findIndex(i => i.id === installmentId);
    if (instIndex === -1) return;
    const installment = installments[instIndex];
    if (installment.pago) return;

    const paidValue = actualAmountPaid !== undefined ? actualAmountPaid : installment.valor;
    const difference = installment.valor - paidValue;

    installments[instIndex] = { 
        ...installment, 
        pago: true, 
        data_pagamento: new Date().toISOString(),
        valor: paidValue
    };

    cash.push({ 
        id: uuidv4(), 
        data: new Date().toISOString(), 
        tipo: 'ENTRADA', 
        valor: paidValue, 
        descricao: `Pagamento Parcela ${installment.numero_parcela}`, 
        vendedor_id: vendedorId, 
        venda_id: installment.venda_id
    });
    
    if (Math.abs(difference) > 0.01) {
        const nextInstallments = installments
            .map((inst, idx) => ({ ...inst, originalIndex: idx }))
            .filter(i => i.venda_id === installment.venda_id && i.numero_parcela > installment.numero_parcela && !i.pago)
            .sort((a,b) => a.numero_parcela - b.numero_parcela);
        
        if (nextInstallments.length > 0) {
            const nextTarget = nextInstallments[0];
            installments[nextTarget.originalIndex] = {
                ...installments[nextTarget.originalIndex],
                valor: installments[nextTarget.originalIndex].valor + difference
            };
        }
    }

    const saleIndex = sales.findIndex(s => s.id === installment.venda_id);
    if (saleIndex !== -1) {
       const saleInsts = installments.filter(i => i.venda_id === installment.venda_id);
       const allPaid = saleInsts.every(i => i.pago);
       const somePaid = saleInsts.some(i => i.pago);
       sales[saleIndex].status = allPaid ? 'QUITADA' : somePaid ? 'PARCIAL' : 'ABERTA';
    }

    setStorage('installments', installments);
    setStorage('sales', sales);
    setStorage('cash', cash);
  },

  addExpense: async (description: string, value: number, vendedorId: string): Promise<void> => {
     if (isSupabaseConfigured) {
         await supabase.from('cash_flow').insert([{ tipo: 'SAIDA', valor: value, descricao: description, vendedor_id: vendedorId, data: new Date().toISOString() }]);
         return;
     }
     await delay(300);
     const cash = getStorage<CashEntry[]>('cash', []);
     cash.push({ id: uuidv4(), data: new Date().toISOString(), tipo: 'SAIDA', valor: value, descricao: description, vendedor_id: vendedorId });
     setStorage('cash', cash);
  },

  deleteCashEntry: async (id: string): Promise<void> => {
      if (isSupabaseConfigured) {
          await supabase.from('cash_flow').delete().eq('id', id);
          return;
      }
      await delay(300);
      const cash = getStorage<CashEntry[]>('cash', []);
      setStorage('cash', cash.filter(c => c.id !== id));
  },

  getCashFlow: async (): Promise<CashEntry[]> => {
      const filterId = getUserFilter();
      if (isSupabaseConfigured) {
          let query = supabase.from('cash_flow').select('*').order('data', { ascending: false });
          if (filterId) query = query.eq('vendedor_id', filterId);
          const { data } = await query;
          return data || [];
      }
      await delay(300);
      let cash = getStorage<CashEntry[]>('cash', []);
      if (filterId) cash = cash.filter(c => c.vendedor_id === filterId);
      return cash.sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  },
  
  getDashboardStats: async () => {
      const filterId = getUserFilter();
      if (isSupabaseConfigured) {
          let salesQuery = supabase.from('sales').select('id, valor_total');
          if (filterId) salesQuery = salesQuery.eq('vendedor_id', filterId);
          const { data: sales } = await salesQuery;
          const salesIds = sales?.map(s => s.id) || [];
          if (salesIds.length === 0) return { totalVendido: 0, totalRecebido: 0, totalReceber: 0, inadimplencia: 0 };
          
          const { data: paidInst } = await supabase.from('installments').select('valor').in('venda_id', salesIds).eq('pago', true);
          const { data: openInst } = await supabase.from('installments').select('valor').in('venda_id', salesIds).eq('pago', false);
          const today = new Date().toISOString();
          const { data: overdueInst } = await supabase.from('installments').select('valor').in('venda_id', salesIds).eq('pago', false).lt('data_vencimento', today);
          
          return {
             totalVendido: sales?.reduce((acc, curr) => acc + curr.valor_total, 0) || 0,
             totalRecebido: paidInst?.reduce((acc, curr) => acc + curr.valor, 0) || 0,
             totalReceber: openInst?.reduce((acc, curr) => acc + curr.valor, 0) || 0,
             inadimplencia: overdueInst?.reduce((acc, curr) => acc + curr.valor, 0) || 0
          };
      }
      await delay(500);
      let sales = getStorage<Sale[]>('sales', []);
      if (filterId) sales = sales.filter(s => s.vendedor_id === filterId);
      const salesIds = sales.map(s => s.id);
      const installments = getStorage<Installment[]>('installments', []).filter(i => salesIds.includes(i.venda_id));
      const today = new Date();
      return {
          totalVendido: sales.reduce((acc, curr) => acc + curr.valor_total, 0),
          totalRecebido: installments.filter(i => i.pago).reduce((acc, curr) => acc + curr.valor, 0),
          totalReceber: installments.filter(i => !i.pago).reduce((acc, curr) => acc + curr.valor, 0),
          inadimplencia: installments.filter(i => !i.pago && new Date(i.data_vencimento) < today).reduce((acc, curr) => acc + curr.valor, 0)
      };
  },

  getDetailedReports: async (startDate: Date, endDate: Date, sellerId?: string) => {
    const processData = (salesRes: Sale[], cashRes: CashEntry[]) => {
        const interval = eachDayOfInterval({ start: startDate, end: endDate });
        const dailyData: DailyReport[] = interval.map(date => {
            const daySales = salesRes.filter(s => isSameDay(new Date(s.data_venda), date));
            const dayCash = cashRes.filter(c => isSameDay(new Date(c.data), date));
            return {
                data: format(date, 'dd/MM'),
                vendas: daySales.reduce((acc, s) => acc + s.valor_total, 0),
                recebimentos: dayCash.reduce((acc, c) => acc + c.valor, 0)
            };
        });
        return {
            dailyData,
            sales: salesRes,
            receipts: cashRes,
            summary: {
                totalSales: salesRes.reduce((acc, s) => acc + s.valor_total, 0),
                totalReceipts: cashRes.reduce((acc, c) => acc + c.valor, 0)
            }
        };
    };
    
    const currentUser = getCurrentUser();
    let finalSellerId = sellerId;
    if (currentUser?.perfil !== 'admin') {
        finalSellerId = currentUser?.id;
    }

    if (isSupabaseConfigured) {
        let salesQuery = supabase.from('sales').select('*, clients(nome)').gte('data_venda', startDate.toISOString()).lte('data_venda', endDate.toISOString());
        let cashQuery = supabase.from('cash_flow').select('*').eq('tipo', 'ENTRADA').gte('data', startDate.toISOString()).lte('data', endDate.toISOString());
        
        if (finalSellerId && finalSellerId !== 'all') {
            salesQuery = salesQuery.eq('vendedor_id', finalSellerId);
            cashQuery = cashQuery.eq('vendedor_id', finalSellerId);
        }

        const { data: sData } = await salesQuery;
        const { data: cData } = await cashQuery;
        const sales = (sData || []).map((s: any) => ({ ...s, cliente_nome: s.clients?.nome || 'Desconhecido' }));
        return processData(sales, cData || []);
    }
    
    await delay(500);
    const sales = await dataService.getSales(); 
    const cash = await dataService.getCashFlow(); 
    
    let filteredSales = sales.filter(s => {
       const d = new Date(s.data_venda);
       return d >= startDate && d <= endDate;
    });
    let filteredCash = cash.filter(c => {
       const d = new Date(c.data);
       return d >= startDate && d <= endDate && c.tipo === 'ENTRADA';
    });
    
    if (finalSellerId && finalSellerId !== 'all') {
        filteredSales = filteredSales.filter(s => s.vendedor_id === finalSellerId);
        filteredCash = filteredCash.filter(c => c.vendedor_id === finalSellerId);
    }
    return processData(filteredSales, filteredCash);
  },

  exportBackupData: async (): Promise<string> => {
      if (isSupabaseConfigured) {
          throw new Error("Exportação não disponível no modo Online (Supabase).");
      }
      const user = getCurrentUser();
      if (!user) throw new Error("Usuário não logado");
      
      const allSales = getStorage<Sale[]>('sales', []);
      const allClients = getStorage<Client[]>('clients', INITIAL_CLIENTS);
      const allCash = getStorage<CashEntry[]>('cash', []);
      const allInstallments = getStorage<Installment[]>('installments', []);
      
      let exportSales = allSales;
      let exportClients = allClients;
      let exportCash = allCash;
      let exportInstallments = allInstallments;
      
      if (user.perfil !== 'admin') {
          exportSales = allSales.filter(s => s.vendedor_id === user.id);
          exportClients = allClients.filter(c => c.vendedor_id === user.id);
          exportCash = allCash.filter(c => c.vendedor_id === user.id);
          const saleIds = exportSales.map(s => s.id);
          exportInstallments = allInstallments.filter(i => saleIds.includes(i.venda_id));
      }

      const backup = {
          version: '1.0',
          timestamp: new Date().toISOString(),
          exporter: user.email,
          users: user.perfil === 'admin' ? getStorage('users', MOCK_USERS) : [user], 
          clients: exportClients,
          products: getStorage('products', INITIAL_PRODUCTS),
          sales: exportSales,
          installments: exportInstallments,
          cash: exportCash
      };
      return JSON.stringify(backup, null, 2);
  },

  importBackupData: async (jsonData: string): Promise<void> => {
      if (isSupabaseConfigured) {
          throw new Error("Importação não disponível no modo Online (Supabase).");
      }
      try {
          const data = JSON.parse(jsonData);
          if (!data.version) throw new Error("Arquivo inválido");
          
          setStorage('clients', data.clients || []);
          setStorage('products', data.products || []);
          setStorage('sales', data.sales || []);
          setStorage('installments', data.installments || []);
          setStorage('cash', data.cash || []);
          
          if (data.users && data.users.length > 0) {
              setStorage('users', data.users);
          }
      } catch (e) {
          console.error(e);
          throw new Error("Erro ao importar backup");
      }
  }
};
