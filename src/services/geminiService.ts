
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Animal, LogType, AnimalCategory, ConservationStatus } from "../types";

let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

const normalizeIUCNStatus = (input: string): ConservationStatus => {
  const s = input.trim().toUpperCase();
  if (s === 'LC' || s.includes('LEAST CONCERN')) return ConservationStatus.LC;
  if (s === 'NT' || s.includes('NEAR THREATENED')) return ConservationStatus.NT;
  if (s === 'VU' || s.includes('VULNERABLE')) return ConservationStatus.VU;
  if (s === 'EN' || s.includes('ENDANGERED') && !s.includes('CRITICALLY')) return ConservationStatus.EN;
  if (s === 'CR' || s.includes('CRITICALLY ENDANGERED')) return ConservationStatus.CR;
  if (s === 'EW' || s.includes('EXTINCT IN THE WILD')) return ConservationStatus.EW;
  if (s === 'EX' || s.includes('EXTINCT') && !s.includes('WILD')) return ConservationStatus.EX;
  if (s === 'DD' || s.includes('DATA DEFICIENT')) return ConservationStatus.DD;
  return ConservationStatus.NE;
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimited = error.message?.includes('429') || error.status === 429;
    const isServiceUnavailable = error.message?.includes('503') || error.status === 503 || error.status === 'UNAVAILABLE';
    
    if (retries > 0 && (isRateLimited || isServiceUnavailable)) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry<T>(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Helper to aggregate stream responses
async function aggregateStream(stream: AsyncGenerator<GenerateContentResponse>): Promise<string> {
    let fullText = '';
    for await (const chunk of stream) {
        if (chunk.text) fullText += chunk.text;
    }
    return fullText;
}

export const getLatinName = async (species: string): Promise<string | null> => {
  if (!species.trim()) return null;
  const ai = getAi();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide only the scientific (Latin) name for the species: "${species}". Return only the name, no extra text.`,
      config: { temperature: 0.1 }
    }));
    return response.text?.trim() || null;
  } catch (error) { return null; }
};

export const getConservationStatus = async (species: string): Promise<ConservationStatus | null> => {
  if (!species.trim()) return null;
  const ai = getAi();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Identify the current official IUCN Red List conservation status for the species: "${species}". Return ONLY the label (e.g. "Least Concern") or the code (e.g. "LC").`,
      config: { temperature: 0.1 }
    }));
    return normalizeIUCNStatus(response.text?.trim() || '');
  } catch (error) { return null; }
};

export const batchGetSpeciesData = async (speciesList: string[]): Promise<Record<string, { latin?: string, status?: ConservationStatus }>> => {
  if (speciesList.length === 0) return {};
  const ai = getAi();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `For the following list of animal species, provide their scientific (Latin) name and their current official IUCN Red List conservation status.
      Species List: ${speciesList.join(', ')}
      Return the data as a JSON object where keys are the original species names from the list.
      Values must be objects with: "latin": string, "status": string. Return ONLY the JSON object.`,
      config: { responseMimeType: "application/json", temperature: 0.1 }
    }));
    return JSON.parse(response.text || '{}');
  } catch (error) { return {}; }
};

export const generateSignageContent = async (species: string): Promise<any> => {
  const ai = getAi();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `For the animal species "${species}", provide content for a zoo enclosure sign.
      I need: 1. DIET: Exactly 2 points. 2. HABITAT: Exactly 3 points. 3. DID YOU KNOW: Exactly 2 facts. 4. WILD ORIGIN: Max 5 words. 5. STATS: Wild Lifespan, Captivity Lifespan, Wingspan/Length, Weight.
      Return purely valid JSON.`,
      config: { responseMimeType: "application/json", temperature: 0.4 }
    }));
    return JSON.parse(response.text || '{}');
  } catch (error) { return {}; }
};

export const analyzeFlightWeather = async (hourlyData: any[]): Promise<string> => {
  const ai = getAi();
  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: `You are a professional Falconer and Safety Officer. Review this 24h weather data: ${JSON.stringify(hourlyData.slice(0, 24))}.
      Provide a "Flight Safety Briefing" for today. Identify: 1. SAFETY INDEX (1-10). 2. OPERATIONAL WINDOWS. 3. HAZARDS. 4. VERDICT. Format with clear bold headers and bullet points.`,
    });
    return await aggregateStream(stream);
  } catch (error) { return "Weather analysis engine is currently offline."; }
};

export const generateSectionSummary = async (category: AnimalCategory, animals: Animal[]): Promise<string> => {
  const ai = getAi();
  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: `Provide a professional operational status report for the ${category} section.`,
    });
    return await aggregateStream(stream);
  } catch (error) { return "Summary unavailable."; }
};

export const analyzeHealthHistory = async (animal: Animal): Promise<string> => {
  const ai = getAi();
  const healthLogs = (animal.logs || []).filter(l => l.type === LogType.HEALTH || l.type === LogType.WEIGHT).slice(0, 15);
  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: `Analyze health history for "${animal.name}" (${animal.species}): ${JSON.stringify(healthLogs)}. Synthesize findings into a brief clinical summary. Note trends, anomalies, and potential areas for monitoring. Use Markdown.`,
    });
    return await aggregateStream(stream);
  } catch (error) { return "Analysis unavailable."; }
};

export const analyzeCollectionHealth = async (animals: Animal[]): Promise<string> => {
  const ai = getAi();
  const context = animals.filter(a => !a.archived).map(a => ({ name: a.name, species: a.species, lastWeight: a.logs.find(l=>l.type===LogType.WEIGHT)?.value }));
  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: `Review this collection data: ${JSON.stringify(context)}. Provide a concise "Morning Veterinary Briefing". Highlight any animals requiring monitoring, note recent weight changes, and suggest any prophylactic actions for the day. Use Markdown.`,
    });
    return await aggregateStream(stream);
  } catch (error) { return "Audit failed."; }
};

export const generateSpeciesCard = async (species: string): Promise<{ text: string, mapImage?: string }> => {
  const ai = getAi();
  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: `Generate a comprehensive "Species Intelligence Dossier" for "${species}".
      Include sections for:
      - Global Conservation Status & Threats
      - Dietary Adaptations
      - Behavioral Traits
      - Native Range description
      
      Format as clean Markdown. Do not include images.`,
    });
    
    const fullText = await aggregateStream(stream);
    return { text: fullText || "Synthesis failed." };
  } catch (error) { 
    return { text: `### **${species} (Offline)**\n\nAI service unavailable.` }; 
  }
};

export const generateExoticSummary = async (species: string): Promise<string> => {
  const ai = getAi();
  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-3-flash-preview',
      contents: `Create a 3-sentence, engaging zoo registry summary for "${species}".`,
      config: { temperature: 0.7 }
    });
    return (await aggregateStream(stream)).trim();
  } catch (error) { return ""; }
};
