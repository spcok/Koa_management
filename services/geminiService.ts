
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Animal, LogType, AnimalCategory, ConservationStatus } from "../types";

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const normalizeIUCNStatus = (input: string): ConservationStatus => {
  const s = input.trim().toUpperCase();
  if (s === 'LC' || s.includes('LEAST CONCERN')) return ConservationStatus.LC;
  if (s === 'NT' || s.includes('NEAR THREATENED')) return ConservationStatus.NT;
  if (s === 'VU' || s.includes('VULNERABLE')) return ConservationStatus.VU;
  if (s === 'EN' || (s.includes('ENDANGERED') && !s.includes('CRITICALLY'))) return ConservationStatus.EN;
  if (s === 'CR' || s.includes('CRITICALLY ENDANGERED')) return ConservationStatus.CR;
  if (s === 'EW' || s.includes('EXTINCT IN THE WILD')) return ConservationStatus.EW;
  if (s === 'EX' || (s.includes('EXTINCT') && !s.includes('WILD'))) return ConservationStatus.EX;
  if (s === 'DD' || s.includes('DATA DEFICIENT')) return ConservationStatus.DD;
  return ConservationStatus.NE;
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimited = error.message?.includes('429') || error.status === 429;
    const isServiceUnavailable = error.message?.includes('503') || error.status === 503;
    if (retries > 0 && (isRateLimited || isServiceUnavailable)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry<T>(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const batchGetSpeciesData = async (speciesList: string[]): Promise<Record<string, { latin?: string, status?: ConservationStatus }>> => {
  if (speciesList.length === 0) return {};
  const ai = getAi();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide scientific name and IUCN Red List status for: ${speciesList.join(', ')}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            speciesData: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  commonName: { type: Type.STRING },
                  latin: { type: Type.STRING },
                  status: { type: Type.STRING }
                },
                required: ["commonName", "latin", "status"]
              }
            }
          },
          required: ["speciesData"]
        },
        temperature: 0.1,
      }
    }));
    
    const parsed = JSON.parse(response.text || '{"speciesData":[]}');
    const normalized: Record<string, { latin?: string, status?: ConservationStatus }> = {};
    parsed.speciesData.forEach((item: any) => {
      normalized[item.commonName] = { latin: item.latin, status: normalizeIUCNStatus(item.status) };
    });
    return normalized;
  } catch (error) {
    console.error("Gemini Error:", error);
    return {};
  }
};

export const analyzeHealthHistory = async (animal: Animal): Promise<string> => {
  const ai = getAi();
  const healthLogs = (animal.logs || [])
    .filter(l => l.type === LogType.HEALTH || l.type === LogType.WEIGHT)
    .slice(0, 20);
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze clinical history for ${animal.name} (${animal.species}): ${JSON.stringify(healthLogs)}.`,
      config: {
          systemInstruction: "You are a professional avian and exotic veterinarian.",
          thinkingConfig: { thinkingBudget: 4000 }
      }
    }));
    return response.text || "Clinical analysis unavailable.";
  } catch (error) { return "Error connecting to clinical diagnostic engine."; }
};

export const generateSpeciesCard = async (species: string): Promise<{ text: string, mapImage?: string }> => {
  const ai = getAi();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `Generate educational sign content (Markdown) for "${species}" including Diet, Habitat, and Facts. Also generate a world map highlighting native range in high-contrast red.` }]
      },
      config: { imageConfig: { aspectRatio: "16:9" } }
    }));
    let text = "";
    let mapImage: string | undefined = undefined;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) text += part.text;
        else if (part.inlineData) mapImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return { text: text || "Dossier synthesis failed.", mapImage };
  } catch (error) { return { text: "Error connecting to AI diagnostic engine." }; }
};

export const generateExoticSummary = async (species: string): Promise<string> => {
  const ai = getAi();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide a concise, engaging 2-3 sentence summary about the species "${species}" for an educational postcard.`,
    }));
    return response.text || "Summary unavailable.";
  } catch (error) { return "Error connecting to AI summary engine."; }
};

export const generateSectionSummary = async (category: AnimalCategory, animals: Animal[]): Promise<string> => {
  const ai = getAi();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide an operational summary for the ${category} section status based on ${animals.length} subjects.`,
      config: { systemInstruction: "You are a senior zoological curator." }
    }));
    return response.text || "Section review unavailable.";
  } catch (error) { return "Error connecting to AI review engine."; }
};

export const analyzeCollectionHealth = async (animals: Animal[]): Promise<string> => {
  const ai = getAi();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Perform a health audit briefing for the collection: ${JSON.stringify(animals.map(a => ({ name: a.name, species: a.species, condition: a.logs?.[0]?.condition } )))}.`,
      config: { systemInstruction: "You are a professional veterinarian giving a morning briefing.", thinkingConfig: { thinkingBudget: 4000 } }
    }));
    return response.text || "Collection health briefing unavailable.";
  } catch (error) { return "Error connecting to health analysis engine."; }
};
