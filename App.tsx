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
  const [userProfileTier, setUserProfileTier] = useState<'free' | 'premium'>('free');

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

      // 1. Update Database
      userService.setPremium(supabaseUser.id)
        .then(() => {
          // 2. Update Local State
          setUserProfileTier('premium');
          alert("Bem-vindo à Elite, Agente! 🕵️‍♂️\nSua conta Premium foi ativada.");

          // 3. Clear URL
          window.history.replaceState({}, '', '/');
        })
        .catch(err => {
          console.error("Erro ao ativar premium:", err);
          // Only alert if we didn't succeed (check if verification shows success)
        });
    }

    if (supabaseUser) {
      userService.getProfile(supabaseUser.id).then(profile => {
        if (profile?.subscription_tier) {
          setUserProfileTier(profile.subscription_tier);
        } else {
          setUserProfileTier('free'); // Default if no profile or no tier
        }
      });
    } else {
      setUserProfileTier('free'); // Reset on logout
    }
  }, [supabaseUser]);

  const user: User | null = React.useMemo(() => {
    return supabaseUser ? {
      username: supabaseUser.email?.split('@')[0] || 'User',
      fullName: supabaseUser.user_metadata?.full_name || 'Agente',
      email: supabaseUser.email || '',
      avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
      subscriptionTier: userProfileTier,
    } : null;
  }, [supabaseUser, userProfileTier]);

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
    // 1. Check Usage Limits (if logged in)
    if (supabaseUser) {
      const canProceed = await userService.checkUsageAvailability(supabaseUser.id);
      if (!canProceed) {
        alert("🚨 Limite Gratuito Atingido! 🚨\n\nVocê já criou 2 fugas. Atualize para o plano PREMIUM para criar viagens ilimitadas e exportar PDFs.");
        // In a real app, we would redirect to payment here.
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

      // 2. Increment usage count
      if (supabaseUser) {
        await userService.incrementTripCount(supabaseUser.id);
      }

      setCurrentItinerary(result);
      setStep(AppStep.RESULT);
    } catch (err) {
      console.error(err);
      setError("Ops! Ocorreu um erro ao planejar sua fuga. Tente novamente.");
      setStep(AppStep.PROFILES);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setStep(AppStep.INTRO);
  };

  const saveCurrentPlan = async (updatedPlan: ItineraryResult) => {
    if (!user || !supabaseUser) {
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
          if (profile?.subscription_tier) {
            setUserProfileTier(profile.subscription_tier);
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
        <header className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-white/20 h-16 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => user ? setStep(AppStep.DASHBOARD) : setStep(AppStep.INTRO)}>
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            <span className="font-bold text-xl tracking-tight text-gray-800 hidden md:block">Plano de Fuga</span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                {user.subscriptionTier === 'premium' ? (
                  <span className="bg-gradient-to-r from-amber-400 to-yellow-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm tracking-wider">
                    PREMIUM
                  </span>
                ) : (
                  <button
                    onClick={() => setStep(AppStep.PRICING)}
                    className="bg-gray-200 hover:bg-gradient-to-r hover:from-amber-400 hover:to-yellow-500 hover:text-white text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider transition-all"
                  >
                    FREE (UPGRADE)
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
                  className="hidden md:flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-4 py-1.5 rounded-full font-bold text-sm shadow-md hover:shadow-lg hover:from-teal-600 hover:to-teal-700 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <span>👤</span>
                  <span>Configurar Perfil</span>
                </button>
              </div>
            )}
            {step === AppStep.INTRO && (
              <button onClick={() => setStep(AppStep.LOGIN)} className="text-sm font-bold text-teal-700 hover:text-teal-900">Entrar</button>
            )}
          </div>
        </header>

        <main className="pt-24 px-4 md:px-8 max-w-7xl mx-auto flex flex-col items-center min-h-[calc(100vh-4rem)]">

          {error && (
            <div className="w-full max-w-2xl bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6 shadow-lg">
              <strong className="font-bold">Erro: </strong>
              <span className="block sm:inline">{error}</span>
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