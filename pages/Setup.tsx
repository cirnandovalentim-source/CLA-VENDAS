
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS, ROUTES } from '../constants';
import { Button, Card } from '../components/ui';

const Setup: React.FC = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'install' | 'rls'>('install');

  // --- SCRIPT 1: INSTALAÇÃO LIMPA (ATUALIZADO COM CASCADES) ---
  const installSQL = `
-- SCRIPT DE INSTALAÇÃO (VERSÃO CORRIGIDA) --
-- Garante a limpeza correta de dados ao excluir registros --

create extension if not exists pgcrypto;

-- 1. CRIAR TABELAS
create table if not exists users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  senha text not null,
  nome text,
  perfil text default 'vendedor',
  ativo boolean default true,
  comissao_porcentagem numeric default 0,
  created_at timestamptz default now()
);

create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  telefone text,
  endereco text,
  bairro text,
  cidade text,
  observacoes text,
  vendedor_id text,
  foto_url text,
  is_mumbuca boolean default false,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  categoria text,
  valor_avista numeric default 0,
  valor_parcelado numeric default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Tabela de Vendas com vínculo ao Cliente (Cascade: Apaga venda se cliente for apagado)
create table if not exists sales (
  id uuid default gen_random_uuid() primary key,
  cliente_id uuid references clients(id) on delete cascade, 
  vendedor_id text,
  valor_total numeric default 0,
  qtd_parcelas integer default 1,
  data_venda timestamptz default now(),
  status text default 'ABERTA',
  is_mumbuca boolean default false,
  created_at timestamptz default now()
);

-- Tabela de Parcelas (Cascade: Apaga parcelas se venda for apagada)
create table if not exists installments (
  id uuid default gen_random_uuid() primary key,
  venda_id uuid references sales(id) on delete cascade,
  numero_parcela integer,
  valor numeric default 0,
  data_vencimento timestamptz,
  pago boolean default false,
  data_pagamento timestamptz,
  created_at timestamptz default now()
);

-- Tabela de Caixa (Cascade: Apaga lançamento se venda for apagada)
create table if not exists cash_flow (
  id uuid default gen_random_uuid() primary key,
  data timestamptz default now(),
  tipo text,
  valor numeric default 0,
  descricao text,
  vendedor_id text,
  venda_id uuid references sales(id) on delete cascade,
  created_at timestamptz default now()
);

-- 2. ATIVAR RLS (SEGURANÇA)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS DE ACESSO (CORREÇÃO ERRO 42501)
-- Permite acesso total à API (o filtro é feito no App para performance)

DO $$
BEGIN
    DROP POLICY IF EXISTS "App Access" ON users;
    DROP POLICY IF EXISTS "App Access" ON clients;
    DROP POLICY IF EXISTS "App Access" ON products;
    DROP POLICY IF EXISTS "App Access" ON sales;
    DROP POLICY IF EXISTS "App Access" ON installments;
    DROP POLICY IF EXISTS "App Access" ON cash_flow;
END $$;

CREATE POLICY "App Access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App Access" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App Access" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App Access" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App Access" ON installments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App Access" ON cash_flow FOR ALL USING (true) WITH CHECK (true);

-- 4. CONCEDER PERMISSÕES
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 5. STORAGE (FOTOS)
INSERT INTO storage.buckets (id, name, public)
VALUES ('clientes-fotos', 'clientes-fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR ALL USING ( bucket_id = 'clientes-fotos' ) WITH CHECK ( bucket_id = 'clientes-fotos' );
GRANT ALL ON storage.objects TO anon, authenticated, service_role;

-- 6. CRIAR ADMIN PADRÃO
INSERT INTO users (email, senha, nome, perfil, ativo, comissao_porcentagem)
VALUES ('admin@cla.com', '123456', 'Administrador', 'admin', true, 0)
ON CONFLICT (email) DO NOTHING;
`;

  // --- SCRIPT 2: CORREÇÃO DE POLÍTICAS ---
  const fixRLSSQL = `
-- SCRIPT: CORRIGIR POLÍTICAS RLS (ERRO 42501) --

BEGIN;

-- 1. Garantir que RLS está ATIVO
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cash_flow ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Access" ON users;
    DROP POLICY IF EXISTS "Public Access" ON clients;
    DROP POLICY IF EXISTS "Public Access" ON products;
    DROP POLICY IF EXISTS "Public Access" ON sales;
    DROP POLICY IF EXISTS "Public Access" ON installments;
    DROP POLICY IF EXISTS "Public Access" ON cash_flow;
    
    DROP POLICY IF EXISTS "App Access" ON users;
    DROP POLICY IF EXISTS "App Access" ON clients;
    DROP POLICY IF EXISTS "App Access" ON products;
    DROP POLICY IF EXISTS "App Access" ON sales;
    DROP POLICY IF EXISTS "App Access" ON installments;
    DROP POLICY IF EXISTS "App Access" ON cash_flow;
END $$;

-- 3. Recriar Policies Permissivas
CREATE POLICY "App Access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App Access" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App Access" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App Access" ON sales FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App Access" ON installments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "App Access" ON cash_flow FOR ALL USING (true) WITH CHECK (true);

-- 4. Garantir Permissões
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

COMMIT;
`;

  const copyToClipboard = () => {
    let textToCopy = installSQL;
    if (activeTab === 'rls') textToCopy = fixRLSSQL;
    
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(ROUTES.LOGIN)} 
            className="p-2 bg-[#2E2E2E] rounded-full text-white hover:bg-[#333]"
          >
            {ICONS.Left}
          </button>
          <h1 className="text-2xl font-bold text-white">Setup do Banco de Dados</h1>
        </div>

        <Card className="bg-[#2E2E2E] border-l-4 border-blue-500">
          <h3 className="text-white font-bold text-lg mb-2">Correção de Banco & RLS</h3>
          <p className="text-gray-300 text-sm mb-2">
             Atualizado: Agora inclui configurações para <strong>Exclusão em Cascata</strong> (previne erros ao apagar vendas).
          </p>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('install')}
            className={`flex-1 py-3 rounded-lg text-xs font-bold transition-colors flex flex-col items-center gap-1 ${activeTab === 'install' ? 'bg-blue-600 text-white ring-2 ring-blue-500/50' : 'bg-[#333] text-gray-400 hover:bg-[#404040]'}`}
          >
            <span>🚀 INSTALAÇÃO COMPLETA</span>
            <span className="text-[9px] font-normal opacity-70">Estrutura + Cascades</span>
          </button>
          <button 
            onClick={() => setActiveTab('rls')}
            className={`flex-1 py-3 rounded-lg text-xs font-bold transition-colors flex flex-col items-center gap-1 ${activeTab === 'rls' ? 'bg-green-600 text-white ring-2 ring-green-500/50' : 'bg-[#333] text-gray-400 hover:bg-[#404040]'}`}
          >
            <span>🛡️ CORRIGIR ERROS</span>
            <span className="text-[9px] font-normal opacity-70">Libera Permissões</span>
          </button>
        </div>

        <div className="relative group">
          <div className="flex justify-between items-center mb-2 bg-[#111] p-2 rounded-t-xl border-b border-white/10">
            <label className="text-gray-400 text-xs font-mono pl-2">
                SQL QUERY (Copie e cole no Supabase)
            </label>
            <button 
              onClick={copyToClipboard}
              className={`text-xs px-4 py-1.5 rounded-lg font-bold transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
            >
              {copied ? 'Copiado!' : 'Copiar Código SQL'}
            </button>
          </div>
          <textarea 
            readOnly
            value={activeTab === 'install' ? installSQL : fixRLSSQL}
            className="w-full h-80 bg-[#111] text-green-400 font-mono text-xs p-4 rounded-b-xl border border-white/10 focus:outline-none resize-none"
          />
        </div>

        <Button fullWidth onClick={() => navigate(ROUTES.LOGIN)}>
          Voltar para Login
        </Button>

      </div>
    </div>
  );
};

export default Setup;
