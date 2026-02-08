
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from '../components/ui';
import { authService } from '../services/mockSupabase';
import { clearSupabaseConfig } from '../services/supabaseClient';
import { ROUTES } from '../constants';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (form.password !== form.confirmPassword) {
        setError('As senhas não coincidem.');
        setLoading(false);
        return;
    }

    if (form.password.length < 6) {
        setError('A senha deve ter no mínimo 6 caracteres.');
        setLoading(false);
        return;
    }

    try {
      const { user, error: authError } = await authService.register(form.name, form.email, form.password);
      if (authError) {
        setError(authError);
      } else if (user) {
        navigate(ROUTES.DASHBOARD);
      }
    } catch (err) {
      setError('Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetConfig = () => {
      clearSupabaseConfig();
      navigate(ROUTES.LOGIN);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1A1A1A] p-6 justify-center">
      <div className="w-full max-w-sm mx-auto space-y-8">
        
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FF7A00]/10 text-[#FF7A00] mb-4">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
               <circle cx="8.5" cy="7" r="4" />
               <line x1="20" y1="8" x2="20" y2="14" />
               <line x1="23" y1="11" x2="17" y2="11" />
             </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Criar Conta</h1>
          <p className="text-gray-500">Preencha os dados abaixo para começar.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-4">
            <Input 
              type="text" 
              placeholder="Seu Nome Completo" 
              label="Nome"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              required
            />
            <Input 
              type="email" 
              placeholder="seu@email.com" 
              label="E-mail"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              required
            />
            <Input 
              type="password" 
              placeholder="••••••" 
              label="Senha"
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
              required
            />
            <Input 
              type="password" 
              placeholder="••••••" 
              label="Confirmar Senha"
              value={form.confirmPassword}
              onChange={(e) => setForm({...form, confirmPassword: e.target.value})}
              required
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              <p className="font-bold mb-1">Falha no Registro</p>
              <p>{error}</p>
              
              {/* Botão de Reset se for erro de Chave Inválida */}
              {(error.includes('Invalid API key') || error.includes('JWT') || error.includes('401')) && (
                 <button 
                   type="button"
                   onClick={handleResetConfig}
                   className="mt-3 w-full bg-red-500/20 py-2 rounded text-xs text-red-300 hover:bg-red-500/30 font-bold border border-red-500/30"
                 >
                   RESETAR CONFIGURAÇÃO (Voltar para Offline)
                 </button>
              )}

              {(error.includes('Setup') || error.includes('Tabelas')) && (
                 <button 
                   type="button"
                   onClick={() => navigate(ROUTES.LOGIN)}
                   className="mt-2 bg-red-500/20 px-3 py-1 rounded text-xs text-red-300 hover:bg-red-500/30"
                 >
                   Ir para Login &gt; Setup
                 </button>
              )}
            </div>
          )}

          <Button type="submit" fullWidth isLoading={loading}>
            Cadastrar
          </Button>

          <div className="text-center">
            <button 
                type="button" 
                onClick={() => navigate(ROUTES.LOGIN)}
                className="text-sm text-gray-500 hover:text-[#FF7A00] transition-colors"
            >
              Já tem uma conta? <span className="font-bold text-white">Faça Login</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
