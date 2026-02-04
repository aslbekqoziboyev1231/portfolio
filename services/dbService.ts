
import { Project, Message } from '../types.ts';

/**
 * SECURITY NOTE: In a production environment, this URI and the database logic 
 * should stay on a Node.js/Serverless backend. 
 */
const MONGODB_URI = "mongodb+srv://cognify:COGNIFY1011@cluster0.qgandg6.mongodb.net/?appName=Cluster0";

// Mocking the behavior of a MongoDB collection
const COLLECTIONS = {
  PROJECTS: 'cognify projects',
  MESSAGES: 'cognify messages'
};

export const dbService = {
  getUri: () => MONGODB_URI,
  
  async fetchProjects(): Promise<Project[]> {
    const data = localStorage.getItem(COLLECTIONS.PROJECTS);
    return data ? JSON.parse(data) : [];
  },

  async saveProjects(projects: Project[]): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    localStorage.setItem(COLLECTIONS.PROJECTS, JSON.stringify(projects));
  },

  async fetchMessages(): Promise<Message[]> {
    const data = localStorage.getItem(COLLECTIONS.MESSAGES);
    return data ? JSON.parse(data) : [];
  },

  async postMessage(message: Omit<Message, 'id' | 'timestamp' | 'isRead'>): Promise<Message> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newMessage: Message = {
      ...message,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      isRead: false
    };
    
    const existing = await this.fetchMessages();
    localStorage.setItem(COLLECTIONS.MESSAGES, JSON.stringify([newMessage, ...existing]));
    return newMessage;
  },

  async deleteMessage(id: string): Promise<void> {
    const existing = await this.fetchMessages();
    const filtered = existing.filter(m => m.id !== id);
    localStorage.setItem(COLLECTIONS.MESSAGES, JSON.stringify(filtered));
  }
};
