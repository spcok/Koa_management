
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Animal, LogType, AnimalCategory, ConservationStatus } from "../types";

/**
 * Valid 1x1 Transparent PNG for fallback/context
 */
const MAP_TEMPLATE_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/**
 * Initializes the Gemini API client
 */
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Helper to normalize string input to a ConservationStatus enum value
 */
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

/**
 * Helper for exponential backoff retries
 * Now handles both 429 (Rate Limit) and 503 (Service Unavailable/High Demand)
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRateLimited = error.message?.includes('429') || error.status === 429;
    const isServiceUnavailable = error.message?.includes('503') || error.status === 503 || error.status === 'UNAVAILABLE';
    
    if (retries > 0 && (isRateLimited || isServiceUnavailable)) {
      console.warn(`Gemini API issue (${error.status || 'transient'}). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry<T>(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Fetches the scientific Latin name for a given species
 */
export const getLatinName = async (species: string): Promise<string | null> => {
  if (!species.trim()) return null;
  const ai = getAi();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide only the scientific (Latin) name for the species: "${species}". Return only the name, no extra text.`,
      config: {
        temperature: 0.1,
      }
    }));
    return response.text?.trim() || null;
  } catch (error) {
    console.error("Gemini Error (getLatinName):", error);
    return null;
  }
};

/**
 * Fetches the IUCN Red List status for a given species
 */
export const getConservationStatus = async (species: string): Promise<ConservationStatus | null> => {
  if (!species.trim()) return null;
  const ai = getAi();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Identify the current official IUCN Red List conservation status for the species: "${species}". 
      Return ONLY the label (e.g. "Least Concern") or the code (e.g. "LC").`,
      config: {
        temperature: 0.1,
      }
    }));
    const statusText = response.text?.trim();
    if (!statusText) return null;

    return normalizeIUCNStatus(statusText);
  } catch (error) {
    console.error("Gemini Error (getConservationStatus):", error);
    return null;
  }
};

/**
 * Batch version of species intelligence fetching to prevent 429 rate limits
 */
export const batchGetSpeciesData = async (speciesList: string[]): Promise<Record<string, { latin?: string, status?: ConservationStatus }>> => {
  if (speciesList.length === 0) return {};
  const ai = getAi();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `For the following list of animal species, provide their scientific (Latin) name and their current official IUCN Red List conservation status.
      
      Species List: ${speciesList.join(', ')}
      
      Return the data as a JSON object where keys are the original species names from the list.
      Values must be objects with:
      - "latin": string (the scientific name)
      - "status": string (The IUCN label or code)

      Return ONLY the JSON object, no markdown formatting or extra text.`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    }));
    
    try {
        const rawJson = JSON.parse(response.text || '{}');
        const normalized: Record<string, { latin?: string, status?: ConservationStatus }> = {};
        
        Object.keys(rawJson).forEach(species => {
          normalized[species] = {
            latin: rawJson[species].latin,
            status: rawJson[species].status ? normalizeIUCNStatus(rawJson[species].status) : undefined
          };
        });
        
        return normalized;
    } catch (e) {
        console.error("Failed to parse batch JSON response", response.text);
        return {};
    }
  } catch (error) {
    console.error("Gemini Error (batchGetSpeciesData):", error);
    return {};
  }
};

/**
 * Generates specific content for the Aviary Sign
 */
export const generateSignageContent = async (species: string): Promise<{ 
    diet: string[], 
    habitat: string[], 
    didYouKnow: string[],
    speciesStats: { lifespanWild: string, lifespanCaptivity: string, wingspan: string, weight: string } 
}> => {
  const ai = getAi();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `For the animal species "${species}", provide content for a zoo enclosure sign.
      
      I need:
      1. DIET: Exactly 2 engaging bullet points about their natural diet. Sentences can be moderately detailed (approx 15-20 words).
      2. HABITAT: Exactly 3 engaging bullet points about their native environment. Sentences can be moderately detailed.
      3. DID YOU KNOW: Exactly 2 fun facts. Sentences can be moderately detailed to fill available space.
      4. STATS: 
         - Wild Lifespan (e.g. "10-12 years")
         - Captivity Lifespan (e.g. "Up to 20 years")
         - Wingspan (or Length if not bird)
         - Weight range

      Return purely valid JSON with keys: 
      "diet" (string[]), 
      "habitat" (string[]), 
      "didYouKnow" (string[]),
      "speciesStats" (object with keys "lifespanWild", "lifespanCaptivity", "wingspan", "weight").`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.4,
      }
    }));

    return JSON.parse(response.text || '{"diet":[], "habitat":[], "didYouKnow":[], "speciesStats":{}}');
  } catch (error) {
    console.error("Gemini Error (generateSignageContent):", error);
    return { 
        diet: [], 
        habitat: [], 
        didYouKnow: [], 
        speciesStats: { lifespanWild: '-', lifespanCaptivity: '-', wingspan: '-', weight: '-' } 
    };
  }
};

/**
 * Generates an operational summary for a collection section
 */
export const generateSectionSummary = async (category: AnimalCategory, animals: Animal[]): Promise<string> => {
  const ai = getAi();
  const context = animals.map(a => ({
    name: a.name,
    species: a.species,
    lastWeight: a.logs?.find(l => l.type === LogType.WEIGHT)?.value,
    lastFeed: a.logs?.find(l => l.type === LogType.FEED)?.value,
  }));

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a senior zookeeper at Kent Owl Academy. Provide a professional, concise operational status report for the ${category} section based on this data: ${JSON.stringify(context)}. Identify any animals needing attention or positive weight trends.`,
    }));
    return response.text || "Operational summary currently unavailable.";
  } catch (error) {
    console.error("Gemini Error (generateSectionSummary):", error);
    return "Operational summary currently unavailable.";
  }
};

/**
 * Performs a clinical analysis of an animal's health history
 */
export const analyzeHealthHistory = async (animal: Animal): Promise<string> => {
  const ai = getAi();
  const healthLogs = (animal.logs || [])
    .filter(l => l.type === LogType.HEALTH || l.type === LogType.WEIGHT)
    .slice(0, 15);

  const context = {
    name: animal.name,
    species: animal.species,
    targetWeight: animal.flyingWeight || animal.winterWeight,
    history: healthLogs.map(l => ({
      date: l.date,
      type: l.type,
      value: l.value,
      bcs: l.bcs,
      notes: l.notes
    }))
  };

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a specialized avian veterinarian. Analyze the following medical and weight history for "${animal.name}" (${animal.species}): ${JSON.stringify(context)}. 
      Provide a concise clinical summary (max 150 words). 
      Format: 
      - STATUS: (Stable/Improving/Concerns)
      - KEY OBSERVATIONS: (Bullet points)
      - RECOMMENDED MONITORING: (What staff should look for)`,
    }));
    return response.text || "Clinical analysis unavailable.";
  } catch (error) {
    console.error("Gemini Error (analyzeHealthHistory):", error);
    return "Error connecting to clinical diagnostic engine.";
  }
};

/**
 * Performs a top-level audit of the entire collection's health
 */
export const analyzeCollectionHealth = async (animals: Animal[]): Promise<string> => {
  const ai = getAi();
  const healthContext = animals
    .filter(a => !a.archived)
    .map(a => {
        const latestHealth = a.logs?.find(l => l.type === LogType.HEALTH);
        const latestWeight = a.logs?.find(l => l.type === LogType.WEIGHT);
        return {
            name: a.name,
            species: a.species,
            condition: latestHealth?.condition,
            bcs: latestHealth?.bcs,
            weight: latestWeight?.value
        };
    });

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are the Chief Curator. Review this collection health data: ${JSON.stringify(healthContext)}. 
      Provide a "Morning Briefing" summary. 
      Identify the top 3 animals requiring immediate veterinary attention or monitoring today. 
      Tone: Professional, urgent but calm.`,
    }));
    return response.text || "Collection audit failed.";
  } catch (error) {
    console.error("Gemini Error (analyzeCollectionHealth):", error);
    return "Unable to perform collection-wide health audit.";
  }
};

/**
 * Generates an educational dossier and distribution map for a species
 */
export const generateSpeciesCard = async (species: string): Promise<{ text: string, mapImage?: string }> => {
  const ai = getAi();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Generate a professional educational dossier for "${species}" in Markdown format. Include sections: HABITAT, DIETARY ADAPTATIONS, and CONSERVATION STATUS. 
            
            ALSO: Generate a clear, high-contrast world map highlighting the native geographic range of this species in red.`
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9"
        }
      }
    }));

    let text = "";
    let mapImage: string | undefined = undefined;

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          text += part.text;
        } else if (part.inlineData) {
          mapImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    return {
      text: text || "Dossier synthesis failed.",
      mapImage
    };
  } catch (error) {
    console.error("Gemini Error (generateSpeciesCard):", error);
    try {
        const textResponse = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a professional educational dossier for "${species}" in Markdown format. Include sections: HABITAT, DIETARY ADAPTATIONS, and CONSERVATION STATUS.`
        }));
        return { text: textResponse.text || "Error connecting to AI diagnostic engine." };
    } catch (e) {
        return { text: "Error connecting to AI diagnostic engine." };
    }
  }
};

/**
 * Generates a concise summary for a postcard (Description + Location)
 */
export const generateExoticSummary = async (species: string): Promise<string> => {
  const ai = getAi();
  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide two very concise sentences for "${species}". Sentence 1: A brief physical description. Sentence 2: Where they are natively found in the world. No headers, just the sentences.`,
      config: { temperature: 0.7 }
    }));
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Gemini Error (generateExoticSummary):", error);
    return "";
  }
};
