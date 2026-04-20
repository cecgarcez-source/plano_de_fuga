import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface Props {
    onBack: () => void;
    userId: string;
}

// TODO: SUBSTITUA PELO SEU PRICE ID REAL (O ID COMEÇA COM 'price_', NÃO 'prod_')
const STRIPE_PRICE_CARDS = import.meta.env.VITE_STRIPE_CARDS_PRICE_ID || 'price_SEU_PRICE_ID_AQUI';

export const PricingView: React.FC<Props> = ({ onBack, userId }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleCheckout = async () => {
        try {
            setIsLoading(true);

            // Validation: Check for placeholder IDs
            if (STRIPE_PRICE_CARDS.includes('price_SEU_PRICE_ID_AQUI')) {
                alert('CONFIGURAÇÃO NECESSÁRIA: Crie um Price para o Produto prod_UNAN0ESf7hfDJU no Stripe e substitua o VITE_STRIPE_CARDS_PRICE_ID no seu arquivo .env.local (ou diretamente no PricingView.tsx).');
                setIsLoading(false);
                return;
            }

            // Verify Auth Session & Token
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                alert('Você precisa estar logado para assinar.');
                setIsLoading(false);
                return;
            }

            // JWT Debug (Client-Side Check)
            try {
                const payload = JSON.parse(atob(session.access_token.split('.')[1]));
                const projectRef = 'tsjpxiguxybqikwkrquh';
                if (!payload.iss || !payload.iss.includes(projectRef)) {
                    console.error('Token Mismatch:', payload.iss);
                    alert(`SESSÃO INVÁLIDA DETECTADA\n\nSeu token de login pertence a um projeto antigo.\nToken Issuer: ${payload.iss}\nEsperado: ${projectRef}\n\nSOLUÇÃO: Faça Logout e Login novamente.`);
                    setIsLoading(false);
                    return;
                }
            } catch (e) {
                console.error('Error parsing token:', e);
            }

            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: {
                    priceId: STRIPE_PRICE_CARDS,
                    returnUrl: window.location.origin
                }
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
            alert(`Erro ao iniciar pagamento: ${error.message || JSON.stringify(error)}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto px-4 py-8 animate-fade-in">
            <div className="text-center mb-12">
                <button onClick={onBack} className="absolute left-4 top-4 text-white/80 hover:text-white font-bold text-sm bg-black/20 p-2 rounded-full backdrop-blur-sm transition-all md:hidden">
                    ← Voltar
                </button>
                <h2 className="text-4xl font-black text-black drop-shadow-lg mb-4">Mais Cards, Mais Destinos 🚀</h2>
                <p className="text-xl text-black font-medium">Você no controle do seu saldo.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* FREE PLAN */}
                <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-gray-200 flex flex-col relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gray-400"></div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Novo Agente</h3>
                    <div className="text-4xl font-black text-black mb-6">Grátis</div>

                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-center gap-3 text-gray-800 font-medium">
                            <span className="text-teal-500 text-xl">✓</span> 3 Cards de Geração Iniciais
                        </li>
                        <li className="flex items-center gap-3 text-gray-800 font-medium">
                            <span className="text-teal-500 text-xl">✓</span> Exportação PDF e Excel
                        </li>
                         <li className="flex items-center gap-3 text-gray-800 font-medium">
                            <span className="text-teal-500 text-xl">✓</span> Guias Inteligentes Inclusos
                        </li>
                        <li className="flex items-center gap-3 text-gray-600">
                            <span className="text-teal-500 text-xl">✓</span> Acesso ao Mapa de Viagem
                        </li>
                        <li className="flex items-center gap-3 text-gray-500 mt-4 italic font-medium">
                            * Cada roteiro gerado com IA consome 1 Card do seu pacote.
                        </li>
                    </ul>

                    <button
                        onClick={onBack}
                        className="w-full py-4 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
                    >
                        Voltar ao Dashboard
                    </button>
                </div>

                {/* PREMIUM PLAN */}
                <div className="bg-gradient-to-br from-gray-900 to-teal-900 rounded-3xl p-8 shadow-2xl border border-teal-500/30 flex flex-col relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 ring-4 ring-teal-500/20">
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-amber-500 text-white text-xs font-bold px-4 py-1 rounded-bl-xl shadow-lg">
                        MELHOR CUSTO BENEFÍCIO
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">Pacote 30 Planos 🗂️</h3>
                    <div className="flex items-end gap-2 mb-6">
                        <span className="text-5xl font-black text-white">R$ 39,90</span>
                        <span className="text-teal-200 font-medium mb-1">/ pacote único</span>
                    </div>

                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-center gap-3 text-white">
                            <span className="bg-teal-500 rounded-full p-0.5 text-white text-xs">✓</span>
                            <span className="font-bold">+30 Cards de Roteiros</span>
                        </li>
                        <li className="flex items-center gap-3 text-white">
                            <span className="bg-teal-500 rounded-full p-0.5 text-white text-xs">✓</span>
                            <span>Os seus Cards <strong>nunca expiram</strong></span>
                        </li>
                        <li className="flex items-center gap-3 text-white">
                            <span className="bg-teal-500 rounded-full w-4 h-4 flex items-center justify-center p-0.5 text-white text-xs">✓</span>
                            <span><strong>Guias Personalizados</strong> Automáticos</span>
                        </li>
                        <li className="flex items-center gap-3 text-white">
                            <span className="bg-teal-500 rounded-full w-4 h-4 flex items-center justify-center p-0.5 text-white text-xs">✓</span>
                            <span><strong>IA Premium</strong> (Pacing dinâmico, PDF/Excel)</span>
                        </li>
                    </ul>

                    <button
                        onClick={() => handleCheckout()}
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-600 text-white font-black text-center hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all transform hover:-translate-y-1 block disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Carregando...' : 'COMPRAR +30 CARDS 🚀'}
                    </button>

                    <p className="text-center text-teal-100 text-xs mt-4 font-medium opacity-80">
                        Pagamento único e seguro via Stripe. Sem assinaturas.
                    </p>
                </div>
            </div>
        </div>
    );
};

