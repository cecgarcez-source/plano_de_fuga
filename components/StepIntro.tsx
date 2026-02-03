import React, { useState, useEffect } from 'react';

interface Props {
  onStart: () => void;
}

export const StepIntro: React.FC<Props> = ({ onStart }) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex flex-col w-full min-h-screen animate-fade-in font-sans text-gray-800">

      {/* --- HERO SECTION --- */}
      <section className="relative h-[90vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        {/* Ambient Background Grid/Gradient */}
        <div className="absolute inset-0 z-0 bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-transparent via-white/50 to-white pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-xs font-semibold uppercase tracking-wider shadow-sm animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
            Novo: IA Gemini 2.0 Integrada
          </div>

          {/* Logo / Brand */}
          <div className="relative group cursor-default">
            <div className="absolute -inset-8 bg-gradient-to-r from-teal-400/20 to-blue-500/20 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition duration-500"></div>
            <div className="relative transform hover:scale-105 transition-transform duration-500">
              <img
                src="/logo.png"
                alt="Plano de Fuga Logo"
                className="w-48 h-48 md:w-64 md:h-64 object-contain drop-shadow-xl"
              />
            </div>
          </div>

          {/* Headlines */}
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-gray-900 leading-tight">
              Sua Próxima Aventura <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">Começa Aqui.</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 font-light leading-relaxed">
              Fuja da rotina. Crie roteiros de viagem <span className="font-semibold text-gray-800">perfeitos</span> e personalizados em segundos com Inteligência Artificial.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4">
            <button
              onClick={onStart}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-300 bg-gray-900 rounded-full hover:bg-teal-600 hover:shadow-2xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 overflow-hidden"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></span>
              <span>Planejar Minha Fuga</span>
              <svg className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-gray-600 transition-all duration-200 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:text-gray-900 hover:border-gray-300 focus:outline-none"
            >
              Como funciona?
            </button>
          </div>

          {/* Social Proof (Micro) */}
          <div className="pt-8 flex items-center gap-4 text-sm text-gray-500">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 overflow-hidden">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 13}`} alt="User" />
                </div>
              ))}
            </div>
            <p>Junte-se a <span className="font-bold text-gray-800">+1.500</span> viajantes inteligentes.</p>
          </div>
        </div>
      </section>

      {/* --- VALUE PROPOSITION (Features) --- */}
      <section id="features" className="py-24 bg-white relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">Por que usar o Plano de Fuga?</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">Não perca horas pesquisando. Nossa IA faz o trabalho pesado para você gastar seu tempo vivendo.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-teal-200 transition-colors duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">🚀</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Velocidade Supersônica</h3>
              <p className="text-gray-600 leading-relaxed">De zero ao roteiro completo em menos de 1 minuto. Digite o destino e pronto.</p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-blue-200 transition-colors duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">🎯</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Hiper Personalizado</h3>
              <p className="text-gray-600 leading-relaxed">Adaptado ao seu orçamento, estilo de viagem e preferências. Nada de roteiros genéricos.</p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-purple-200 transition-colors duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">💎</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Experiência Premium</h3>
              <p className="text-gray-600 leading-relaxed">Exporte para PDF, acesse descontos exclusivos e suporte prioritário na nossa comunidade.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- SOCIAL PROOF --- */}
      <section className="py-24 bg-gray-900 text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">O que dizem nossos viajantes?</h2>
            <div className="w-20 h-1 bg-teal-500 mx-auto rounded-full"></div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700">
              <div className="flex items-center gap-1 text-amber-400 mb-4">★★★★★</div>
              <p className="text-gray-300 italic mb-6">"Eu passava dias montando planilha. O Plano de Fuga montou uma viagem pro Chile surreal em 30 segundos. Vale cada centavo."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro" alt="Pedro" /></div>
                <div><p className="font-bold text-sm">Pedro S.</p><p className="text-xs text-gray-400">Viajante Anual</p></div>
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700">
              <div className="flex items-center gap-1 text-amber-400 mb-4">★★★★★</div>
              <p className="text-gray-300 italic mb-6">"A funcionalidade de 'Destino Surpresa' mudou minhas férias. Descobri lugares que nem sabia que existiam."</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Ana" alt="Ana" /></div>
                <div><p className="font-bold text-sm">Ana Clara</p><p className="text-xs text-gray-400">Nômade Digital</p></div>
              </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-700 md:hidden lg:block">
              <div className="flex items-center gap-1 text-amber-400 mb-4">★★★★★</div>
              <p className="text-gray-300 italic mb-6">"Simples, direto e lindo. O PDF que ele gera é perfeito para levar no celular. Recomendo muito!"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Marcos" alt="Marcos" /></div>
                <div><p className="font-bold text-sm">Marcos V.</p><p className="text-xs text-gray-400">Estudante</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- PRE-FOOTER CTA --- */}
      <section className="py-24 bg-teal-600 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-teal-500 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-50"></div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Pronto para sua próxima fuga?</h2>
          <p className="text-teal-100 text-xl mb-10 max-w-2xl mx-auto">Não deixe para amanhã a viagem que você pode planejar hoje.</p>
          <button
            onClick={onStart}
            className="bg-white text-teal-800 font-bold text-xl px-10 py-4 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
          >
            Começar Agora Grátis
          </button>
          <p className="mt-4 text-teal-200 text-sm">Sem cartão de crédito necessário.</p>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">✈️</span>
              <span className="font-bold text-xl tracking-tight text-gray-900">Plano de Fuga</span>
            </div>
            <p className="text-gray-500 text-sm max-w-xs">
              Sua plataforma inteligente de planejamento de viagens. Transformando sonhos em roteiros desde 2024.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li><a href="/politica-de-privacidade" className="hover:text-teal-600">Política de Privacidade</a></li>
              <li><a href="/termos-de-uso" className="hover:text-teal-600">Termos de Uso</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-4">Contato & Suporte</h4>
            <ul className="space-y-2 text-sm text-gray-500">
              <li className="flex items-center gap-2">
                <span>📧</span>
                <a href="mailto:contato@planodefugai.com.br" className="hover:text-teal-600 text-teal-700 font-medium">contato@planodefugai.com.br</a>
              </li>
              <li className="text-xs text-gray-400 mt-2">
                Atendimento exclusivo para membros Premium.
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-gray-200 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Plano de Fuga AI. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};