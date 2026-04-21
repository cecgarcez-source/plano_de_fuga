import { GoogleGenAI, Type } from "@google/genai";
import { TripPreferences, ItineraryResult } from "../types";
import { userService } from "./userService";
import { supabase } from "./supabase";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("Google Gemini API Key is missing. AI features will not work.");
}

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getCityCoordinates = async (cityName: string): Promise<{ lat: number; lng: number }> => {
  const modelId = "gemini-2.5-flash-lite";
  const prompt = `Retorne as coordenadas geográficas (latitude e longitude) centrais da seguinte cidade/local: "${cityName}". Retorne APENAS o JSON.`;

  if (!ai) throw new Error("AI client not initialized");

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
          },
          required: ["lat", "lng"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    } else {
      throw new Error("Could not find coordinates");
    }
  } catch (error) {
    console.error("Geocoding error:", error);
    throw error;
  }
};

const searchGooglePlaces = async (query: string, location: string): Promise<any> => {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn("VITE_GOOGLE_PLACES_API_KEY missing! Returning mock data for query:", query);
    return { error: "Google Places API key is not configured. Please proceed without finding exact real local places data, use your best knowledge instead." };
  }
  
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.types"
      },
      body: JSON.stringify({
        textQuery: `${query} em ${location}`,
        languageCode: "pt-BR"
      })
    });
    
    if (!response.ok) {
      console.error("Google Places API Error", await response.text());
      return { error: "Google API error. Do NOT call this tool again. Please proceed using your internal knowledge to finish the itinerary." };
    }
    
    const data = await response.json();
    const topPlaces = (data.places || []).slice(0, 5).map((p: any) => ({
      name: p.displayName?.text,
      address: p.formattedAddress,
      rating: p.rating,
      reviews: p.userRatingCount,
      priceLevel: p.priceLevel,
      types: p.types?.slice(0, 3)
    }));
    
    return { results: topPlaces };
  } catch (err) {
    console.error("Search API Error:", err);
    return { error: "An exception occurred during search." };
  }
};

export const generateTripItinerary = async (preferences: TripPreferences): Promise<ItineraryResult> => {
  const modelId = "gemini-2.5-flash-lite";

  if (!ai) throw new Error("AI client not initialized");

  // 1. Fetch User Context
  let userContext = "";
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const profile = await userService.getProfile(user.id);
      if (profile) {
        const styles = profile.travel_style?.join(", ") || "Não informado";
        const interests = profile.interests?.join(", ") || "Não informado";
        const currency = profile.currency_preference || "BRL";

        userContext = `
        CONTEXTO DO VIAJANTE (IMPORTANTE - PERSONALIZE O ROTEIRO COM BASE NISSO):
        - Nome: ${profile.full_name || "Viajante"}
        - Biografia: ${profile.bio || "N/A"}
        - Estilo de Viagem: ${styles}
        - Interesses Principais: ${interests}
        - Restrições Alimentares: ${profile.dietary_restrictions || "Nenhuma"}
        - Moeda Preferencial: ${currency}
        
        Certifique-se de que as sugestões de restaurantes respeitem as restrições alimentares e que as atividades alinhem com os interesses citados.
        TODOS os custos devem ser estimados em ${currency}.
        `;
      }
    }
  } catch (err) {
    console.warn("Could not load user profile for AI context", err);
  }

  const destinationPrompt = preferences.isSurpriseDestination
    ? "SUGIRA um destino incrível e inesperado que combine com o perfil selecionado."
    : `O destino é ${preferences.destination}.`;

  let accommodationPrompt = "";
  if (preferences.prebookedAccommodation && preferences.prebookedAccommodation.length > 0) {
    accommodationPrompt = `
    HOSPEDAGENS JÁ DEFINIDAS PELO USUÁRIO (RESPEITE OBRIGATORIAMENTE):
    ${preferences.prebookedAccommodation.map(h => `- Hotel: ${h.name} (De ${h.checkIn} até ${h.checkOut})`).join("\n")}
    `;
  }

  const currencyInstruction = userContext.includes("Moeda Preferencial") ? "" : "Use BRL como moeda padrão se não especificado.";

  const prompt = `
    ${userContext}

    Atue como um Concierge de Viagens de Elite e um Especialista Local (Local Insider) do destino escolhido E especialista em monetização de turismo.
    Seu objetivo é criar roteiros de viagem impecáveis para ${destinationPrompt}, fugindo de clichês e 'pegadinhas para turistas'.
    
    DADOS:
    Origem: ${preferences.origin}
    Duração: ${preferences.duration} dias (${preferences.startDate} a ${preferences.endDate})
    Orçamento: ${preferences.budget}
    Viajantes Ativos: ${preferences.travelers} pessoa(s)
    Perfis: ${preferences.selectedProfiles.join(", ")}
    ${accommodationPrompt}

    DIRETRIZES DE ROTEIRO (MUITO IMPORTANTE - REGRAS DE CONCISÃO):
    - Duração Exata (CRÍTICO): Gere EXATAMENTE ${preferences.duration} objetos de dia no array 'days', numerados de 1 até ${preferences.duration}. Não encerre o roteiro antes do final do plano!
    - Volume Limitado (CRÍTICO PARA NÃO CORTAR O JSON): Para cada dia, gere NO MÁXIMO 3 a 4 atividades essenciais (ex: 1 manhã, 1 tarde, 1 noite). NUNCA gere mais que 4 atividades por dia.
    - Resumo Extremo nas Descrições: Na 'description' das atividades, seja super direto (máximo de 20 palavras). Não escreva textos longos!
    - Limites Geográficos: TODAS as atrações devem ficar ESTRITAMENTE dentro de ${preferences.destination}. NÃO cruze longas distâncias no mesmo dia.
    - Qualidade Exigida: Priorize apenas locais altamente avaliados (acima de 4.5 estrelas).
    - Plano B (contingencyPlan): Apenas 1 frase curta com uma alternativa (ex: "Ir ao Museu X").
    
    SAZONALIDADE E CLIMA GERAL (weatherAdvice): Analise a estação do ano referente ao período escolhido e explique brevemente: 1) Como é o clima geralmente (chuva, sol, neve, calor, etc). 2) Se o período escolhido é adequado ou qual seria a melhor época para essa viagem.
    
    DICAS PRÁTICAS (practicalInfo): 
    - currency: Breve dica sobre a moeda local e se é melhor levar espécie ou cartão.
    - documentation: Documentação necessária e exigências de visto.
    - insurance: Destaque a importância ou exigência de contratar um Seguro Viagem para este destino.
    - souvenirs: Sugira qual lembrança/souvenir autêntico o viajante não deve deixar de comprar no local.

    REGRAS CRÍTICAS DE CUSTOS (FINANCEIRO REAL):
    1. Baseado no grupo de ${preferences.travelers} viajante(s), calcule mentalmente todos os custos de hospedagem, refeição e passeios para O GRUPO INTEIRO (total projetado).
    2. DIVISÃO DE TRANSPORTE: 
       - 'transport': Custo APENAS de locomoção local na cidade (Ubers, táxis, metrô, ônibus de linha).
       - 'flights': Custo do Deslocamento Principal (Passagens Aéreas ou Rodoviárias) da Origem (${preferences.origin}) para o Destino (${preferences.destination}) para todo o grupo. Simule o valor mais realista possível. Se Origem e Destino forem muito próximos a ponto de ir de próprio carro, retorne 0.
    3. CÂMBIO MESTRE (BRL): Independentemente da moeda do país de destino, FAÇA A CONVERSÃO CAMBIAL PARA REAL BRASILEIRO e os valores DEVEM VIR ESTRITAMENTE EM REAIS (BRL) usando cotações atuais aproximadas.
    4. Nunca retorne custo 0 a menos que a atividade seja gratuita. O campo 'currency' deve obrigatoriamente ser "BRL".

    REGRAS DE MONETIZAÇÃO E CURADORIA (CONTEXTUAL):
    Você deve agir como um consultor que sugere produtos/serviços que AGREGAM valor.
    
    0. **Seguro Viagem (OBRIGATÓRIO):** Gere sempre uma Premium Tip urgenciando a compra de Seguro Saúde/Viagem para evitar falência médica, usando format 'insurance_affiliate' com um link padrão de busca de seguros.
    1. **MarketingTip (Logística):** Sugira hotéis ou aluguel de carro com call-to-action cativante. Direcione para links reais do Booking/TripAdvisor.
    2. **PremiumTips (Curadoria):** Sugira guias pagos ou serviços essenciais.

    3. **HotelSuggestions**: Sempre forneça um link de busca ou reserva real e útil para o hotel sugerido no campo 'link'. Prioritariamente direcione para links reais do Booking ou TripAdvisor do hotel. Em caso de não localização do link exato, informe obrigatoriamente um link para consulta no Google (ex: "https://www.google.com/search?q=nome+do+hotel+cidade").

    Retorne APENAS JSON, estritamente no seguinte formato:
    {
      "destinationTitle": "Nome do destino",
      "destinationDescription": "Breve descrição",
      "coordinates": { "lat": 0.0, "lng": 0.0 },
      "justification": "Por que é perfeito",
      "costBreakdown": { "accommodation": 0, "food": 0, "activities": 0, "transport": 0, "flights": 0, "total": 0, "currency": "BRL" },
      "weatherAdvice": "Análise sazonal e melhor época sugerida.",
      "practicalInfo": {
        "currency": "Dicas de moeda...",
        "documentation": "Vistos etc...",
        "insurance": "Seguro viagem...",
        "souvenirs": "Lembrancinhas locais..."
      },
      "hotelSuggestions": [ { "name": "Hotel", "category": "Luxo", "priceRange": "$$$", "description": "...", "link": "url" } ],
      "premiumTips": [ { "type": "insurance_affiliate", "title": "Seguro Viagem", "description": "...", "ctaText": "Cotar", "url": "url", "contextTrigger": "..." } ],
      "days": [ 
        { 
          "day": 1, 
          "theme": "Chegada", 
          "locationBase": "Bairro/Região", 
          "accommodation": "Nome do Hotel", 
          "energyScore": 3,
          "activities": [ 
            { "time": "10:00", "title": "...", "description": "...", "location": "Endereço exato", "estimatedCost": 0, "contingencyPlan": "Plano B caso chova..." } 
          ],
          "logisticsTip": { "type": "tour_affiliate", "title": "...", "description": "...", "ctaText": "...", "url": "...", "contextTrigger": "..." }
        } 
      ]
    }

    REGRA FINAL E ABSOLUTA: GARANTA QUE A RESPOSTA SEJA UM ARQUIVO JSON PERFEITAMENTE VÁLIDO E FECHADO NO FINAL (COM AS CHAVES E COLCHETES CORRETOS). E CUMPRA EXATAMENTE ${preferences.duration} DIAS.
  `;

  try {
    const requestConfig = {
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
    };

    let contents: any[] = [{ role: "user", parts: [{ text: prompt }] }];
    let response = await ai.models.generateContent({
      model: modelId,
      contents,
      // @ts-ignore
      config: requestConfig,
    });

    if (response.text) {
      // Clean potential markdown ticks
      const cleanJson = response.text.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleanJson);
    } else {
      throw new Error("Empty response from AI");
    }
  } catch (error) {
    console.error("Gemini AI Error:", error);
    throw error;
  }
};