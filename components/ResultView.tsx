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
  onUpgrade?: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const ResultView: React.FC<Props> = ({ itinerary: initialItinerary, preferences, user, onSave, onBackToDashboard, isSaved, onUpgrade }) => {
  const [activeDay, setActiveDay] = useState<number | null>(1);
  const [isEditing, setIsEditing] = useState(false);
  const [trackMode, setTrackMode] = useState(false); // Mode to input actual costs
  const [itinerary, setItinerary] = useState(initialItinerary);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const getGoogleMapUrl = (day: typeof itinerary.days[0]) => {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    if (!apiKey) return null;

    if (!day.activities || day.activities.length === 0) {
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(day.locationBase + ' ' + itinerary.destinationTitle)}`;
    }
    
    if (day.activities.length === 1) {
      return `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(day.activities[0].location + ' ' + itinerary.destinationTitle)}`;
    }

    const origin = encodeURIComponent(day.activities[0].location + ' ' + itinerary.destinationTitle);
    const destination = encodeURIComponent(day.activities[day.activities.length - 1].location + ' ' + itinerary.destinationTitle);
    
    let url = `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${origin}&destination=${destination}`;
    
    if (day.activities.length > 2) {
      const waypoints = day.activities.slice(1, -1).map(act => encodeURIComponent(act.location + ' ' + itinerary.destinationTitle)).join('|');
      url += `&waypoints=${waypoints}`;
    }
    
    return url;
  };

  // Ref for PDF capture
  const contentRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  // Infographic Map Export
  const infographicRef = useRef<HTMLDivElement>(null);
  const [isExportingInfographic, setIsExportingInfographic] = useState(false);

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
            pdf.text("PLANO DE FUGA // CONFIDENCIAL", 10, 12);
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

  const handleExportInfographic = async () => {
    if (!infographicRef.current) return;
    
    if (user?.subscriptionTier !== 'premium') {
      alert("🔒 Recurso Premium\n\nA exportação para 'Mapa da Fuga' é exclusiva para membros Premium.\nAtualize seu plano para desbloquear!");
      return;
    }

    setIsExportingInfographic(true);
    try {
      const element = infographicRef.current;
      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#fdfbf7',
      });
      const link = document.createElement('a');
      link.download = `Mapa-da-Fuga-${itinerary.destinationTitle.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Erro ao gerar Mapa da Fuga:", err);
      alert("Ocorreu um erro ao gerar a imagem.");
    } finally {
      setIsExportingInfographic(false);
    }
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

  const handleDownloadEbook = () => {
    if (!itinerary.personalizedGuideText) return;
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const margin = 20;
      const textWidth = pageWidth - margin * 2;
      
      // Cover Background (Beautiful Gradient Header)
      pdf.setFillColor(15, 23, 42); // slate-900 (Dark background for top half)
      pdf.rect(0, 0, pageWidth, 60, 'F');
      
      // Draw a secondary shape for style
      pdf.setFillColor(13, 148, 136); // teal-600
      pdf.rect(0, 60, pageWidth, 5, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.setFont("helvetica", "bold");
      pdf.text("E-BOOK EXCLUSIVO", margin, 30);
      
      // Title
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(203, 213, 225); // slate-300
      pdf.text(`Curadoria Premium: ${itinerary.destinationTitle}`, margin, 45);
      
      // Body Text
      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(51, 65, 85); // slate-700
      
      const splitText = pdf.splitTextToSize(itinerary.personalizedGuideText, textWidth);
      
      // Pagination handling for long e-books
      let yOffset = 85;
      for (let i = 0; i < splitText.length; i++) {
        if (yOffset > 270) {
          pdf.addPage();
          yOffset = 20;
        }
        pdf.text(splitText[i], margin, yOffset);
        yOffset += 6; // Line height
      }

      // Footer
      const cleanTitle = itinerary.destinationTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      pdf.save(`Ebook_Curadoria_${cleanTitle}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Erro ao baixar o E-book.");
    }
  };

  const handleExportExcel = () => {
    if (user?.subscriptionTier !== 'premium') {
      alert("🔒 Recurso Premium\n\nA exportação para Excel é exclusiva para membros Premium.\nAtualize seu plano para desbloquear!");
      return;
    }

    try {
      // Create CSV content with semicolon delimiter (Portuguese standard format for Excel)
      const delimiter = ';';
      const headers = ['Dia', 'Data', 'Tema', 'Base', 'Acomodação', 'Total Estimado', 'Total Realizado'];
      const rows = itinerary.days.map(day => {
        const date = getTripDate(preferences.startDate, day.day - 1);
        const dateStr = date ? formatDate(date) : '';
        
        const activitySum = day.activities.reduce((sum, act) => sum + act.estimatedCost, 0);
        const estimatedDayTotal = activitySum + avgDailyAccommodation + avgDailyFood + avgDailyTransport;
        
        const dayAcc = safeSum(0, day.actualCosts?.accommodation);
        const dayFood = safeSum(0, day.actualCosts?.food);
        const dayTrans = safeSum(0, day.actualCosts?.transport);
        const dayActs = day.activities.reduce((sum, act) => safeSum(sum, act.actualCost), 0);
        const actualDayTotal = dayAcc + dayFood + dayTrans + dayActs;

        // Escape quotes, format numbers to use comma decimals internally to Excel BR if needed
        return [
          day.day,
          `"${dateStr}"`,
          `"${day.theme}"`,
          `"${day.locationBase}"`,
          `"${day.accommodation}"`,
          Math.round(estimatedDayTotal),
          Math.round(actualDayTotal)
        ].join(delimiter);
      });

      // \uFEFF is the UTF-8 BOM, required for Excel to read accents correctly
      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(delimiter), ...rows].join('\n');
      const encodedUri = encodeURI(csvContent);
      
      const cleanTitle = itinerary.destinationTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const a = document.createElement('a');
      a.setAttribute('href', encodedUri);
      a.setAttribute('download', `Plano_Fuga_${cleanTitle}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
    } catch (err) {
      console.error(err);
      alert("Erro ao exportar para Excel.");
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
          <div className="absolute top-10 right-10 border-4 border-red-700 text-red-700 font-black text-2xl px-4 py-2 rotate-[-15deg] opacity-80 whitespace-nowrap flex items-center justify-center">
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
                  {h.link && (
                    <a href={h.link} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-700 underline mt-1 inline-block">
                      {h.link}
                    </a>
                  )}
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
          <div className="absolute top-10 right-10 border-4 border-red-700 text-red-700 font-black text-2xl px-4 py-2 rotate-[-15deg] opacity-80 whitespace-nowrap flex items-center justify-center">
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

      {/* --- HIDDEN CONTAINER: INFOGRAPHIC MAPA DA FUGA EXPORT --- */}
      <div style={{ position: 'fixed', top: 0, left: '-9999px', width: '1920px', zIndex: -9999, pointerEvents: 'none' }}>
        <div ref={infographicRef} style={{ width: '1920px', minHeight: '1080px', backgroundColor: '#fdfbf7', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'sans-serif' }}>
          {/* Header */}
          <div style={{ padding: '60px 80px 30px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '56px', fontWeight: '900', color: '#111827', textTransform: 'uppercase', letterSpacing: '2px' }}>
               MISSÃO {itinerary.destinationTitle}: O PLANO DE FUGA PERFEITO
            </h1>
          </div>

          {/* Timeline Nodes */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 80px', position: 'relative' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '80px 40px', justifyContent: 'center', width: '100%', zIndex: 10 }}>
              {itinerary.days.map((day, idx) => (
                <div key={day.day} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px', textAlign: 'center' }}>
                  {/* Circle */}
                  <div style={{ width: '220px', height: '220px', borderRadius: '50%', backgroundColor: '#ffffff', border: '16px solid ' + (idx%2===0 ? '#f59e0b' : '#0d9488'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '90px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', marginBottom: '32px', position: 'relative', overflow: 'hidden', margin: '0 auto 32px' }}>
                     <span style={{ position: 'relative', zIndex: 10 }}>{idx%3===0 ? '🏖️' : idx%3===1 ? '🌲' : '🏺'}</span>
                     <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', backgroundColor: (idx%2===0 ? '#fef3c7' : '#ccfbf1'), zIndex: 0 }}></div>
                  </div>
                  {/* Text */}
                  <h3 style={{ fontSize: '28px', fontWeight: '900', color: '#1f2937', marginBottom: '12px', textTransform: 'uppercase' }}>DIA {day.day}: <br/><span style={{ fontSize: '22px', fontWeight: '800', color: '#0d9488' }}>{day.theme}</span></h3>
                  <p style={{ fontSize: '18px', color: '#4b5563', lineHeight: '1.4', fontWeight: '500' }}>{day.activities.slice(0, 3).map(a => a.title).join(' | ')}.</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Data Blocks */}
          <div style={{ padding: '20px 80px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {/* Left Block - Financial */}
            <div style={{ display: 'flex', gap: '60px', alignItems: 'flex-end' }}>
               <div>
                  <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#111827', marginBottom: '16px', textTransform: 'uppercase' }}>RELATÓRIO FINANCEIRO E LOGÍSTICA</h2>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase' }}>Investimento de</div>
                  <div style={{ fontSize: '80px', fontWeight: '900', color: '#111827', lineHeight: '1', display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
                    {Math.round(itinerary.costBreakdown.total).toLocaleString()} <span style={{fontSize: '40px'}}>{itinerary.costBreakdown.currency}</span>
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '600', color: '#6b7280', marginTop: '8px' }}>por {preferences.travelers} viajantes</div>
               </div>
               
               {/* Bar Chart Fake */}
               <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderLeft: '4px solid #e5e7eb', paddingLeft: '40px', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                     <div style={{ width: '280px', height: '48px', backgroundColor: '#d97706', borderRadius: '6px' }}></div>
                     <span style={{ fontSize: '24px', fontWeight: '800', color: '#1f2937' }}>Hospedagem<br/><span style={{ fontSize: '20px', fontWeight: '600', color: '#6b7280' }}>~{Math.round(itinerary.costBreakdown.accommodation).toLocaleString()} {itinerary.costBreakdown.currency}</span></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                     <div style={{ width: '280px', height: '48px', backgroundColor: '#1e3a8a', borderRadius: '6px' }}></div>
                     <span style={{ fontSize: '24px', fontWeight: '800', color: '#1f2937' }}>Alimentação<br/><span style={{ fontSize: '20px', fontWeight: '600', color: '#6b7280' }}>~{Math.round(itinerary.costBreakdown.food).toLocaleString()} {itinerary.costBreakdown.currency}</span></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                     <div style={{ width: '280px', height: '48px', backgroundColor: '#166534', borderRadius: '6px' }}></div>
                     <span style={{ fontSize: '24px', fontWeight: '800', color: '#1f2937' }}>Passeios & Outros<br/><span style={{ fontSize: '20px', fontWeight: '600', color: '#6b7280' }}>~{Math.round(itinerary.costBreakdown.activities).toLocaleString()} {itinerary.costBreakdown.currency}</span></span>
                  </div>
               </div>
            </div>

            {/* Right Blocks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '550px' }}>
               <div style={{ backgroundColor: '#f3f4f6', borderRadius: '20px', padding: '30px', border: '3px solid #e5e7eb' }}>
                 <h4 style={{ fontSize: '24px', fontWeight: '900', color: '#111827', marginBottom: '12px', textTransform: 'uppercase' }}>DICAS DE INTELIGÊNCIA</h4>
                 <ul style={{ fontSize: '20px', color: '#374151', listStyle: 'disc', paddingLeft: '24px', lineHeight: '1.4', fontWeight: '500' }}>
                   <li>{itinerary.weatherAdvice || "Reserve atrações com antecedência para evitar longas filas."}</li>
                   <li>Siga sempre as recomendações dos guias locais incluídos neste mapa exclusivo.</li>
                 </ul>
               </div>
               <div style={{ backgroundColor: '#f3f4f6', borderRadius: '20px', padding: '30px', border: '3px solid #e5e7eb' }}>
                 <h4 style={{ fontSize: '24px', fontWeight: '900', color: '#111827', marginBottom: '12px', textTransform: 'uppercase' }}>OPÇÕES DE HOSPEDAGEM</h4>
                 <ul style={{ fontSize: '20px', color: '#374151', listStyle: 'none', paddingLeft: '0', lineHeight: '1.4', fontWeight: '500' }}>
                   {itinerary.hotelSuggestions.slice(0, 2).map((h, i) => (
                     <li key={i} style={{ marginBottom: '8px' }}>• {h.name} <span style={{color: '#9ca3af'}}>({h.category})</span></li>
                   ))}
                 </ul>
               </div>
            </div>
          </div>
        </div>
      </div>

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
                onClick={handleExportInfographic}
                disabled={isExportingInfographic}
                className="px-4 py-2 rounded-lg font-bold text-sm bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 border border-teal-400"
              >
                {isExportingInfographic ? 'Gerando...' : '🗺️ Mapa da Fuga'}
              </button>
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 rounded-lg font-bold text-sm bg-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.3)] text-white border border-[rgba(255,255,255,0.4)] backdrop-blur-md shadow-lg transition-all flex items-center gap-2"
              >
                📊 Exportar Excel
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
            <h3 className={`text-lg font-bold ${isExportingPdf ? 'mb-1' : 'mb-2'} ${isExportingPdf ? 'text-black' : 'text-white'}`}>Por que este destino?</h3>
            <p className={`${isExportingPdf ? 'text-gray-900' : 'text-white/90'} italic border-l-4 border-[#14b8a6] pl-4 text-sm md:text-base mb-4`}>{itinerary.justification}</p>
            {itinerary.weatherAdvice && (
              <div className="bg-blue-50/90 backdrop-blur-sm border border-blue-200 p-4 rounded-xl shadow-sm">
                <h4 className="text-blue-800 font-bold text-sm mb-1 flex items-center gap-2">🌤️ Clima & Sazonalidade</h4>
                <p className="text-blue-700 text-sm md:text-base leading-relaxed">{itinerary.weatherAdvice}</p>
              </div>
            )}

            {itinerary.practicalInfo && (
              <div className="mt-4 bg-purple-50/90 backdrop-blur-sm border border-purple-200 p-4 rounded-xl shadow-sm">
                <h4 className="text-purple-800 font-bold text-sm mb-3 flex items-center gap-2">🎒 Dicas Práticas do Agente</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white/60 p-2 rounded border border-purple-100">
                    <span className="block text-[10px] font-bold text-purple-700 uppercase mb-1">💱 Moeda Local</span>
                    <p className="text-purple-900 text-xs">{itinerary.practicalInfo.currency}</p>
                  </div>
                  <div className="bg-white/60 p-2 rounded border border-purple-100">
                    <span className="block text-[10px] font-bold text-purple-700 uppercase mb-1">🛂 Documentação</span>
                    <p className="text-purple-900 text-xs">{itinerary.practicalInfo.documentation}</p>
                  </div>
                  <div className="bg-white/60 p-2 rounded border border-purple-100">
                    <span className="block text-[10px] font-bold text-purple-700 uppercase mb-1">🏥 Seguro Viagem</span>
                    <p className="text-purple-900 text-xs">{itinerary.practicalInfo.insurance}</p>
                  </div>
                  <div className="bg-white/60 p-2 rounded border border-purple-100">
                    <span className="block text-[10px] font-bold text-purple-700 uppercase mb-1">🎁 Souvenirs</span>
                    <p className="text-purple-900 text-xs">{itinerary.practicalInfo.souvenirs}</p>
                  </div>
                </div>
              </div>
            )}
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

      {/* Timeline Calendar / Tabs - HIDDEN ON PDF */}
      {!isExportingPdf && (
        <div className="mb-8 w-full">
          <div className="flex flex-wrap justify-between md:justify-start gap-2 md:gap-3 pb-2 px-1">
            {itinerary.days.map((day) => {
              const date = preferences.startDate ? getTripDate(preferences.startDate, day.day - 1) : null;
              const isActive = activeDay === day.day;

              const activitySum = day.activities.reduce((sum, act) => sum + act.estimatedCost, 0);
              const estimatedDayTotal = activitySum + avgDailyAccommodation + avgDailyFood + avgDailyTransport;

              return (
                <button
                  key={day.day}
                  onClick={() => {
                    setActiveDay(day.day);
                    document.getElementById(`day-${day.day}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`flex flex-col items-start justify-between p-2 md:p-3 w-[calc(50%-4px)] sm:w-[calc(33%-6px)] md:w-auto md:min-w-[140px] h-auto min-h-[5.5rem] md:min-h-[6rem] rounded-xl border transition-all duration-300 text-left relative overflow-hidden ${isActive
                    ? (trackMode ? 'bg-orange-600 border-orange-600 text-white shadow-lg z-10' : 'bg-teal-600 border-teal-600 text-white shadow-lg z-10')
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <div className="w-full flex justify-between items-start">
                    <div>
                      {date ? (
                        <>
                          <span className={`text-[10px] uppercase font-bold block ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                            {getWeekDay(date)}
                          </span>
                          <span className="text-xl font-black leading-none">{formatDate(date)}</span>
                        </>
                      ) : (
                         <span className="text-lg font-black leading-tight line-clamp-2">{day.theme}</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-[rgba(255,255,255,0.2)] text-white' : 'bg-gray-100 text-gray-500'}`}>Dia {day.day}</span>
                  </div>

                  {date && (
                     <div className="w-full mt-1">
                      <div className="flex items-center gap-1 text-[10px] opacity-90 mb-0.5 truncate">
                        <span>📍</span>
                        <span className="font-bold truncate">{day.locationBase}</span>
                      </div>
                    </div>
                  )}

                  <div className={`mt-auto w-full pt-1 md:pt-2 border-t ${isActive ? 'border-[rgba(255,255,255,0.3)]' : 'border-gray-100'}`}>
                    <div className="text-[10px] md:text-xs flex justify-between items-center w-full mt-1">
                      <span>Estimado:</span>
                      <span className="font-bold">~{Math.round(estimatedDayTotal).toLocaleString()} BRL</span>
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

          <div className="space-y-4 md:space-y-6 lg:space-y-8">
            {itinerary.days.map((day, dayIndex) => {
              const date = preferences.startDate ? getTripDate(preferences.startDate, day.day - 1) : null;
              const isExpanded = true; 
              const isPremium = user?.subscriptionTier === 'premium';
              const isBlurred = !isPremium && day.day > 1 && !isExportingPdf;
              const mapUrl = getGoogleMapUrl(day);

              const dayCardClass = isExportingPdf
                ? "border border-[#9ca3af] rounded-lg mb-4 bg-white break-inside-avoid shadow-none"
                : `bg-[rgba(255,255,255,0.95)] backdrop-blur rounded-xl shadow-lg border border-gray-100 transition-all duration-300 overflow-hidden`;

              const dayHeaderClass = isExportingPdf
                ? "w-full text-left p-4 flex justify-between items-center bg-[#f9fafb] border-b border-[#e5e7eb]"
                : `w-full text-left p-4 md:p-5 flex justify-between items-center cursor-default ${trackMode ? 'bg-orange-50' : 'bg-teal-50'} border-b border-gray-100`;

              return (
                <div key={day.day} id={`day-${day.day}`} className={`${dayCardClass} scroll-mt-24`}>
                  <div className={dayHeaderClass}>
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={`${isExportingPdf ? 'bg-teal-800 text-white' : (trackMode ? 'bg-orange-100 text-orange-800' : 'bg-teal-100 text-teal-800')} font-bold px-2 py-1 md:px-3 rounded-lg text-sm text-center min-w-[50px] md:min-w-[60px]`}>
                        <span className="block text-[10px] md:text-xs uppercase">{getWeekDay(date)}</span>
                        <span className="block text-base md:text-lg">{formatDate(date)}</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-bold ${isExportingPdf ? 'text-black' : (trackMode ? 'text-orange-600' : 'text-teal-600')} text-xs md:text-sm block`}>DIA {day.day}</span>
                          {day.energyScore && (
                            <span className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded font-bold border border-orange-100 flex items-center gap-1" title="Nível de Esforço Físico">
                              {day.energyScore >= 4 ? '🔥' : day.energyScore <= 2 ? '🦥' : '🚶'} Nível {day.energyScore}/5
                            </span>
                          )}
                        </div>
                        <span className={`font-medium ${isExportingPdf ? 'text-black whitespace-normal leading-relaxed py-0.5 block' : 'text-gray-800 line-clamp-1'} text-base md:text-lg`}>{day.theme}</span>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className={`relative p-4 md:p-5 bg-white ${!isExportingPdf && 'animate-fade-in'}`}>
                      
                      <div className={`transition-all duration-300 ${isBlurred ? 'blur-[8px] opacity-60 select-none grayscale-[30%] pointer-events-none' : ''}`}>
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

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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
                                  {act.contingencyPlan && (
                                    <div className={`mt-2 text-xs p-2 rounded border border-l-4 ${isExportingPdf ? 'bg-gray-100 text-black border-gray-300 border-l-gray-400' : 'bg-gray-50 text-gray-600 border-gray-200 border-l-gray-400'}`}>
                                      <span className="font-bold">☔ Plano B:</span> {act.contingencyPlan}
                                    </div>
                                  )}
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
                        
                        {!isExportingPdf && mapUrl && (
                          <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 h-[300px] lg:h-[400px] sticky top-4">
                            <iframe
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              style={{ border: 0 }}
                              referrerPolicy="no-referrer-when-downgrade"
                              src={mapUrl}
                              allowFullScreen
                              className="grayscale-[10%] hover:grayscale-0 transition-all duration-500"
                              title={`Mapa do Dia ${day.day}`}
                            ></iframe>
                          </div>
                        )}
                      </div>

                    </div>
                    {/* FOMO Premium Blur Overlay */}
                    {isBlurred && (
                      <div className="absolute inset-x-0 bottom-0 top-[80px] z-10 flex flex-col items-center justify-center bg-white/30 backdrop-blur-[2px] rounded-b-xl">
                        <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 md:p-8 rounded-2xl shadow-2xl text-center max-w-sm mx-4 border border-amber-300 transform transition-transform hover:scale-105">
                          <span className="text-4xl block mb-3 drop-shadow-md">🔒</span>
                          <h3 className="font-black text-white text-xl md:text-2xl mb-2 drop-shadow-md">Dia {day.day} Protegido</h3>
                          <p className="text-amber-50 text-sm md:text-base font-medium mb-6 drop-shadow-sm">A partir do Dia 2, o detalhamento do roteiro é exclusivo para membros Premium. Assine agora para ver o planejamento completo!</p>
                          <button 
                            onClick={() => onUpgrade && onUpgrade()}
                            className="w-full bg-white text-amber-800 font-black text-sm uppercase tracking-wide px-6 py-3.5 rounded-full shadow-lg hover:shadow-xl hover:bg-amber-50 transition-all"
                          >
                            ⭐ Desbloquear Roteiro
                          </button>
                        </div>
                      </div>
                    )}
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
                <div key={idx} className={`border rounded-lg p-4 transition-colors flex flex-col justify-between ${isExportingPdf ? 'border-gray-400' : 'border-gray-200 hover:border-teal-300'}`}>
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={`font-bold ${isExportingPdf ? 'text-black' : 'text-gray-800'}`}>{hotel.name}</h4>
                      <span className={`text-xs px-2 py-1 rounded ${isExportingPdf ? 'bg-gray-200 text-black border border-gray-400' : 'bg-gray-100'}`}>{hotel.category}</span>
                    </div>
                    <p className={`text-sm mb-2 ${isExportingPdf ? 'text-black' : 'text-gray-500'}`}>{hotel.description}</p>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                    <span className={`text-sm font-medium ${isExportingPdf ? 'text-black' : 'text-teal-600'}`}>{hotel.priceRange}</span>
                    {hotel.link && !isExportingPdf && (
                      <a href={hotel.link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 px-3 py-1.5 rounded transition-colors inline-block text-center">
                        Ver Oferta
                      </a>
                    )}
                    {hotel.link && isExportingPdf && (
                      <a href={hotel.link} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-700 underline">
                        Acessar Link
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumo Financeiro ao Final */}
          <div className={`${isExportingPdf ? 'border border-gray-400 rounded-lg p-4 mt-4 break-inside-avoid' : 'bg-[rgba(255,255,255,0.95)] backdrop-blur rounded-xl shadow-lg p-6 md:p-8 border-t-4 border-teal-500'}`}>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold text-center ${isExportingPdf ? 'text-black' : 'text-gray-800'}`}>
                📊 Resumo Financeiro Detalhado 
                <span className={`block text-sm font-medium mt-1 ${isExportingPdf ? 'text-gray-600' : 'text-teal-600'}`}>
                  (Custo Mapeado para {preferences.travelers} viajante{preferences.travelers > 1 ? 's' : ''})
                </span>
              </h2>
              {!isExportingPdf && (
                <button
                  onClick={handleExportExcel}
                  className="mt-4 md:mt-0 px-4 py-2 rounded-lg font-bold text-sm bg-teal-600 hover:bg-teal-700 text-white shadow transition-all flex items-center gap-2"
                >
                  📊 Exportar Tabela (Excel)
                </button>
              )}
            </div>

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
                      <tr className="bg-gray-50 border-t-2 border-gray-200">
                        <td className="py-3 pl-2 font-black uppercase text-gray-800">CUSTO TOTAL (GRUPO)</td>
                        <td className="py-3 text-right font-black text-gray-800 text-lg">{totalPlanned.toLocaleString()} BRL</td>
                        <td className="py-3 text-right font-black text-orange-600 text-xl">{totalActual.toLocaleString()} BRL</td>
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



        {/* Fim do roteiro e resumo financeiro */}
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
          onClick={handleExportExcel}
          className="flex flex-col items-center justify-center text-teal-600 text-xs w-16"
        >
          <span className="text-xl">📊</span>
          Excel
        </button>

        <button
          onClick={handleExportPdf}
          className="flex flex-col items-center justify-center text-red-500 text-xs w-16 hidden sm:flex"
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