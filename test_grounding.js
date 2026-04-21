import { GoogleGenAI } from "@google/genai";

async function testGrounding() {
  const apiKey = "AIzaSyC3XMug62lrEQgHBwtrgR7So4D793p10F0"; // user's new key
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `Crie a array JSON [ { nome, endereco } ] com 3 locais reais em Marabá, Brasil. Locais devem ser restaurantes famosos que existem na realidade. Nao invente.`;
  
  try {
      const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-lite", // let's see if lite supports it
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            tools: [{ googleSearch: {} }],
            responseMimeType: "application/json"
          }
      });
      console.log("Lite successfully generated:", response.text);
  } catch (err) {
      console.error("Lite error: ", err.message);
  }
}

testGrounding();
