import React from 'react';
import { SavedPlan } from '../types';

interface Props {
  plans: SavedPlan[];
  onBack: () => void;
}

export const CompareView: React.FC<Props> = ({ plans, onBack }) => {
  // Find winners for badges
  const lowestCost = Math.min(...plans.map(p => p.costBreakdown.total));
  const shortestDuration = Math.min(...plans.map(p => p.days.length));

  return (
    <div className="w-full max-w-7xl mx-auto pb-20 animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Comparador de Fugas ⚖️</h1>
        <button 
          onClick={onBack}
          className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium text-gray-700 transition-colors"
        >
          Voltar
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px] grid grid-cols-[auto_1fr] gap-4">
          
          {/* Labels Column */}
          <div className="flex flex-col gap-4 mt-[220px]"> {/* Offset for header cards */}
            <div className="h-16 flex items-center font-bold text-gray-600 border-b">Custo Total</div>
            <div className="h-16 flex items-center font-bold text-gray-600 border-b">Duração</div>
            <div className="h-24 flex items-center font-bold text-gray-600 border-b">Hospedagem (Est.)</div>
            <div className="h-32 flex items-center font-bold text-gray-600 border-b">Melhor Hotel</div>
            <div className="h-40 flex items-center font-bold text-gray-600 border-b">Vibe Principal</div>
          </div>

          {/* Plans Grid */}
          <div className={`grid gap-6`} style={{ gridTemplateColumns: `repeat(${plans.length}, minmax(300px, 1fr))` }}>
             {plans.map((plan) => (
               <div key={plan.id} className="flex flex-col gap-4">
                 
                 {/* Header Card */}
                 <div className="bg-white p-6 rounded-2xl shadow-lg border-t-4 border-teal-500 h-[220px] flex flex-col justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-2 truncate">{plan.destinationTitle}</h2>
                      <p className="text-sm text-gray-500 line-clamp-3">{plan.destinationDescription}</p>
                    </div>
                    {plan.costBreakdown.total === lowestCost && (
                      <span className="inline-block bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full self-start">
                        🏆 Melhor Preço
                      </span>
                    )}
                 </div>

                 {/* Data Rows */}
                 <div className="h-16 flex items-center bg-white px-4 rounded-lg shadow-sm border border-gray-100">
                    <span className="text-xl font-bold text-gray-800">
                      {plan.costBreakdown.total.toLocaleString()} {plan.costBreakdown.currency}
                    </span>
                 </div>

                 <div className="h-16 flex items-center bg-white px-4 rounded-lg shadow-sm border border-gray-100">
                    <span className="font-medium">
                       {plan.days.length} dias
                       {plan.days.length === shortestDuration && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Mais rápido</span>}
                    </span>
                 </div>

                 <div className="h-24 flex items-center bg-white px-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="w-full">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Hotel</span>
                        <span>{plan.costBreakdown.accommodation.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(plan.costBreakdown.accommodation / plan.costBreakdown.total) * 100}%` }}></div>
                      </div>
                    </div>
                 </div>

                 <div className="h-32 p-4 bg-white rounded-lg shadow-sm border border-gray-100 overflow-y-auto">
                    {plan.hotelSuggestions[0] ? (
                      <div>
                        <div className="font-bold text-sm">{plan.hotelSuggestions[0].name}</div>
                        <div className="text-xs text-gray-500">{plan.hotelSuggestions[0].category}</div>
                        <div className="text-xs text-teal-600 mt-1">{plan.hotelSuggestions[0].priceRange}</div>
                      </div>
                    ) : '-'}
                 </div>

                 <div className="h-40 p-4 bg-white rounded-lg shadow-sm border border-gray-100 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {plan.originalPreferences.selectedProfiles.map(p => (
                        <span key={p} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                          {p}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500 italic">"{plan.justification.substring(0, 100)}..."</p>
                 </div>

               </div>
             ))}
          </div>

        </div>
      </div>
    </div>
  );
};
