import React, { useState, useEffect, useRef } from 'react';
import { ItineraryResult, TripPreferences, SavedPlan, MarketingTip, User } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface Props {
  itinerary: ItineraryResult | SavedPlan;
  preferences: TripPreferences;
  user?: User | null;
  onSave: (itinerary: ItineraryResult) => void;
  onBackToDashboard: () => void;
  isSaved?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const ResultView: React.FC<Props> = ({ itinerary: initialItinerary, preferences, user, onSave, onBackToDashboard, isSaved }) => {
  const [activeDay, setActiveDay] = useState<number | null>(1);
  const [isEditing, setIsEditing] = useState(false);
  const [trackMode, setTrackMode] = useState(false); // Mode to input actual costs
  const [itinerary, setItinerary] = useState(initialItinerary);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Ref for PDF capture
  const contentRef = useRef<HTMLDivElement>(null);

  // Helper para calcular datas sem problemas de fuso horário
  const getTripDate = (startString: string, dayOffset: number) => {
    if (!startString) return null;
    const [y, m, d] = startString.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + dayOffset);
    return date;
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
  };

  const getWeekDay = (date: Date | null) => {
    if (!date) return '';
    const day = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date);
    return day.charAt(0).toUpperCase() + day.slice(1).replace('.', '');
  };

  const handleSave = () => {
    if (isEditing) setIsEditing(false);
    onSave(itinerary);
  };

  const handleDayFieldChange = (dayIndex: number, field: string, value: any) => {
    const newDays = [...itinerary.days];
    // @ts-ignore
    newDays[dayIndex][field] = value;
    setItinerary(prev => ({ ...prev, days: newDays }));
  };

  const handleActualCostChange = (dayIndex: number, category: 'accommodation' | 'food' | 'transport', value: string) => {
    const newDays = [...itinerary.days];
    if (!newDays[dayIndex].actualCosts) {
      newDays[dayIndex].actualCosts = {};
    }
    // @ts-ignore
    newDays[dayIndex].actualCosts[category] = parseFloat(value) || 0;
    setItinerary(prev => ({ ...prev, days: newDays }));
  };

  const handleActivityActualCostChange = (dayIndex: number, actIndex: number, value: string) => {
    const newDays = [...itinerary.days];
    newDays[dayIndex].activities[actIndex].actualCost = parseFloat(value) || 0;
    setItinerary(prev => ({ ...prev, days: newDays }));
  };

  // Shared PDF Generation Logic
  const generatePdfBlob = async (): Promise<Blob | null> => {
    if (!contentRef.current) return null;

    return new Promise((resolve, reject) => {
      setIsExportingPdf(true);

      // Delay to allow React to render print styles
      setTimeout(async () => {
        try {
          const element = contentRef.current;
          if (!element) throw new Error("Elemento não encontrado");

          // SALVAR ESTILOS ORIGINAIS
          const originalStyleHeight = element.style.height;
          const originalStyleOverflow = element.style.overflow;
          const originalBodyOverflow = document.body.style.overflow;

          // MEDIR ALTURA
          element.style.height = 'auto';
          element.style.overflow = 'visible';

          // Force width to A4 width in pixels at 96DPI approx (794px) or just let it flow?
          // We set w-[210mm] in CSS, so scrollWidth should be accurate.

          const captureHeight = element.scrollHeight; // Take full height
          element.style.height = `${captureHeight}px`;
          document.body.style.overflow = 'visible';
          window.scrollTo(0, 0);

          const canvas = await html2canvas(element, {
            scale: 2, // High Res
            useCORS: true,
            allowTaint: false,
            backgroundColor: '#ffffff',
            // width: element.scrollWidth, // Let it detect
            // height: captureHeight,
            ignoreElements: (node) => node.hasAttribute('data-html2canvas-ignore'),
            onclone: (clonedDoc) => {
              const clonedElement = clonedDoc.getElementById('result-view-container');
              if (clonedElement) {
                clonedElement.style.height = 'auto'; // Let it flow naturally to capture all
                clonedElement.style.overflow = 'visible';

                // CRITICAL: Strip Shadows/Gradients for Print
                const allElements = clonedElement.querySelectorAll('*');
                allElements.forEach((el) => {
                  const hEle = el as HTMLElement;
                  hEle.style.boxShadow = 'none';
                  hEle.style.textShadow = 'none';
                  hEle.style.filter = 'none';
                  hEle.style.backdropFilter = 'none';
                  hEle.style.backgroundImage = 'none';

                  // Fix OKLCH colors
                  const computed = window.getComputedStyle(hEle);
                  if (computed.backgroundColor && computed.backgroundColor.includes('oklch')) {
                    hEle.style.backgroundColor = '#ffffff';
                  }
                  if (computed.color && computed.color.includes('oklch')) {
                    hEle.style.color = '#000000';
                  }
                  if (computed.borderColor && computed.borderColor.includes('oklch')) {
                    hEle.style.borderColor = '#cccccc';
                  }
                });
              }
            }
          });

          // RESTAURAR
          element.style.height = originalStyleHeight;
          element.style.overflow = originalStyleOverflow;
          document.body.style.overflow = originalBodyOverflow;

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pageWidth = 210;
          const pageHeight = 297;

          // Adjusted Margins for new Layout (20mm top/bottom)
          const topMargin = 20;
          const bottomMargin = 20;
          const contentHeight = pageHeight - topMargin - bottomMargin; // 257mm

          const imgHeight = (canvas.height * pageWidth) / canvas.width;

          let heightLeft = imgHeight;
          let position = 0;
          let page = 1;

          const addHeaderFooter = (pageNum: number) => {
            // White Background for Margins
            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, 0, pageWidth, topMargin, 'F');
            pdf.rect(0, pageHeight - bottomMargin, pageWidth, bottomMargin, 'F');

            // Header (Only small logo/text)
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.setFont("helvetica", "bold");
            pdf.text("PLANO DE FUGA // CONFIDENTIAL", 10, 12);
            pdf.setDrawColor(200, 200, 200);
            pdf.line(10, 15, pageWidth - 10, 15);

            // Footer
            const userName = user?.username || 'Viajante';
            const footerY = pageHeight - 10;
            pdf.line(10, pageHeight - 15, pageWidth - 10, pageHeight - 15);
            pdf.text(`Agente: ${userName.toUpperCase()}`, 10, footerY);
            pdf.text(`Página ${pageNum}`, pageWidth - 10, footerY, { align: 'right' });
          };

          while (heightLeft > 0) {
            if (page > 1) pdf.addPage();

            // Put image at negative position to scroll through it
            // We start rendering content at topMargin
            const yOffset = topMargin - position;

            pdf.addImage(imgData, 'JPEG', 0, yOffset, pageWidth, imgHeight);

            // Overlay Header/Footer
            addHeaderFooter(page);

            heightLeft -= contentHeight;
            position += contentHeight;
            page++;
          }

          const blob = pdf.output('blob');
          resolve(blob);

        } catch (err) {
          reject(err);
        } finally {
          setIsExportingPdf(false);
        }
      }, 800); // 800ms delay for safety
    });
  };

  const handleExportPdf = async () => {
    if (user?.subscriptionTier !== 'premium') {
      alert("🔒 Recurso Premium\n\nA exportação para PDF é exclusiva para membros Premium.\nAtualize seu plano para desbloquear!");
      return;
    }
    try {
      const blob = await generatePdfBlob();
      if (blob) {
        const cleanTitle = itinerary.destinationTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Plano_Fuga_${cleanTitle}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao exportar PDF.");
    }
  };

  const sharePlan = async () => {
    if (user?.subscriptionTier !== 'premium') {
      alert("🔒 Recurso Premium\n\nCompartilhar o roteiro é exclusivo para membros Premium.\nAtualize seu plano para desbloquear!");
      return;
    }

    if (!isSaved || !itinerary['id']) {
      alert("Salve o roteiro primeiro para compartilhar!");
      return;
    }

    try {
      const planId = itinerary['id'];

      // Ensure Public
      // @ts-ignore
      if (!itinerary.isPublic) {
        const confirm = window.confirm("Para compartilhar, este roteiro ficará acessível para quem tiver o link.\nDeseja torná-lo público?");
        if (!confirm) return;
        await import('../services/plansService').then(m => m.plansService.setPublic(planId, true));
        // Update local state assumption
        // @ts-ignore
        itinerary.isPublic = true;
      }

      const shareUrl = `${window.location.origin}/?planId=${planId}`;

      // Fallback para link
      if (navigator.share) {
        await navigator.share({
          title: 'Plano de Fuga',
          text: `Confira meu plano: ${shareUrl}`,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copiado! Envie para seus amigos.");
      }

    } catch (err) {
      console.error("Erro ao compartilhar:", err);
      // Fallback silencioso para link se falhar o PDF
      try {
        const shareUrl = `${window.location.origin}/?planId=${itinerary['id']}`;
        await navigator.clipboard.writeText(shareUrl);
        alert("Link copiado! (Erro ao abrir menu de compartilhamento)");
      } catch (e) {
        alert("Erro ao compartilhar.");
      }
    }
  };

  // Helper seguro para somas (evita [object Object])
  const safeSum = (a: any, b: any) => {
    const numA = parseFloat(a) || 0;
    const numB = parseFloat(b) || 0;
    return numA + numB;
  };

  // Calculations for Summary
  const calculateTotalActual = () => {
    return itinerary.days.reduce((total, day) => {
      const dayAcc = safeSum(0, day.actualCosts?.accommodation);
      const dayFood = safeSum(0, day.actualCosts?.food);
      const dayTrans = safeSum(0, day.actualCosts?.transport);
      const dayActs = day.activities.reduce((sum, act) => safeSum(sum, act.actualCost), 0);
      return total + dayAcc + dayFood + dayTrans + dayActs;
    }, 0);
  };

  // Cálculo específico seguro para a tabela
  const calculateActivitiesActualTotal = () => {
    return itinerary.days.reduce((acc, d) => {
      const dailyActs = d.activities.reduce((s, a) => safeSum(s, a.actualCost), 0);
      return safeSum(acc, dailyActs);
    }, 0);
  };

  const totalActual = calculateTotalActual();
  const totalPlanned = itinerary.costBreakdown.total;
  const daysCount = itinerary.days.length;

  const avgDailyAccommodation = itinerary.costBreakdown.accommodation / daysCount;
  const avgDailyFood = itinerary.costBreakdown.food / daysCount;
  const avgDailyTransport = itinerary.costBreakdown.transport / daysCount;

  const dailyAveragePlanned = totalPlanned / daysCount;
  const dailyAverageActual = totalActual / daysCount;

  const costData = [
    { name: 'Hospedagem', value: itinerary.costBreakdown.accommodation },
    { name: 'Alimentação', value: itinerary.costBreakdown.food },
    { name: 'Passeios', value: itinerary.costBreakdown.activities },
    { name: 'Transporte', value: itinerary.costBreakdown.transport },
  ];

  const renderTip = (tip: MarketingTip, context: 'logistics' | 'premium') => {
    const isPremium = context === 'premium';
    return (
      <div className={`mt-4 mb-2 p-4 rounded-lg border-l-4 shadow-sm ${!isExportingPdf && 'animate-fade-in'} ${isPremium ? 'bg-indigo-50 border-indigo-500' : 'bg-amber-50 border-amber-500'}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{isPremium ? '💎' : '💡'}</span>
          <div>
            <h4 className={`font-bold text-sm uppercase mb-1 ${isPremium ? 'text-indigo-800' : 'text-amber-800'}`}>
              {isPremium ? 'Dica Premium / Guia Exclusivo' : 'Dica de Logística'}
            </h4>
            <p className="text-sm text-gray-700 font-medium mb-1">{tip.title}</p>
            <p className="text-sm text-gray-600 mb-3">{tip.description}</p>
            <a
              href={tip.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-block px-4 py-2 rounded text-xs font-bold text-white transition-colors ${isPremium ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-amber-600 hover:bg-amber-700'}`}
            >
              {tip.ctaText} &rarr;
            </a>
            <p className="text-[10px] text-gray-400 mt-2 italic">Sugerido pois: {tip.contextTrigger}</p>
          </div>
        </div>
      </div>
    );
  };

  // --- STYLES LOGIC FOR PDF vs SCREEN ---
  const containerClass = isExportingPdf
    ? "w-[210mm] bg-white px-8 pt-4 pb-16 text-black mx-auto overflow-visible"
    : "w-full max-w-6xl mx-auto pb-32 md:pb-20 animate-fade-in px-2 md:px-0";

  const headerClass = isExportingPdf
    ? "bg-white border-b-4 border-[#0d9488] mb-2 pb-2 text-black shadow-none ring-0"
    : `bg-[rgba(255,255,255,0.95)] backdrop-blur rounded-3xl overflow-hidden shadow-2xl mb-8 relative group ${trackMode ? 'bg-gradient-to-r from-orange-500 to-red-600' : 'bg-gradient-to-r from-teal-600 to-blue-600'}`;

  const headerTitleColor = isExportingPdf ? "text-[#134e4a]" : "text-white";
  const headerDescColor = isExportingPdf ? "text-[#374151]" : "text-[rgba(255,255,255,0.9)]"; // Hex equivalents
  const headerBadgeStyle = isExportingPdf
    ? "bg-[#f3f4f6] text-[#1f2937] border border-[#d1d5db]"
    : "bg-[rgba(255,255,255,0.2)] text-white backdrop-blur-sm";

  // --- PDF EXPORT RENDER MODE (Strict Pagination) ---
  if (isExportingPdf) {
    const PDF_H = '257mm';

    return (
      <div ref={contentRef} id="result-view-container" className="w-[210mm] bg-white text-black mx-auto relative font-sans">
        {/* Loading Overlay (Ignored by Capture) */}
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50 text-white font-bold text-2xl" data-html2canvas-ignore>
          🚀 Preparando Dossiê Secreto...
        </div>

        {/* PAGE 1: COVER */}
        <div style={{ height: PDF_H, overflow: 'hidden' }} className="flex flex-col items-center justify-center p-12 bg-[#f0f0f0] relative border-b border-gray-100">
          <div className="absolute top-10 right-10 border-4 border-red-700 text-red-700 font-black text-2xl px-4 py-2 rotate-[-15deg] opacity-80">
            TOP SECRET
          </div>
          <div className="text-center space-y-8">
            <h1 className="text-6xl font-black tracking-widest text-black border-b-8 border-black pb-4">PLANO DE FUGA</h1>
            <div className="text-left w-full max-w-lg space-y-4 font-mono text-lg mt-8">
              <div className="flex justify-between border-b border-gray-400 pb-1">
                <span className="font-bold">AGENTE:</span><span>{user?.fullName?.toUpperCase() || 'CLASSIFIED'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-400 pb-1">
                <span className="font-bold">CÓDIGO:</span><span>{user?.username?.toUpperCase() || 'UNKNOWN'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-400 pb-1">
                <span className="font-bold">MISSÃO:</span><span>{itinerary.destinationTitle.toUpperCase()}</span>
              </div>
              <div className="flex justify-between border-b border-gray-400 pb-1">
                <span className="font-bold">DATA:</span><span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="absolute bottom-10 text-xs font-mono">GENERATED BY INTELLIGENCE CORE V1.0</div>
        </div>

        {/* PAGE 2: SUMMARY & SCHEDULE */}
        <div style={{ height: PDF_H, overflow: 'hidden' }} className="p-12 relative border-b border-gray-100">
          <h1 className="text-4xl font-black text-teal-900 mb-2">{itinerary.destinationTitle}</h1>
          <p className="text-lg text-gray-600 mb-4">{itinerary.destinationDescription}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {preferences.selectedProfiles.map(p => (
              <span key={p} className="bg-gray-100 text-gray-800 border border-gray-300 px-3 py-1 rounded-full text-xs uppercase font-bold">
                {p}
              </span>
            ))}
          </div>

          <div className="mb-8 border-l-4 border-teal-500 pl-4 bg-gray-50 p-4 rounded-r-lg">
            <h3 className="font-bold text-gray-900 mb-1">Por que este destino?</h3>
            <p className="text-sm text-gray-700 italic">{itinerary.justification}</p>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 border-b-2 border-gray-200 pb-2 mb-4">🗓️ Cronograma da Missão</h2>
            <table className="w-full text-sm text-left border-collapse text-gray-700">
              <thead>
                <tr className="bg-gray-200 text-gray-800">
                  <th className="p-2 border border-gray-300 w-12 text-center">Dia</th>
                  <th className="p-2 border border-gray-300 w-24 text-center">Data</th>
                  <th className="p-2 border border-gray-300">Tema / Foco</th>
                  <th className="p-2 border border-gray-300">Base</th>
                </tr>
              </thead>
              <tbody>
                {itinerary.days.map((day, idx) => {
                  const date = getTripDate(preferences.startDate, day.day - 1);
                  return (
                    <tr key={day.day} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="p-2 border border-gray-300 text-center font-bold">{day.day}</td>
                      <td className="p-2 border border-gray-300 text-center">{formatDate(date)}</td>
                      <td className="p-2 border border-gray-300 font-medium">{day.theme}</td>
                      <td className="p-2 border border-gray-300">{day.locationBase}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGE 3+: DAYS DETAIL (One per Page) */}
        {itinerary.days.map((day) => {
          const date = getTripDate(preferences.startDate, day.day - 1);
          return (
            <div key={day.day} style={{ height: PDF_H, overflow: 'hidden' }} className="p-10 relative border-b border-gray-100 flex flex-col">
              <div className="flex items-center justify-between border-b-4 border-teal-600 pb-4 mb-6">
                <div>
                  <h2 className="text-5xl font-black text-teal-800">DIA {day.day}</h2>
                  <p className="text-xl text-gray-500 font-medium uppercase mt-1">{getWeekDay(date)} - {formatDate(date)}</p>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-bold text-gray-400 uppercase">Tema</span>
                  <span className="block text-xl font-bold text-gray-800">{day.theme}</span>
                </div>
              </div>

              {/* Logistics Tip */}
              {day.logisticsTip && (
                <div className="mb-6 bg-amber-50 border-l-4 border-amber-500 p-3 rounded-r">
                  <span className="font-bold text-amber-800 text-xs uppercase block">💡 Dica Logística</span>
                  <p className="text-sm text-gray-800 font-medium">{day.logisticsTip.title}</p>
                  <p className="text-xs text-gray-600">{day.logisticsTip.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div><span className="font-bold text-xs uppercase text-gray-500 block">📍 Base</span><span className="font-bold text-gray-900">{day.locationBase}</span></div>
                <div><span className="font-bold text-xs uppercase text-gray-500 block">🏨 Hospedagem</span><span className="font-bold text-gray-900">{day.accommodation}</span></div>
              </div>

              {/* Activities */}
              <div className="flex-1 space-y-4">
                <h3 className="font-bold text-gray-900 text-lg border-b border-gray-200 pb-1">Atividades Principais</h3>
                {day.activities.map((act, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="text-teal-700 font-bold w-12 pt-1">{act.time}</div>
                    <div className="flex-1 pb-3 border-b border-dashed border-gray-200 last:border-0">
                      <h4 className="font-bold text-gray-900">{act.title}</h4>
                      <p className="text-sm text-gray-600 leading-snug">{act.description}</p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500 font-medium">
                        <span>📍 {act.location}</span>
                        <span>💰 {act.estimatedCost} {itinerary.costBreakdown.currency}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* FINAL PAGE: FINANCIALS & CONCLUSIONS */}
        <div style={{ height: PDF_H, overflow: 'hidden' }} className="p-12 relative">
          <h2 className="text-3xl font-black text-gray-900 mb-8 border-b-4 border-teal-600 pb-2">Relatório Financeiro</h2>

          <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Estimativa Total</h3>
              <div className="text-5xl font-black text-teal-700 mb-2">{Math.round(totalPlanned).toLocaleString()} {itinerary.costBreakdown.currency}</div>
              <p className="text-gray-500 text-sm">Baseado em custos médios para {preferences.travelers} viajante(s).</p>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-gray-200 pb-2"><span className="text-gray-600">Hospedagem</span><span className="font-bold">{itinerary.costBreakdown.accommodation}</span></div>
              <div className="flex justify-between border-b border-gray-200 pb-2"><span className="text-gray-600">Alimentação</span><span className="font-bold">{itinerary.costBreakdown.food}</span></div>
              <div className="flex justify-between border-b border-gray-200 pb-2"><span className="text-gray-600">Transporte</span><span className="font-bold">{itinerary.costBreakdown.transport}</span></div>
              <div className="flex justify-between border-b border-gray-200 pb-2"><span className="text-gray-600">Passeios</span><span className="font-bold">{itinerary.costBreakdown.activities}</span></div>
            </div>
          </div>

          <h3 className="text-xl font-bold text-gray-900 mb-4">Sugestões de Hospedagem</h3>
          <div className="grid grid-cols-1 gap-4">
            {itinerary.hotelSuggestions.map((h, i) => (
              <div key={i} className="border border-gray-300 p-4 rounded-lg flex justify-between">
                <div>
                  <h4 className="font-bold text-gray-900">{h.name}</h4>
                  <p className="text-sm text-gray-600">{h.description}</p>
                </div>
                <div className="text-right">
                  <span className="bg-gray-100 text-xs px-2 py-1 rounded border border-gray-300 block mb-1">{h.category}</span>
                  <span className="text-teal-600 font-bold text-sm">{h.priceRange}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-12 text-center opacity-50 text-sm">
            <p>Fim do Dossiê. Boa viagem, Agente.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={contentRef} className={containerClass} id="result-view-container">
      {/* --- CONFIDENTIAL COVER PAGE (PDF ONLY) --- */}
      {isExportingPdf && (
        <div className="w-full h-[290mm] flex flex-col items-center justify-center border-4 border-black mb-8 p-12 bg-[#f0f0f0] relative break-after-page">
          {/* Stamp */}
          <div className="absolute top-10 right-10 border-4 border-red-700 text-red-700 font-black text-2xl px-4 py-2 rotate-[-15deg] opacity-80">
            TOP SECRET
          </div>

          <div className="text-center space-y-8">
            <h1 className="text-6xl font-black tracking-widest text-black border-b-8 border-black pb-4">
              PLANO DE FUGA
            </h1>

            <div className="w-full h-1 bg-black"></div>

            <div className="text-left w-full max-w-lg space-y-4 font-mono text-lg">
              <div className="flex justify-between border-b border-gray-400 pb-1">
                <span className="font-bold">AGENTE:</span>
                <span>{user?.fullName?.toUpperCase() || 'CLASSIFIED'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-400 pb-1">
                <span className="font-bold">CÓDIGO:</span>
                <span>{user?.username?.toUpperCase() || 'UNKNOWN'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-400 pb-1">
                <span className="font-bold">MISSÃO:</span>
                <span>{itinerary.destinationTitle.toUpperCase()}</span>
              </div>
              <div className="flex justify-between border-b border-gray-400 pb-1">
                <span className="font-bold">DATA:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <div className="mt-20 border-2 border-black p-8 max-w-md">
              <p className="font-bold text-sm text-center uppercase mb-2">Aviso de Confidencialidade</p>
              <p className="text-xs text-justify leading-tight">
                Este documento contém informações operacionais sensíveis. A divulgação não autorizada pode resultar em cancelamento permanente de privilégios de fuga. Após leitura, saboreie a viagem.
              </p>
            </div>
          </div>

          <div className="absolute bottom-10 text-xs font-mono">
            GENERATED BY INTELLIGENCE CORE V1.0
          </div>
        </div>
      )}

      {/* Header */}
      <div className={headerClass}>
        <div className={`p-6 md:p-8 relative ${isExportingPdf ? 'p-0' : ''}`}>
          {!isExportingPdf && (
            <div className="absolute top-0 right-0 p-4 opacity-10 text-7xl md:text-9xl pointer-events-none">
              {trackMode ? '💸' : '🗺️'}
            </div>
          )}

          {/* Compact Font for PDF */}
          <h1 className={`${isExportingPdf ? 'text-4xl' : 'text-3xl md:text-5xl'} font-black mb-2 ${headerTitleColor}`}>{itinerary.destinationTitle}</h1>
          <p className={`${isExportingPdf ? 'text-lg' : 'text-lg md:text-2xl'} font-light ${headerDescColor}`}>{itinerary.destinationDescription}</p>

          <div className={`flex flex-wrap gap-2 ${isExportingPdf ? 'mt-2' : 'mt-4'}`}>
            {preferences.selectedProfiles.map(p => (
              <span key={p} className={`${headerBadgeStyle} px-3 py-1 rounded-full text-xs md:text-sm`}>
                {p.toUpperCase()}
              </span>
            ))}
          </div>

          {trackMode && !isExportingPdf && (
            <div className="mt-4 bg-white/20 inline-block px-4 py-2 rounded-lg backdrop-blur border border-white/30 animate-pulse text-white">
              <span className="font-bold">⚠️ Modo de Lançamento de Gastos Ativo</span>
            </div>
          )}

          {/* ACTIONS BAR - Moved to Header */}
          {!isExportingPdf && (
            <div className="mt-6 flex flex-wrap gap-3" data-html2canvas-ignore>
              <button
                onClick={handleSave}
                className={`px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all flex items-center gap-2 ${isEditing || trackMode ? 'bg-green-500 hover:bg-green-600 text-white animate-pulse' : 'bg-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.3)] text-white border border-[rgba(255,255,255,0.4)] backdrop-blur-md'}`}
              >
                {isEditing || trackMode ? '💾 Salvar' : (isSaved ? '✅ Salvo' : '💾 Salvar')}
              </button>
              <button
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-4 py-2 rounded-lg font-bold text-sm bg-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.3)] text-white border border-[rgba(255,255,255,0.4)] backdrop-blur-md shadow-lg transition-all flex items-center gap-2"
              >
                {isExportingPdf ? '📄 Gerando...' : '📄 PDF'}
              </button>
              <button
                onClick={sharePlan}
                className="px-4 py-2 rounded-lg font-bold text-sm bg-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.3)] text-white border border-[rgba(255,255,255,0.4)] backdrop-blur-md shadow-lg transition-all flex items-center gap-2"
              >
                📤 Compartilhar
              </button>
              <button
                onClick={onBackToDashboard}
                className="px-4 py-2 rounded-lg font-bold text-sm bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.9)] border border-[rgba(255,255,255,0.2)] backdrop-blur-md transition-all flex items-center gap-2"
              >
                🏠 Voltar
              </button>
            </div>
          )}
        </div>

        <div className={`p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${isExportingPdf ? 'p-0 mt-2' : ''}`}>
          <div>
            <h3 className={`text-lg font-bold ${isExportingPdf ? 'mb-1' : 'mb-2'} ${isExportingPdf ? 'text-black' : 'text-gray-700'}`}>Por que este destino?</h3>
            <p className={`${isExportingPdf ? 'text-gray-900' : 'text-gray-600'} italic border-l-4 border-[#14b8a6] pl-4 text-sm md:text-base`}>{itinerary.justification}</p>
          </div>

          <div className="hidden md:flex gap-2" data-html2canvas-ignore>
            <button
              onClick={() => { setIsEditing(!isEditing); setTrackMode(false); }}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${isEditing ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
              {isEditing ? 'Concluir Edição' : '🛠️ Editar Roteiro'}
            </button>
            <button
              onClick={() => { setTrackMode(!trackMode); setIsEditing(false); }}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition-all shadow-sm ${trackMode ? 'bg-orange-600 text-white border-orange-600 ring-2 ring-orange-300' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'}`}
            >
              {trackMode ? '👁️ Voltar ao Roteiro' : '💰 Lançar Gastos Reais'}
            </button>
          </div>
        </div>
      </div>

      {/* --- RESUMED SCHEDULE (VISIBLE ONLY IN PDF) --- */}
      {isExportingPdf && (
        <div className="mb-4 break-inside-avoid border border-[#d1d5db] rounded-lg p-3 bg-[#f9fafb]">
          <div className="flex items-center gap-2 mb-2 border-b border-[#d1d5db] pb-1">
            <span className="text-lg">🗓️</span>
            <h2 className="text-lg font-bold text-[#1f2937]">Cronograma Resumido</h2>
          </div>
          <table className="w-full text-sm text-left border-collapse text-[#374151]">
            <thead>
              <tr className="bg-[#e5e7eb] text-[#374151]">
                <th className="p-1 border border-[#d1d5db] w-12 text-center text-xs">Dia</th>
                <th className="p-1 border border-[#d1d5db] w-20 text-center text-xs">Data</th>
                <th className="p-1 border border-[#d1d5db] text-xs">Tema do Dia / Foco</th>
                <th className="p-1 border border-[#d1d5db] text-xs">Base / Local</th>
              </tr>
            </thead>
            <tbody>
              {itinerary.days.map((day, idx) => {
                const date = getTripDate(preferences.startDate, day.day - 1);
                return (
                  <tr key={day.day} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#f3f4f6]'}>
                    <td className="p-1 border border-[#d1d5db] text-center font-bold text-xs">{day.day}</td>
                    <td className="p-1 border border-[#d1d5db] text-center text-xs">{formatDate(date)}</td>
                    <td className="p-1 border border-[#d1d5db] font-medium text-xs">{day.theme}</td>
                    <td className="p-1 border border-[#d1d5db] text-xs">{day.locationBase}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Timeline Calendar - HIDDEN ON PDF */}
      {preferences.startDate && !isExportingPdf && (
        <div className="mb-8 px-1">
          <div className="flex flex-wrap gap-3 pb-4">
            {itinerary.days.map((day) => {
              const date = getTripDate(preferences.startDate, day.day - 1);
              const isActive = activeDay === day.day;

              const activitySum = day.activities.reduce((sum, act) => sum + act.estimatedCost, 0);
              const estimatedDayTotal = activitySum + avgDailyAccommodation + avgDailyFood + avgDailyTransport;

              return (
                <button
                  key={day.day}
                  onClick={() => setActiveDay(day.day)}
                  className={`flex flex-col items-start justify-between p-3 min-w-[160px] h-32 rounded-xl border transition-all duration-300 flex-1 text-left relative overflow-hidden ${isActive
                    ? (trackMode ? 'bg-orange-600 border-orange-600' : 'bg-teal-600 border-teal-600') + ' text-white shadow-lg scale-105 z-10'
                    : 'bg-white/90 border-white text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <div className="w-full flex justify-between items-start">
                    <div>
                      <span className={`text-[10px] uppercase font-bold block ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                        {getWeekDay(date)}
                      </span>
                      <span className="text-xl font-black leading-none">{formatDate(date)}</span>
                    </div>
                    <span className="text-[10px] opacity-80 font-bold bg-[rgba(255,255,255,0.2)] px-1.5 py-0.5 rounded">Dia {day.day}</span>
                  </div>

                  <div className="w-full mt-2">
                    <div className="flex items-center gap-1 text-[10px] opacity-90 mb-1 truncate">
                      <span>📍</span>
                      <span className="font-bold truncate">{day.locationBase}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] opacity-80 truncate">
                      <span>🏨</span>
                      <span className="truncate max-w-[120px]">{day.accommodation}</span>
                    </div>
                  </div>

                  <div className={`mt-auto w-full pt-2 border-t ${isActive ? 'border-[rgba(255,255,255,0.3)]' : 'border-gray-100'}`}>
                    <div className="text-[10px] flex justify-between items-center">
                      <span>Estimado:</span>
                      <span className="font-bold">{Math.round(estimatedDayTotal).toLocaleString()} {itinerary.costBreakdown.currency}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 ${isExportingPdf ? 'grid-cols-1' : 'lg:grid-cols-3'} gap-6 md:gap-8`}>

        <div className={isExportingPdf ? 'w-full' : 'col-span-1 md:col-span-3 space-y-4 md:space-y-6'}>
          <h2 className={`text-xl md:text-2xl font-bold flex items-center px-1 mb-4 ${isExportingPdf ? 'text-black border-b border-[#d1d5db] pb-2' : 'text-gray-900'}`}>
            {trackMode ? '💸 Lançamentos do Dia' : '📅 Roteiro Dia a Dia Detalhado'}
          </h2>

          <div className="space-y-3 md:space-y-4">
            {itinerary.days.map((day, dayIndex) => {
              const date = getTripDate(preferences.startDate, day.day - 1);
              const isExpanded = isExportingPdf ? true : activeDay === day.day;

              const dayCardClass = isExportingPdf
                ? "border border-[#9ca3af] rounded-lg mb-4 bg-white break-inside-avoid shadow-none"
                : `bg-[rgba(255,255,255,0.95)] backdrop-blur rounded-xl shadow-md overflow-hidden border transition-all duration-300 ${isExpanded ? (trackMode ? 'border-orange-500 ring-1 ring-orange-500' : 'border-teal-500 ring-1 ring-teal-500') : 'border-gray-100'}`;

              const dayHeaderClass = isExportingPdf
                ? "w-full text-left p-4 flex justify-between items-center bg-[#f9fafb] border-b border-[#e5e7eb]"
                : `w-full text-left p-4 md:p-5 flex justify-between items-center transition-colors ${isExpanded ? (trackMode ? 'bg-orange-50' : 'bg-teal-50') : 'bg-white hover:bg-gray-50'}`;

              return (
                <div key={day.day} className={dayCardClass}>
                  <button
                    onClick={() => !isExportingPdf && setActiveDay(activeDay === day.day ? null : day.day)}
                    className={dayHeaderClass}
                    style={{ cursor: isExportingPdf ? 'default' : 'pointer' }}
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={`${isExportingPdf ? 'bg-teal-800 text-white' : (trackMode ? 'bg-orange-100 text-orange-800' : 'bg-teal-100 text-teal-800')} font-bold px-2 py-1 md:px-3 rounded-lg text-sm text-center min-w-[50px] md:min-w-[60px]`}>
                        <span className="block text-[10px] md:text-xs uppercase">{getWeekDay(date)}</span>
                        <span className="block text-base md:text-lg">{formatDate(date)}</span>
                      </div>
                      <div>
                        <span className={`font-bold ${isExportingPdf ? 'text-black' : (trackMode ? 'text-orange-600' : 'text-teal-600')} text-xs md:text-sm block`}>DIA {day.day}</span>
                        <span className={`font-medium ${isExportingPdf ? 'text-black whitespace-normal leading-relaxed py-0.5 block' : 'text-gray-800 line-clamp-1'} text-base md:text-lg`}>{day.theme}</span>
                      </div>
                    </div>
                    {!isExportingPdf && (
                      <span className="text-gray-400 transform transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        ▼
                      </span>
                    )}
                  </button>

                  {isExpanded && (
                    <div className={`p-4 md:p-5 border-t border-gray-100 bg-white ${!isExportingPdf && 'animate-fade-in'}`}>
                      {day.logisticsTip && renderTip(day.logisticsTip, 'logistics')}
                      {/* Location & Hotel Section */}
                      <div className={`mb-6 p-3 md:p-4 rounded-lg border ${isExportingPdf ? 'bg-gray-50 border-gray-300' : 'bg-blue-50 border-blue-100'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                          <div>
                            <label className={`text-xs font-bold uppercase block mb-1 ${isExportingPdf ? 'text-black' : 'text-blue-800'}`}>📍 Base da Estada</label>
                            {isEditing ? (
                              <input
                                type="text"
                                value={day.locationBase || ''}
                                onChange={(e) => handleDayFieldChange(dayIndex, 'locationBase', e.target.value)}
                                className="w-full text-sm p-2 rounded border border-blue-200"
                              />
                            ) : (
                              <span className="text-sm text-gray-900 font-bold">{day.locationBase || 'Não definido'}</span>
                            )}
                          </div>
                          <div>
                            <label className={`text-xs font-bold uppercase block mb-1 ${isExportingPdf ? 'text-black' : 'text-blue-800'}`}>🏨 Hospedagem</label>
                            {isEditing ? (
                              <div className="flex flex-col gap-2">
                                <select
                                  className="w-full text-sm p-2 rounded border border-blue-200"
                                  onChange={(e) => {
                                    if (e.target.value !== 'other') handleDayFieldChange(dayIndex, 'accommodation', e.target.value);
                                  }}
                                  defaultValue=""
                                >
                                  <option value="" disabled>Selecione...</option>
                                  {itinerary.hotelSuggestions.map(h => (
                                    <option key={h.name} value={h.name}>{h.name}</option>
                                  ))}
                                  <option value="other">Outro</option>
                                </select>
                                <input
                                  type="text"
                                  value={day.accommodation || ''}
                                  onChange={(e) => handleDayFieldChange(dayIndex, 'accommodation', e.target.value)}
                                  placeholder="Ou digite o nome"
                                  className="w-full text-sm p-2 rounded border border-blue-200"
                                />
                              </div>
                            ) : (
                              <span className="text-sm text-gray-900 font-bold">{day.accommodation || 'A definir'}</span>
                            )}
                          </div>
                        </div>

                        {trackMode && (
                          <div className="mt-3 pt-3 border-t border-blue-200 animate-fade-in">
                            <label className="text-xs font-bold text-orange-600 uppercase block mb-1">💵 Custo Real Hospedagem (Dia)</label>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 font-bold">R$</span>
                              <input
                                type="number"
                                placeholder="0.00"
                                value={day.actualCosts?.accommodation || ''}
                                onChange={(e) => handleActualCostChange(dayIndex, 'accommodation', e.target.value)}
                                className="w-full md:w-1/2 text-lg font-bold p-2 rounded border border-orange-300 bg-white text-orange-900 focus:ring-orange-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="relative border-l-2 border-teal-200 ml-3 space-y-6 pl-6 py-2">
                        {day.activities.map((act, idx) => (
                          <div key={idx} className="relative group break-inside-avoid">
                            <div className="absolute -left-[31px] bg-teal-500 h-4 w-4 rounded-full border-2 border-white"></div>

                            {isEditing ? (
                              <div className="bg-gray-50 p-3 rounded border border-gray-200 space-y-2">
                                <input className="w-full text-xs font-bold text-teal-600" value={act.time} onChange={(e) => {
                                  const newDays = [...itinerary.days];
                                  newDays[dayIndex].activities[idx].time = e.target.value;
                                  setItinerary({ ...itinerary, days: newDays });
                                }} />
                                <input className="w-full font-bold text-gray-800" value={act.title} onChange={(e) => {
                                  const newDays = [...itinerary.days];
                                  newDays[dayIndex].activities[idx].title = e.target.value;
                                  setItinerary({ ...itinerary, days: newDays });
                                }} />
                              </div>
                            ) : (
                              <div className="md:flex md:justify-between md:items-start">
                                <div>
                                  <span className={`text-sm font-bold block mb-1 ${isExportingPdf ? 'text-black' : 'text-teal-600'}`}>{act.time}</span>
                                  <h4 className={`font-bold text-lg ${isExportingPdf ? 'text-black leading-relaxed' : 'text-gray-800'}`}>{act.title}</h4>
                                  <p className={`text-sm mb-2 ${isExportingPdf ? 'text-black' : 'text-gray-600'}`}>{act.description}</p>
                                  <div className={`flex flex-col md:flex-row gap-2 md:items-center text-xs ${isExportingPdf ? 'text-black font-bold' : 'text-gray-500'}`}>
                                    <span className="flex items-center gap-1">
                                      <span className="text-sm">📍</span>
                                      <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(act.location + " " + itinerary.destinationTitle)}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`underline ${isExportingPdf ? 'whitespace-normal' : 'truncate max-w-[220px]'} leading-relaxed ${isExportingPdf ? 'text-black' : 'hover:text-teal-600'}`}
                                      >
                                        {act.location}
                                      </a>
                                    </span>
                                    <span>💰 Est: {act.estimatedCost} {itinerary.costBreakdown.currency}</span>
                                  </div>
                                </div>

                                {trackMode && (
                                  <div className="mt-3 md:mt-0 md:ml-4 bg-orange-50 p-2 rounded border border-orange-200 min-w-[120px]">
                                    <label className="text-[10px] text-orange-600 font-bold block mb-1">Gasto Real Atividade</label>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-400">R$</span>
                                      <input
                                        type="number"
                                        placeholder="0.00"
                                        value={act.actualCost || ''}
                                        onChange={(e) => handleActivityActualCostChange(dayIndex, idx, e.target.value)}
                                        className="w-full text-sm bg-white border border-orange-200 rounded px-1 py-1 font-bold text-gray-800"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className={`${isExportingPdf ? 'border border-gray-400 p-4 rounded-lg mt-4 break-inside-avoid' : 'bg-[rgba(255,255,255,0.95)] backdrop-blur rounded-xl shadow-md p-6'}`}>
            <h3 className={`font-bold mb-4 text-lg ${isExportingPdf ? 'text-black' : 'text-gray-800'}`}>🏨 Sugestões Gerais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {itinerary.hotelSuggestions.map((hotel, idx) => (
                <div key={idx} className={`border rounded-lg p-4 transition-colors ${isExportingPdf ? 'border-gray-400' : 'border-gray-200 hover:border-teal-300'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className={`font-bold ${isExportingPdf ? 'text-black' : 'text-gray-800'}`}>{hotel.name}</h4>
                    <span className={`text-xs px-2 py-1 rounded ${isExportingPdf ? 'bg-gray-200 text-black border border-gray-400' : 'bg-gray-100'}`}>{hotel.category}</span>
                  </div>
                  <p className={`text-sm mb-2 ${isExportingPdf ? 'text-black' : 'text-gray-500'}`}>{hotel.description}</p>
                  <p className={`text-sm font-medium ${isExportingPdf ? 'text-black' : 'text-teal-600'}`}>{hotel.priceRange}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo Financeiro ao Final */}
          <div className={`${isExportingPdf ? 'border border-gray-400 rounded-lg p-4 mt-4 break-inside-avoid' : 'bg-[rgba(255,255,255,0.95)] backdrop-blur rounded-xl shadow-lg p-6 md:p-8 border-t-4 border-teal-500'}`}>
            <h2 className={`text-2xl font-bold mb-6 text-center ${isExportingPdf ? 'text-black' : 'text-gray-800'}`}>📊 Resumo Financeiro Detalhado</h2>

            <div className="flex flex-col lg:flex-row gap-8 items-center">
              <div className="w-full lg:w-1/2 space-y-4">

                {/* Tabela de Comparação */}
                <div className="overflow-x-auto">
                  <table className={`w-full text-sm text-left ${isExportingPdf ? 'text-black' : 'text-gray-500'}`}>
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="pb-2">Categoria</th>
                        <th className="pb-2 text-right">Planejado</th>
                        <th className="pb-2 text-right text-orange-600">Realizado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="py-2">Hospedagem</td>
                        <td className="text-right font-medium">{itinerary.costBreakdown.accommodation.toLocaleString()}</td>
                        <td className="text-right font-bold text-orange-600">
                          {itinerary.days.reduce((acc, d) => safeSum(acc, d.actualCosts?.accommodation), 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Alimentação</td>
                        <td className="text-right font-medium">{itinerary.costBreakdown.food.toLocaleString()}</td>
                        <td className="text-right font-bold text-orange-600">
                          {itinerary.days.reduce((acc, d) => safeSum(acc, d.actualCosts?.food), 0).toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Passeios</td>
                        <td className="text-right font-medium">{itinerary.costBreakdown.activities.toLocaleString()}</td>
                        <td className="text-right font-bold text-orange-600">
                          {calculateActivitiesActualTotal().toLocaleString()}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">Transporte</td>
                        <td className="text-right font-medium">{itinerary.costBreakdown.transport.toLocaleString()}</td>
                        <td className="text-right font-bold text-orange-600">
                          {itinerary.days.reduce((acc, d) => safeSum(acc, d.actualCosts?.transport), 0).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td className="py-3 pl-2 font-bold">TOTAL GERAL</td>
                        <td className="py-3 text-right font-bold">{totalPlanned.toLocaleString()}</td>
                        <td className="py-3 text-right font-black text-orange-600 text-lg">{totalActual.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Resumo Diário */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className={`${isExportingPdf ? 'border border-gray-400 bg-white' : 'bg-teal-50 border border-teal-100'} p-3 rounded-lg text-center`}>
                    <span className={`text-xs uppercase font-bold block ${isExportingPdf ? 'text-black' : 'text-teal-800'}`}>Média Diária (Plan)</span>
                    <span className={`text-lg font-bold ${isExportingPdf ? 'text-black' : 'text-teal-900'}`}>{dailyAveragePlanned.toLocaleString(undefined, { maximumFractionDigits: 0 })} {itinerary.costBreakdown.currency}</span>
                  </div>
                  <div className={`${isExportingPdf ? 'border border-gray-400 bg-white' : 'bg-orange-50 border border-orange-100'} p-3 rounded-lg text-center`}>
                    <span className={`text-xs uppercase font-bold block ${isExportingPdf ? 'text-black' : 'text-orange-800'}`}>Média Diária (Real)</span>
                    <span className={`text-lg font-bold ${isExportingPdf ? 'text-black' : 'text-orange-900'}`}>{dailyAverageActual.toLocaleString(undefined, { maximumFractionDigits: 0 })} {itinerary.costBreakdown.currency}</span>
                  </div>
                </div>

              </div>

              {/* Hide charts on PDF to ensure layout simplicity, or keep if fits. Keeping for now. */}
              <div className="h-64 w-full lg:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={costData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {costData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} ${itinerary.costBreakdown.currency}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>



        {/* Separate Premium Tips to show in PDF if they exist */}
        {itinerary.premiumTips && itinerary.premiumTips.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-gray-500 text-xs font-bold uppercase mb-2">Curadoria Exclusiva</h3>
            <div className="space-y-4">
              {itinerary.premiumTips.map((tip, idx) => (
                <div key={idx} className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                  <h4 className="font-bold text-sm text-indigo-900 mb-1">{tip.title}</h4>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{tip.description}</p>
                  <a
                    href={tip.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-indigo-600 text-white text-xs font-bold py-1.5 rounded hover:bg-indigo-700 transition-colors"
                  >
                    {tip.ctaText}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>


      {/* Mobile Sticky Bottom Bar Actions */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-2xl z-50 flex gap-2 items-center justify-between pb-6" data-html2canvas-ignore>
        <button
          onClick={onBackToDashboard}
          className="flex flex-col items-center justify-center text-gray-500 text-xs w-16"
        >
          <span className="text-xl">🏠</span>
          Home
        </button>

        <button
          onClick={handleExportPdf}
          className="flex flex-col items-center justify-center text-red-500 text-xs w-16"
        >
          <span className="text-xl">📄</span>
          PDF
        </button>

        <button
          onClick={() => { setTrackMode(!trackMode); setIsEditing(false); }}
          className={`flex-1 py-3 rounded-lg font-bold text-sm shadow flex items-center justify-center gap-2 transition-colors ${trackMode ? 'bg-orange-600 text-white' : 'bg-orange-50 text-orange-700 border border-orange-200'}`}
        >
          {trackMode ? '👁️ Ver' : '💰 Gastos'}
        </button>

        <button
          onClick={handleSave}
          className={`flex-1 py-3 font-bold rounded-lg text-sm shadow flex items-center justify-center gap-2 transition-colors ${isEditing || trackMode ? 'bg-green-600 text-white animate-pulse' : 'bg-teal-600 text-white'}`}
        >
          💾 Salvar
        </button>
      </div>

    </div >
  );
};