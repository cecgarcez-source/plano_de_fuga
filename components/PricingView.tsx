import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface Props {
    onBack: () => void;
    userId: string;
}

// TODO: SUBSTITUA PELOS SEUS PRICE IDs REAIS DO STRIPE DASHBOARD
const STRIPE_PRICES = {
    monthly: 'price_1SuehbCcUP4dntWPAsETDzEg', // Plano Premium Mensal
    yearly: 'price_1Suev0CcUP4dntWPgnW3V0Jf',  // Plano Premium Anual
};

export const PricingView: React.FC<Props> = ({ onBack, userId }) => {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [isLoading, setIsLoading] = useState(false);

    const handleCheckout = async (cycle: 'monthly' | 'yearly') => {
        try {
            setIsLoading(true);

            // Validation: Check for placeholder IDs
            if (STRIPE_PRICES[cycle].includes('price_1Q...')) {
                alert('CONFIGURAÇÃO NECESSÁRIA: Substitua os IDs de preço no arquivo `components/PricingView.tsx` pelos seus IDs reais do Stripe Dashboard.');
                setIsLoading(false);
                return;
            }

            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: {
                    priceId: STRIPE_PRICES[cycle],
                    returnUrl: window.location.origin
                }
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
            alert('Erro ao iniciar pagamento. Verifique se a função create-checkout está deployada e os Price IDs configurados.');
        } finally {
            setIsLoading(false);
        }
    };

    const plans = {
        monthly: {
            price: 'R$ 19,90',
            period: '/mês',
            id: 'monthly'
        },
        yearly: {
            price: 'R$ 199,90',
            period: '/ano',
            note: 'Economize 16%',
            id: 'yearly'
        }
    };

    const selectedPlan = plans[billingCycle];

    return (
        <div className="w-full max-w-5xl mx-auto px-4 py-8 animate-fade-in">
            <div className="text-center mb-12">
                <button onClick={onBack} className="absolute left-4 top-4 text-white/80 hover:text-white font-bold text-sm bg-black/20 p-2 rounded-full backdrop-blur-sm transition-all md:hidden">
                    ← Voltar
                </button>
                <h2 className="text-4xl font-black text-black drop-shadow-lg mb-4">Escolha seu Plano de Fuga 🚀</h2>
                <p className="text-xl text-black font-medium">Desbloqueie todo o potencial da sua próxima viagem.</p>
            </div>

            <div className="flex justify-center mb-8">
                <div className="bg-white/20 backdrop-blur-md p-1 rounded-full flex gap-1 shadow-inner">
                    <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${billingCycle === 'monthly'
                            ? 'bg-white text-teal-900 shadow-md'
                            : 'text-white hover:bg-white/10'
                            }`}
                    >
                        Mensal
                    </button>
                    <button
                        onClick={() => setBillingCycle('yearly')}
                        className={`px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${billingCycle === 'yearly'
                            ? 'bg-white text-teal-900 shadow-md'
                            : 'text-white hover:bg-white/10'
                            }`}
                    >
                        Anual
                        <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">-16%</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* FREE PLAN */}
                <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-gray-200 flex flex-col relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gray-400"></div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Viajante Iniciante</h3>
                    <div className="text-4xl font-black text-black mb-6">Grátis</div>

                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-center gap-3 text-gray-800 font-medium">
                            <span className="text-teal-500 text-xl">✓</span> 3 Planos Inteligentes
                        </li>
                        <li className="flex items-center gap-3 text-gray-600">
                            <span className="text-teal-500 text-xl">✓</span> Acesso ao Mapa
                        </li>
                        <li className="flex items-center gap-3 text-gray-400">
                            <span className="text-gray-300 text-xl">✕</span> Exportar PDF
                        </li>
                        <li className="flex items-center gap-3 text-gray-400">
                            <span className="text-gray-300 text-xl">✕</span> Compartilhamento
                        </li>
                    </ul>

                    <button
                        onClick={onBack}
                        className="w-full py-4 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
                    >
                        Já possuo
                    </button>
                </div>

                {/* PREMIUM PLAN */}
                <div className="bg-gradient-to-br from-gray-900 to-teal-900 rounded-3xl p-8 shadow-2xl border border-teal-500/30 flex flex-col relative overflow-hidden group hover:scale-[1.02] transition-all duration-300 ring-4 ring-teal-500/20">
                    <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-amber-500 text-white text-xs font-bold px-4 py-1 rounded-bl-xl shadow-lg">
                        RECOMENDADO
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">Agente de Elite 🕵️‍♂️</h3>
                    <div className="flex items-end gap-2 mb-6">
                        <span className="text-5xl font-black text-white">{selectedPlan.price}</span>
                        <span className="text-teal-200 font-medium mb-1">{selectedPlan.period}</span>
                    </div>

                    <ul className="space-y-4 mb-8 flex-1">
                        <li className="flex items-center gap-3 text-white">
                            <span className="bg-teal-500 rounded-full p-0.5 text-white text-xs">✓</span>
                            <span className="font-bold">Planos Ilimitados</span>
                        </li>
                        <li className="flex items-center gap-3 text-white">
                            <span className="bg-teal-500 rounded-full p-0.5 text-white text-xs">✓</span>
                            <span>Exportação em <strong>PDF Profissional</strong></span>
                        </li>
                        <li className="flex items-center gap-3 text-white">
                            <span className="bg-teal-500 rounded-full p-0.5 text-white text-xs">✓</span>
                            <span><strong>Compartilhamento</strong> de Link</span>
                        </li>
                        <li className="flex items-center gap-3 text-white">
                            <span className="bg-teal-500 rounded-full p-0.5 text-white text-xs">✓</span>
                            <span>Acesso Antecipado a Novas Features</span>
                        </li>
                    </ul>

                    <button
                        onClick={() => handleCheckout(billingCycle)}
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-600 text-white font-black text-center hover:shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all transform hover:-translate-y-1 block disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Carregando...' : 'QUERO SER PREMIUM 🚀'}
                    </button>

                    <p className="text-center text-teal-100 text-xs mt-4 font-medium opacity-80">
                        Pagamento seguro via Stripe. Cancele quando quiser.
                    </p>
                </div>
            </div>
        </div>
    );
};

