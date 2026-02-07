
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS, ROUTES } from '../constants';
import { Button, Card } from '../components/ui';

const Setup: React.FC = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'install' | 'fix'>('install');

  // --- SCRIPT 1: INSTALAÇÃO LIMPA (PARA BANCO NOVO) ---
  const installSQL = `
-- SCRIPT DE INSTALAÇÃO COMPLETA --

-- 1. HABILITAR EXTENSÕES
create extension if not exists pgcrypto;

-- 2. CRIAR TABELAS (Se não existirem)
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

create table if not exists sales (
  id uuid default gen_random_uuid() primary key,
  cliente_id uuid references clients(id),
  vendedor_id text,
  valor_total numeric default 0,
  qtd_parcelas integer default 1,
  data_venda timestamptz default now(),
  status text default 'ABERTA',
  is_mumbuca boolean default false,
  created_at timestamptz default now()
);

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

create table if not exists cash_flow (
  id uuid default gen_random_uuid() primary key,
  data timestamptz default now(),
  tipo text,
  valor numeric default 0,
  descricao text,
  vendedor_id text,
  venda_id uuid,
  created_at timestamptz default now()
);

-- 3. STORAGE (BUCKET DE FOTOS)
-- O comando abaixo cria o bucket, mas SE JÁ EXISTIR, ele não faz nada (evita o erro).
INSERT INTO storage.buckets (id, name, public)
VALUES ('clientes-fotos', 'clientes-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- 4. POLÍTICAS DE ACESSO (STORAGE)
-- Limpa antigas para evitar duplicidade
DO $$
BEGIN
    DROP POLICY IF EXISTS "Give Access" ON storage.objects;
    DROP POLICY IF EXISTS "Give Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Give Update" ON storage.objects;
    DROP POLICY IF EXISTS "Give Delete" ON storage.objects;
END $$;

-- Cria novas permissões
CREATE POLICY "Give Access" ON storage.objects FOR SELECT USING ( bucket_id = 'clientes-fotos' );
CREATE POLICY "Give Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'clientes-fotos' );
CREATE POLICY "Give Update" ON storage.objects FOR UPDATE WITH CHECK ( bucket_id = 'clientes-fotos' );
CREATE POLICY "Give Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'clientes-fotos' );

GRANT ALL ON storage.objects TO anon, authenticated, service_role;

-- 5. LIBERAR ACESSO ÀS TABELAS (DESATIVAR RLS)
-- Isso garante que o app funcione sem bloqueios de permissão complexos
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE installments DISABLE ROW LEVEL SECURITY;
ALTER TABLE cash_flow DISABLE ROW LEVEL SECURITY;

-- 6. CRIAR ADMIN (Se não existir)
INSERT INTO users (email, senha, nome, perfil, ativo, comissao_porcentagem)
VALUES ('admin@cla.com', '123456', 'Administrador', 'admin', true, 0)
ON CONFLICT (email) DO NOTHING;

-- FIM DO SCRIPT --
`;

  // --- SCRIPT 2: CORREÇÃO (ADD COLUNAS) ---
  const fixSQL = `
-- SCRIPT DE CORREÇÃO (Adiciona colunas faltantes) --
DO $$
BEGIN
    -- CLIENTS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'foto_url') THEN
        ALTER TABLE clients ADD COLUMN foto_url text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'is_mumbuca') THEN
        ALTER TABLE clients ADD COLUMN is_mumbuca boolean DEFAULT false;
    END IF;

    -- SALES
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'is_mumbuca') THEN
        ALTER TABLE sales ADD COLUMN is_mumbuca boolean DEFAULT false;
    END IF;
    
    -- USERS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'comissao_porcentagem') THEN
        ALTER TABLE users ADD COLUMN comissao_porcentagem numeric DEFAULT 0;
    END IF;
END $$;
`;

  const copyToClipboard = () => {
    let textToCopy = installSQL;
    if (activeTab === 'fix') textToCopy = fixSQL;
    
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
          <h3 className="text-white font-bold text-lg mb-2">Instalação para Novo Projeto</h3>
          <p className="text-gray-300 text-sm mb-2">
             Como você criou um <strong>banco de dados novo</strong>, use a opção <strong>INSTALAÇÃO ZERO</strong>.
          </p>
          <p className="text-gray-300 text-sm">
             Este script cria todas as tabelas e configura o armazenamento. Ele contém proteções (ON CONFLICT) para não dar erro se você rodar mais de uma vez.
          </p>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('install')}
            className={`flex-1 py-3 rounded-lg text-xs font-bold transition-colors flex flex-col items-center gap-1 ${activeTab === 'install' ? 'bg-blue-600 text-white ring-2 ring-blue-500/50' : 'bg-[#333] text-gray-400 hover:bg-[#404040]'}`}
          >
            <span>🚀 INSTALAÇÃO ZERO</span>
            <span className="text-[9px] font-normal opacity-70">Para banco novo</span>
          </button>
          <button 
            onClick={() => setActiveTab('fix')}
            className={`flex-1 py-3 rounded-lg text-xs font-bold transition-colors flex flex-col items-center gap-1 ${activeTab === 'fix' ? 'bg-[#FF7A00] text-white ring-2 ring-orange-500/50' : 'bg-[#333] text-gray-400 hover:bg-[#404040]'}`}
          >
            <span>🛠️ CORREÇÃO</span>
            <span className="text-[9px] font-normal opacity-70">Apenas atualizações</span>
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
            value={activeTab === 'install' ? installSQL : fixSQL}
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
