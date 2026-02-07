
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ICONS, ROUTES } from '../constants';
import { Button, Card } from '../components/ui';

const Setup: React.FC = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'fix' | 'full'>('fix');

  // Script Consolidado: Corrige Colunas E Cria Bucket de Fotos
  const fixAllSQL = `
-- 1. CORREÇÃO DE TABELAS (Adiciona colunas se faltarem)
DO $$
BEGIN
    -- Adicionar foto_url em clients
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'foto_url') THEN
        ALTER TABLE clients ADD COLUMN foto_url text;
    END IF;
    -- Adicionar venda_id em cash_flow
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_flow' AND column_name = 'venda_id') THEN
        ALTER TABLE cash_flow ADD COLUMN venda_id uuid;
    END IF;
    -- Adicionar is_mumbuca em sales
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'is_mumbuca') THEN
        ALTER TABLE sales ADD COLUMN is_mumbuca boolean DEFAULT false;
    END IF;
END $$;

-- 2. STORAGE: CRIAR BUCKET DE FOTOS
INSERT INTO storage.buckets (id, name, public)
VALUES ('clientes-fotos', 'clientes-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. STORAGE: POLÍTICAS DE SEGURANÇA (RLS)
-- Como usamos autenticação própria (tabela users) e não o Supabase Auth,
-- as policies devem permitir acesso público ao bucket específico, 
-- pois o cliente Supabase atua como 'anon'.
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;
DROP POLICY IF EXISTS "Give Access" ON storage.objects;
DROP POLICY IF EXISTS "Give Upload" ON storage.objects;
DROP POLICY IF EXISTS "Give Update" ON storage.objects;
DROP POLICY IF EXISTS "Give Delete" ON storage.objects;

-- Criamos as policies permissivas para o bucket específico
CREATE POLICY "Give Access" ON storage.objects FOR SELECT USING ( bucket_id = 'clientes-fotos' );
CREATE POLICY "Give Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'clientes-fotos' );
CREATE POLICY "Give Update" ON storage.objects FOR UPDATE WITH CHECK ( bucket_id = 'clientes-fotos' );
CREATE POLICY "Give Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'clientes-fotos' );

-- 4. PERMISSÕES GERAIS (Garantia)
GRANT ALL ON storage.objects TO authenticated, service_role, anon;
GRANT ALL ON storage.buckets TO authenticated, service_role, anon;
`;

  const fullSetupSQL = `
-- 1. EXTENSÕES
create extension if not exists "uuid-ossp";

-- 2. GARANTIR PERMISSÕES
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;
grant all on all functions in schema public to postgres, anon, authenticated, service_role;

-- 3. CRIAÇÃO DAS TABELAS
create table if not exists users (
  id uuid default uuid_generate_v4() primary key,
  email text unique not null,
  senha text not null,
  nome text,
  perfil text default 'vendedor',
  ativo boolean default true,
  comissao_porcentagem numeric default 0,
  created_at timestamptz default now()
);

create table if not exists clients (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  telefone text,
  endereco text,
  bairro text,
  cidade text,
  observacoes text,
  vendedor_id text,
  foto_url text,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  categoria text,
  valor_avista numeric default 0,
  valor_parcelado numeric default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);

create table if not exists sales (
  id uuid default uuid_generate_v4() primary key,
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
  id uuid default uuid_generate_v4() primary key,
  venda_id uuid references sales(id) on delete cascade,
  numero_parcela integer,
  valor numeric default 0,
  data_vencimento timestamptz,
  pago boolean default false,
  data_pagamento timestamptz,
  created_at timestamptz default now()
);

create table if not exists cash_flow (
  id uuid default uuid_generate_v4() primary key,
  data timestamptz default now(),
  tipo text,
  valor numeric default 0,
  descricao text,
  vendedor_id text,
  venda_id uuid,
  created_at timestamptz default now()
);

-- 4. MIGRAÇÃO DE COLUNAS (Segurança extra)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'clients' and column_name = 'foto_url') then
    alter table clients add column foto_url text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'cash_flow' and column_name = 'venda_id') then
    alter table cash_flow add column venda_id uuid;
  end if;
  if not exists (select 1 from information_schema.columns where table_name = 'sales' and column_name = 'is_mumbuca') then
    alter table sales add column is_mumbuca boolean default false;
  end if;
end $$;

-- 5. STORAGE BUCKET E POLICIES
insert into storage.buckets (id, name, public) values ('clientes-fotos', 'clientes-fotos', true) on conflict (id) do nothing;

drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Auth Upload" on storage.objects;
drop policy if exists "Auth Update" on storage.objects;
drop policy if exists "Auth Delete" on storage.objects;
drop policy if exists "Give Access" on storage.objects;
drop policy if exists "Give Upload" on storage.objects;
drop policy if exists "Give Update" on storage.objects;
drop policy if exists "Give Delete" on storage.objects;

-- Policies permissivas para funcionar sem Supabase Auth
create policy "Give Access" on storage.objects for select using ( bucket_id = 'clientes-fotos' );
create policy "Give Upload" on storage.objects for insert with check ( bucket_id = 'clientes-fotos' );
create policy "Give Update" on storage.objects for update with check ( bucket_id = 'clientes-fotos' );
create policy "Give Delete" on storage.objects for delete using ( bucket_id = 'clientes-fotos' );

grant all on storage.objects to anon, authenticated, service_role;

-- 6. RLS TABLES
alter table users enable row level security;
alter table clients enable row level security;
alter table products enable row level security;
alter table sales enable row level security;
alter table installments enable row level security;
alter table cash_flow enable row level security;

drop policy if exists "Users Visible" on users;
drop policy if exists "Clients Policy" on clients;
drop policy if exists "Sales Policy" on sales;
drop policy if exists "Installments Policy" on installments;
drop policy if exists "Cash Flow Policy" on cash_flow;
drop policy if exists "Products Policy" on products;

create policy "Users Visible" on users for all using (true);
create policy "Clients Policy" on clients for all using (true) with check (true);
create policy "Sales Policy" on sales for all using (true) with check (true);
create policy "Installments Policy" on installments for all using (true) with check (true);
create policy "Cash Flow Policy" on cash_flow for all using (true) with check (true);
create policy "Products Policy" on products for all using (true) with check (true);

-- 7. ADMIN
insert into users (email, senha, nome, perfil, ativo, comissao_porcentagem)
values ('admin@cla.com', '123456', 'Administrador', 'admin', true, 0)
on conflict (email) do nothing;
`;

  const copyToClipboard = () => {
    const textToCopy = activeTab === 'fix' ? fixAllSQL : fullSetupSQL;
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
          <h1 className="text-2xl font-bold text-white">Configuração do Banco</h1>
        </div>

        <Card className="bg-[#2E2E2E] border-l-4 border-red-500">
          <h3 className="text-white font-bold text-lg mb-2">Erro "Bucket not found" ou "RLS"?</h3>
          <p className="text-gray-300 text-sm mb-2">
             Se você recebe erros ao enviar fotos ("bucket not found" ou "row-level security"), é necessário configurar as permissões de armazenamento.
          </p>
          <p className="text-gray-300 text-sm mb-4">
             Execute o <strong>Script de Correção</strong> abaixo no SQL Editor do Supabase para corrigir tabelas, criar o bucket e ajustar permissões.
          </p>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('fix')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'fix' ? 'bg-[#FF7A00] text-white' : 'bg-[#333] text-gray-400'}`}
          >
            Script de Correção (Recomendado)
          </button>
          <button 
            onClick={() => setActiveTab('full')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'full' ? 'bg-[#FF7A00] text-white' : 'bg-[#333] text-gray-400'}`}
          >
            Script Instalação Zero
          </button>
        </div>

        <div className="relative">
          <div className="flex justify-between items-center mb-2">
            <label className="text-gray-400 text-sm font-mono">
                {activeTab === 'fix' ? 'SQL: Ajustar Bucket, Policies e Tabelas' : 'SQL: Estrutura Completa do Zero'}
            </label>
            <button 
              onClick={copyToClipboard}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-[#FF7A00] text-white hover:bg-[#E66E00]'}`}
            >
              {copied ? 'Copiado!' : 'Copiar Código'}
            </button>
          </div>
          <textarea 
            readOnly
            value={activeTab === 'fix' ? fixAllSQL : fullSetupSQL}
            className="w-full h-96 bg-[#111] text-green-400 font-mono text-xs p-4 rounded-xl border border-white/10 focus:outline-none resize-none"
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
