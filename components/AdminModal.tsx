
import React, { useState, useEffect } from 'react';
import { Project, Message } from '../types.ts';
import { improveProjectDescription, generateProjectIdea, generateProjectImage } from '../services/geminiService.ts';
import { dbService } from '../services/dbService.ts';

interface AdminModalProps {
  initialProjects: Project[];
  onClose: () => void;
  onRefresh: () => void;
}

export default function AdminModal({ initialProjects, onClose, onRefresh }: AdminModalProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'projects' | 'messages' | 'config'>('projects');
  const [localProjects, setLocalProjects] = useState<Project[]>(initialProjects);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingAI, setLoadingAI] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      loadMessages();
    }
  }, [isLoggedIn]);

  const loadMessages = async () => {
    const msgs = await dbService.fetchMessages();
    setMessages(msgs);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.email === 'admin@cognify.com' && loginForm.password === 'aa1011') {
      setIsLoggedIn(true);
      setLoginError(null);
    } else {
      setLoginError('Access denied. Cognify Terminal requires valid authorization.');
    }
  };

  const handleUpdate = (id: string, field: keyof Project, value: any) => {
    setLocalProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleAddProject = async () => {
    setLoadingAI('generating');
    try {
      const idea = await generateProjectIdea(['AI', 'Automation', 'Cognitive UI', 'Cloud Native']);
      // Immediately generate an image for the new idea
      const imageUrl = await generateProjectImage(idea.title, idea.description);
      
      const newProject: Project = {
        id: Date.now().toString(),
        title: idea.title,
        description: idea.description,
        imageUrl: imageUrl,
        tags: idea.tags,
        link: ''
      };
      setLocalProjects(prev => [...prev, newProject]);
    } catch (err) {
      console.error("AI Project Inception failed", err);
    } finally {
      setLoadingAI(null);
    }
  };

  const handleRemoveProject = (id: string) => {
    setLocalProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleAIImprove = async (id: string) => {
    const project = localProjects.find(p => p.id === id);
    if (!project) return;
    setLoadingAI(id);
    const improved = await improveProjectDescription(project.title, project.description);
    handleUpdate(id, 'description', improved);
    setLoadingAI(null);
  };

  const handleAIGenerateImage = async (id: string) => {
    const project = localProjects.find(p => p.id === id);
    if (!project) return;
    setLoadingAI(`${id}-img`);
    try {
      const imageUrl = await generateProjectImage(project.title, project.description);
      handleUpdate(id, 'imageUrl', imageUrl);
    } catch (err) {
      console.error("Manual AI image synthesis failed", err);
    } finally {
      setLoadingAI(null);
    }
  };

  const handleCommitChanges = async () => {
    setIsSaving(true);
    await dbService.saveProjects(localProjects);
    setIsSaving(false);
    onRefresh();
    onClose();
  };

  const handleDeleteMessage = async (id: string) => {
    await dbService.deleteMessage(id);
    loadMessages();
  };

  if (!isLoggedIn) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
        <div className="bg-[#050810] border border-gray-800 rounded-[2rem] w-full max-w-md p-10 space-y-8 shadow-2xl">
          <div className="text-center">
            <h2 className="text-2xl font-black uppercase text-white tracking-tighter">Cognify <span className="text-indigo-500">Terminal</span></h2>
            <p className="text-[10px] text-gray-500 mt-2 font-mono uppercase tracking-[0.3em]">Authorized Access Only</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input 
              type="email"
              className="w-full bg-black border border-gray-800 rounded-xl px-6 py-4 text-sm text-white focus:border-indigo-500 outline-none"
              placeholder="Admin Identifier"
              value={loginForm.email}
              onChange={e => setLoginForm({...loginForm, email: e.target.value})}
              required
            />
            <input 
              type="password"
              className="w-full bg-black border border-gray-800 rounded-xl px-6 py-4 text-sm text-white focus:border-indigo-500 outline-none"
              placeholder="Security Protocol"
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              required
            />
            {loginError && <p className="text-red-500 text-[10px] text-center font-bold uppercase">{loginError}</p>}
            <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold uppercase rounded-xl hover:bg-indigo-500 transition-colors">Initiate Link</button>
            <button type="button" onClick={onClose} className="w-full py-2 text-gray-500 text-[10px] uppercase font-bold tracking-widest">Abort</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4">
      <div className="bg-[#050810] border border-gray-800 rounded-[2.5rem] w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-8 border-b border-gray-800 flex justify-between items-center bg-black/50">
          <div className="flex gap-12 items-center">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Cognify <span className="text-indigo-500">Admin</span></h2>
            <div className="flex gap-4">
              {(['projects', 'messages', 'config'] as const).map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-full transition-all ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-12 bg-[#02040a]">
          {activeTab === 'projects' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {localProjects.map((project) => (
                  <div key={project.id} className="bg-gray-900/30 p-8 rounded-3xl border border-gray-800 space-y-6 hover:border-gray-700 transition-all flex flex-col">
                    <div className="flex gap-6 items-start">
                      <div className="w-32 h-32 rounded-2xl overflow-hidden bg-black flex-shrink-0 border border-gray-800 relative group">
                        <img src={project.imageUrl} alt={project.title} className={`w-full h-full object-cover transition-opacity duration-500 ${loadingAI === `${project.id}-img` ? 'opacity-20' : 'opacity-100'}`} />
                        {loadingAI === `${project.id}-img` && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[8px] font-black uppercase text-indigo-400 animate-pulse">Synthesizing</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Project Title</label>
                          <input className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-white focus:border-indigo-500 outline-none" value={project.title} onChange={(e) => handleUpdate(project.id, 'title', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest flex justify-between">
                            <span>Visual Asset Source</span>
                            <span className="text-indigo-500 font-bold">AI Active</span>
                          </label>
                          <div className="flex gap-2">
                            <input className="flex-1 bg-black border border-gray-800 rounded-xl p-3 text-xs text-gray-400 focus:border-indigo-500 outline-none truncate" value={project.imageUrl} onChange={(e) => handleUpdate(project.id, 'imageUrl', e.target.value)} />
                            <button 
                              onClick={() => handleAIGenerateImage(project.id)}
                              disabled={loadingAI === `${project.id}-img`}
                              className="px-4 py-2 bg-indigo-600/10 text-indigo-500 text-[10px] font-black uppercase rounded-xl hover:bg-indigo-600/20 disabled:opacity-50 transition-all border border-indigo-500/20 flex items-center gap-2 group"
                            >
                              <svg className="w-3 h-3 group-hover:rotate-12 transition-transform" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" /></svg>
                              {loadingAI === `${project.id}-img` ? '...' : 'Synthesize'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Technical Description</label>
                      <textarea className="w-full bg-black border border-gray-800 rounded-xl p-3 text-xs text-gray-400 focus:border-indigo-500 outline-none resize-none" rows={3} value={project.description} onChange={(e) => handleUpdate(project.id, 'description', e.target.value)} />
                    </div>
                    
                    <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-800">
                      <div className="flex gap-4">
                        <button onClick={() => handleAIImprove(project.id)} disabled={loadingAI === project.id} className="px-4 py-2 rounded-lg bg-indigo-600/10 text-indigo-500 text-[10px] uppercase font-black hover:bg-indigo-600/20 transition-all flex items-center gap-2">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                          {loadingAI === project.id ? 'Optimizing...' : 'AI Optimize'}
                        </button>
                        <button onClick={() => handleRemoveProject(project.id)} className="px-4 py-2 rounded-lg bg-red-600/10 text-red-500 text-[10px] uppercase font-black hover:bg-red-600/20 transition-all">Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleAddProject} disabled={loadingAI === 'generating'} className="w-full py-12 border-2 border-dashed border-gray-800 rounded-3xl text-gray-600 hover:text-indigo-500 hover:border-indigo-500 transition-all group relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-600/5 translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                <span className="flex flex-col items-center gap-2 relative z-10">
                   <svg className={`w-8 h-8 transition-all ${loadingAI === 'generating' ? 'animate-spin text-indigo-500' : 'opacity-50 group-hover:opacity-100'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                   <span className="text-xs font-black uppercase tracking-[0.2em]">{loadingAI === 'generating' ? 'Synthesizing Project Package...' : 'Incept Full AI Project'}</span>
                   <span className="text-[8px] uppercase tracking-widest text-gray-700">Generates Idea + Description + Visuals</span>
                </span>
              </button>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-6">
              {messages.length === 0 ? <div className="flex flex-col items-center justify-center py-32 text-gray-700 space-y-4"><p className="text-xs font-bold uppercase tracking-widest">Inbox Zero</p></div> : 
                messages.map(msg => (
                  <div key={msg.id} className="bg-gray-900/30 border border-gray-800 p-8 rounded-3xl hover:border-indigo-500/30 transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="text-white font-black text-lg">{msg.name}</h4>
                        <p className="text-xs text-indigo-500 font-mono">{msg.email}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] text-gray-600 font-mono">{new Date(msg.timestamp).toLocaleString()}</span>
                        <button onClick={() => handleDeleteMessage(msg.id)} className="text-[10px] text-red-500 font-black uppercase tracking-widest hover:text-red-400">Purge</button>
                      </div>
                    </div>
                    <div className="p-6 bg-black/40 rounded-2xl">
                      <p className="text-sm text-gray-300 leading-relaxed font-light">{msg.content}</p>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {activeTab === 'config' && (
            <div className="p-10 bg-black rounded-[2rem] border border-gray-800 space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-black uppercase tracking-widest">Cognify Core Settings</h3>
                <span className="px-3 py-1 bg-green-500/10 text-green-500 text-[8px] font-black rounded-full border border-green-500/20 uppercase tracking-widest">Neural Link Sync: 100%</span>
              </div>
              <p className="text-gray-500 text-sm font-light leading-relaxed">System configuration and neural mapping monitoring. All administrative changes are logged to the blockchain node.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="px-6 py-4 bg-gray-900 rounded-xl border border-gray-800 flex-1">
                   <div className="text-[9px] text-gray-600 font-black uppercase">Database Provider</div>
                   <div className="text-indigo-400 text-xs font-bold mt-1">MongoDB Atlas</div>
                </div>
                <div className="px-6 py-4 bg-gray-900 rounded-xl border border-gray-800 flex-1">
                   <div className="text-[9px] text-gray-600 font-black uppercase">GenAI Status</div>
                   <div className="text-indigo-500 text-xs font-bold mt-1">Operational</div>
                </div>
                <div className="px-6 py-4 bg-gray-900 rounded-xl border border-gray-800 flex-1">
                   <div className="text-[9px] text-gray-600 font-black uppercase">System Uptime</div>
                   <div className="text-white text-xs font-bold mt-1">99.998%</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 border-t border-gray-800 flex justify-end gap-6 bg-black/50">
          <button onClick={onClose} className="px-8 py-3 text-gray-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">Discard Changes</button>
          {activeTab === 'projects' && (
            <button onClick={handleCommitChanges} disabled={isSaving} className="px-12 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50">
              {isSaving ? 'Synchronizing Node...' : 'Deploy Manifest'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
