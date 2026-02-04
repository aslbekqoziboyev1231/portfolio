
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';

interface VoiceAssistantProps {
  onCommand: (command: string, args: any) => void;
}

// Audio Utils
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const navigateToFunction: FunctionDeclaration = {
  name: 'navigateTo',
  parameters: {
    type: Type.OBJECT,
    description: 'Navigate to a specific section of the portfolio.',
    properties: {
      section: {
        type: Type.STRING,
        enum: ['home', 'work', 'skills'],
        description: 'The ID of the section to scroll to.',
      },
    },
    required: ['section'],
  },
};

const toggleThemeFunction: FunctionDeclaration = {
  name: 'toggleTheme',
  parameters: {
    type: Type.OBJECT,
    description: 'Toggle the application theme between light and dark mode.',
    properties: {},
  },
};

const openAdminFunction: FunctionDeclaration = {
  name: 'openAdmin',
  parameters: {
    type: Type.OBJECT,
    description: 'Open the administrative login terminal.',
    properties: {},
  },
};

export default function VoiceAssistant({ onCommand }: VoiceAssistantProps) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const sessionRef = useRef<any>(null);
  const audioContexts = useRef<{ input: AudioContext; output: AudioContext } | null>(null);
  const nextStartTime = useRef(0);
  const sources = useRef<Set<AudioBufferSourceNode>>(new Set());

  const cleanup = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
    setTranscript('');
    
    for (const source of sources.current) {
      source.stop();
    }
    sources.current.clear();
  };

  const startSession = async () => {
    try {
      setIsConnecting(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

      if (!audioContexts.current) {
        audioContexts.current = {
          input: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 }),
          output: new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 })
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsActive(true);
            
            // Start streaming mic
            const source = audioContexts.current!.input.createMediaStreamSource(stream);
            const scriptProcessor = audioContexts.current!.input.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const blob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: blob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContexts.current!.input.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
                setTranscript(prev => prev + ' ' + message.serverContent?.inputTranscription?.text);
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                onCommand(fc.name, fc.args);
                sessionPromise.then(session => {
                  session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result: "ok" },
                    }
                  });
                });
              }
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = audioContexts.current!.output;
              nextStartTime.current = Math.max(nextStartTime.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sources.current.delete(source));
              source.start(nextStartTime.current);
              nextStartTime.current += buffer.duration;
              sources.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              for (const s of sources.current) s.stop();
              sources.current.clear();
              nextStartTime.current = 0;
            }

            if (message.serverContent?.turnComplete) {
                setTranscript('');
            }
          },
          onerror: (e) => {
            console.error('Voice Assistant Error:', e);
            cleanup();
          },
          onclose: () => cleanup()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          tools: [{ functionDeclarations: [navigateToFunction, toggleThemeFunction, openAdminFunction] }],
          systemInstruction: 'You are Cognify-Voice, a high-tech voice assistant for the Cognify portfolio. You can help users navigate the site, toggle dark mode, or open the admin terminal. Be brief, professional, and efficient. Use tools whenever a user asks to go somewhere or change settings.',
          inputAudioTranscription: {},
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err) {
      console.error('Failed to start voice session:', err);
      cleanup();
    }
  };

  const toggleVoice = () => {
    if (isActive) cleanup();
    else startSession();
  };

  return (
    <div className="fixed bottom-32 right-8 z-[60] flex flex-col items-end gap-4 pointer-events-none">
      {isActive && (
        <div className="glass p-6 rounded-[2rem] border-indigo-500/30 max-w-[250px] animate-in slide-in-from-bottom-5 fade-in duration-300 pointer-events-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Voice Active</span>
          </div>
          <div className="text-[10px] text-gray-500 font-mono line-clamp-2">
            {transcript || "Listening for command..."}
          </div>
        </div>
      )}
      
      <button 
        onClick={toggleVoice}
        disabled={isConnecting}
        className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center transition-all duration-700 shadow-2xl hover:scale-110 active:scale-90 pointer-events-auto ${isActive ? 'bg-red-600/20 text-red-500 border border-red-500/30 rotate-90' : 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30'}`}
      >
        {isConnecting ? (
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        ) : isActive ? (
          <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        ) : (
          <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
        )}
      </button>
    </div>
  );
}
