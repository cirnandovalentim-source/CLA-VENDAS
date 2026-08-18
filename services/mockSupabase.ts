
import { User, Client, Product, Sale, Installment, CashEntry, SaleStatus, DailyReport } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, startOfDay, endOfDay, addMonths } from 'date-fns';
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
  try {
    const stored = localStorage.getItem(`cla_${key}`);
    if (!stored) {
      localStorage.setItem(`cla_${key}`, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(stored);
  } catch (e) {
    console.error(`Error getting storage ${key}`, e);
    return initial;
  }
};

const setStorage = <T>(key: string, data: T) => {
  try {
    localStorage.setItem(`cla_${key}`, JSON.stringify(data));
  } catch (e: any) {
    if (
        e.name === 'QuotaExceededError' || 
        e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        (e.code === 22) || (e.code === 1014)
    ) {
        alert("⚠️ MEMÓRIA CHEIA!\n\nNão foi possível salvar pois o navegador está sem espaço. Tente:\n1. Excluir clientes antigos\n2. Usar fotos menores\n3. Exportar Backup e limpar dados.");
    }
    console.error(`Error setting storage ${key}`, e);
    throw e;
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- HELPER: USER CONTEXT ---
const getCurrentUser = (): User | null => {
  const session = localStorage.getItem('cla_session');
  return session ? JSON.parse(session) : null;
};

// SECURITY: Enforce RLS at Application Layer
// Returns the ID to filter by, or NULL if admin (sees all)
const getUserFilter = (): string | null => {
  const user = getCurrentUser();
  if (!user) return 'anon'; // Block access if not logged in
  return user.perfil === 'admin' ? null : user.id;
};

// HELPER: DETECT NETWORK / FETCH ERRORS
export const isNetworkError = (error: any): boolean => {
    if (!error) return false;
    const str = typeof error === 'string'
      ? error
      : String(error.message || error.details || error.hint || error.error_description || JSON.stringify(error));
    return str.includes('Failed to fetch') ||
           str.includes('TypeError') ||
           str.includes('NetworkError') ||
           str.includes('network error') ||
           error.name === 'TypeError';
};

// HELPER: ERROR HANDLER FOR SUPABASE
const handleSupabaseError = (error: any) => {
    if (!error) return;

    if (isNetworkError(error)) {
        console.warn("[Supabase] Conexão indisponível (Failed to fetch). Operando com resiliência local.");
        throw new Error("ERR_NETWORK: Falha de conexão com o banco de dados Supabase.");
    }
    
    console.error("Supabase Operation Error:", error);
    
    // RLS / Permission Denied Error
    if (error.code === '42501' || error.message?.includes('row-level security') || error.message?.includes('permission denied')) {
        const msg = "ERRO DE PERMISSÃO (RLS):\nO banco de dados bloqueou esta ação.\n\nSOLUÇÃO:\n1. Vá na tela de Login -> Setup.\n2. Clique em 'CORRIGIR POLICIES'.\n3. Copie o código e rode no Supabase.";
        alert(msg);
        throw new Error(msg);
    }
    
    // Missing Tables
    if (error.code === '42P01') {
        const msg = "ERRO: Tabelas não encontradas.\nExecute o script de Instalação no Setup.";
        alert(msg);
        throw new Error(msg);
    }
    
    throw error;
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
          .maybeSingle(); 

        if (error) {
            if (error.code === '42P01') return { user: null, error: 'Banco de dados não configurado. Vá em Setup.' };
            if (error.code === 'PGRST301') return { user: null, error: 'Chave de API inválida.' };
            return { user: null, error: `Erro no banco: ${error.message}` };
        }
        
        if (!data) return { user: null, error: 'E-mail ou senha incorretos.' };
        if (!data.ativo) return { user: null, error: 'Usuário desativado.' };

        const user: User = data;
        localStorage.setItem('cla_session', JSON.stringify(user));
        return { user, error: null };
      } catch (e: any) {
        console.error("Supabase Login Exception:", e);
        return { user: null, error: 'Erro de conexão com o banco de dados.' };
      }
    } 
    
    // 2. Fallback to Mock
    await delay(500);
    const users = getStorage<User[]>('users', MOCK_USERS);
    const user = users.find(u => u.email === email && pass === '123456'); 
    
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
        const { data: existing, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();
            
        if (checkError && checkError.code !== 'PGRST116') { // Ignore "no rows" error
             handleSupabaseError(checkError);
        }

        if (existing) {
          return { user: null, error: 'E-mail já cadastrado.' };
        }

        const newUser = {
          nome: name,
          email: email,
          senha: pass,
          perfil: 'vendedor', 
          ativo: true,
          comissao_porcentagem: 0
        };

        const { data, error } = await supabase.from('users').insert([newUser]).select().single();
        
        if (error) {
          if (error.code === '42501') return { user: null, error: 'Permissão negada (RLS). Rode o script CORRIGIR POLICIES no Setup.' };
          handleSupabaseError(error);
          return { user: null, error: 'Erro ao criar conta.' };
        }
        
        const user: User = data;
        localStorage.setItem('cla_session', JSON.stringify(user));
        return { user, error: null };

      } catch (e: any) {
        return { user: null, error: e.message || 'Erro de conexão.' };
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

// --- DATA SERVICE (Refactored to avoid circular dependencies) ---

// 1. Define functions independently
const getSellers = async (): Promise<User[]> => {
    const filterId = getUserFilter();
    
    if (isSupabaseConfigured) {
        try {
            let query = supabase.from('users').select('*').order('nome');
            if (filterId) query = query.eq('id', filterId); // STRICT SECURITY
            const { data, error } = await query;
            if (error) handleSupabaseError(error);
            return data || [];
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[getSellers] Erro de rede. Usando dados locais.");
            } else {
                throw e;
            }
        }
    }
    await delay(300);
    const users = getStorage<User[]>('users', MOCK_USERS);
    if (filterId) return users.filter(u => u.id === filterId);
    return users;
};

// GET SPECIFIC USER
const getUserById = async (id: string): Promise<User | null> => {
    if (isSupabaseConfigured) {
        try {
            const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
            if (error) handleSupabaseError(error);
            return data || null;
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[getUserById] Erro de rede. Usando dados locais.");
            } else {
                throw e;
            }
        }
    }
    await delay(200);
    const users = getStorage<User[]>('users', MOCK_USERS);
    return users.find(u => u.id === id) || null;
};

// NEW FUNCTION: Calculate Seller Performance
const getSellersPerformance = async (startDate: Date, endDate: Date): Promise<{ sellerId: string, totalSales: number, salesCount: number }[]> => {
    const startIso = startOfDay(startDate).toISOString();
    const endIso = endOfDay(endDate).toISOString();

    if (isSupabaseConfigured) {
        try {
            const { data: sales, error } = await supabase
                .from('sales')
                .select('vendedor_id, valor_total')
                .gte('data_venda', startIso)
                .lte('data_venda', endIso);

            if (error) {
                handleSupabaseError(error);
                return [];
            }

            // Aggregate by Seller
            const map: Record<string, { total: number, count: number }> = {};
            sales?.forEach((s: any) => {
                if (!map[s.vendedor_id]) map[s.vendedor_id] = { total: 0, count: 0 };
                map[s.vendedor_id].total += s.valor_total;
                map[s.vendedor_id].count += 1;
            });

            return Object.keys(map).map(id => ({
                sellerId: id,
                totalSales: map[id].total,
                salesCount: map[id].count
            }));
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[getSellersPerformance] Erro de rede. Usando dados locais.");
            } else {
                throw e;
            }
        }
    }

    // Mock Implementation
    await delay(300);
    const sales = getStorage<Sale[]>('sales', []);
    const filtered = sales.filter(s => {
        const d = new Date(s.data_venda);
        return d >= startDate && d <= endDate;
    });

    const map: Record<string, { total: number, count: number }> = {};
    filtered.forEach(s => {
        if (!map[s.vendedor_id]) map[s.vendedor_id] = { total: 0, count: 0 };
        map[s.vendedor_id].total += s.valor_total;
        map[s.vendedor_id].count += 1;
    });

    return Object.keys(map).map(id => ({
        sellerId: id,
        totalSales: map[id].total,
        salesCount: map[id].count
    }));
};

const createSeller = async (userData: Omit<User, 'id'>): Promise<void> => {
    // Only admins usually create sellers, but handled here just in case
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('users').insert([{ ...userData, senha: '123456' }]);
        if (error) handleSupabaseError(error);
        return;
    }
    await delay(300);
    const users = getStorage<User[]>('users', MOCK_USERS);
    setStorage('users', [...users, { ...userData, id: uuidv4(), ativo: true, senha: '123456' } as any]);
};

const updateSeller = async (id: string, updates: Partial<User>): Promise<void> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('users').update(updates).eq('id', id);
        if (error) handleSupabaseError(error);
        return;
    }
    await delay(300);
    const users = getStorage<User[]>('users', MOCK_USERS);
    const idx = users.findIndex(u => u.id === id);
    if (idx > -1) {
        users[idx] = { ...users[idx], ...updates };
        setStorage('users', users);
    }
};

const deleteSeller = async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) handleSupabaseError(error);
        return;
    }
    await delay(300);
    const users = getStorage<User[]>('users', MOCK_USERS);
    setStorage('users', users.filter(u => u.id !== id));
};

// CLIENTS
const getClients = async (): Promise<Client[]> => {
    const filterId = getUserFilter();
    if (isSupabaseConfigured) {
        try {
            let query = supabase.from('clients').select('*').order('nome');
            if (filterId) {
                 query = query.eq('vendedor_id', filterId); // STRICT SECURITY
            }
            const { data, error } = await query;
            if (error) {
                 if (error.code !== '42P01') handleSupabaseError(error);
            }
            return data || [];
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[getClients] Erro de rede. Usando dados locais.");
            } else {
                throw e;
            }
        }
    }
    await delay(300);
    let clients = getStorage<Client[]>('clients', INITIAL_CLIENTS);
    if (filterId) clients = clients.filter(c => c.vendedor_id === filterId);
    return clients;
};

const getClientById = async (id: string): Promise<Client | undefined> => {
    if (isSupabaseConfigured) {
        try {
            const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
            if (error) handleSupabaseError(error);
            return data || undefined;
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[getClientById] Erro de rede. Usando dados locais.");
            } else {
                throw e;
            }
        }
    }
    await delay(200);
    return getStorage<Client[]>('clients', INITIAL_CLIENTS).find(c => c.id === id);
};

const uploadClientPhoto = async (file: File | Blob, clientId: string): Promise<string | null> => {
    if (isSupabaseConfigured) {
        try {
            const timestamp = Date.now();
            const path = `clientes/${clientId}.jpg`;
            
            const { error: uploadError } = await supabase.storage
                .from('clientes-fotos')
                .upload(path, file, { upsert: true });

            if (uploadError) {
                const errMsg = uploadError.message || (uploadError as any).error || '';
                if (errMsg.includes('Bucket') || errMsg.includes('row-level') || (uploadError as any).statusCode === '403') {
                    alert("⚠️ ERRO DE PERMISSÃO NO STORAGE:\n\nVá em Setup > CORRIGIR POLICIES e execute o script.");
                    return null;
                }
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('clientes-fotos')
                .getPublicUrl(path);
            
            return `${publicUrl}?t=${timestamp}`;

        } catch (e) {
            console.error("Upload Failed", e);
            return null;
        }
    } else {
        return null;
    }
};

const createClient = async (client: Omit<Client, 'id'>): Promise<Client> => {
    const user = getCurrentUser();
    // STRICT SECURITY: Always force current user ID unless admin
    let vId = user?.perfil === 'admin' ? (client.vendedor_id || user.id) : user?.id || 'anon';
    
    if (isSupabaseConfigured) {
        try {
            const { data, error } = await supabase.from('clients').insert([{ ...client, vendedor_id: vId }]).select().single();
            if (error) {
                if (error.message.includes("foreign key") || error.message.includes("uuid")) {
                    const { data: retryData, error: retryError } = await supabase.from('clients').insert([{ 
                        ...client, 
                        vendedor_id: null 
                    }]).select().single();
                    if (retryError) handleSupabaseError(retryError);
                    return retryData;
                }
                handleSupabaseError(error);
            }
            return data;
        } catch (e: any) {
            if (isNetworkError(e)) {
                console.warn("[createClient] Erro de rede ao salvar no Supabase. Salvando localmente.");
            } else {
                throw e;
            }
        }
    }
    
    await delay(300);
    const clients = getStorage<Client[]>('clients', INITIAL_CLIENTS);
    const newClient = { ...client, vendedor_id: vId, id: uuidv4() };
    setStorage('clients', [newClient, ...clients]);
    return newClient;
};

const updateClient = async (id: string, updates: Partial<Client>): Promise<void> => {
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from('clients').update(updates).eq('id', id);
            if (error) handleSupabaseError(error);
            return;
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[updateClient] Erro de rede. Atualizando localmente.");
            } else {
                throw e;
            }
        }
    }
    await delay(300);
    const clients = getStorage<Client[]>('clients', INITIAL_CLIENTS);
    const idx = clients.findIndex(c => c.id === id);
    if (idx > -1) {
        clients[idx] = { ...clients[idx], ...updates };
        setStorage('clients', clients);
    }
};

const deleteClient = async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from('clients').delete().eq('id', id);
            if (error) handleSupabaseError(error);
            return;
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[deleteClient] Erro de rede. Excluindo localmente.");
            } else {
                throw e;
            }
        }
    }
    await delay(300);
    const clients = getStorage<Client[]>('clients', INITIAL_CLIENTS);
    setStorage('clients', clients.filter(c => c.id !== id));
};

// PRODUCTS (Shared)
const getProducts = async (): Promise<Product[]> => {
    if (isSupabaseConfigured) {
        try {
            const { data, error } = await supabase.from('products').select('*').eq('ativo', true).order('nome');
            if (error && error.code !== '42P01') handleSupabaseError(error);
            return data || [];
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[getProducts] Erro de rede. Usando dados locais.");
            } else {
                throw e;
            }
        }
    }
    await delay(300);
    return getStorage<Product[]>('products', INITIAL_PRODUCTS);
};

const createProduct = async (productData: Omit<Product, 'id'>): Promise<void> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('products').insert([productData]);
        if (error) handleSupabaseError(error);
        return;
    }
    await delay(300);
    const products = getStorage<Product[]>('products', INITIAL_PRODUCTS);
    setStorage('products', [...products, { ...productData, id: uuidv4(), ativo: true }]);
};

const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('products').update(updates).eq('id', id);
        if (error) handleSupabaseError(error);
        return;
    }
    await delay(300);
    const products = getStorage<Product[]>('products', INITIAL_PRODUCTS);
    const idx = products.findIndex(p => p.id === id);
    if (idx > -1) {
        products[idx] = { ...products[idx], ...updates };
        setStorage('products', products);
    }
};

const deleteProduct = async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) handleSupabaseError(error);
        return;
    }
    await delay(300);
    const products = getStorage<Product[]>('products', INITIAL_PRODUCTS);
    setStorage('products', products.filter(p => p.id !== id));
};

// SALES
const getSales = async (): Promise<Sale[]> => {
    const filterId = getUserFilter();

    if (isSupabaseConfigured) {
        try {
            let query = supabase.from('sales').select('*, clients(nome)').order('data_venda', { ascending: false });
            if (filterId) { query = query.eq('vendedor_id', filterId); } // STRICT SECURITY
            const { data, error } = await query;
            if (error) handleSupabaseError(error);
            return (data || []).map((s: any) => ({ ...s, cliente_nome: s.clients?.nome || 'Desconhecido' }));
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[getSales] Erro de rede. Usando dados locais.");
            } else {
                throw e;
            }
        }
    }
    await delay(300);
    let sales = getStorage<Sale[]>('sales', []);
    const clients = getStorage<Client[]>('clients', INITIAL_CLIENTS);
    if (filterId) sales = sales.filter(s => s.vendedor_id === filterId);
    return sales.map(s => ({
      ...s,
      cliente_nome: clients.find(c => c.id === s.cliente_id)?.nome || 'Cliente Desconhecido'
    })).sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime());
};

const getSalesByClient = async (clientId: string): Promise<Sale[]> => {
    const filterId = getUserFilter();
    if (isSupabaseConfigured) {
        try {
            let query = supabase.from('sales').select('*').eq('cliente_id', clientId).order('data_venda', { ascending: false });
            if (filterId) { query = query.eq('vendedor_id', filterId); } // STRICT SECURITY
            const { data, error } = await query;
            if (error) handleSupabaseError(error);
            return data || [];
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[getSalesByClient] Erro de rede. Usando dados locais.");
            } else {
                throw e;
            }
        }
    }
    await delay(300);
    let sales = getStorage<Sale[]>('sales', []);
    if (filterId) sales = sales.filter(s => s.vendedor_id === filterId);
    return sales.filter(s => s.cliente_id === clientId).sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime());
};

const createSale = async (saleData: Omit<Sale, 'id' | 'status'>, installmentsData: Omit<Installment, 'id' | 'venda_id'>[]): Promise<void> => {
    if (isSupabaseConfigured) {
        try {
            // Force Vendedor ID
            const user = getCurrentUser();
            const vId = user?.id;
            if (!vId) throw new Error("Usuário não logado");
            
            const salePayload = { ...saleData, vendedor_id: vId, status: 'ABERTA' };
            
            // 1. Create Sale
            const { data: sale, error: saleError } = await supabase.from('sales').insert([salePayload]).select().single();
            if (saleError || !sale) {
                handleSupabaseError(saleError);
                return;
            }
            
            // 2. Create Installments
            try {
                const installmentsWithId = installmentsData.map(i => ({ ...i, venda_id: sale.id }));
                const { error: instError } = await supabase.from('installments').insert(installmentsWithId);
                
                if (instError) {
                    console.error("Installment error, rolling back sale...", instError);
                    await supabase.from('sales').delete().eq('id', sale.id);
                    throw instError;
                }
            } catch (e: any) {
                 throw new Error("Erro ao criar parcelas: " + e.message);
            }
            return;
        } catch (e: any) {
            if (isNetworkError(e)) {
                console.warn("[createSale] Erro de rede ao comunicar com Supabase. Salvando localmente.");
            } else {
                throw e;
            }
        }
    }
    await delay(800);
    const sales = getStorage<Sale[]>('sales', []);
    const installments = getStorage<Installment[]>('installments', []);
    const newSaleId = uuidv4();
    const newSale = { ...saleData, id: newSaleId, status: 'ABERTA' as SaleStatus };
    const newInstallments = installmentsData.map(i => ({ ...i, id: uuidv4(), venda_id: newSaleId, pago: false, data_pagamento: null }));
    setStorage('sales', [newSale, ...sales]);
    setStorage('installments', [...installments, ...newInstallments]);
};

const updateSale = async (id: string, updates: Partial<Sale>): Promise<void> => {
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from('sales').update(updates).eq('id', id);
            if (error) handleSupabaseError(error);
            return;
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[updateSale] Erro de rede. Atualizando localmente.");
            } else {
                throw e;
            }
        }
    }
    await delay(300);
    const sales = getStorage<Sale[]>('sales', []);
    const idx = sales.findIndex(s => s.id === id);
    if (idx > -1) {
        sales[idx] = { ...sales[idx], ...updates };
        setStorage('sales', sales);
    }
};

const deleteSale = async (saleId: string): Promise<void> => {
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from('sales').delete().eq('id', saleId);
            if (error) handleSupabaseError(error);
            return;
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[deleteSale] Erro de rede. Excluindo localmente.");
            } else {
                throw e;
            }
        }
    }
    await delay(400);
    const sales = getStorage<Sale[]>('sales', []);
    const installments = getStorage<Installment[]>('installments', []);
    setStorage('sales', sales.filter(s => s.id !== saleId));
    setStorage('installments', installments.filter(i => i.venda_id !== saleId));
};
  
const returnSale = async (saleId: string): Promise<void> => {
      if (isSupabaseConfigured) {
          try {
              await supabase.from('sales').update({ status: 'DEVOLVIDO' }).eq('id', saleId);
              await supabase.from('installments').delete().eq('venda_id', saleId);
              await supabase.from('cash_flow').delete().eq('venda_id', saleId);
              return;
          } catch (e) {
              if (isNetworkError(e)) {
                  console.warn("[returnSale] Erro de rede. Devolvendo localmente.");
              } else {
                  throw e;
              }
          }
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
};

// INSTALLMENTS
const getInstallmentsBySale = async (saleId: string): Promise<Installment[]> => {
    if (isSupabaseConfigured) {
        try {
            const { data, error } = await supabase.from('installments').select('*').eq('venda_id', saleId).order('numero_parcela');
            if (error) handleSupabaseError(error);
            return data || [];
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[getInstallmentsBySale] Erro de rede. Usando dados locais.");
            } else {
                throw e;
            }
        }
    }
    await delay(200);
    return getStorage<Installment[]>('installments', []).filter(i => i.venda_id === saleId).sort((a, b) => a.numero_parcela - b.numero_parcela);
};

const updateInstallment = async (id: string, updates: Partial<Pick<Installment, 'valor' | 'data_vencimento'>>): Promise<void> => {
    if (isSupabaseConfigured) {
        try {
            const { error } = await supabase.from('installments').update(updates).eq('id', id);
            if (error) handleSupabaseError(error);
            return;
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[updateInstallment] Erro de rede. Atualizando localmente.");
            } else {
                throw e;
            }
        }
    }
    await delay(200);
    const installments = getStorage<Installment[]>('installments', []);
    const index = installments.findIndex(i => i.id === id);
    if (index > -1) {
        installments[index] = { ...installments[index], ...updates };
        setStorage('installments', installments);
    }
};

const getInstallmentsByDate = async (date: Date): Promise<{ 
     daily: (Installment & { cliente_nome: string, venda_id: string, is_mumbuca?: boolean })[], 
     overdueCount: number 
  }> => {
    const filterId = getUserFilter();
    const start = startOfDay(date).toISOString();
    const end = endOfDay(date).toISOString();
    
    if (isSupabaseConfigured) {
        try {
            // STRICT SECURITY: JOIN WITH SALES AND FILTER BY VENDEDOR
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

            const { data: daily, error: dailyError } = await query;
            if (dailyError) handleSupabaseError(dailyError);

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
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[getInstallmentsByDate] Erro de rede. Usando dados locais.");
            } else {
                throw e;
            }
        }
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
};

const getDueInstallments = async (): Promise<(Installment & { cliente_nome: string, venda_id: string, is_mumbuca?: boolean })[]> => {
    const filterId = getUserFilter();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (isSupabaseConfigured) {
        try {
            let query = supabase
                .from('installments')
                .select('*, sales!inner(id, vendedor_id, is_mumbuca, clients(nome))')
                .eq('pago', false)
                .lte('data_vencimento', today.toISOString())
                .order('data_vencimento');
            
            if (filterId) { query = query.eq('sales.vendedor_id', filterId); } // STRICT SECURITY

            const { data, error } = await query;
            if (error) handleSupabaseError(error);
            return (data || []).map((i: any) => ({ 
                ...i, 
                cliente_nome: i.sales?.clients?.nome || 'Desconhecido', 
                venda_id: i.venda_id,
                is_mumbuca: i.sales?.is_mumbuca
            }));
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[getDueInstallments] Erro de rede. Usando dados locais.");
            } else {
                throw e;
            }
        }
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
};

const payInstallment = async (installmentId: string, vendedorId: string, actualAmountPaid?: number): Promise<void> => {
    const processPaymentLogic = async (inst: Installment, paidValue: number) => {
        const difference = Number((inst.valor - paidValue).toFixed(2));
        
        // 1. Mark Current Installment as Paid with the ACTUAL amount paid
        if (isSupabaseConfigured) {
            try {
                await supabase.from('installments').update({ 
                    pago: true, 
                    data_pagamento: new Date().toISOString(),
                    valor: paidValue 
                }).eq('id', inst.id);
                
                await supabase.from('cash_flow').insert([{ 
                    tipo: 'ENTRADA', 
                    valor: paidValue, 
                    descricao: `Pagamento Parcela ${inst.numero_parcela}`, 
                    vendedor_id: vendedorId, 
                    venda_id: inst.venda_id,
                    data: new Date().toISOString() 
                }]);
            } catch (e) {
                if (!isNetworkError(e)) throw e;
            }
        } else {
            // Mock Update
            const installments = getStorage<Installment[]>('installments', []);
            const idx = installments.findIndex(i => i.id === inst.id);
            if (idx > -1) {
                installments[idx] = { ...installments[idx], pago: true, data_pagamento: new Date().toISOString(), valor: paidValue };
                setStorage('installments', installments);
                const cash = getStorage<CashEntry[]>('cash', []);
                cash.push({ 
                    id: uuidv4(), data: new Date().toISOString(), tipo: 'ENTRADA', valor: paidValue, 
                    descricao: `Pagamento Parcela ${inst.numero_parcela}`, vendedor_id: vendedorId, venda_id: inst.venda_id 
                });
                setStorage('cash', cash);
            }
        }

        // 2. Handle Difference (Carry Over or Create New)
        if (Math.abs(difference) > 0.01) {
            let nextInstallment: Installment | null = null;

            if (isSupabaseConfigured) {
                try {
                    const { data } = await supabase.from('installments')
                        .select('*')
                        .eq('venda_id', inst.venda_id)
                        .gt('numero_parcela', inst.numero_parcela)
                        .order('numero_parcela')
                        .limit(1)
                        .maybeSingle();
                    nextInstallment = data;
                } catch (e) {
                    if (!isNetworkError(e)) throw e;
                }
            } else {
                const allMock = getStorage<Installment[]>('installments', []);
                nextInstallment = allMock
                    .filter(i => i.venda_id === inst.venda_id && i.numero_parcela > inst.numero_parcela)
                    .sort((a,b) => a.numero_parcela - b.numero_parcela)[0] || null;
            }

            if (nextInstallment) {
                const newNextValue = Number((nextInstallment.valor + difference).toFixed(2));
                if (isSupabaseConfigured) {
                    try {
                        await supabase.from('installments').update({ valor: newNextValue }).eq('id', nextInstallment.id);
                    } catch (e) {
                        if (!isNetworkError(e)) throw e;
                    }
                } else {
                    const allMock = getStorage<Installment[]>('installments', []);
                    const nIdx = allMock.findIndex(i => i.id === nextInstallment!.id);
                    if (nIdx > -1) {
                        allMock[nIdx].valor = newNextValue;
                        setStorage('installments', allMock);
                    }
                }
            } else if (difference > 0) {
                const newInstallment = {
                    venda_id: inst.venda_id,
                    numero_parcela: inst.numero_parcela + 1,
                    valor: difference,
                    data_vencimento: addMonths(new Date(inst.data_vencimento), 1).toISOString(),
                    pago: false,
                    data_pagamento: null
                };

                if (isSupabaseConfigured) {
                    try {
                        await supabase.from('installments').insert([newInstallment]);
                    } catch (e) {
                        if (!isNetworkError(e)) throw e;
                    }
                } else {
                    const allMock = getStorage<Installment[]>('installments', []);
                    setStorage('installments', [...allMock, { ...newInstallment, id: uuidv4() }]);
                }
            }
        }

        // 3. Update Sale Status AND Recalculate Total Sale Value
        if (isSupabaseConfigured) {
             try {
                 const { data: allInst } = await supabase.from('installments').select('pago, valor').eq('venda_id', inst.venda_id);
                 if (allInst) {
                     const allPaid = allInst.every((i: any) => i.pago);
                     const somePaid = allInst.some((i: any) => i.pago);
                     const newTotal = allInst.reduce((acc, curr) => acc + curr.valor, 0);

                     let status: SaleStatus = 'ABERTA';
                     if (allPaid) status = 'QUITADA';
                     else if (somePaid) status = 'PARCIAL';
                     
                     await supabase.from('sales').update({ 
                         status,
                         valor_total: newTotal
                     }).eq('id', inst.venda_id);
                 }
             } catch (e) {
                 if (!isNetworkError(e)) throw e;
             }
        } else {
            const allMock = getStorage<Installment[]>('installments', []);
            const saleInsts = allMock.filter(i => i.venda_id === inst.venda_id);
            const allPaid = saleInsts.every(i => i.pago);
            const somePaid = saleInsts.some(i => i.pago);
            const newTotal = saleInsts.reduce((acc, curr) => acc + curr.valor, 0);
            
            const sales = getStorage<Sale[]>('sales', []);
            const sIdx = sales.findIndex(s => s.id === inst.venda_id);
            if (sIdx > -1) {
                sales[sIdx].status = allPaid ? 'QUITADA' : somePaid ? 'PARCIAL' : 'ABERTA';
                sales[sIdx].valor_total = newTotal;
                setStorage('sales', sales);
            }
        }
    };

    if (isSupabaseConfigured) {
        try {
            const { data: inst } = await supabase.from('installments').select('*').eq('id', installmentId).single();
            if (!inst || inst.pago) return;
            await processPaymentLogic(inst, actualAmountPaid !== undefined ? actualAmountPaid : inst.valor);
            return;
        } catch (e) {
            if (!isNetworkError(e)) throw e;
            console.warn("[payInstallment] Erro de rede. Processando pagamento localmente.");
        }
    }
    
    await delay(300);
    const installments = getStorage<Installment[]>('installments', []);
    const inst = installments.find(i => i.id === installmentId);
    if (!inst || inst.pago) return;
    await processPaymentLogic(inst, actualAmountPaid !== undefined ? actualAmountPaid : inst.valor);
};

const addExpense = async (description: string, value: number, vendedorId: string, categoria?: string): Promise<void> => {
     const finalDesc = categoria ? `[${categoria}] ${description}` : description;
     if (isSupabaseConfigured) {
         try {
             const { error } = await supabase.from('cash_flow').insert([{ tipo: 'SAIDA', valor: value, descricao: finalDesc, vendedor_id: vendedorId, data: new Date().toISOString() }]);
             if (error) handleSupabaseError(error);
             return;
         } catch (e) {
             if (!isNetworkError(e)) throw e;
             console.warn("[addExpense] Erro de rede. Salvando despesa localmente.");
         }
     }
     await delay(300);
     const cash = getStorage<CashEntry[]>('cash', []);
     cash.push({ id: uuidv4(), data: new Date().toISOString(), tipo: 'SAIDA', valor: value, descricao: finalDesc, vendedor_id: vendedorId, categoria });
     setStorage('cash', cash);
};

const deleteCashEntry = async (id: string): Promise<void> => {
      if (isSupabaseConfigured) {
          try {
              const { error } = await supabase.from('cash_flow').delete().eq('id', id);
              if (error) handleSupabaseError(error);
              return;
          } catch (e) {
              if (!isNetworkError(e)) throw e;
              console.warn("[deleteCashEntry] Erro de rede. Excluindo localmente.");
          }
      }
      await delay(300);
      const cash = getStorage<CashEntry[]>('cash', []);
      setStorage('cash', cash.filter(c => c.id !== id));
};

const getCashFlow = async (sellerIdOverride?: string): Promise<CashEntry[]> => {
      const filterId = sellerIdOverride || getUserFilter();
      
      const parseCategoria = (entries: any[]) => {
          return entries.map(e => {
              if (e.tipo === 'SAIDA' && e.descricao) {
                  const match = e.descricao.match(/^\[(.*?)\]\s*(.*)$/);
                  if (match) {
                      return { ...e, categoria: match[1], descricao: match[2] };
                  }
              }
              return e;
          });
      };

      if (isSupabaseConfigured) {
          try {
              let query = supabase.from('cash_flow').select('*').order('data', { ascending: false });
              if (filterId && filterId !== 'all') { query = query.eq('vendedor_id', filterId); }
              const { data, error } = await query;
              if (error && error.code !== '42P01') handleSupabaseError(error);
              return parseCategoria(data || []);
          } catch (e) {
              if (isNetworkError(e)) {
                  console.warn("[getCashFlow] Erro de rede. Usando dados locais.");
              } else {
                  throw e;
              }
          }
      }
      await delay(300);
      let cash = getStorage<CashEntry[]>('cash', []);
      if (filterId && filterId !== 'all') cash = cash.filter(c => c.vendedor_id === filterId);
      return parseCategoria(cash).sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
};
  
const getDashboardStats = async () => {
      const filterId = getUserFilter();
      if (isSupabaseConfigured) {
          try {
              let salesQuery = supabase.from('sales').select('id, valor_total');
              if (filterId) { salesQuery = salesQuery.eq('vendedor_id', filterId); } // STRICT SECURITY
              const { data: sales, error: salesError } = await salesQuery;
              if (salesError) {
                  if (salesError.code !== '42P01') handleSupabaseError(salesError);
                  return { totalVendido: 0, totalRecebido: 0, totalReceber: 0, inadimplencia: 0 };
              }

              const salesIds = sales?.map(s => s.id) || [];
              const totalVendido = sales?.reduce((acc, curr) => acc + curr.valor_total, 0) || 0;

              if (salesIds.length === 0) return { totalVendido: 0, totalRecebido: 0, totalReceber: 0, inadimplencia: 0 };
              
              const { data: paidInst } = await supabase.from('installments').select('valor').in('venda_id', salesIds).eq('pago', true);
              const { data: openInst } = await supabase.from('installments').select('valor').in('venda_id', salesIds).eq('pago', false);
              const today = new Date().toISOString();
              const { data: overdueInst } = await supabase.from('installments').select('valor').in('venda_id', salesIds).eq('pago', false).lt('data_vencimento', today);
              
              return {
                 totalVendido,
                 totalRecebido: paidInst?.reduce((acc, curr) => acc + curr.valor, 0) || 0,
                 totalReceber: openInst?.reduce((acc, curr) => acc + curr.valor, 0) || 0,
                 inadimplencia: overdueInst?.reduce((acc, curr) => acc + curr.valor, 0) || 0
              };
          } catch (e) {
              console.error(e);
              return { totalVendido: 0, totalRecebido: 0, totalReceber: 0, inadimplencia: 0 };
          }
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
};

const getDetailedReports = async (startDate: Date, endDate: Date, sellerId?: string) => {
    const processData = (salesRes: Sale[], cashRes: CashEntry[], expensesRes: CashEntry[]) => {
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
            expenses: expensesRes,
            summary: {
                totalSales: salesRes.reduce((acc, s) => acc + s.valor_total, 0),
                totalReceipts: cashRes.reduce((acc, c) => acc + c.valor, 0),
                totalExpenses: expensesRes.reduce((acc, e) => acc + e.valor, 0)
            }
        };
    };
    
    const currentUser = getCurrentUser();
    
    // SECURITY: Non-admins can ONLY see their own data, ignoring the 'sellerId' param if passed
    let finalSellerId = sellerId;
    if (currentUser?.perfil !== 'admin') {
        finalSellerId = currentUser?.id;
    }

    if (isSupabaseConfigured) {
        try {
            let salesQuery = supabase.from('sales').select('*, clients(nome)').gte('data_venda', startDate.toISOString()).lte('data_venda', endDate.toISOString());
            let cashQuery = supabase.from('cash_flow').select('*').eq('tipo', 'ENTRADA').gte('data', startDate.toISOString()).lte('data', endDate.toISOString());
            
            if (finalSellerId && finalSellerId !== 'all') {
                salesQuery = salesQuery.eq('vendedor_id', finalSellerId);
                cashQuery = cashQuery.eq('vendedor_id', finalSellerId);
            }

            const { data: sData, error: sError } = await salesQuery;
            const { data: cData, error: cError } = await cashQuery;
            
            let expensesQuery = supabase.from('cash_flow').select('*').eq('tipo', 'SAIDA').gte('data', startDate.toISOString()).lte('data', endDate.toISOString());
            if (finalSellerId && finalSellerId !== 'all') {
                expensesQuery = expensesQuery.eq('vendedor_id', finalSellerId);
            }
            const { data: eData, error: eError } = await expensesQuery;

            if (sError) handleSupabaseError(sError);
            
            const parseCategoria = (entries: any[]) => {
                return entries.map(e => {
                    if (e.descricao) {
                        const match = e.descricao.match(/^\[(.*?)\]\s*(.*)$/);
                        if (match) {
                            return { ...e, categoria: match[1], descricao: match[2] };
                        }
                    }
                    return e;
                });
            };

            const sales = (sData || []).map((s: any) => ({ ...s, cliente_nome: s.clients?.nome || 'Desconhecido' }));
            return processData(sales, cData || [], parseCategoria(eData || []));
        } catch (e) {
            if (isNetworkError(e)) {
                console.warn("[getDetailedReports] Erro de rede. Usando dados locais.");
            } else {
                throw e;
            }
        }
    }
    
    await delay(500);
    // CALL INTERNAL FUNCTIONS DIRECTLY TO AVOID CIRCULAR REFERENCE
    const sales = await getSales(); 
    const cash = await getCashFlow(); 
    
    let filteredSales = sales.filter(s => {
       const d = new Date(s.data_venda);
       return d >= startDate && d <= endDate;
    });
    let filteredCash = cash.filter(c => {
       const d = new Date(c.data);
       return d >= startDate && d <= endDate && c.tipo === 'ENTRADA';
    });
    let filteredExpenses = cash.filter(c => {
       const d = new Date(c.data);
       return d >= startDate && d <= endDate && c.tipo === 'SAIDA';
    });
    
    if (finalSellerId && finalSellerId !== 'all') {
        filteredSales = filteredSales.filter(s => s.vendedor_id === finalSellerId);
        filteredCash = filteredCash.filter(c => c.vendedor_id === finalSellerId);
        filteredExpenses = filteredExpenses.filter(c => c.vendedor_id === finalSellerId);
    }
    return processData(filteredSales, filteredCash, filteredExpenses);
};

const exportBackupData = async (): Promise<string> => {
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
};

const importBackupData = async (jsonData: string): Promise<void> => {
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
};

// 2. Export Object (Safe Construction)
export const dataService = {
  getSellers,
  getUserById,
  getSellersPerformance,
  createSeller,
  updateSeller,
  deleteSeller,
  getClients,
  getClientById,
  uploadClientPhoto,
  createClient,
  updateClient,
  deleteClient,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSales,
  getSalesByClient,
  createSale,
  updateSale,
  deleteSale,
  returnSale,
  getInstallmentsBySale,
  updateInstallment,
  getInstallmentsByDate,
  getDueInstallments,
  payInstallment,
  addExpense,
  deleteCashEntry,
  getCashFlow,
  getDashboardStats,
  getDetailedReports,
  exportBackupData,
  importBackupData
};
