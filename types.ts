
export interface Project {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  tags: string[];
  link?: string;
}

export interface Skill {
  name: string;
  level: number;
  category: 'Frontend' | 'Backend' | 'DevOps' | 'AI';
}

export interface Message {
  id: string;
  name: string;
  email: string;
  content: string;
  timestamp: number;
  isRead: boolean;
}

export type Theme = 'dark' | 'light';
