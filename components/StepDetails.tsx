import React, { useState, useEffect } from 'react';
import { TripPreferences, BudgetLevel, TransportType, PrebookedHotel } from '../types';

interface Props {
  preferences: TripPreferences;
  onUpdate: (data: Partial<TripPreferences>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepDetails: React.FC<Props> = ({ preferences, onUpdate, onNext, onBack }) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showHotelInput, setShowHotelInput] = useState(preferences.prebookedAccommodation?.length > 0);

  // Auto-calculate duration when dates change
  useEffect(() => {
    if (preferences.startDate && preferences.endDate) {
      const start = new Date(preferences.startDate);
      const end = new Date(preferences.endDate);
      
      // Calculate difference in milliseconds
      const diffTime = Math.abs(end.getTime() - start.getTime());
      // Convert to days (ceil to ensure partial days count as a day)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 

      if (diffDays > 0) {
        onUpdate({ duration: diffDays });
      }
    }
  }, [preferences.startDate, preferences.endDate]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!preferences.origin) newErrors.origin = "Origem é obrigatória";
    if (!preferences.isSurpriseDestination && !preferences.destination) newErrors.destination = "Destino é obrigatório (ou escolha surpresa)";
    if (!preferences.startDate) newErrors.startDate = "Data de ida é obrigatória";
    if (!preferences.endDate) newErrors.endDate = "Data de volta é obrigatória";
    if (preferences.startDate && preferences.endDate && preferences.startDate > preferences.endDate) {
      newErrors.endDate = "A volta deve ser depois da ida";
    }
    
    // Validar hoteis pre-reservados se houver
    if (showHotelInput && preferences.prebookedAccommodation) {
        preferences.prebookedAccommodation.forEach((hotel, idx) => {
            if (!hotel.name) newErrors[`hotel_${idx}`] = "Nome do hotel é obrigatório";
            if (!hotel.checkIn) newErrors[`hotel_ci_${idx}`] = "Data de check-in obrigatória";
            if (!hotel.checkOut) newErrors[`hotel_co_${idx}`] = "Data de check-out obrigatória";
        });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  // Funções para manipular hoteis
  const addHotel = () => {
    const newHotel: PrebookedHotel = {
        name: '',
        checkIn: preferences.startDate || '',
        checkOut: preferences.endDate || ''
    };
    onUpdate({ 
        prebookedAccommodation: [...(preferences.prebookedAccommodation || []), newHotel] 
    });
    setShowHotelInput(true);
  };

  const removeHotel = (index: number) => {
    const updated = [...(preferences.prebookedAccommodation || [])];
    updated.splice(index, 1);
    onUpdate({ prebookedAccommodation: updated });
    if (updated.length === 0) setShowHotelInput(false);
  };

  const updateHotel = (index: number, field: keyof PrebookedHotel, value: string) => {
    const updated = [...(preferences.prebookedAccommodation || [])];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate({ prebookedAccommodation: updated });
  };

  return (
    <div className="max-w-2xl mx-auto w-full bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-6 md:p-8 animate-fade-in-up">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <span className="bg-teal-100 text-teal-600 w-8 h-8 rounded-full flex items-center justify-center text-sm mr-3">1</span>
        Detalhes da Fuga
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Origin */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">De onde você vai sair?</label>
          <input
            type="text"
            value={preferences.origin}
            onChange={(e) => onUpdate({ origin: e.target.value })}
            placeholder="Ex: São Paulo, SP"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
          />
          {errors.origin && <p className="text-red-500 text-xs mt-1">{errors.origin}</p>}
        </div>

        {/* Destination */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Para onde quer ir?</label>
          <div className="flex flex-col md:flex-row gap-3">
             <input
              type="text"
              disabled={preferences.isSurpriseDestination}
              value={preferences.destination}
              onChange={(e) => onUpdate({ destination: e.target.value })}
              placeholder={preferences.isSurpriseDestination ? "Destino Surpresa!" : "Ex: Paris, Tóquio, Maceió..."}
              className={`flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${preferences.isSurpriseDestination ? 'bg-gray-100 text-gray-400' : ''}`}
            />
            <button
              onClick={() => onUpdate({ isSurpriseDestination: !preferences.isSurpriseDestination, destination: '' })}
              className={`px-4 py-3 rounded-lg font-medium border transition-colors ${preferences.isSurpriseDestination ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
              🎁 Me surpreenda
            </button>
          </div>
          {errors.destination && <p className="text-red-500 text-xs mt-1">{errors.destination}</p>}
        </div>

        {/* Start Date & Time */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Ida</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={preferences.startDate}
              onChange={(e) => onUpdate({ startDate: e.target.value })}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="time"
              value={preferences.departureTime}
              onChange={(e) => onUpdate({ departureTime: e.target.value })}
              className="w-24 px-2 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 text-center"
            />
          </div>
          {errors.startDate && <p className="text-red-500 text-xs">{errors.startDate}</p>}
        </div>

        {/* End Date & Time */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Volta</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={preferences.endDate}
              onChange={(e) => onUpdate({ endDate: e.target.value })}
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500"
            />
            <input
              type="time"
              value={preferences.returnTime}
              onChange={(e) => onUpdate({ returnTime: e.target.value })}
              className="w-24 px-2 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 text-center"
            />
          </div>
          {errors.endDate && <p className="text-red-500 text-xs">{errors.endDate}</p>}
        </div>
        
        {/* Helper text for duration */}
        {(preferences.startDate && preferences.endDate) && (
           <div className="col-span-1 md:col-span-2 text-center text-sm text-teal-600 font-medium bg-teal-50 py-2 rounded-lg">
             Duração calculada: {preferences.duration} dias
           </div>
        )}

        {/* Accommodation Pre-booked */}
        <div className="col-span-1 md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
           <div className="flex items-center justify-between mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                 <input 
                    type="checkbox" 
                    checked={showHotelInput} 
                    onChange={(e) => {
                        setShowHotelInput(e.target.checked);
                        if(e.target.checked && (!preferences.prebookedAccommodation || preferences.prebookedAccommodation.length === 0)) {
                            addHotel();
                        }
                    }}
                    className="w-5 h-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500" 
                 />
                 <span className="font-medium text-gray-700">Já tenho hospedagem(s) reservada(s)</span>
              </label>
           </div>
           
           {showHotelInput && (
              <div className="space-y-4 animate-fade-in">
                  {(preferences.prebookedAccommodation || []).map((hotel, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 relative">
                          <button 
                            onClick={() => removeHotel(idx)}
                            className="absolute top-2 right-2 text-red-400 hover:text-red-600 font-bold"
                            title="Remover Hotel"
                          >
                            ✕
                          </button>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-6">
                              <div className="col-span-1 md:col-span-2">
                                  <label className="text-xs text-gray-500 block">Nome do Hotel/Local</label>
                                  <input 
                                    type="text" 
                                    value={hotel.name}
                                    onChange={(e) => updateHotel(idx, 'name', e.target.value)}
                                    className="w-full border-b border-gray-300 focus:border-teal-500 outline-none py-1 text-sm font-medium"
                                    placeholder="Ex: Hotel Atlântico"
                                  />
                                  {errors[`hotel_${idx}`] && <p className="text-red-500 text-xs">{errors[`hotel_${idx}`]}</p>}
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500 block">Check-in</label>
                                  <input 
                                    type="date" 
                                    value={hotel.checkIn}
                                    onChange={(e) => updateHotel(idx, 'checkIn', e.target.value)}
                                    className="w-full border-b border-gray-300 focus:border-teal-500 outline-none py-1 text-sm"
                                  />
                                  {errors[`hotel_ci_${idx}`] && <p className="text-red-500 text-xs">{errors[`hotel_ci_${idx}`]}</p>}
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500 block">Check-out</label>
                                  <input 
                                    type="date" 
                                    value={hotel.checkOut}
                                    onChange={(e) => updateHotel(idx, 'checkOut', e.target.value)}
                                    className="w-full border-b border-gray-300 focus:border-teal-500 outline-none py-1 text-sm"
                                  />
                                  {errors[`hotel_co_${idx}`] && <p className="text-red-500 text-xs">{errors[`hotel_co_${idx}`]}</p>}
                              </div>
                          </div>
                      </div>
                  ))}
                  
                  <button 
                    onClick={addHotel}
                    className="text-sm text-teal-600 font-bold hover:underline flex items-center gap-1"
                  >
                    + Adicionar outro hotel/período
                  </button>
              </div>
           )}
        </div>

        {/* Travelers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Viajantes</label>
          <div className="flex items-center space-x-3">
             <button 
                onClick={() => onUpdate({ travelers: Math.max(1, preferences.travelers - 1) })}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold"
             >-</button>
             <span className="text-xl font-semibold w-8 text-center">{preferences.travelers}</span>
             <button 
                onClick={() => onUpdate({ travelers: preferences.travelers + 1 })}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold"
             >+</button>
          </div>
        </div>

        {/* Budget */}
        <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Orçamento</label>
           <select
            value={preferences.budget}
            onChange={(e) => onUpdate({ budget: e.target.value as BudgetLevel })}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
           >
             <option value="low">💰 Econômico (Baixo)</option>
             <option value="medium">💰💰 Confortável (Médio)</option>
             <option value="high">💰💰💰 Luxo (Alto)</option>
           </select>
        </div>

        {/* Transport */}
        <div className="col-span-1 md:col-span-2">
           <label className="block text-sm font-medium text-gray-700 mb-2">Transporte Preferido</label>
           <div className="flex gap-4">
              {(['plane', 'car', 'bus'] as TransportType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => onUpdate({ transport: type })}
                  className={`flex-1 py-3 px-2 rounded-lg border font-medium text-sm transition-all ${
                    preferences.transport === type
                      ? 'bg-teal-50 border-teal-500 text-teal-700 ring-1 ring-teal-500'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {type === 'plane' && '✈️ Avião'}
                  {type === 'car' && '🚗 Carro'}
                  {type === 'bus' && '🚌 Ônibus'}
                </button>
              ))}
           </div>
        </div>

      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg text-gray-500 hover:bg-gray-100 font-medium transition-colors"
        >
          Voltar
        </button>
        <button
          onClick={handleNext}
          className="px-8 py-3 rounded-lg bg-teal-600 text-white font-bold hover:bg-teal-700 shadow-lg hover:shadow-xl transition-all"
        >
          Próximo: Perfis &rarr;
        </button>
      </div>
    </div>
  );
};
