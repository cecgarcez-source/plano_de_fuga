import React, { useState, useRef } from 'react';
import { SavedPlan, User, VisitedPlace } from '../types';
import { Map, Overlay } from 'pigeon-maps';
import html2canvas from 'html2canvas';
import { getCityCoordinates } from '../services/geminiService';
import { plansService } from '../services/plansService';

interface Props {
  user: User;
  plans: SavedPlan[];
  visitedPlaces: VisitedPlace[];
  onNewPlan: () => void;
  onViewPlan: (plan: SavedPlan) => void;
  onDeletePlan: (id: string) => void;
  onAddVisited: (place: VisitedPlace) => void;
  onDeleteVisited: (id: string) => void;
  onCompare: (plans: SavedPlan[]) => void;
  onLogout: () => void;
}

export const DashboardView: React.FC<Props> = ({
  user, plans, visitedPlaces, onNewPlan, onViewPlan, onDeletePlan, onAddVisited, onDeleteVisited, onCompare, onLogout
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const visiblePlansForMap = user.subscriptionTier === 'premium' ? plans : plans.slice(0, 3);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activeVisitedId, setActiveVisitedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Ref for the element we want to capture (Single Plan)
  const exportRef = useRef<HTMLDivElement>(null);
  // Ref for the element we want to capture (Full Map)
  const mapExportRef = useRef<HTMLDivElement>(null);

  const [planToExport, setPlanToExport] = useState<SavedPlan | null>(null);
  const [isExportingMap, setIsExportingMap] = useState(false);

  // State for adding new visited place
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(pid => pid !== id));
    } else {
      if (selectedIds.length >= 3) {
        alert("Selecione no máximo 3 planos para comparar.");
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCompare = () => {
    const selectedPlans = plans.filter(p => selectedIds.includes(p.id));
    onCompare(selectedPlans);
  };

  // --- ADD VISITED PLACE LOGIC ---
  const handleAddVisitedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaceName.trim()) return;

    setIsGeocoding(true);
    try {
      const coords = await getCityCoordinates(newPlaceName);
      const newPlace: VisitedPlace = {
        id: Date.now().toString(),
        name: newPlaceName,
        coordinates: coords,
        dateAdded: new Date().toISOString()
      };
      onAddVisited(newPlace);
      setNewPlaceName('');
      setIsAddingPlace(false);
    } catch (err) {
      alert("Não foi possível encontrar este local. Tente ser mais específico (Ex: Paris, França).");
    } finally {
      setIsGeocoding(false);
    }
  };

  // --- UPLOAD COVER LOGIC ---
  const handleCoverUpload = async (planId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // Optimistic Update (Optional) or just wait for reload? 
    // Ideally we update state.
    try {
      const url = await plansService.updatePlanCover(planId, file);
      // Simple reload or force update logic? 
      // For better UX, let's refresh the list via props or parent? 
      // Actually `plans` comes from props. DashboardView doesn't own plans state completely, 
      // but App.tsx passes it. We should probably accept an `onUpdatePlan` prop, but for now 
      // let's just reload window or notify user. 
      // Better: The User asked for the FEATURE. 
      alert("Capa atualizada! Recarregando...");
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao enviar imagem: ${err.message || JSON.stringify(err)}`);
    }
  };

  // --- EXPORT SINGLE PLAN ---
  const handleExportClick = (plan: SavedPlan, e: React.MouseEvent) => {
    e.stopPropagation();

    // PREMIUM CHECK
    if (user.subscriptionTier !== 'premium' && !plan.isPaidExport) {
      alert("🔒 Recurso Premium\n\nA exportação para PDF (Dossiê) é exclusiva para membros Premium.\n\n[Aqui seria o link do Stripe]");
      return;
    }

    setPlanToExport(plan);
    setTimeout(() => {
      captureAndDownload(exportRef, `Missao-${plan.destinationTitle}`);
    }, 800); // Wait for render and images
  };

  // ... (map export click etc)

  // ... (inside map)


  // --- EXPORT FULL MAP ---
  const handleMapExportClick = () => {
    setIsExportingMap(true);
    setTimeout(() => {
      captureAndDownload(mapExportRef, `Minhas-Fugas-${user.username}`);
    }, 1500); // Longer wait for map tiles
  };

  const captureAndDownload = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    if (!ref.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(ref.current, {
        useCORS: true,
        scale: 2, // Better resolution
        backgroundColor: null,
        logging: false,
        onclone: (clonedDoc) => {
          // We can't find by ID because it's a ref. We need to find the element in the cloned doc.
          // Since we passed ref.current to html2canvas, the clonedDoc body usually contains just that element.
          // Or we can query selector for the specific classes if we added an ID. 
          // Let's iterate over ALL elements in the cloned doc to be safe.
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((el) => {
            const hEle = el as HTMLElement;
            hEle.style.boxShadow = 'none';
            hEle.style.textShadow = 'none';
            hEle.style.filter = 'none';
            hEle.style.backdropFilter = 'none';
            hEle.style.mixBlendMode = 'normal'; // Fix for mix-blend-screen

            // Strip gradients if they cause issues, but we want the background pattern?
            // Maybe just ensure no oklch.

            // Check computed styles for oklch and replace with safe fallbacks
            const computed = window.getComputedStyle(hEle); // NOTE: This gets style from ORIGINAL DOM element?
            // Actually window.getComputedStyle(hEle) where hEle is in clonedDoc might return defaults if not attached? 
            // html2canvas usually handles this but accessing it might conform it.
            // Safer to just check inline styles or blindly force safe colors if we suspect them.

            // If we really want to fix the "Top Secret" card, let's just force the background color for that specifically if needed.
            // But let's try the generic oklch sanitizer approach.

            if (hEle.style.backgroundColor && hEle.style.backgroundColor.includes('oklch')) {
              hEle.style.backgroundColor = '#18181b'; // zinc-900 fallback
            }
            if (hEle.style.color && hEle.style.color.includes('oklch')) {
              hEle.style.color = '#ffffff';
            }
          });
        }
      });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error("Erro ao exportar", err);
      alert("Não foi possível gerar a imagem agora.");
    } finally {
      setIsExporting(false);
      setPlanToExport(null);
      setIsExportingMap(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in relative">

      {/* --- HIDDEN CONTAINER: SINGLE PLAN INSTAGRAM EXPORT --- */}
      {planToExport && (
        <div style={{ position: 'fixed', top: 0, left: '-9999px', width: '375px', height: '667px', zIndex: 9999 }}>
          {/* Fixed dimensions for Instagram Story 9:16 approx */}
          <div ref={exportRef} style={{ width: '375px', height: '667px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', padding: '32px', boxSizing: 'border-box', border: '12px solid #18181b', fontFamily: 'Courier New, Courier, monospace', color: '#18181b', position: 'relative' }}>

            {/* Watermark */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', fontSize: '60px', fontWeight: '900', color: '#f3f4f6', zIndex: 0, pointerEvents: 'none', whiteSpace: 'nowrap', border: '8px dashed #e5e7eb', padding: '20px', opacity: 0.5 }}>
              CONFIDENTIAL
            </div>

            {/* Header */}
            <div style={{ borderBottom: '4px solid #18181b', paddingBottom: '20px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 10 }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px', lineHeight: 1 }}>AGÊNCIA DE FUGA</h2>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#52525b', display: 'block', marginTop: '4px' }}>REF: {planToExport.id.substring(0, 8).toUpperCase()}</span>
              </div>
              <div style={{ fontSize: '32px', filter: 'grayscale(100%)' }}>✈️</div>
            </div>

            {/* Main Info */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px', position: 'relative', zIndex: 10 }}>

              {/* Destination Stamp */}
              <div style={{ transform: 'rotate(-2deg)' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '8px', backgroundColor: '#18181b', color: '#ffffff', padding: '4px 8px', width: 'fit-content' }}>DESTINO ALVO</span>
                <h1 style={{ fontSize: '42px', lineHeight: '0.9', fontWeight: '900', textTransform: 'uppercase', wordWrap: 'break-word', color: '#000000' }}>
                  {planToExport.destinationTitle}
                </h1>
              </div>

              {/* Data Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ border: '2px solid #18181b', padding: '12px', backgroundColor: '#fafafa' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', display: 'block', fontWeight: 'bold', color: '#52525b', marginBottom: '4px' }}>AGENTE</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username.toUpperCase()}</span>
                </div>
                <div style={{ border: '2px solid #18181b', padding: '12px', backgroundColor: '#fafafa' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', display: 'block', fontWeight: 'bold', color: '#52525b', marginBottom: '4px' }}>DURAÇÃO</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{planToExport.days.length} DIAS</span>
                </div>
              </div>

              {/* Status Box */}
              <div style={{ border: '4px double #18181b', padding: '16px', textAlign: 'center', backgroundColor: '#ffffff' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', display: 'block', marginBottom: '6px', letterSpacing: '1px' }}>STATUS DA MISSÃO</span>
                <div style={{ fontSize: '28px', fontWeight: '900', color: '#18181b', textDecoration: 'underline decoration-4' }}>AUTORIZADA</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '2px solid #e5e7eb', paddingTop: '20px', marginTop: '20px', textAlign: 'center', position: 'relative', zIndex: 10 }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#18181b' }}>DOCUMENTO OFICIAL // NÃO DOBRAR</div>
              <div style={{ fontSize: '9px', marginTop: '4px', color: '#71717a' }}>EMITIDO EM: {new Date().toLocaleDateString('pt-BR').toUpperCase()}</div>
            </div>

          </div>
        </div>
      )}

      {/* --- HIDDEN CONTAINER: FULL MAP EXPORT --- */}
      {isExportingMap && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center z-[9999] bg-white pointer-events-none opacity-0 md:opacity-100">
          <div ref={mapExportRef} className="w-[1080px] h-[1920px] bg-blue-50 relative flex flex-col">
            <div className="absolute inset-0 z-0">
              <Map defaultCenter={[-15, -55]} defaultZoom={4} width={1080} height={1920}>
                {visiblePlansForMap.map(plan => (
                  <Overlay key={plan.id} anchor={[plan.coordinates.lat, plan.coordinates.lng]}>
                    <div className="relative flex flex-col items-center">
                      {/* Pin Size */}
                      <span className="text-[50px] drop-shadow-xl filter transform -translate-y-full">📍</span>
                    </div>
                  </Overlay>
                ))}
                {visitedPlaces.map(place => (
                  <Overlay key={place.id} anchor={[place.coordinates.lat, place.coordinates.lng]}>
                    <div className="relative flex flex-col items-center">
                      <span className="text-[50px] drop-shadow-xl filter transform -translate-y-full grayscale-[50%] brightness-75">🚩</span>
                    </div>
                  </Overlay>
                ))}
              </Map>
            </div>

            <div className="absolute top-24 left-0 w-full flex justify-center z-50 px-10">
              {/* Solid background, no backdrop-blur, dark text for contrast */}
              <div className="bg-white px-12 py-10 rounded-3xl shadow-2xl border-4 border-gray-800 text-center w-full max-w-4xl">
                <h1 className="text-7xl font-black text-gray-900 uppercase tracking-tighter leading-tight mb-4">
                  Nossas Fugas<br />pelo Mundo!
                </h1>
                {/* REMOVED AGENT BADGE HERE */}
                <div className="mt-6 flex justify-center gap-8 text-gray-500 font-bold text-xl uppercase tracking-wider">
                  <span>{visitedPlaces.length} Conquistados</span>
                  <span>•</span>
                  <span>{plans.length} Planejados</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN DASHBOARD CONTENT --- */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm">
        <div className="mb-4 md:mb-0 text-center md:text-left">
          <h1 className="text-2xl font-bold text-gray-800">Olá, {user.username}! 👋</h1>
          <p className="text-gray-500">Você tem {plans.length} planos e visitou {visitedPlaces.length} locais.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
          <div className="bg-gray-100 p-1 rounded-lg flex">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-1 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white shadow text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-1 rounded-md text-sm font-medium transition-all ${viewMode === 'map' ? 'bg-white shadow text-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Mapa
            </button>
          </div>

          {viewMode === 'map' && (
            <button
              onClick={handleMapExportClick}
              disabled={isExporting}
              className="bg-purple-100 text-purple-700 px-3 py-2 rounded-lg text-sm font-bold hover:bg-purple-200 transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {isExporting ? '...' : '📸 Mapa Mundi'}
            </button>
          )}

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={onLogout}
              className="flex-1 md:flex-none px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
            >
              Sair
            </button>
            <button
              onClick={onNewPlan}
              className="flex-1 md:flex-none px-6 py-2 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 shadow-md transition-all whitespace-nowrap"
            >
              + Nova Fuga
            </button>
          </div>
        </div>
      </div>

      {plans.length === 0 && visitedPlaces.length === 0 ? (
        <div className="text-center py-20 bg-white/50 rounded-3xl border-2 border-dashed border-gray-300">
          <span className="text-6xl block mb-4">🗺️</span>
          <h3 className="text-xl font-bold text-gray-700 mb-2">Nenhum plano ainda</h3>
          <p className="text-gray-500 mb-6">Que tal criar seu primeiro roteiro agora?</p>
          <button
            onClick={onNewPlan}
            className="text-teal-600 font-bold hover:underline"
          >
            Começar agora
          </button>
        </div>
      ) : (
        <>
          {viewMode === 'list' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all border-2 ${selectedIds.includes(plan.id) ? 'border-teal-500 transform scale-[1.02]' : 'border-transparent'}`}
                >
                  <div
                    className={`h-32 flex items-center justify-center relative group cursor-pointer ${!plan.coverUrl ? 'bg-gradient-to-r from-blue-400 to-teal-400' : 'bg-cover bg-center'}`}
                    style={plan.coverUrl ? { backgroundImage: `url(${plan.coverUrl})` } : {}}
                    onClick={() => onViewPlan(plan)}
                  >
                    {!plan.coverUrl && (
                      <span className="text-5xl drop-shadow-lg transition-transform group-hover:scale-110 z-10">✈️</span>
                    )}

                    {/* Upload Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                      <button
                        className="text-white text-xs font-bold border border-white px-3 py-1 rounded-full hover:bg-white hover:text-black transition-colors shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById(`upload-cover-${plan.id}`)?.click();
                        }}
                      >
                        🖼️ Trocar Capa
                      </button>
                    </div>

                    <input
                      type="file"
                      id={`upload-cover-${plan.id}`}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleCoverUpload(plan.id, e)}
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div className="absolute top-2 right-2 z-30" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(plan.id)}
                        onChange={() => toggleSelection(plan.id)}
                        className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500 cursor-pointer bg-white/80"
                        title="Selecionar para comparar"
                      />
                    </div>
                    <button
                      onClick={(e) => handleExportClick(plan, e)}
                      className="absolute bottom-2 right-2 bg-white/20 hover:bg-white/40 backdrop-blur rounded-full p-2 text-white transition-colors z-30"
                      title="Gerar Dossiê de Fuga (Instagram)"
                    >
                      📷
                    </button>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-xl text-gray-800 mb-1 truncate cursor-pointer hover:text-teal-600" onClick={() => onViewPlan(plan)}>{plan.destinationTitle}</h3>
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{plan.destinationDescription}</p>

                    <div className="flex justify-between items-center text-sm font-medium text-gray-600 mb-4">
                      <span>📅 {plan.days.length} dias</span>
                      <span>💰 ~{plan.costBreakdown.total.toLocaleString()} {plan.costBreakdown.currency}</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => onViewPlan(plan)}
                        className="flex-1 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm"
                      >
                        Ver Detalhes
                      </button>
                      <button
                        onClick={() => onDeletePlan(plan.id)}
                        className="px-3 py-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                        title="Excluir"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-[60vh] md:h-[70vh] border border-gray-200 relative">
              <Map defaultCenter={[-14.235, -51.925]} defaultZoom={4} onClick={() => { setActivePlanId(null); setActiveVisitedId(null); }}>

                {/* EXISTING PLANS MARKERS */}
                {visiblePlansForMap.map(plan => {
                  const lat = plan.coordinates?.lat || 0;
                  const lng = plan.coordinates?.lng || 0;
                  if (lat === 0 && lng === 0) return null;

                  return (
                    <Overlay key={plan.id} anchor={[lat, lng]} offset={[0, 0]}>
                      <div className="relative">
                        <div
                          className="text-4xl transform -translate-x-1/2 -translate-y-full hover:scale-125 transition-transform cursor-pointer drop-shadow-md z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveVisitedId(null);
                            setActivePlanId(plan.id);
                          }}
                        >
                          📍
                        </div>

                        {activePlanId === plan.id && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-48 bg-white rounded-lg shadow-xl z-50 p-3 border border-gray-200 animate-fade-in-up">
                            <h3 className="font-bold text-gray-800 text-sm mb-1 truncate">{plan.destinationTitle}</h3>
                            <div className="flex justify-between text-[10px] font-semibold text-gray-600 mb-2 bg-gray-50 p-1 rounded">
                              <span>{plan.days.length} Dias</span>
                              <span>{plan.costBreakdown.total} {plan.costBreakdown.currency}</span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => onViewPlan(plan)}
                                className="flex-1 bg-teal-600 text-white text-[10px] py-1.5 rounded hover:bg-teal-700 font-bold"
                              >
                                VER
                              </button>
                              <button
                                onClick={(e) => handleExportClick(plan, e)}
                                className="bg-purple-100 text-purple-600 px-2 py-1.5 rounded hover:bg-purple-200 text-[10px]"
                                title="Exportar"
                              >
                                📷
                              </button>
                            </div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-white"></div>
                          </div>
                        )}
                      </div>
                    </Overlay>
                  );
                })}

                {/* VISITED PLACES MARKERS */}
                {visitedPlaces.map(place => (
                  <Overlay key={place.id} anchor={[place.coordinates.lat, place.coordinates.lng]} offset={[0, 0]}>
                    <div className="relative">
                      <div
                        className="text-4xl transform -translate-x-1/2 -translate-y-full hover:scale-125 transition-transform cursor-pointer drop-shadow-md z-0 grayscale-[50%] brightness-90 hover:grayscale-0 hover:brightness-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePlanId(null);
                          setActiveVisitedId(place.id);
                        }}
                      >
                        🚩
                      </div>

                      {activeVisitedId === place.id && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-40 bg-white rounded-lg shadow-xl z-50 p-3 border border-green-200 animate-fade-in-up">
                          <span className="text-[10px] text-green-600 font-bold uppercase block">Fuga Realizada</span>
                          <h3 className="font-bold text-gray-800 text-sm mb-2 leading-tight">{place.name}</h3>
                          <button
                            onClick={() => onDeleteVisited(place.id)}
                            className="w-full bg-red-50 text-red-500 text-[10px] py-1 rounded hover:bg-red-100 font-bold"
                          >
                            Remover
                          </button>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-white"></div>
                        </div>
                      )}
                    </div>
                  </Overlay>
                ))}

              </Map>

              {/* Controls Layer */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button
                  onClick={() => setIsAddingPlace(!isAddingPlace)}
                  className="bg-white text-green-700 px-4 py-2 rounded-lg shadow-lg font-bold text-sm border border-green-200 hover:bg-green-50 flex items-center gap-2"
                >
                  🚩 Já Fui!
                </button>

                {isAddingPlace && (
                  <div className="bg-white p-4 rounded-lg shadow-xl border border-gray-200 w-64 animate-fade-in">
                    <h4 className="font-bold text-gray-800 text-sm mb-2">Onde você já fugiu?</h4>
                    <form onSubmit={handleAddVisitedSubmit}>
                      <input
                        autoFocus
                        type="text"
                        placeholder="Cidade, País"
                        className="w-full text-sm p-2 border border-gray-300 rounded mb-2 focus:border-green-500 outline-none"
                        value={newPlaceName}
                        onChange={e => setNewPlaceName(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddingPlace(false)}
                          className="flex-1 text-gray-500 text-xs font-bold hover:bg-gray-100 py-2 rounded"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isGeocoding}
                          className="flex-1 bg-green-600 text-white text-xs font-bold py-2 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {isGeocoding ? '...' : 'Adicionar'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg text-xs text-center text-gray-600 shadow-md pointer-events-none">
                📍 Futuras | 🚩 Realizadas
              </div>
            </div>
          )}

          {selectedIds.length > 1 && viewMode === 'list' && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-6 animate-fade-in-up z-40 w-max max-w-[90vw]">
              <span className="font-medium whitespace-nowrap">{selectedIds.length} selecionados</span>
              <button
                onClick={handleCompare}
                className="bg-teal-500 hover:bg-teal-400 text-white px-6 py-2 rounded-full font-bold transition-colors whitespace-nowrap"
              >
                Comparar
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};