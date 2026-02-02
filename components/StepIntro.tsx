import React from 'react';

interface Props {
  onStart: () => void;
}

export const StepIntro: React.FC<Props> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 animate-fade-in">

      {/* Logo Section */}
      <div className="mb-4 relative group">
        <div className="absolute -inset-4 bg-gradient-to-r from-teal-400/30 to-blue-500/30 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative">
          {/* Assumes the user placed the file as logo.png in public folder */}
          {/* Increased size by approx 30% (w-80 -> w-[26rem], md:w-96 -> md:w-[32rem]) */}
          <img
            src="/logo.png?v=5"
            alt="Plano de Fuga Logo"
            className="w-[20rem] md:w-[26rem] h-auto object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Fallback just in case image is missing - increased text size
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = '<span class="text-7xl md:text-8xl">✈️<br/><span class="text-4xl md:text-5xl font-black">PLANO DE FUGA</span></span>';
            }}
          />
        </div>
      </div>

      {/* Removed Text Title as it is likely inside the logo image now */}

      <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl font-light">
        O mundo é grande demais para ficar no mesmo lugar.
        <br />
        <span className="font-semibold text-gray-800">Sua próxima aventura começa com um clique.</span>
      </p>

      <button
        onClick={onStart}
        className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-teal-600 rounded-full hover:bg-teal-700 hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600"
      >
        <span>Planejar minha Fuga</span>
        <svg className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
        </svg>
      </button>

      <p className="mt-8 text-sm text-gray-400">Desenvolvido com Gemini AI</p>
    </div>
  );
};