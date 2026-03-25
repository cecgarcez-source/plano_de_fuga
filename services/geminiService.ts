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
  const modelId = "gemini-2.0-flash";

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
    Perfis: ${preferences.selectedProfiles.join(", ")}
    ${accommodationPrompt}

    DIRETRIZES DE ROTEIRO (MUITO IMPORTANTE):
    - Lógica Geográfica: Agrupe atividades por proximidade. Nunca faça o viajante cruzar a cidade várias vezes no mesmo dia.
    - Ritmo (Pacing): Respeite o perfil de energia do usuário, alternando entre atividades intensas e momentos de descanso. Considere o tempo de deslocamento.
    - Segredos Locais: Para cada dia, inclua pelo menos uma recomendação que apenas um morador conheceria (ex: um café escondido, um mirante menos disputado, a melhor hora para visitar sem filas).
    - Gastronomia Autêntica: Recomende restaurantes com base na culinária local autêntica, adequados ao orçamento selecionado pelo usuário, evitando redes de fast-food globais.
    - Estrutura da Atividade ('description'): Na descrição de CADA atividade do JSON, além de explicar a atividade, INCLUA NO TEXTO DA DESCRIÇÃO: 1) O tempo estimado de duração. 2) O melhor meio de transporte para chegar da atividade anterior. 3) Uma dica prática sobre o local (ex: compre ingresso online, cuidado com batedores de carteira).

    REGRAS CRÍTICAS DE CUSTOS:
    1. Nunca retorne custo 0 a menos que seja gratuito.
    3. FORCE a moeda correta no campo 'currency' e nos valores. ${currencyInstruction}

    REGRAS DE MONETIZAÇÃO E CURADORIA (CONTEXTUAL):
    Você deve agir como um consultor que sugere produtos/serviços que AGREGAM valor.
    
    1. **MarketingTip (Logística):** Nos dias onde a logística é complexa, sugira um hotel estratégico ou aluguel de carro. Use linguagem consultiva: "Para otimizar seu tempo...". O 'url' deve obrigatoriamente ser um link do Booking ou TripAdvisor do local/serviço sugerido. Se não encontrar o link exato, envie obrigatoriamente um link de pesquisa no Google (ex: "https://www.google.com/search?q=nome+do+local+ou+servico").
    
    2. **PremiumTips (Curadoria):** Baseado no perfil do usuário, sugira 1 a 2 guias externos reais ou recomendações de ferramentas essenciais para este destino. (O 'url' pode ser um link de busca/reserva).

    3. **HotelSuggestions**: Sempre forneça um link de busca ou reserva real e útil para o hotel sugerido no campo 'link'. Prioritariamente direcione para links reais do Booking ou TripAdvisor do hotel. Em caso de não localização do link exato, informe obrigatoriamente um link para consulta no Google (ex: "https://www.google.com/search?q=nome+do+hotel+cidade").

    E-BOOK EXCLUSIVO (LONGO E DETALHADO - APROX 5 PÁGINAS EM PDF):
    Crie o conteúdo de um "E-book Exclusivo" BEM EXTENSO em texto limpo informacional formatado (campo 'personalizedGuideText') respondendo aos interesses do viajante. 
    Este E-book DEVE ter profundidade, contendo de 1500 a 2000 palavras, dividido exatamente em 5 grandes Capítulos:
    - 1. A Essência de [Destino] e o porquê de visitá-lo.
    - 2. O Segredo dos Locais (Hacks, lugares escondidos).
    - 3. Gastronomia Autêntica (Onde comer aquilo que só os locais comem, pratos exóticos).
    - 4. Cultura, Lendas e História Oculta.
    - 5. Dicas Práticas de Ouro (Segurança, transporte, melhor lado do avião/trem, golpes comuns).
    Desenvolva CADA tópico como se fosse um livro. Não use markdown pesado, use formatação em texto limpo com tópicos textuais estruturados.

    Retorne APENAS JSON.
  `;

  try {
    const requestConfig = {
      responseMimeType: "application/json",
      tools: [{
        functionDeclarations: [
          {
            name: "searchGooglePlaces",
            description: "Pesquisa locais reais, restaurantes, hotéis e atrações turísticas usando a API do Google Places. Só chame essa função se precisar validar ou encontrar locais específicos na cidade solicitada antes de montar o roteiro.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: { type: Type.STRING, description: "Termo amplo (ex: 'pontos turísticos', 'restaurantes populares')" },
                location: { type: Type.STRING, description: "A cidade onde a busca deve ser feita" },
              },
              required: ["query", "location"]
            }
          }
        ]
      }],
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          destinationTitle: { type: Type.STRING },
          destinationDescription: { type: Type.STRING },
          coordinates: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
            },
            required: ["lat", "lng"],
          },
          justification: { type: Type.STRING },
          costBreakdown: {
            type: Type.OBJECT,
            properties: {
              accommodation: { type: Type.NUMBER },
              food: { type: Type.NUMBER },
              activities: { type: Type.NUMBER },
              transport: { type: Type.NUMBER },
              total: { type: Type.NUMBER },
              currency: { type: Type.STRING },
            },
            required: ["accommodation", "food", "activities", "transport", "total", "currency"],
          },
          hotelSuggestions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                category: { type: Type.STRING },
                priceRange: { type: Type.STRING },
                description: { type: Type.STRING },
                link: { type: Type.STRING },
              },
              required: ["name", "category", "priceRange", "description", "link"],
            },
          },
          premiumTips: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["hotel_affiliate", "infoproduct", "tour_affiliate"] },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                ctaText: { type: Type.STRING },
                url: { type: Type.STRING },
                contextTrigger: { type: Type.STRING },
              },
              required: ["type", "title", "description", "ctaText", "url", "contextTrigger"],
            },
          },
          days: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.NUMBER },
                theme: { type: Type.STRING },
                locationBase: { type: Type.STRING },
                accommodation: { type: Type.STRING },
                activities: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      time: { type: Type.STRING },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      location: { type: Type.STRING },
                      estimatedCost: { type: Type.NUMBER },
                    },
                    required: ["time", "title", "description", "location", "estimatedCost"],
                  },
                },
                logisticsTip: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ["hotel_affiliate", "infoproduct", "tour_affiliate"] },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    ctaText: { type: Type.STRING },
                    url: { type: Type.STRING },
                    contextTrigger: { type: Type.STRING },
                  },
                  required: ["type", "title", "description", "ctaText", "url", "contextTrigger"],
                }
              },
              required: ["day", "theme", "locationBase", "accommodation", "activities"],
            },
          },
          personalizedGuideText: { type: Type.STRING },
        },
        required: ["destinationTitle", "destinationDescription", "coordinates", "justification", "costBreakdown", "days", "hotelSuggestions", "premiumTips", "personalizedGuideText"],
      },
    };

    let contents: any[] = [{ role: "user", parts: [{ text: prompt }] }];
    let response = await ai.models.generateContent({
      model: modelId,
      contents,
      // @ts-ignore - The types for genai might be slightly outdated globally but runtime supports this
      config: requestConfig,
    });

    // Handle Tool Calling Interception
    const MAX_TOOL_LOOPS = 3;
    let loops = 0;
    
    while (response.functionCalls && response.functionCalls.length > 0 && loops < MAX_TOOL_LOOPS) {
      loops++;
      const call = response.functionCalls[0];
      console.log(`[Gemini Tool Call] Func: ${call.name} | Args:`, call.args);
      
      let apiResult: any = {};
      if (call.name === "searchGooglePlaces") {
         const args = call.args as { query: string, location: string };
         apiResult = await searchGooglePlaces(args.query, args.location);
      }
      
      // Append model's tool call response
      contents.push(response.candidates?.[0]?.content);
      
      // Append the tool execution response back to user
      contents.push({
        role: "user",
        parts: [{
          functionResponse: {
            name: call.name,
            response: apiResult
          }
        }]
      });
      
      console.log(`[Gemini Tool Return] Fed data back to AI.`);
      // Run generation again
      response = await ai.models.generateContent({
        model: modelId,
        contents,
        // @ts-ignore
        config: requestConfig,
      });
    }

    // Se saiu do loop e ainda quer chamar ferramenta, force a geração final
    if (!response.text && response.functionCalls) {
       console.log("[Gemini Tool Return] Forcing final generation without tools.");
       contents.push({ role: "user", parts: [{ text: "Não faça mais buscas. Por favor, crie e retorne o Roteiro Final completo estritamente em JSON de acordo com o JSON Schema agora." }] });
       
       const finalConfig = { ...requestConfig, tools: undefined };
       response = await ai.models.generateContent({
         model: modelId,
         contents,
         config: finalConfig as any,
       });
    }

    if (response.text) {
      // Clean potential markdown ticks
      const cleanJson = response.text.replace(/```json\n?|```/g, '').trim();
      return JSON.parse(cleanJson);
    } else {
      throw new Error("Empty response from AI after tools execution");
    }
  } catch (error) {
    console.error("Gemini AI Error:", error);
    throw error;
  }
};