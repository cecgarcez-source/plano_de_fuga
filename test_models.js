import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: "AIzaSyCocmU1vbCM0Z8EKi3XOEY2DrkCpS4MKSM" }); // Use key from .env

async function testModel(modelId) {
  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: "user", parts: [{ text: "Oi" }] }]
    });
    console.log(`✅ ${modelId} SUCCESS:`, response.text);
  } catch (e) {
    console.error(`❌ ${modelId} FAILED:`, e.message);
  }
}

async function run() {
  await testModel("gemini-1.5-flash");
  await testModel("gemini-2.0-flash");
  await testModel("gemini-1.5-pro");
  await testModel("gemini-2.5-flash");
  await testModel("gemini-1.5-flash-latest");
}

run();
