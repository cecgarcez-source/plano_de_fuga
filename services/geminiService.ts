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
  const modelId = "gemini-2.0-flash";
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

export const searchGooglePlaces = async (query: string, location: string, limit: number = 5): Promise<any> => {
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
    const topPlaces = (data.places || []).slice(0, limit).map((p: any) => ({
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
  const modelId = "gemini-2.0-flash"; // User has enabled Billing Tier 1! We can use 2.0-flash unrestricted.

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

  let realPlacesContext = "";
  if (!preferences.isSurpriseDestination) {
    try {
      // Fetch hotels, restaurants, and attractions in parallel from Google Places to ground the AI and prevent hallucinations
      const [hotels, restaurants, attractions] = await Promise.all([
        searchGooglePlaces("melhores hotéis", preferences.destination, 5),
        searchGooglePlaces("restaurantes bem avaliados", preferences.destination, 8),
        searchGooglePlaces("principais atrações turísticas", preferences.destination, 8)
      ]);
      
      let contextBlocks = [];
      
      if (hotels && hotels.results?.length > 0) {
        contextBlocks.push(`[HOTÉIS REAIS VÁLIDOS]\n` + hotels.results.map((p:any) => `- ${p.name} | Nota: ${p.rating}⭐ (${p.reviews || 0} revs) | Endereço: ${p.address}`).join("\n"));
      }
      if (restaurants && restaurants.results?.length > 0) {
        contextBlocks.push(`[RESTAURANTES REAIS VÁLIDOS]\n` + restaurants.results.map((p:any) => `- ${p.name} | Nota: ${p.rating}⭐ (${p.reviews || 0} revs) | Endereço: ${p.address}`).join("\n"));
      }
      if (attractions && attractions.results?.length > 0) {
        contextBlocks.push(`[ATRAÇÕES/PASSEIOS REAIS VÁLIDOS]\n` + attractions.results.map((p:any) => `- ${p.name} | Nota: ${p.rating}⭐ (${p.reviews || 0} revs) | Endereço: ${p.address}`).join("\n"));
      }

      if (contextBlocks.length > 0) {
        realPlacesContext = `[DADOS REAIS DA API - GOOGLE PLACES]\n${contextBlocks.join("\n\n")}`;
      }
    } catch (e) {
      console.error("Falha ao buscar places reais:", e);
    }
  }

  const systemPrompt = `
    Atue como um Concierge de Viagens de Elite e um Especialista Local (Local Insider) do destino escolhido E especialista em monetização de turismo.
    Seu objetivo é criar roteiros de viagem impecáveis, fugindo de clichês e 'pegadinhas para turistas'.
    
    DIRETRIZES DE ROTEIRO (MUITO IMPORTANTE - REGRAS DE CONCISÃO E PRECISÃO GEOGRÁFICA):
    - Volume Limitado (CRÍTICO PARA NÃO CORTAR O JSON): Para cada dia, gere NO MÁXIMO 3 a 4 atividades essenciais (ex: 1 manhã, 1 tarde, 1 noite). NUNCA gere mais que 4 atividades por dia.
    - Resumo Extremo nas Descrições: Na 'description' das atividades, seja super direto (máximo de 20 palavras). Não escreva textos longos!
    - Limites Geográficos (REGRA DE OURO): TUDO (atrações, restaurantes e hotéis) DEVE FICAR ESTRITAMENTE dentro do destino. NÃO cruze para outras cidades ou estados. A precisão geográfica é a sua regra NÚMERO UM.
    - Se o usuário fornecer um [CONTEXTO DE DADOS REAIS - GOOGLE PLACES API], VOCÊ É OBRIGADO A USAR EXCLUSIVAMENTE OS LOCAIS DAQUELA LISTA PARA HOTÉIS E RESTAURANTES. NÃO CRIE LUGARES INEXISTENTES.
    - Plano B (contingencyPlan): Apenas 1 frase curta com uma alternativa (ex: "Ir ao Museu X").
    
    SAZONALIDADE E CLIMA GERAL (weatherAdvice): Analise a estação do ano referente ao período escolhido e explique brevemente: 1) Como é o clima geralmente (chuva, sol, neve, calor, etc). 2) Se o período escolhido é adequado ou qual seria a melhor época para essa viagem.
    
    DICAS PRÁTICAS (practicalInfo): 
    - currency: Breve dica sobre a moeda local e se é melhor levar espécie ou cartão.
    - documentation: Documentação necessária e exigências de visto.
    - insurance: Destaque a importância ou exigência de contratar um Seguro Viagem para este destino.
    - souvenirs: Sugira qual lembrança/souvenir autêntico o viajante não deve deixar de comprar no local.

    REGRAS CRÍTICAS DE CUSTOS (FINANCEIRO REAL):
    1. Calcule mentalmente todos os custos de hospedagem, refeição e passeios para O GRUPO INTEIRO (total projetado).
    2. DIVISÃO DE TRANSPORTE: 
       - 'transport': Custo APENAS de locomoção local na cidade (Ubers, táxis, metrô, ônibus de linha).
       - 'flights': Custo do Deslocamento Principal (Passagens Aéreas ou Rodoviárias) da Origem para o Destino para todo o grupo.
    3. CÂMBIO MESTRE (BRL): FAÇA A CONVERSÃO CAMBIAL PARA REAL BRASILEIRO e os valores DEVEM VIR ESTRITAMENTE EM REAIS (BRL).

    REGRAS DE MONETIZAÇÃO E CURADORIA (CONTEXTUAL):
    Você deve agir como um consultor que sugere produtos/serviços que AGREGAM valor.
    0. **Seguro Viagem (OBRIGATÓRIO):** Gere sempre uma Premium Tip urgenciando a compra de Seguro Saúde/Viagem para evitar falência médica, usando format 'insurance_affiliate' com um link padrão de busca de seguros.
    1. **MarketingTip (Logística):** Sugira hotéis ou aluguel de carro com call-to-action cativante. Direcione para links reais do Booking/TripAdvisor.
    2. **HotelSuggestions**: SEMPRE sugira APENAS HOTÉIS REAIS E EXISTENTES. É expressamente proibido inventar ou alucinar nomes de hotéis. Prioritariamente direcione para links reais do Booking ou TripAdvisor do hotel.

    Retorne APENAS JSON, estritamente no seguinte formato:
    {
      "destinationTitle": "Nome do destino",
      "destinationDescription": "Breve descrição",
      "coordinates": { "lat": 0.0, "lng": 0.0 },
      "justification": "Por que é perfeito",
      "costBreakdown": { "accommodation": 0, "food": 0, "activities": 0, "transport": 0, "flights": 0, "total": 0, "currency": "BRL" },
      "weatherAdvice": "Análise sazonal e melhor época sugerida.",
      "practicalInfo": { "currency": "...", "documentation": "...", "insurance": "...", "souvenirs": "..." },
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
          "logisticsTip": { "title": "Dica de Transporte", "description": "...", "ctaText": "Alugar Carro", "url": "url", "type": "transport" }
        } 
      ]
    }
    ===
    [FIM DAS REGRAS]
    ATENÇÃO: Não engula aspas, não adicione marcações Markdown ao redor do JSON (como \`\`\`json). APENAS o JSON puro.
  `;

  const userPrompt = `
    DADOS DA VIAGEM:
    Origem: ${preferences.origin}
    Destino: ${preferences.destination}
    Duração: EXATAMENTE ${preferences.duration} dias (${preferences.startDate} a ${preferences.endDate}) - CRIE EXATAMENTE ESTE NÚMERO DE DIAS!
    Orçamento: ${preferences.budget}
    Viajantes Ativos: ${preferences.travelers} pessoa(s)
    Perfis: ${preferences.selectedProfiles.join(", ")}
    Restrição/Tipo de Hospedagem: ${preferences.accommodationType || 'Qualquer'}
    ${userContext}
    
    ${realPlacesContext}
    
    Agora, baseado EXCLUSIVAMENTE nos [DADOS REAIS DA API] acima para escolher os locais e nos dados da viagem, gere o Roteiro Final completo em JSON.
  `;

  try {
    const requestConfig = {
      responseMimeType: "application/json",
      systemInstruction: { parts: [{ text: systemPrompt }] },
      maxOutputTokens: 8192,
    };

    let contents: any[] = [{ role: "user", parts: [{ text: userPrompt }] }];
    let response = await ai.models.generateContent({
      model: modelId,
      contents,
      // @ts-ignore
      config: requestConfig,
    });

    if (response.text) {
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