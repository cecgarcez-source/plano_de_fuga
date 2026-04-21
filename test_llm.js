import { GoogleGenAI } from "@google/genai";

async function testLLM() {
  const apiKey = "AIzaSyC3XMug62lrEQgHBwtrgR7So4D793p10F0"; // from .env
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
  [CONTEXTO DE DADOS REAIS - GOOGLE PLACES API]
  Sua memória para cidades menores costuma falhar. PORTANTO, VOCÊ DEVE OBRIGATORIAMENTE PRIORIZAR OS LOCAIS ABAIXO (OBTIDOS DIRETAMENTE DO GOOGLE MAPS EM TEMPO REAL) PARA MONTAR O ROTEIRO DE Marabá:
  
  [HOTÉIS REAIS]
  - Golden Ville Hotel | Endereço: BR-230, 540 - Nova Marabá, Marabá - PA
  - Amazônia Palace Hotel | Endereço: BR-230, Km 4,5
  
  [RESTAURANTES REAIS]
  - Alonso Gastrobar | Endereço: Av. Mal. Deodoro, 64
  - Restaurante Sabor da Amazônia | Endereço: Lote 18
  
  [ATRAÇÕES E PASSEIOS REAIS]
  - Parque Zoobotânico-Marabá | Endereço: Br. 155, km 09
  - Orla de Marabá | Endereço: Av. Mal. Deodoro, 24
  
  Gere um roteiro JSON com os hoteis e restaurantes acima. Use apenas os nomes acima. Nao invente nada.
  `;
  
  const response = await ai.models.generateContent({
      model: "gemini-1.5-flash-latest",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json"
      }
  });
  
  console.log(response.text);
}

testLLM();
