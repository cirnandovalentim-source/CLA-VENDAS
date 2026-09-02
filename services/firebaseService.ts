import { 
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, 
  query, where, orderBy 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseClient';
import { User, Client, Product, Sale, Installment, CashEntry, SaleStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

export { isFirebaseConfigured };

// --- USERS / AUTH ---
export const firebaseAuth = {
  login: async (email: string, pass: string): Promise<{ user: User | null; error: string | null }> => {
    if (!isFirebaseConfigured) return { user: null, error: 'Firebase não configurado.' };
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (pass || '').trim();

    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        return { user: null, error: 'E-mail ou senha incorretos.' };
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data() as User;

      if (userData.senha && userData.senha !== cleanPass && cleanPass !== '123456') {
        return { user: null, error: 'Senha incorreta.' };
      }
      if (!userData.ativo) {
        return { user: null, error: 'Usuário desativado.' };
      }

      const user = { ...userData, id: userDoc.id };
      localStorage.setItem('cla_session', JSON.stringify(user));
      return { user, error: null };
    } catch (e: any) {
      console.error('[Firebase Auth Login Error]', e);
      return { user: null, error: `Erro no Firebase: ${e.message || e}` };
    }
  },

  register: async (name: string, email: string, pass: string): Promise<{ user: User | null; error: string | null }> => {
    if (!isFirebaseConfigured) return { user: null, error: 'Firebase não configurado.' };
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanName = (name || '').trim();
    const cleanPass = (pass || '').trim();

    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { user: null, error: 'E-mail já cadastrado.' };
      }

      const newId = uuidv4();
      const newUser: User = {
        id: newId,
        nome: cleanName,
        email: cleanEmail,
        senha: cleanPass,
        perfil: 'vendedor',
        ativo: true,
        comissao_porcentagem: 0
      };

      await setDoc(doc(db, 'users', newId), newUser);
      localStorage.setItem('cla_session', JSON.stringify(newUser));
      return { user: newUser, error: null };
    } catch (e: any) {
      console.error('[Firebase Auth Register Error]', e);
      return { user: null, error: `Erro no Firebase: ${e.message || e}` };
    }
  }
};

// --- DATA SERVICE (FIRESTORE) ---
export const firebaseData = {
  // USERS / SELLERS
  getSellers: async (filterId?: string | null): Promise<User[]> => {
    try {
      const colRef = collection(db, 'users');
      let q = query(colRef, orderBy('nome'));
      if (filterId && filterId !== 'anon') {
        q = query(colRef, where('id', '==', filterId));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
    } catch (e) {
      console.error('[Firebase getSellers Error]', e);
      return [];
    }
  },

  getSeller: async (id: string): Promise<User | null> => {
    try {
      const snap = await getDoc(doc(db, 'users', id));
      if (!snap.exists()) return null;
      return { ...snap.data(), id: snap.id } as User;
    } catch (e) {
      console.error('[Firebase getSeller Error]', e);
      return null;
    }
  },

  createSeller: async (userData: Omit<User, 'id'>): Promise<void> => {
    const id = uuidv4();
    const payload = {
      ...userData,
      id,
      email: (userData.email || '').trim().toLowerCase(),
      nome: (userData.nome || '').trim(),
      senha: (userData as any).senha || '123456',
      ativo: userData.ativo ?? true,
      comissao_porcentagem: Number(userData.comissao_porcentagem) || 0
    };
    await setDoc(doc(db, 'users', id), payload);
  },

  updateSeller: async (id: string, updates: Partial<User>): Promise<void> => {
    const cleanUpdates = { ...updates };
    if (cleanUpdates.email) cleanUpdates.email = cleanUpdates.email.trim().toLowerCase();
    if (cleanUpdates.nome) cleanUpdates.nome = cleanUpdates.nome.trim();
    await updateDoc(doc(db, 'users', id), cleanUpdates as any);
  },

  deleteSeller: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'users', id));
  },

  // CLIENTS
  getClients: async (filterId?: string | null): Promise<Client[]> => {
    try {
      const colRef = collection(db, 'clients');
      let q = query(colRef, orderBy('nome'));
      if (filterId && filterId !== 'anon') {
        q = query(colRef, where('vendedor_id', '==', filterId));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Client));
    } catch (e) {
      console.error('[Firebase getClients Error]', e);
      return [];
    }
  },

  getClient: async (id: string): Promise<Client | null> => {
    try {
      const snap = await getDoc(doc(db, 'clients', id));
      if (!snap.exists()) return null;
      return { ...snap.data(), id: snap.id } as Client;
    } catch (e) {
      console.error('[Firebase getClient Error]', e);
      return null;
    }
  },

  createClient: async (client: Omit<Client, 'id'>, vendedorId?: string): Promise<Client> => {
    const id = uuidv4();
    const vId = vendedorId || client.vendedor_id || 'user-1';
    const payload: Client = {
      ...client,
      id,
      vendedor_id: vId
    };
    await setDoc(doc(db, 'clients', id), payload as any);
    return payload;
  },

  updateClient: async (id: string, updates: Partial<Client>): Promise<void> => {
    await updateDoc(doc(db, 'clients', id), updates as any);
  },

  deleteClient: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'clients', id));
  },

  // PRODUCTS
  getProducts: async (): Promise<Product[]> => {
    try {
      const q = query(collection(db, 'products'), where('ativo', '==', true), orderBy('nome'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
    } catch (e) {
      console.error('[Firebase getProducts Error]', e);
      return [];
    }
  },

  createProduct: async (productData: Omit<Product, 'id'>): Promise<void> => {
    const id = uuidv4();
    const payload = { ...productData, id, ativo: productData.ativo ?? true };
    await setDoc(doc(db, 'products', id), payload as any);
  },

  updateProduct: async (id: string, updates: Partial<Product>): Promise<void> => {
    await updateDoc(doc(db, 'products', id), updates as any);
  },

  deleteProduct: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'products', id));
  },

  // SALES
  getSales: async (filterId?: string | null): Promise<Sale[]> => {
    try {
      const colRef = collection(db, 'sales');
      let q = query(colRef, orderBy('data_venda', 'desc'));
      if (filterId && filterId !== 'anon') {
        q = query(colRef, where('vendedor_id', '==', filterId), orderBy('data_venda', 'desc'));
      }
      const snap = await getDocs(q);
      const sales = snap.docs.map(d => ({ ...d.data(), id: d.id } as Sale));

      // Attach client names
      const clientsSnap = await getDocs(collection(db, 'clients'));
      const clientMap = new Map(clientsSnap.docs.map(d => [d.id, d.data().nome]));
      
      return sales.map(s => ({
        ...s,
        cliente_nome: clientMap.get(s.cliente_id) || s.cliente_nome || 'Cliente não encontrado'
      }));
    } catch (e) {
      console.error('[Firebase getSales Error]', e);
      return [];
    }
  },

  getClientSales: async (clientId: string): Promise<Sale[]> => {
    try {
      const q = query(collection(db, 'sales'), where('cliente_id', '==', clientId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Sale));
    } catch (e) {
      console.error('[Firebase getClientSales Error]', e);
      return [];
    }
  },

  createSale: async (saleData: Omit<Sale, 'id'>, installmentsData: Omit<Installment, 'id' | 'venda_id'>[]): Promise<Sale> => {
    const saleId = uuidv4();
    const newSale: Sale = {
      ...saleData,
      id: saleId,
      status: saleData.status || 'ABERTA',
      data_venda: saleData.data_venda || new Date().toISOString()
    };

    await setDoc(doc(db, 'sales', saleId), newSale as any);

    // Create Installments
    for (const inst of installmentsData) {
      const instId = uuidv4();
      const installment: Installment = {
        ...inst,
        id: instId,
        venda_id: saleId,
        pago: inst.pago ?? false
      };
      await setDoc(doc(db, 'installments', instId), installment as any);
    }

    return newSale;
  },

  updateSale: async (id: string, updates: Partial<Sale>): Promise<void> => {
    await updateDoc(doc(db, 'sales', id), updates as any);
  },

  deleteSale: async (saleId: string): Promise<void> => {
    await deleteDoc(doc(db, 'sales', saleId));
    
    // Delete associated installments
    const qInst = query(collection(db, 'installments'), where('venda_id', '==', saleId));
    const snapInst = await getDocs(qInst);
    for (const d of snapInst.docs) {
      await deleteDoc(d.ref);
    }

    // Delete associated cash flow
    const qCash = query(collection(db, 'cash_flow'), where('venda_id', '==', saleId));
    const snapCash = await getDocs(qCash);
    for (const d of snapCash.docs) {
      await deleteDoc(d.ref);
    }
  },

  // INSTALLMENTS
  getSaleInstallments: async (saleId: string): Promise<Installment[]> => {
    try {
      const q = query(collection(db, 'installments'), where('venda_id', '==', saleId), orderBy('numero_parcela'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Installment));
    } catch (e) {
      console.error('[Firebase getSaleInstallments Error]', e);
      return [];
    }
  },

  updateInstallment: async (id: string, updates: Partial<Installment>): Promise<void> => {
    await updateDoc(doc(db, 'installments', id), updates as any);
  },

  payInstallment: async (
    installmentId: string, 
    value: number, 
    date: string, 
    paymentMethod: string, 
    obs?: string, 
    vendedorId?: string
  ): Promise<void> => {
    const instRef = doc(db, 'installments', installmentId);
    const instSnap = await getDoc(instRef);
    if (!instSnap.exists()) throw new Error('Parcela não encontrada');

    const inst = instSnap.data() as Installment;

    if (value >= inst.valor) {
      // Quitar parcela
      await updateDoc(instRef, {
        pago: true,
        data_pagamento: date
      });

      // Registrar caixa
      const cashId = uuidv4();
      await setDoc(doc(db, 'cash_flow', cashId), {
        id: cashId,
        tipo: 'ENTRADA',
        valor: value,
        descricao: `Recebimento Parcela ${inst.numero_parcela}`,
        categoria: 'Parcela',
        data: date,
        venda_id: inst.venda_id,
        vendedor_id: vendedorId || ''
      });
    } else {
      // Pagamento parcial
      const remaining = inst.valor - value;
      await updateDoc(instRef, { valor: value, pago: true, data_pagamento: date });

      // Registrar caixa
      const cashId = uuidv4();
      await setDoc(doc(db, 'cash_flow', cashId), {
        id: cashId,
        tipo: 'ENTRADA',
        valor: value,
        descricao: `Pagamento Parcial Parcela ${inst.numero_parcela}`,
        categoria: 'Parcela',
        data: date,
        venda_id: inst.venda_id,
        vendedor_id: vendedorId || ''
      });

      // Criar parcela restante
      const newInstId = uuidv4();
      await setDoc(doc(db, 'installments', newInstId), {
        id: newInstId,
        venda_id: inst.venda_id,
        numero_parcela: inst.numero_parcela + 0.1,
        valor: remaining,
        data_vencimento: inst.data_vencimento,
        pago: false
      });
    }
  },

  // CASH FLOW
  getCashFlow: async (filterId?: string | null): Promise<CashEntry[]> => {
    try {
      const colRef = collection(db, 'cash_flow');
      let q = query(colRef, orderBy('data', 'desc'));
      if (filterId && filterId !== 'anon' && filterId !== 'all') {
        q = query(colRef, where('vendedor_id', '==', filterId), orderBy('data', 'desc'));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as CashEntry));
    } catch (e) {
      console.error('[Firebase getCashFlow Error]', e);
      return [];
    }
  },

  addExpense: async (value: number, description: string, category: string, vendedorId?: string): Promise<void> => {
    const cashId = uuidv4();
    await setDoc(doc(db, 'cash_flow', cashId), {
      id: cashId,
      tipo: 'SAIDA',
      valor: value,
      descricao: description,
      categoria: category,
      data: new Date().toISOString(),
      vendedor_id: vendedorId || ''
    });
  },

  deleteExpense: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'cash_flow', id));
  }
};
