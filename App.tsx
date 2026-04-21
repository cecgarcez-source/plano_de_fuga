import React, { useState, useEffect } from 'react';
import { StepIntro } from './components/StepIntro';
import { AuthScreen } from './components/AuthScreen';
import { useAuth } from './contexts/AuthContext';
import { DashboardView } from './components/DashboardView';
import { StepDetails } from './components/StepDetails';
import { StepProfiles } from './components/StepProfiles';
import { LoadingView } from './components/LoadingView';
import { ResultView } from './components/ResultView';
import { CompareView } from './components/CompareView';
import { UserProfileView } from './components/UserProfileView';
import { PricingView } from './components/PricingView';
import { PrivacyView } from './components/PrivacyView';
import { TermsView } from './components/TermsView';
import { AppStep, TripPreferences, ItineraryResult, User, SavedPlan, VisitedPlace } from './types';
import { generateTripItinerary } from './services/geminiService';
import { plansService } from './services/plansService';
import { userService } from './services/userService';
import { supabase } from './services/supabase';

const INITIAL_PREFERENCES: TripPreferences = {
  origin: '',
  destination: '',
  isSurpriseDestination: false,
  startDate: '',
  endDate: '',
  departureTime: '08:00',
  returnTime: '18:00',
  duration: 1,
  travelers: 1,
  budget: 'medium',
  transport: 'plane',
  selectedProfiles: [],
  prebookedAccommodation: [],
};

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.INTRO);
  const [preferences, setPreferences] = useState<TripPreferences>(INITIAL_PREFERENCES);
  const [currentItinerary, setCurrentItinerary] = useState<ItineraryResult | SavedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auth & Data State
  const { user: supabaseUser, loading, signOut } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [loadingData, setLoadingData] = useState(false); // Added loadingData
  const [userPlanCredits, setUserPlanCredits] = useState<number | undefined>(undefined);

  const processedRef = React.useRef(false); // Ref to track if upgrade processed
  const sharedPlanRef = React.useRef(false);

  useEffect(() => {
    // Check for Upgrade Success & Routing
    const path = window.location.pathname;
    const query = new URLSearchParams(window.location.search);

    // Simple Routing
    if (path === '/politica-de-privacidade') {
      setStep(AppStep.PRIVACY);
    } else if (path === '/termos-de-uso') {
      setStep(AppStep.TERMS);
    }


    // Handle Shared Plan
    const planId = query.get('planId');
    if (planId && !sharedPlanRef.current) {
      sharedPlanRef.current = true;
      setLoadingData(true);
      userService.getProfile('dummy') // Verify supabase conn
        .catch(() => { });

      // Dynamic Import to avoid cycle or use existing global if possible
      import('./services/plansService').then(async (m) => {
        const plan = await m.plansService.getPlanById(planId);
        if (plan) {
          setCurrentItinerary(plan);
          setStep(AppStep.RESULT);
          // Clean URL? Maybe keep it so refresh works
        } else {
          alert("Roteiro não encontrado ou privado.");
        }
      }).finally(() => setLoadingData(false));
    }

    if (query.get('upgrade') === 'success' && supabaseUser) {
      if (processedRef.current) return; // Skip if already processed
      processedRef.current = true;

      // 1. Atualizar state local (Banco de dados já foi via webhook)
      // Recarregamos o profile para pegar os créditos novos
      userService.getProfile(supabaseUser.id).then(profile => {
          if (profile?.plan_credits !== undefined) {
             setUserPlanCredits(profile.plan_credits);
          }
      });
      alert("Pagamento Aprovado! 🕵️‍♂️\nSeus Cards foram adicionados ao seu perfil.");

      // Clear URL
      window.history.replaceState({}, '', '/');
    }

    if (supabaseUser) {
      userService.getProfile(supabaseUser.id).then(profile => {
        if (profile?.plan_credits !== undefined && profile?.plan_credits !== null) {
          setUserPlanCredits(profile.plan_credits);
        } else {
          setUserPlanCredits(3); // Default if no profile
        }
      });
    } else {
      setUserPlanCredits(undefined); // Reset on logout
    }
  }, [supabaseUser]);

  const user: User | null = React.useMemo(() => {
    return supabaseUser ? {
      username: supabaseUser.email?.split('@')[0] || 'User',
      fullName: supabaseUser.user_metadata?.full_name || 'Agente',
      email: supabaseUser.email || '',
      avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
      plan_credits: userPlanCredits,
    } : null;
  }, [supabaseUser, userPlanCredits]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0 || !supabaseUser) {
        return;
      }

      setUploading(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${supabaseUser.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Update User Metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (updateError) {
        throw updateError;
      }

      alert("Avatar atualizado com sucesso!");
      window.location.reload(); // Simple reload to reflect changes for now
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (user && (step === AppStep.INTRO || step === AppStep.LOGIN)) {
      setStep(AppStep.DASHBOARD);
    }
  }, [user?.email, step]); // Depend on ID/Email, not object reference

  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [comparisonQueue, setComparisonQueue] = useState<SavedPlan[]>([]);

  // Load plans from Supabase or LocalStorage
  useEffect(() => {
    // 1. If user is logged in, load from Supabase
    if (user && supabaseUser) {
      const loadUserPlans = async () => {
        try {
          const remotePlans = await plansService.getUserPlans();
          // Only update if different to avoid potential loops (though less likely with [] dep)
          setSavedPlans(remotePlans);
        } catch (err) {
          console.error("Error loading plans:", err);
        }
      };
      loadUserPlans();
    } else {
      // 2. If not logged in, stick to LocalStorage (Legacy Mode / Guest)
      const storedPlans = localStorage.getItem('pf_plans');
      if (storedPlans) setSavedPlans(JSON.parse(storedPlans));
    }

    // Always load visited from local for now (or move to DB later)
    const storedVisited = localStorage.getItem('pf_visited');
    if (storedVisited) setVisitedPlaces(JSON.parse(storedVisited));
  }, [user?.email]); // Only re-run if user email changes

  // Persist visited data (local only for now)
  useEffect(() => {
    localStorage.setItem('pf_visited', JSON.stringify(visitedPlaces));
  }, [visitedPlaces]);

  const updatePreferences = (data: Partial<TripPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...data }));
  };

  const handleProfileToggle = (id: string) => {
    setPreferences((prev) => {
      const current = prev.selectedProfiles;
      if (current.includes(id)) {
        return { ...prev, selectedProfiles: current.filter((p) => p !== id) };
      } else {
        return { ...prev, selectedProfiles: [...current, id] };
      }
    });
  };

  const generatePlan = async () => {
    if (supabaseUser) {
      const usageCheck = await userService.checkUsageAvailability(supabaseUser.id);
      if (!usageCheck.allowed) {
          alert("🚨 Sem Cards Disponíveis! 🚨\n\nVocê utilizou todos os seus planos disponíveis. Por favor, compre um novo pacote de Cards para continuar gerando roteiros incríveis.");
          setStep(AppStep.PRICING);
          return;
      }
    }

    setStep(AppStep.LOADING);
    setError(null);
    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY && !(import.meta.env as any).GEMINI_API_KEY) {
        // Fallback checks
      }
      const result = await generateTripItinerary(preferences);

      // Consume credit
      if (supabaseUser) {
        await userService.consumeCredit(supabaseUser.id);
        setUserPlanCredits(prev => (prev === undefined ? prev : Math.max(0, prev - 1)));
        await userService.incrementTripCount(supabaseUser.id);
      }

      setCurrentItinerary(result);
      setStep(AppStep.RESULT);
    } catch (err: any) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      
      let errorMessage = "Ocorreu um erro inesperado ao gerar seu plano. Tente novamente.";
      if (msg.includes("503") || msg.includes("429") || msg.includes("high demand") || msg.includes("quota") || msg.includes("UNAVAILABLE")) {
        errorMessage = "A inteligência artificial do Google está enfrentando uma demanda altíssima em todo o mundo neste exato momento. Por favor, aguarde de 1 a 2 minutos e clique em gerar novamente! ⏳ (Alta Demanda)";
      } else if (msg.includes("404") || msg.includes("NOT_FOUND")) {
        errorMessage = "Erro de conexão com o modelo de IA. Nossos engenheiros já estão atualizando o sistema. Tente novamente em breve.";
      } else {
        errorMessage = msg; // Mostra a mensagem crua para outros erros, se não for JSON feio
      }

      setError(errorMessage);
      setStep(AppStep.PROFILES);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setStep(AppStep.INTRO);
  };

  const saveCurrentPlan = async (updatedPlan: ItineraryResult) => {
    const isNewPlan = !('id' in updatedPlan) && !('id' in (currentItinerary || {}));

    if (!user || !supabaseUser) {
      if (isNewPlan && savedPlans.length >= 3) {
        alert("🔒 Limite Local Atingido!\n\nVocê atingiu o limite de 3 planos salvos no dispositivo.\nFaça login para salvar na nuvem ou exclua um plano existente.");
        return;
      }

      // Fallback for guest (Local Storage)
      const newPlan: SavedPlan = {
        ...(currentItinerary as SavedPlan), // Preserve ID if exists
        ...updatedPlan,
        id: (currentItinerary as SavedPlan)?.id || Date.now().toString(),
        createdAt: (currentItinerary as SavedPlan)?.createdAt || new Date().toISOString(),
        originalPreferences: preferences
      };
      const newPlans = [...savedPlans, newPlan];
      setSavedPlans(newPlans);
      localStorage.setItem('pf_plans', JSON.stringify(newPlans));
      setCurrentItinerary(newPlan);
      alert("Plano salvo localmente! Faça login para salvar na nuvem.");
      setStep(AppStep.DASHBOARD);
      return;
    }

    if (isNewPlan) {
      const saveCheck = await userService.checkSaveAvailability(supabaseUser.id);
      if (!saveCheck.allowed && saveCheck.reason === 'free_save_limit_reached') {
        alert("🔒 Limite de Planos Salvos!\n\nVocê atingiu o limite de 3 planos salvos na sua conta grátis.\nAssine o Premium ou exclua um plano antigo para salvar novos.");
        return;
      }
    }

    try {
      const saved = await plansService.savePlan(updatedPlan, preferences, supabaseUser.id);

      setSavedPlans(prev => {
        const exists = prev.find(p => p.id === saved.id);
        if (exists) {
          return prev.map(p => p.id === saved.id ? saved : p);
        }
        return [saved, ...prev];
      });

      setCurrentItinerary(saved);
      alert("Plano salvo na nuvem com sucesso!");
      setStep(AppStep.DASHBOARD);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar plano.");
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este plano?")) {
      if (user) {
        try {
          await plansService.deletePlan(id);
          setSavedPlans(prev => prev.filter(p => p.id !== id));
        } catch (err) {
          alert("Erro ao excluir plano.");
        }
      } else {
        const newPlans = savedPlans.filter(p => p.id !== id);
        setSavedPlans(newPlans);
        localStorage.setItem('pf_plans', JSON.stringify(newPlans));
      }
    }
  };

  // Fetch Data on User Change
  useEffect(() => {
    if (supabaseUser) {
      setLoadingData(true);
      Promise.all([
        plansService.getUserPlans(),
        plansService.getVisitedPlaces(),
        userService.getProfile(supabaseUser.id)
      ])
        .then(([plans, items, profile]) => {
          setSavedPlans(plans);
          setVisitedPlaces(items);
          if (profile?.plan_credits !== undefined && profile?.plan_credits !== null) {
            setUserPlanCredits(profile.plan_credits);
          } else {
            setUserPlanCredits(3);
          }
        })
        .catch((err) => console.error("Error loading data:", err))
        .finally(() => setLoadingData(false));
    } else {
      // Simple Local Storage for Guests
      const localPlans = localStorage.getItem('pf_plans');
      if (localPlans) setSavedPlans(JSON.parse(localPlans));

      // Maybe local visited places too?
      const localVisited = localStorage.getItem('pf_visited');
      if (localVisited) setVisitedPlaces(JSON.parse(localVisited));
    }
  }, [supabaseUser]); // removed userProfileTier dep loop

  // ... (generatePlan, etc)

  const handleAddVisited = async (place: VisitedPlace) => {
    if (supabaseUser) {
      try {
        const saved = await plansService.addVisitedPlace(place);
        setVisitedPlaces(prev => [saved, ...prev]);
      } catch (err) {
        console.error(err);
        alert("Erro ao salvar local visitado.");
      }
    } else {
      const newPlaces = [...visitedPlaces, place];
      setVisitedPlaces(newPlaces);
      localStorage.setItem('pf_visited', JSON.stringify(newPlaces));
    }
  };

  const handleDeleteVisited = async (id: string) => {
    if (window.confirm("Remover este local dos visitados?")) {
      if (supabaseUser) {
        try {
          await plansService.deleteVisitedPlace(id);
          setVisitedPlaces(prev => prev.filter(p => p.id !== id));
        } catch (err) {
          console.error(err);
          alert("Erro ao excluir local.");
        }
      } else {
        const newPlaces = visitedPlaces.filter(p => p.id !== id);
        setVisitedPlaces(newPlaces);
        localStorage.setItem('pf_visited', JSON.stringify(newPlaces));
      }
    }
  };

  const handleStartComparison = (plans: SavedPlan[]) => {
    if (plans.length < 2) {
      alert("Selecione pelo menos 2 planos para comparar.");
      return;
    }
    setComparisonQueue(plans);
    setStep(AppStep.COMPARE);
  };

  return (
    <div
      className="min-h-screen font-sans selection:bg-teal-200 bg-cover bg-center bg-fixed bg-no-repeat relative"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop')"
      }}
    >
      {/* Overlay to ensure readability */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]"></div>

      <div className="relative z-10">
        {/* Navbar */}
        <header className="fixed top-0 left-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100 h-auto py-1 md:py-2 flex items-center justify-between px-4 md:px-6 shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => user ? setStep(AppStep.DASHBOARD) : setStep(AppStep.INTRO)}>
            <img src="/logo.png" alt="Logo" className="w-16 h-16 md:w-20 md:h-20 object-contain transition-all" />
            <span className="font-bold text-xl tracking-tight text-gray-800 hidden lg:block mt-2">Plano de Fuga</span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                {user.plan_credits !== undefined && (
                  <button
                    onClick={() => setStep(AppStep.PRICING)}
                    className="bg-gray-100 hover:bg-gradient-to-r hover:from-teal-400 hover:to-teal-500 hover:text-white text-gray-700 font-bold px-3 py-1 rounded-full uppercase tracking-widest transition-all flex items-center gap-1.5 shadow-sm border border-gray-200 hover:border-transparent cursor-pointer"
                  >
                    <span className="text-sm shadow-sm opacity-90">🗂️</span>
                    <span className="text-[10px] sm:text-[11px]">{user.plan_credits} CARDS</span>
                    {user.plan_credits === 0 && <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[8px] ml-1 flex items-center justify-center animate-pulse">0</span>}
                  </button>
                )}

                {/* Avatar / Upload Trigger */}
                <div
                  className="relative cursor-pointer group"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  title="Alterar foto de perfil"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover border border-gray-300 group-hover:border-teal-500 transition-colors"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200 group-hover:border-teal-500 transition-colors">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Upload Indicator */}
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] text-white">📷</span>
                  </div>
                </div>

                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />

                <button
                  onClick={() => setStep(AppStep.USER_PROFILE)}
                  className="flex items-center gap-1 md:gap-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-3 md:px-4 py-1.5 rounded-full font-bold text-xs md:text-sm shadow-md hover:shadow-lg hover:from-teal-600 hover:to-teal-700 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>👤</span>
                  <span className="hidden sm:inline">Configurar Perfil</span>
                </button>
              </div>
            )}
            {step === AppStep.INTRO && (
              <button onClick={() => setStep(AppStep.LOGIN)} className="text-sm font-bold text-teal-700 hover:text-teal-900">Entrar</button>
            )}
          </div>
        </header>

        <main className="pt-24 md:pt-40 px-4 md:px-8 max-w-7xl mx-auto flex flex-col items-center min-h-[calc(100vh-4rem)]">

          {error && (
            <div className={`w-full max-w-2xl px-6 py-4 rounded-xl relative mb-8 shadow-lg border ${error.includes('🤖') ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-red-50 border-red-400 text-red-800'}`}>
              <div className="flex items-start gap-4">
                <div className="text-3xl mt-1">{error.includes('🤖') ? '⚠️' : '❌'}</div>
                <div>
                  <strong className="font-black block text-lg mb-1">
                    {error.includes('🤖') ? 'Quase lá...' : 'Erro'}
                  </strong>
                  <span className="block text-sm leading-relaxed">{error.replace('🤖 ', '')}</span>
                </div>
              </div>
            </div>
          )}

          {step === AppStep.INTRO && <StepIntro onStart={() => setStep(AppStep.LOGIN)} />}

          {step === AppStep.LOGIN && (
            <AuthScreen />
          )}

          {step === AppStep.DASHBOARD && user && (
            <DashboardView
              user={user}
              plans={savedPlans}
              visitedPlaces={visitedPlaces}
              onNewPlan={() => {
                setPreferences(INITIAL_PREFERENCES);
                setStep(AppStep.DETAILS);
              }}
              onViewPlan={(plan) => {
                setCurrentItinerary(plan);
                setPreferences(plan.originalPreferences);
                setStep(AppStep.RESULT);
              }}
              onDeletePlan={handleDeletePlan}
              onAddVisited={handleAddVisited}
              onDeleteVisited={handleDeleteVisited}
              onCompare={handleStartComparison}
              onLogout={handleLogout}
            />
          )}

          {step === AppStep.DETAILS && (
            <StepDetails
              preferences={preferences}
              onUpdate={updatePreferences}
              onNext={() => setStep(AppStep.PROFILES)}
              onBack={() => user ? setStep(AppStep.DASHBOARD) : setStep(AppStep.INTRO)}
            />
          )}

          {step === AppStep.PROFILES && (
            <StepProfiles
              selectedProfiles={preferences.selectedProfiles}
              onToggleProfile={handleProfileToggle}
              onNext={generatePlan}
              onBack={() => setStep(AppStep.DETAILS)}
            />
          )}

          {step === AppStep.LOADING && <LoadingView />}

          {step === AppStep.RESULT && currentItinerary && (
            <ResultView
              itinerary={currentItinerary}
              preferences={preferences}
              user={user}
              onSave={saveCurrentPlan}
              onBackToDashboard={() => setStep(AppStep.DASHBOARD)}
              isSaved={'id' in currentItinerary}
              onUpgrade={() => setStep(AppStep.PRICING)}
            />
          )}

          {step === AppStep.COMPARE && (
            <CompareView
              plans={comparisonQueue}
              onBack={() => setStep(AppStep.DASHBOARD)}
            />
          )}

          {step === AppStep.USER_PROFILE && user && (
            <UserProfileView
              user={user}
              userId={supabaseUser?.id || ''}
              onBack={() => setStep(AppStep.DASHBOARD)}
            />
          )}

          {step === AppStep.PRICING && (
            <PricingView onBack={() => setStep(AppStep.DASHBOARD)} userId={supabaseUser?.id || ''} />
          )}

          {step === AppStep.PRIVACY && (
            <PrivacyView onBack={() => {
              window.history.pushState({}, '', '/');
              setStep(user ? AppStep.DASHBOARD : AppStep.INTRO);
            }} />
          )}

          {step === AppStep.TERMS && (
            <TermsView onBack={() => {
              window.history.pushState({}, '', '/');
              setStep(user ? AppStep.DASHBOARD : AppStep.INTRO);
            }} />
          )}
        </main>

        <footer className="w-full py-6 text-center text-gray-700 text-sm font-medium relative z-20">
          <p className="bg-white/40 inline-block px-4 py-1 rounded-full mb-2">&copy; {new Date().getFullYear()} Plano de Fuga. Feito com 💙 e IA.</p>
          <div className="text-xs text-gray-500 space-x-4">
            <a href="/politica-de-privacidade" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/politica-de-privacidade'); setStep(AppStep.PRIVACY); }} className="hover:text-teal-700 underline">Política de Privacidade</a>
            <a href="/termos-de-uso" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/termos-de-uso'); setStep(AppStep.TERMS); }} className="hover:text-teal-700 underline">Termos de Uso</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default App;