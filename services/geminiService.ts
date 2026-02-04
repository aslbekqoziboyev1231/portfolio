
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => {
  const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : '';
  return new GoogleGenAI({ apiKey: apiKey || '' });
};

export const improveProjectDescription = async (title: string, currentDesc: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Improve this project description for a professional IT portfolio. Use simple words.
      Title: ${title}
      Current: ${currentDesc}
      Keep it short. Maximum 3 sentences.`,
      config: {
        temperature: 0.7,
        topP: 0.95,
      },
    });
    return response.text?.trim() || currentDesc;
  } catch (error) {
    console.error("AI Improvement failed:", error);
    return currentDesc;
  }
};

export const generateProjectIdea = async (skills: string[]): Promise<{ title: string; description: string; tags: string[] }> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a simple, modern IT project idea based on these skills: ${skills.join(", ")}. Use simple English.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["title", "description", "tags"],
        },
      },
    });
    const text = response.text || '{}';
    return JSON.parse(text);
  } catch (error) {
    console.error("Project generation failed:", error);
    return { title: "New Project", description: "Project description goes here", tags: skills };
  }
};

export const generateProjectImage = async (title: string, description: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Create a high-tech, futuristic, professional digital illustration for an IT project named "${title}". 
            Context: ${description}. 
            Style: Minimalist, clean, blueprint-inspired or cyberpunk aesthetic with indigo and violet accents. 16:9 aspect ratio.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned");
  } catch (error) {
    console.error("Image generation failed:", error);
    return `https://picsum.photos/seed/${title}/1280/720`;
  }
};

export const startAssistantChat = () => {
  const ai = getAI();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are Cognify-AI, the intelligent assistant for Cognify. 
      Help people understand what Cognify does.
      Our services: Cognitive software development, AI-driven automation, and secure infrastructure.
      Talk in simple, professional English.
      Be friendly, smart, and efficient.
      If someone asks about pricing or hiring, tell them to use the contact form at the bottom of the page.`,
      temperature: 0.8,
    },
  });
};
