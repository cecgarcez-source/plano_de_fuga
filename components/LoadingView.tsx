import React, { useEffect, useState } from 'react';
import { MOCK_LOADING_MESSAGES } from '../constants';

export const LoadingView: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MOCK_LOADING_MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 animate-fade-in">
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-teal-500 rounded-full border-t-transparent animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">
          ✈️
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-800 mb-2 transition-all duration-500">
        {MOCK_LOADING_MESSAGES[messageIndex]}
      </h2>
      <p className="text-gray-500 text-sm max-w-md">
        Nossa IA está analisando milhares de possibilidades para criar o roteiro perfeito para você.
      </p>
    </div>
  );
};
