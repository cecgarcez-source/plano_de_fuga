import { GoogleGenAI, Type } from "@google/genai";
import { TripPreferences, ItineraryResult } from "../types";
import { userService } from "./userService";
import { supabase } from "./supabase";

export const getAiClient = () => {
  const localKey = typeof localStorage !== 'undefined' ? localStorage.getItem("VITE_GEMINI_API_KEY") : null;
  if (localKey && localKey !== "INSIRA_SUA_NOVA_CHAVE_AQUI" && localKey !== "AIzaSyCkhIrSAE5U0574bqKb8Cnij9DMulJjM-s" && localKey.trim()) {
    return new GoogleGenAI({ apiKey: localKey.trim() });
  }

  const envKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (envKey && envKey !== "INSIRA_SUA_NOVA_CHAVE_AQUI" && envKey !== "AIzaSyCkhIrSAE5U0574bqKb8Cnij9DMulJjM-s" && envKey.trim()) {
    return new GoogleGenAI({ apiKey: envKey.trim() });
  }

  return null;
};

export const hasValidApiKey = (): boolean => {
  const localKey = typeof localStorage !== 'undefined' ? localStorage.getItem("VITE_GEMINI_API_KEY") : null;
  if (localKey && localKey !== "INSIRA_SUA_NOVA_CHAVE_AQUI" && localKey !== "AIzaSyCkhIrSAE5U0574bqKb8Cnij9DMulJjM-s" && localKey.trim()) {
    return true;
  }
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (envKey && envKey !== "INSIRA_SUA_NOVA_CHAVE_AQUI" && envKey !== "AIzaSyCkhIrSAE5U0574bqKb8Cnij9DMulJjM-s" && envKey.trim()) {
    return true;
  }
  return false;
};

export const getCityCoordinates = async (cityName: string): Promise<{ lat: number; lng: number }> => {
  const modelId = "gemini-flash-latest";
  const prompt = `Retorne as coordenadas geográficas (latitude e longitude) centrais da seguinte cidade/local: "${cityName}". Retorne APENAS o JSON.`;

  const ai = getAiClient();
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
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.types,places.googleMapsLinks,places.businessStatus"
      },
      body: JSON.stringify({
        textQuery: `${query} em ${location}`,
        languageCode: "pt-BR",
        rankPreference: "RELEVANCE"
      })
    });
    
    if (!response.ok) {
      console.error("Google Places API Error", await response.text());
      return { error: "Google API error. Do NOT call this tool again. Please proceed using your internal knowledge to finish the itinerary." };
    }
    
    const data = await response.json();
    const topPlaces = (data.places || [])
      // Filter out permanently closed places before passing to AI
      .filter((p: any) => p.businessStatus !== 'CLOSED_PERMANENTLY' && p.businessStatus !== 'CLOSED_TEMPORARILY')
      .slice(0, limit)
      .map((p: any) => ({
        name: p.displayName?.text,
        address: p.formattedAddress,
        rating: p.rating,
        reviews: p.userRatingCount,
        priceLevel: p.priceLevel,
        types: p.types?.slice(0, 3),
        placeId: p.id, // Unique Google Place ID for exact Maps linking
        googleMapsUri: p.googleMapsLinks?.placeUri // Direct canonical Maps URL
      }));
    
    return { results: topPlaces };
  } catch (err) {
    console.error("Search API Error:", err);
    return { error: "An exception occurred during search." };
  }
};

/**
 * Sanitizes and parses JSON text that may contain:
 * - JS-style comments (// and /* *\/)
 * - Trailing commas before } or ]
 * - Markdown code fences (```json ... ```)
 * - Surrounding non-JSON text
 * - Truncated output (unclosed brackets due to token limit)
 */
const robustJsonParse = (raw: string): any => {
  // 1. Strip markdown fences (```json ... ``` or ``` ... ```)
  let text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  // 2. Extract the outermost JSON object if surrounded by extra text
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  // 3. Remove JS block comments (/* ... */) - careful not to touch strings
  text = text.replace(/\/\*[\s\S]*?\*\//g, '');

  // 4. Remove JS line comments (// ...) - only outside of strings
  // Uses a state machine to avoid stripping URLs like "https://..."
  let result = '';
  let inString = false;
  let escaped = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (escaped) {
      result += ch;
      escaped = false;
      i++;
      continue;
    }
    if (ch === '\\' && inString) {
      result += ch;
      escaped = true;
      i++;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      result += ch;
      i++;
      continue;
    }
    if (!inString && ch === '/' && text[i + 1] === '/') {
      // Skip until end of line
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    result += ch;
    i++;
  }
  text = result;

  // 5. Remove trailing commas before } or ] (JSON does not allow them)
  text = text.replace(/,(\s*[}\]])/g, '$1');

  // 6. First parse attempt (clean JSON)
  try {
    return JSON.parse(text);
  } catch (firstErr) {
    // JSON still invalid — may be truncated by token limit. Attempt repair.
    console.warn('robustJsonParse: first parse failed, attempting truncation repair...', (firstErr as Error).message);
  }

  // 7. Truncation Repair: close unclosed strings and brackets
  try {
    const repaired = repairTruncatedJson(text);
    if (repaired !== text) {
      console.warn('robustJsonParse: repaired truncated JSON, retrying parse...');
      return JSON.parse(repaired);
    }
  } catch (repairErr) {
    console.warn('robustJsonParse: repair attempt also failed:', (repairErr as Error).message);
  }

  // 8. Last resort: log and throw
  console.error('robustJsonParse failed. Raw text length:', text.length, '| Snippet near end:', text.slice(-300));
  throw new Error(`Falha ao interpretar o JSON retornado pela IA: JSON inválido ou truncado. Por favor, tente novamente.`);
};

/**
 * Attempts to close unclosed strings and brackets in a truncated JSON string.
 * Useful when AI output is cut short due to token limits.
 */
const repairTruncatedJson = (text: string): string => {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if ((ch === '}' || ch === ']') && stack.length > 0) stack.pop();
  }

  if (stack.length === 0 && !inString) return text; // Not truncated

  let repaired = text;

  // Close any unclosed string first
  if (inString) repaired += '"';

  // Trim trailing incomplete token (partial key/value after last comma)
  // Remove any trailing comma before we close brackets
  repaired = repaired.replace(/,\s*$/, '');

  // Close all open brackets in reverse order
  repaired += stack.reverse().join('');

  return repaired;
};

export const generateTripItinerary = async (preferences: TripPreferences): Promise<ItineraryResult> => {

  const ai = getAiClient();
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
        contextBlocks.push(`[HOTÉIS REAIS VÁLIDOS]\n` + hotels.results.map((p:any) => `- ${p.name} | placeId: ${p.placeId || 'N/A'} | Nota: ${p.rating}⭐ (${p.reviews || 0} revs) | Endereço: ${p.address} | mapsUri: ${p.googleMapsUri || 'N/A'}`).join("\n"));
      }
      if (restaurants && restaurants.results?.length > 0) {
        contextBlocks.push(`[RESTAURANTES REAIS VÁLIDOS]\n` + restaurants.results.map((p:any) => `- ${p.name} | placeId: ${p.placeId || 'N/A'} | Nota: ${p.rating}⭐ (${p.reviews || 0} revs) | Endereço: ${p.address} | mapsUri: ${p.googleMapsUri || 'N/A'}`).join("\n"));
      }
      if (attractions && attractions.results?.length > 0) {
        contextBlocks.push(`[ATRAÇÕES/PASSEIOS REAIS VÁLIDOS]\n` + attractions.results.map((p:any) => `- ${p.name} | placeId: ${p.placeId || 'N/A'} | Nota: ${p.rating}⭐ (${p.reviews || 0} revs) | Endereço: ${p.address} | mapsUri: ${p.googleMapsUri || 'N/A'}`).join("\n"));
      }

      if (contextBlocks.length > 0) {
        realPlacesContext = `
[ATENÇÃO MÁXIMA: DADOS REAIS DA API - GOOGLE PLACES MAPPING]
${contextBlocks.join("\n\n")}
[FIM DOS DADOS REAIS DA API]`;
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
    
    >>> REGRA DE OURO ANTI-ALUCINAÇÃO E MAPAS (LEIA COM ATENÇÃO) <<<
    1. Se o usuário fornecer o bloco [ATENÇÃO MÁXIMA: DADOS REAIS DA API - GOOGLE PLACES MAPPING], VOCÊ É TOTALMENTE PROIBIDO DE INVENTAR RESTAURANTES OU HOTÉIS! Você DEVE OBRIGATORIAMENTE copiar o nome exato dos Hotéis e Restaurantes da lista fornecida!
    2. Na propriedade 'location' das atividades, forneça SEMPRE O NOME OFICIAL EXACTO do local e o endereço completo real (ex: "Cristo Redentor, Estrada do Corcovado, 1, Rio de Janeiro"). NÃO use termos genéricos como "Centro", "Praia" ou "Restaurante", pois isso quebra a exatidão das coordenadas e links do Google Maps no nosso frontend.
    3. REGRA DO PLACEID (CRÍTICO PARA LINKS PRECISOS NO GOOGLE MAPS): Se nos dados da API for fornecido um 'placeId' para um local, VOCÊ DEVE OBRIGATORIAMENTE incluí-lo no campo 'placeId' da atividade correspondente. Copie o placeId EXATAMENTE como fornecido (começa com 'ChIJ'). Isso é fundamental para que os links levem ao local correto e bem avaliado no Google Maps.
    4. Para os HOTÉIS em 'hotelSuggestions': se o placeId for fornecido, preencha o campo 'placeId' do hotel suggestion correspondente. Se 'mapsUri' for fornecido, use-o no campo 'googleMapsUri'. O campo 'link' do hotel deve ser preferencialmente o mapsUri oficial do Google Maps.
    5. REGRA ANTI-ESTABELECIMENTOS FECHADOS (CRÍTICO): É ESTRITAMENTE PROIBIDO sugerir restaurantes, hotéis, atrações ou qualquer estabelecimento que esteja PERMANENTEMENTE FECHADO (encerrado, falido ou demolido). Use EXCLUSIVAMENTE os locais fornecidos nos dados reais da API (que já foram filtrados para excluir fechados). Caso não haja dados da API, use seu conhecimento e escolha APENAS lugares que você tem certeza que ainda estão em funcionamento regular. NUNCA invente ou sugira um local sobre o qual você tem dúvida se ainda está aberto.
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

    Retorne APENAS JSON válido e puro, estritamente no seguinte formato:
    {
      "destinationTitle": "Nome do destino",
      "destinationDescription": "Breve descricao",
      "coordinates": { "lat": 0.0, "lng": 0.0 },
      "justification": "Por que e perfeito",
      "costBreakdown": { "accommodation": 0, "food": 0, "activities": 0, "transport": 0, "flights": 0, "total": 0, "currency": "BRL" },
      "weatherAdvice": "Analise sazonal e melhor epoca sugerida.",
      "practicalInfo": { "currency": "...", "documentation": "...", "insurance": "...", "souvenirs": "..." },
      "hotelSuggestions": [ { "name": "Hotel", "category": "Luxo", "priceRange": "$$$", "description": "...", "link": "url", "placeId": "ChIJxxxxxxxx", "googleMapsUri": "https://maps.google.com/?cid=xxx" } ],
      "premiumTips": [ { "type": "insurance_affiliate", "title": "Seguro Viagem", "description": "...", "ctaText": "Cotar", "url": "url", "contextTrigger": "..." } ],
      "days": [ 
        { 
          "day": 1, 
          "theme": "Chegada", 
          "locationBase": "Bairro/Regiao", 
          "accommodation": "Nome do Hotel", 
          "energyScore": 3,
          "activities": [ 
            { "time": "10:00", "title": "...", "description": "...", "location": "Nome Oficial e Exato do Local, Endereco Completo", "placeId": "ChIJxxxxxxxx", "estimatedCost": 0, "contingencyPlan": "Plano B curto." } 
          ],
          "logisticsTip": { "title": "Dica de Transporte", "description": "...", "ctaText": "Alugar Carro", "url": "url", "type": "transport" }
        } 
      ]
    }
    ===
    [FIM DAS REGRAS]
    REGRAS ABSOLUTAS DE FORMATACAO JSON (VIOLACAO CAUSA ERRO FATAL):
    1. PROIBIDO usar comentarios JavaScript (// ou /* */) dentro do JSON.
    2. PROIBIDO usar virgula apos o ultimo elemento de um objeto ou array (trailing comma).
    3. PROIBIDO envolver o JSON com marcadores Markdown como \`\`\`json ou \`\`\`.
    4. Se o placeId nao estiver disponivel, use uma string vazia "" ou omita o campo. NUNCA escreva texto explicativo dentro de valores JSON.
    5. O JSON gerado deve ser parseavel diretamente por JSON.parse() sem qualquer pre-processamento.
    APENAS o JSON puro e valido.
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
      maxOutputTokens: 32768, // gemini-2.5-flash suporta até 65536; 8192 era insuficiente e causava truncamento do JSON
    };

    let contents: any[] = [{ role: "user", parts: [{ text: userPrompt }] }];
    let responseText = null;
    let lastError = null;
    // Fallback progression with robust retries per model for 503 High Demand
    const models = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.5-pro"
    ];

    for (const modelId of models) {
      let attempts = 0;
      let success = false;
      const maxAttempts = 3;

      while (attempts < maxAttempts && !success) {
        attempts++;
        try {
          console.log(`Tentando gerar roteiro com o modelo: ${modelId} (Tentativa ${attempts})...`);
          let response = await ai.models.generateContent({
            model: modelId,
            contents,
            // @ts-ignore
            config: requestConfig,
          });

          if (response.text) {
            responseText = response.text;
            console.log(`Sucesso com o modelo: ${modelId}`);
            success = true;
            break; 
          }
        } catch (err: any) {
          console.warn(`Falha no modelo ${modelId} (Tent. ${attempts}):`, err.message || err);
          
          // Se for o último modelo, salva o erro para reportar no final
          lastError = err;
          
          const errMsg = String(err.message || err).toLowerCase();
          const isRetryable = errMsg.includes("503") || errMsg.includes("429") || errMsg.includes("high demand") || errMsg.includes("quota") || errMsg.includes("unavailable");
          
          if (isRetryable && attempts < maxAttempts) {
            console.log(`Ocupado/503. Aguardando 6 segundos antes de re-tentar o modelo...`);
            await new Promise(r => setTimeout(r, 6000));
          } else {
             break; // Erro fatal (tipo 404) ou limite de tentativas excedido, parte pro próximo modelo
          }
        }
      }
      
      if (responseText) {
        break; // Sai do loop de modelos se teve sucesso
      }
    }

    if (responseText) {
      const parsed = robustJsonParse(responseText);
      return parsed;
    } else {
      throw lastError || new Error("Todos os modelos falharam na tentativa de geração.");
    }
  } catch (error) {
    console.error("Gemini AI Error:", error);
    throw error;
  }
};