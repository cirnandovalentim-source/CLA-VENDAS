
export type UserProfileType = 'admin' | 'vendedor';

export interface User {
  id: string;
  email: string;
  nome: string;
  perfil: UserProfileType;
  telefone?: string;
  ativo: boolean;
  comissao_porcentagem?: number; // New field for commission rate (e.g., 5 for 5%)
}

export interface Client {
  id: string;
  nome: string;
  telefone: string;
  endereco: string;
  bairro: string;
  cidade: string;
  observacoes?: string;
  vendedor_id: string;
  foto_url?: string; // Base64 string or URL
  is_mumbuca?: boolean; // Flag para identificar cliente que usa moeda social
}

export interface Product {
  id: string;
  nome: string;
  categoria: string;
  valor_avista: number;
  valor_parcelado: number;
  ativo: boolean;
}

export type SaleStatus = 'ABERTA' | 'PARCIAL' | 'QUITADA' | 'DEVOLVIDO';

export interface Sale {
  id: string;
  cliente_id: string;
  vendedor_id: string;
  valor_total: number;
  qtd_parcelas: number;
  data_venda: string; // ISO Date
  status: SaleStatus;
  cliente_nome?: string; // Helper for UI
  is_mumbuca?: boolean; // Nova flag para Moeda Social
  descricao?: string; // Lista de produtos (Ex: "2x Cama, 1x Mesa")
}

export interface Installment {
  id: string;
  venda_id: string;
  numero_parcela: number;
  valor: number;
  data_vencimento: string; // ISO Date
  pago: boolean;
  data_pagamento?: string | null;
}

export type CashFlowType = 'ENTRADA' | 'SAIDA';

export interface CashEntry {
  id: string;
  data: string; // ISO Date
  tipo: CashFlowType;
  valor: number;
  descricao: string;
  vendedor_id: string;
  venda_id?: string; // Optional link to sale for refunds/returns
}

export interface CartItem extends Product {
  quantity: number;
}

// Report Types
export interface SellerReport {
  vendedor_nome: string;
  total_vendas: number;
  total_recebido: number;
  comissao_estimada: number;
  quantidade_vendas: number;
}

export interface DailyReport {
  data: string;
  vendas: number;
  recebimentos: number;
}
