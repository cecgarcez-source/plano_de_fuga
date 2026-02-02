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

    Atue como uma agência de viagens de luxo E especialista em monetização de turismo (Curador de Viagem).
    Crie um "Plano de Fuga" detalhado para ${destinationPrompt}.
    
    DADOS:
    Origem: ${preferences.origin}
    Duração: ${preferences.duration} dias (${preferences.startDate} a ${preferences.endDate})
    Orçamento: ${preferences.budget}
    Perfis: ${preferences.selectedProfiles.join(", ")}
    ${accommodationPrompt}

    REGRAS CRÍTICAS DE CUSTOS:
    1. Nunca retorne custo 0 a menos que seja gratuito.
    2. Calcule média realista para restaurantes.
    3. FORCE a moeda correta no campo 'currency' e nos valores. ${currencyInstruction}

    REGRAS DE MONETIZAÇÃO E CURADORIA (CONTEXTUAL):
    Você deve agir como um consultor que sugere produtos/serviços que AGREGAM valor.
    
    1. **MarketingTip (Logística):** Nos dias onde a logística é complexa, sugira um hotel estratégico ou aluguel de carro. Use linguagem consultiva: "Para otimizar seu tempo...". O 'url' deve ser um placeholder genérico de afiliado (ex: "https://booking.com/example").
    
    2. **PremiumTips (Infoprodutos/Guias):** Baseado no perfil do usuário, sugira infoprodutos (e-books, guias técnicos) que aprofundem a experiência.
       - Ex: Se perfil "Cultural" em Brasília -> "E-book: Bússola da Arquitetura".
       - Ex: Se perfil "Gastronômico" -> "Guia Secreto de Vinhos Locais".
       - A sugestão deve parecer um material exclusivo seu (do App).

    Retorne APENAS JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
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
                },
                required: ["name", "category", "priceRange", "description"],
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
          },
          required: ["destinationTitle", "destinationDescription", "coordinates", "justification", "costBreakdown", "days", "hotelSuggestions", "premiumTips"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text);
    } else {
      throw new Error("Empty response from AI");
    }
  } catch (error) {
    console.error("Gemini AI Error:", error);
    throw error;
  }
};