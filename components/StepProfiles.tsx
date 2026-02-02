import React from 'react';
import { TripPreferences } from '../types';
import { TRAVEL_PROFILES } from '../constants';

interface Props {
  selectedProfiles: string[];
  onToggleProfile: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepProfiles: React.FC<Props> = ({ selectedProfiles, onToggleProfile, onNext, onBack }) => {
  
  const handleNext = () => {
    if (selectedProfiles.length === 0) {
      alert("Selecione pelo menos um perfil para continuarmos!");
      return;
    }
    onNext();
  };

  return (
    <div className="max-w-4xl mx-auto w-full animate-fade-in-up">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Qual a vibe da sua viagem?</h2>
        <p className="text-gray-600">Selecione quantos quiser. A IA vai misturar tudo para você.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {TRAVEL_PROFILES.map((profile) => {
          const isSelected = selectedProfiles.includes(profile.id);
          return (
            <button
              key={profile.id}
              onClick={() => onToggleProfile(profile.id)}
              className={`relative p-4 rounded-xl text-left transition-all duration-200 border-2 ${
                isSelected
                  ? 'bg-teal-50 border-teal-500 shadow-md scale-105'
                  : 'bg-white border-transparent hover:border-gray-200 shadow-sm hover:shadow'
              }`}
            >
              <div className="text-4xl mb-2">{profile.icon}</div>
              <div className="font-bold text-gray-800">{profile.label}</div>
              <div className="text-xs text-gray-500 mt-1">{profile.description}</div>
              
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center text-white text-xs">
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-between items-center bg-white/80 backdrop-blur rounded-2xl p-4 shadow-lg sticky bottom-4">
        <button
          onClick={onBack}
          className="px-6 py-2 rounded-lg text-gray-500 hover:bg-gray-100 font-medium transition-colors"
        >
          Voltar
        </button>
        
        <div className="text-sm text-gray-500 hidden md:block">
            {selectedProfiles.length} perfis selecionados
        </div>

        <button
          onClick={handleNext}
          disabled={selectedProfiles.length === 0}
          className={`px-8 py-3 rounded-lg font-bold shadow-lg transition-all ${
            selectedProfiles.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-teal-600 to-blue-600 text-white hover:shadow-xl hover:-translate-y-1'
          }`}
        >
          GERAR MEU PLANO ✨
        </button>
      </div>
    </div>
  );
};
