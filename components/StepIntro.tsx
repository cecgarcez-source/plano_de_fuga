import React, { useState, useEffect } from 'react';
import { Compass, Coins, Send, FileText, Search } from 'lucide-react';

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
      <section className="relative min-h-screen flex flex-col items-center justify-center text-left pt-20 pb-20 overflow-hidden">
        {/* Blurred Image Background */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: "url('/machu-picchu-bg.jpg.png')",
            filter: "blur(6px) contrast(1.15)",
            transform: "scale(1.1)" // Previne bordas brancas do desfoque
          }}
        ></div>
        
        {/* Overlay for Readability */}
        <div className="absolute inset-0 z-0 bg-black/10 bg-gradient-to-b from-slate-900/20 via-[#0A1128]/40 to-black/70"></div>
        
        {/* Dotted Lines Organic Curves */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden hidden md:block">
          <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path d="M -100 300 C 200 400, 400 100, 700 200 S 1100 400, 1500 200" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="6 6" />
            <path d="M 1500 600 C 1200 500, 900 800, 600 700 S 200 500, -100 600" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 8" />
          </svg>
        </div>

        {/* Dedicated Navbar Floating */}
        <nav className="absolute top-0 w-full flex justify-between items-center px-8 md:px-16 py-6 z-50">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo Plano de Fuga" className="h-16 md:h-20 w-auto object-contain" />
          </div>
          <div className="hidden md:flex gap-8 text-base font-bold text-white/90">
            <a href="#" className="hover:text-white transition-colors">Início</a>
            <a href="#features" className="hover:text-white transition-colors">Destinos</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Planos</a>
            <a href="#" className="hover:text-white transition-colors">Sobre Nós</a>
            <a href="#" className="hover:text-white transition-colors">Contato</a>
          </div>
          <div>
            <button onClick={onStart} className="text-base font-bold text-[#fdfbf7] border-2 border-white/30 px-6 py-2.5 rounded-full hover:bg-white/20 transition-colors">
              Acessar
            </button>
          </div>
        </nav>

        {/* Main Content Grid */}
        <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 px-6 items-center">
          
          {/* Left Side: Floating Suitcase & Orbiting Elements */}
          <div className="relative flex items-center justify-center h-[280px] md:h-[600px] w-full mt-4 mb-0 md:mt-0">
            <div className="relative z-20 animate-float w-full max-w-md">
              <img src="/mala-flutuante.png" alt="Mala de Viagem Plano de Fuga" className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]" />
            </div>
            
            {/* Orbiting Element 1: Documents */}
            <div className="absolute top-1/2 left-1/2 -mt-6 -ml-6 animate-orbit z-10">
              <div className="bg-sky-200/90 backdrop-blur-sm p-3 rounded-xl border border-sky-300 shadow-[0_0_15px_rgba(125,211,252,0.3)] text-sky-800 rotate-12 animate-float-delayed">
                <FileText size={28} />
              </div>
            </div>

            {/* Orbiting Element 2: Magnifying Glass */}
            <div className="absolute top-1/2 left-1/2 -mt-6 -ml-6 animate-orbit z-30" style={{ animationDelay: '-10s' }}>
              <div className="bg-[#cdb08a]/90 backdrop-blur-sm p-3 rounded-full border border-[#b2936a] shadow-[0_0_15px_rgba(205,176,138,0.3)] text-amber-900 -rotate-12 animate-float">
                <Search size={28} />
              </div>
            </div>
          </div>

          {/* Right Side: Typography & CTA */}
          <div className="flex flex-col justify-center animate-fade-in-up mt-8 md:mt-0">
            <h1 className="text-5xl lg:text-7xl font-sans font-black text-[#fdfbf7] mb-6 leading-tight drop-shadow-lg tracking-tight">
              Trace o Seu <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-300 to-amber-500">Plano de Fuga</span> Agora
            </h1>
            
            <p className="text-xl text-gray-300 mb-10 leading-relaxed max-w-lg font-light">
              Descubra destinos remotos e experiências autênticas, planejados para você.
            </p>

            {/* Highlight Cards */}
            <div className="flex flex-col gap-4 mb-10">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 w-max pr-8 shadow-xl animate-float" style={{ animationDelay: '0s' }}>
                <div className="bg-[#b2936a]/20 p-2 rounded-lg text-[#cdb08a]">
                  <Compass size={24} />
                </div>
                <span className="text-white font-medium">Roteiros Exclusivos</span>
              </div>
              
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 w-max pr-8 shadow-xl animate-float-delayed" style={{ animationDelay: '1s' }}>
                <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400">
                  <Coins size={24} />
                </div>
                <span className="text-white font-medium">Custos Transparentes</span>
              </div>
              
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-4 w-max pr-8 shadow-xl animate-float" style={{ animationDelay: '2s' }}>
                <div className="bg-sky-500/20 p-2 rounded-lg text-sky-400">
                  <Send size={24} />
                </div>
                <span className="text-white font-medium">Suporte 24/7</span>
              </div>
            </div>

            {/* CTA */}
            <div>
              <button
                onClick={onStart}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-300 bg-gradient-to-r from-[#8a5d3b] to-[#6a4325] rounded-xl hover:scale-105 overflow-hidden shadow-[0_0_30px_rgba(138,93,59,0.4)] hover:shadow-[0_0_50px_rgba(138,93,59,0.6)] tracking-wide border border-[#b2936a]/30"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></span>
                <span>Começar Minha Jornada</span>
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* --- VALUE PROPOSITION (Features) --- */}
      <section id="features" className="py-32 mt-12 relative z-20 overflow-hidden">
        {/* Background Praia */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: "url('/praia.jpg.png')",
            filter: "contrast(1.15)"
          }}
        ></div>
        {/* Overlay para legibilidade */}
        <div className="absolute inset-0 z-0 bg-stone-100/40 backdrop-blur-sm"></div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4 font-serif uppercase drop-shadow-sm">Mais que planejamento. Inteligência de Rota.</h2>
            <p className="text-xl text-gray-900 font-medium max-w-2xl mx-auto drop-shadow-sm">Descubra as vantagens exclusivas de acionar sua Agência Secreta com IA para estruturar sua próxima missão.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-white/70 backdrop-blur-md border border-white/50 hover:border-amber-400 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-amber-100/90 text-amber-700 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-sm">🧭</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 uppercase font-serif">Dossiês em Segundos</h3>
              <p className="text-gray-800 text-sm leading-relaxed font-medium">De zero ao dossiê completo instantaneamente. Nossa IA analisa milhares de pontos turísticos para mapear o cenário ideal sem deixar rastros.</p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-white/70 backdrop-blur-md border border-white/50 hover:border-orange-400 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-orange-100/90 text-orange-600 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-sm">🎯</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 uppercase font-serif">Missões Personalizadas</h3>
              <p className="text-gray-800 text-sm leading-relaxed font-medium">Orçamento, estilo operante e ritmo adaptados ao seu perfil confidencial. De viajante low-profile a missões de extremo luxo.</p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-teal-50/80 backdrop-blur-md border-2 border-teal-500/50 hover:border-teal-500 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-teal-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg shadow-sm">Geofencing & Qualidade</div>
              <div className="w-14 h-14 rounded-2xl bg-teal-200/90 text-teal-700 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-sm">⭐</div>
              <h3 className="text-xl font-bold text-teal-900 mb-2">Curadoria de Alta Qualidade</h3>
              <p className="text-teal-900 text-sm leading-relaxed font-medium">Garantimos que você só visitará os melhores restaurantes e atrações avaliados com notas acima de 4.5 estrelas pelos viajantes.</p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-3xl bg-white/70 backdrop-blur-md border border-white/50 hover:border-orange-400 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-orange-100/90 text-orange-600 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-sm">🌤️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Inteligência Climática</h3>
              <p className="text-gray-800 text-sm leading-relaxed font-medium">Tenha uma análise detalhada da melhor época para viajar com base na sazonalidade escolhida para não ter férias estragadas pela chuva.</p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-3xl bg-white/70 backdrop-blur-md border border-white/50 hover:border-purple-400 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-purple-100/90 text-purple-600 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-sm">🗺️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Dashboard Geográfico</h3>
              <p className="text-gray-800 text-sm leading-relaxed font-medium">Mapeie os locais que já conquistou no mundo e organize todos os seus futuros planos de fuga de um só lugar.</p>
            </div>

            {/* Feature 6 */}
            <div className="p-8 rounded-3xl bg-gray-900/85 backdrop-blur-md text-white border border-gray-700/50 hover:border-white hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg shadow-sm">Liberado</div>
              <div className="w-14 h-14 rounded-2xl bg-gray-800/90 text-amber-400 flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform shadow-sm">📱</div>
              <h3 className="text-xl font-bold mb-2">Dossiês em PDF Otimizados</h3>
              <p className="text-gray-200 text-sm leading-relaxed font-medium">Exporte seus roteiros para formato Dossiê e Excel desde o primeiro uso. Cabe perfeito na tela do celular para leitura offline.</p>
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