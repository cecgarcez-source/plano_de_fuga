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
      <section className="relative min-h-[90vh] md:h-[90vh] flex flex-col items-center justify-start pt-0 md:justify-center md:pt-0 text-center px-4 overflow-hidden bg-center bg-cover bg-no-repeat" style={{ backgroundImage: "url('/hero-bg.jpg')" }}>
        {/* Ambient Overlay - Dark vintage to make text readable but let image shine */}
        <div className="absolute inset-0 z-0 bg-stone-900/30 mix-blend-multiply"></div>
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-stone-100 to-transparent z-0"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center space-y-0 pt-8">
          {/* Badge */}
          <div className="hidden md:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50/80 border border-amber-200 text-amber-900 text-xs font-bold uppercase tracking-widest shadow-sm animate-fade-in-up backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            ACESSO RESTRITO: IA TOP SECRET
          </div>

          {/* Logo / Brand - Doubled Size */}
          <div className="relative group cursor-default -mt-12 md:mt-0">
            <div className="relative transform hover:scale-105 transition-transform duration-500">
              <img
                src="/logo.png"
                alt="Plano de Fuga Logo"
                className="w-96 h-96 md:w-[32rem] md:h-[32rem] object-contain drop-shadow-2xl mix-blend-multiply"
              />
            </div>
          </div>

          {/* Headlines - Background removed for full image transparency, text shadow added */}
          <div className="-mt-8 space-y-2 max-w-2xl p-4 drop-shadow-lg">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight uppercase font-serif drop-shadow-md">
              Missão Férias: <br />
              <span
                onClick={onStart}
                className="cursor-pointer text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 underline decoration-amber-400/50 hover:decoration-amber-400/80 transition-all font-black tracking-widest"
              >
                ATIVADA.
              </span>
            </h1>
            <p className="text-lg md:text-xl text-stone-100 font-medium leading-relaxed mt-2 drop-shadow-md">
              Sua Agência de Viagens <span className="font-bold text-amber-400 uppercase">Secreta</span> com IA. Planeje seu roteiro perfeito, descubra destinos e experiências personalizadas em segundos.
            </p>
          </div>

          {/* CTA Buttons - Compact spacing */}
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-2">
            <button
              onClick={onStart}
              className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-300 bg-amber-800 rounded-lg hover:bg-amber-700 hover:shadow-2xl hover:-translate-y-1 focus:outline-none border-b-4 border-amber-950 overflow-hidden shadow-xl uppercase tracking-wider font-serif"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></span>
              <span>INICIAR DOSSIÊ AGORA</span>
              <svg className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center px-8 py-3 text-sm font-bold text-gray-700 transition-all duration-200 bg-stone-100/80 backdrop-blur-md border border-stone-300 rounded-lg hover:bg-white hover:text-gray-900 hover:border-stone-400 focus:outline-none shadow-md uppercase tracking-wider"
            >
              INVESTIGAR RECURSOS
            </button>
          </div>

          {/* Social Proof (Micro) */}
          <div className="pt-4 flex items-center gap-4 text-sm text-gray-500">
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
      <section id="features" className="py-32 mt-12 bg-stone-100 relative z-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 font-serif uppercase">Mais que planejamento. Inteligência de Rota.</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">Descubra as vantagens exclusivas de acionar sua Agência Secreta com IA para estruturar sua próxima missão.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-amber-400 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">🧭</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 uppercase font-serif">Dossiês em Segundos</h3>
              <p className="text-gray-600 text-sm leading-relaxed">De zero ao dossiê completo instantaneamente. Nossa IA analisa milhares de pontos turísticos para mapear o cenário ideal sem deixar rastros.</p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-orange-400 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">🎯</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 uppercase font-serif">Missões Personalizadas</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Orçamento, estilo operante e ritmo adaptados ao seu perfil confidencial. De viajante low-profile a missões de extremo luxo.</p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-teal-50 border-2 border-teal-500 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-teal-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg">Geofencing & Qualidade</div>
              <div className="w-14 h-14 rounded-2xl bg-teal-200 text-teal-700 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">⭐</div>
              <h3 className="text-xl font-bold text-teal-900 mb-2">Curadoria de Alta Qualidade</h3>
              <p className="text-teal-800 text-sm leading-relaxed">Garantimos que você só visitará os melhores restaurantes e atrações avaliados com notas acima de 4.5 estrelas pelos viajantes.</p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-orange-400 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">🌤️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Inteligência Climática</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Tenha uma análise detalhada da melhor época para viajar com base na sazonalidade escolhida para não ter férias estragadas pela chuva.</p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-3xl bg-gray-50 border border-gray-100 hover:border-purple-400 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">🗺️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Dashboard Geográfico</h3>
              <p className="text-gray-600 text-sm leading-relaxed">Mapeie os locais que já conquistou no mundo e organize todos os seus futuros planos de fuga de um só lugar.</p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-3xl bg-gray-900 text-white border border-gray-700 hover:border-white hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg">Liberado</div>
              <div className="w-14 h-14 rounded-2xl bg-gray-800 text-amber-400 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform text-shadow">📱</div>
              <h3 className="text-xl font-bold mb-2">Dossiês em PDF Otimizados</h3>
              <p className="text-gray-300 text-sm leading-relaxed">Exporte seus roteiros para formato Dossiê e Excel desde o primeiro uso. Cabe perfeito na tela do celular para leitura offline.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- COMO FUNCIONA --- */}
      <section id="how-it-works" className="py-24 bg-stone-200 border-t border-stone-300 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-stone-900 mb-4 font-serif uppercase">Como a Operação Ocorre</h2>
            <p className="text-xl text-stone-600 max-w-2xl mx-auto">Em apenas 4 passos você aciona a agência e recebe seu dossiê confidencial de viagem.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[10%] w-[80%] h-0.5 bg-stone-300 z-0"></div>

            <div className="relative z-10 text-center flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-white border-4 border-amber-600 flex items-center justify-center text-2xl font-black text-amber-700 shadow-xl mb-6 font-serif">1</div>
              <h3 className="font-bold text-xl text-stone-900 mb-2">Configure o Perfil</h3>
              <p className="text-stone-600 text-sm">Diga quem você é. Gosta de luxo? É vegano? Gosta de cultura? Isso moldará a IA para sempre.</p>
            </div>

            <div className="relative z-10 text-center flex flex-col items-center mt-0 md:mt-8">
              <div className="w-20 h-20 rounded-full bg-white border-4 border-amber-600 flex items-center justify-center text-2xl font-black text-amber-700 shadow-xl mb-6 font-serif">2</div>
              <h3 className="font-bold text-xl text-stone-900 mb-2">Crie a Missão</h3>
              <p className="text-stone-600 text-sm">Defina o destino (ou clique em Surpresa), o período, orçamento e quem vai com você.</p>
            </div>

            <div className="relative z-10 text-center flex flex-col items-center mt-0 md:mt-0">
              <div className="w-20 h-20 rounded-full bg-white border-4 border-amber-600 flex items-center justify-center text-2xl font-black text-amber-700 shadow-xl mb-6 font-serif">3</div>
              <h3 className="font-bold text-xl text-stone-900 mb-2">A Agência Trabalha</h3>
              <p className="text-stone-600 text-sm">O Gemini cruza milhares de avaliações exclusivas, custos de transporte e regras logísticas pra criar a rota secreta.</p>
            </div>

            <div className="relative z-10 text-center flex flex-col items-center mt-0 md:mt-8">
              <div className="w-20 h-20 rounded-full bg-white border-4 border-amber-600 flex items-center justify-center text-2xl font-black text-amber-700 shadow-xl mb-6 font-serif">4</div>
              <h3 className="font-bold text-xl text-stone-900 mb-2">Missão Autorizada!</h3>
              <p className="text-stone-600 text-sm">Dossiê gerado. Navegue na plataforma, rastreie gastos via satélite ou baixe o PDF para ler offline.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- SOCIAL PROOF --- */}
      <section className="py-24 bg-gray-900/90 backdrop-blur-sm text-white overflow-hidden relative">
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
      <section className="py-24 bg-stone-900 backdrop-blur-sm relative overflow-hidden border-t-4 border-amber-600">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-600 rounded-full blur-[100px] opacity-20"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-700 rounded-full blur-[100px] opacity-30"></div>

        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-amber-50 mb-6 font-serif uppercase tracking-tight">Pronto para assumir a missão?</h2>
          <p className="text-stone-300 text-xl mb-10 max-w-2xl mx-auto">Sua agência secreta aguarda instruções. Não deixe para amanhã a viagem que você pode mapear hoje.</p>
          <button
            onClick={onStart}
            className="bg-gradient-to-r from-amber-600 to-orange-700 text-white font-black text-xl px-10 py-5 rounded-lg shadow-2xl shadow-orange-900/50 hover:shadow-orange-700 hover:scale-105 transition-all duration-300 uppercase tracking-widest"
          >
            ACESSAR SUA FUGA AGORA
          </button>
          <div className="mt-8 flex flex-col items-center justify-center">
            <span className="bg-red-600 text-white text-xs font-black px-4 py-1.5 rounded-sm uppercase tracking-widest shadow-md rotate-1 mb-3">
               ALERTA DE STATUS: OFERTA LIBERADA
            </span>
            <div className="text-amber-50 font-medium text-sm md:text-base max-w-lg bg-black/40 p-5 rounded-xl backdrop-blur-md border border-amber-600/30 shadow-inner">
               Faça seu cadastro agora e receba <strong className="text-amber-400 text-lg uppercase tracking-wide block my-1">3 CRÉDITOS GRATUITOS</strong> para acionar a IA e gerar 3 planejamentos de viagem 100% completos! Sem amarras.
            </div>
          </div>
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
                Qualquer dúvida, fale com a nossa equipe!
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