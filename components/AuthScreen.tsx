import React, { useState } from 'react';
import { supabase } from '../services/supabase';

export const AuthScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState(''); // Added Full Name
    const [loading, setLoading] = useState(false);
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const translateError = (msg: string) => {
        if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
        if (msg.includes('User already registered')) return 'Este e-mail já está cadastrado.';
        if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.';
        return 'Ocorreu um erro. Verifique seus dados e tente novamente.';
    };

    const getRedirectUrl = () => {
        const origin = window.location.origin;
        if (!origin || origin === 'null') {
            return window.location.protocol + '//' + window.location.host;
        }
        return origin;
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: getRedirectUrl()
                }
            });
            if (error) throw error;
        } catch (err: any) {
            console.error(err);
            setError("Erro ao conectar com Google.");
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            subscription_tier: 'free', // Force Free
                        }
                    }
                });
                if (error) throw error;
                setMessage('Conta criada! Verifique seu e-mail para confirmar.');
            }
        } catch (err: any) {
            console.error(err);
            setError(translateError(err.message || ''));
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 animate-fade-in-up border border-white/50 my-10">
            <div className="text-center mb-6">
                <span className="text-4xl mb-2 block">✈️</span>
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600 mb-2">
                    {isLogin ? 'Bem-vindo de volta!' : 'Comece sua Jornada'}
                </h2>
                <p className="text-gray-500 text-sm font-medium">
                    {isLogin ? 'Faça login para acessar seus planos.' : 'Crie sua conta para salvar e compartilhar roteiros.'}
                </p>
            </div>

            {error && (
                <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-3 text-sm rounded shadow-sm animate-fade-in flex items-center gap-2">
                    <span>⚠️</span>
                    <p>{error}</p>
                </div>
            )}

            {message && (
                <div className="mb-4 bg-green-50 border-l-4 border-green-500 text-green-700 p-3 text-sm rounded shadow-sm animate-fade-in flex items-center gap-2">
                    <span>✅</span>
                    <p>{message}</p>
                </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
                {!isLogin && (
                    <div className="animate-fade-in">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Seu Nome</label>
                        <input
                            type="text"
                            required={!isLogin}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                            placeholder="Ex: James Bond"
                        />
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">E-mail</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                        placeholder="seu@email.com"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Senha</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                        placeholder="••••••••"
                    />
                </div>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">Ou continue com</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full py-3 rounded-xl border border-gray-200 bg-white text-gray-700 font-bold hover:bg-gray-50 transition-all flex justify-center items-center gap-2 shadow-sm"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                    Google
                </button>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-teal-600 to-blue-600 text-white font-bold hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Processando...</span>
                        </>
                    ) : (isLogin ? 'Entrar Agora' : 'Criar Conta Grátis')}
                </button>
            </form>

            <div className="mt-8 text-center">
                <p className="text-gray-500 text-sm mb-2">
                    {isLogin ? 'Ainda não tem conta?' : 'Já tem cadastro?'}
                </p>
                <button
                    onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
                    className="text-teal-600 hover:text-teal-800 font-bold text-sm tracking-wide border-b-2 border-transparent hover:border-teal-600 transition-all"
                >
                    {isLogin ? 'CRIAR CONTA NOVA' : 'FAZER LOGIN'}
                </button>
            </div>
        </div>
    );
};
