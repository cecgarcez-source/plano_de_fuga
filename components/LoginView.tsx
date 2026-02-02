import React, { useState } from 'react';
import { User } from '../types';

interface Props {
  onLogin: (user: User) => void;
  onBack: () => void;
}

export const LoginView: React.FC<Props> = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    // Regex rigoroso para e-mail (exige @ e domínio com ponto)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (pwd: string) => {
    return pwd.length >= 8;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações
    if (!validateEmail(email)) {
      setError("Por favor, insira um e-mail válido (ex: nome@dominio.com).");
      return;
    }

    if (!validatePassword(password)) {
      setError("A senha deve ter no mínimo 8 dígitos.");
      return;
    }

    if (isRegistering && !fullName.trim()) {
      setError("Por favor, informe seu nome completo.");
      return;
    }

    // Sucesso (Simulação)
    onLogin({
      email,
      username: fullName ? fullName.split(' ')[0] : email.split('@')[0],
      fullName: fullName || email.split('@')[0],
    });
  };

  const handleGoogleLogin = () => {
    // Simulação de Social Login
    alert("Redirecionando para Google OAuth... (Simulação)");
    onLogin({
      email: "google_user@gmail.com",
      username: "Viajante Google",
      fullName: "Viajante Google",
    });
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 animate-fade-in-up border border-white/50">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600 mb-2">
          {isRegistering ? 'Criar Conta' : 'Acesse seu Plano'}
        </h2>
        <p className="text-gray-500 text-sm">
          {isRegistering ? 'Junte-se a milhares de viajantes inteligentes.' : 'Continue de onde parou.'}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-3 text-sm rounded">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {isRegistering && (
          <div className="animate-fade-in">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nome Completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
              placeholder="Ex: João da Silva"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
            placeholder="seu@dominio.com"
          />
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
            placeholder="Mínimo 8 caracteres"
          />
          {isRegistering && (
            <p className="text-[10px] text-gray-400 mt-1 text-right">Mínimo 8 caracteres.</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-lg bg-teal-600 text-white font-bold hover:bg-teal-700 shadow-lg transition-all transform hover:-translate-y-0.5"
        >
          {isRegistering ? 'Cadastrar e Viajar' : 'Entrar'}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Ou continue com</span>
          </div>
        </div>

        <button 
          onClick={handleGoogleLogin}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="h-5 w-5" alt="Google" />
          Google
        </button>
      </div>

      <div className="mt-6 text-center text-sm">
        <button
          onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
          className="text-teal-600 hover:text-teal-800 font-bold"
        >
          {isRegistering ? 'Já tenho uma conta' : 'Criar conta gratuita'}
        </button>
      </div>
       <div className="mt-2 text-center">
        <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600">
          Voltar para Home
        </button>
      </div>
    </div>
  );
};