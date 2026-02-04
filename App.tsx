
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Project, Skill, Theme } from './types.ts';
import AdminModal from './components/AdminModal.tsx';
import AIAssistant from './components/AIAssistant.tsx';
import VoiceAssistant from './components/VoiceAssistant.tsx';
import { dbService } from './services/dbService.ts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const INITIAL_PROJECTS: Project[] = [
  {
    id: '1',
    title: 'Cognitive Core',
    description: 'Scalable infrastructure designed for real-time AI inference and neural processing pipelines.',
    imageUrl: 'https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&q=80&w=800',
    tags: ['Infrastructure', 'AI', 'Cloud'],
    link: '#'
  },
  {
    id: '2',
    title: 'Sentinel Protocol',
    description: 'Advanced cybersecurity layer utilizing heuristic analysis to prevent zero-day vulnerabilities.',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
    tags: ['Security', 'DevOps'],
    link: '#'
  }
];

const SKILLS: Skill[] = [
  { name: 'AI Engineering', level: 98, category: 'AI' },
  { name: 'Cloud Architecture', level: 95, category: 'Backend' },
  { name: 'Cyber Security', level: 92, category: 'DevOps' },
  { name: 'React Architecture', level: 96, category: 'Frontend' }
];

const Logo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" stroke="url(#cogGradient)" strokeWidth="4" />
    <path d="M50 25C36 25 25 36 25 50C25 64 36 75 50 75C64 75 75 64 75 50" stroke="url(#cogGradient)" strokeWidth="8" strokeLinecap="round" />
    <circle cx="50" cy="50" r="10" fill="url(#cogGradient)" />
    <defs>
      <linearGradient id="cogGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" />
        <stop offset="100%" stopColor="#a855f7" />
      </linearGradient>
    </defs>
  </svg>
);

const ThemeToggle = ({ theme, onToggle }: { theme: Theme, onToggle: () => void }) => (
  <button 
    onClick={onToggle}
    className="p-3 rounded-2xl glass hover:scale-110 transition-all flex items-center justify-center text-indigo-500"
    aria-label="Toggle Theme"
  >
    {theme === 'dark' ? (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z"></path></svg>
    ) : (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
    )}
  </button>
);

type ActiveSection = 'home' | 'work' | 'skills';

const VOICE_COMMANDS = [
  { phrase: "Go to Home", action: "Navigates back to the hero section." },
  { phrase: "Show Manifest", action: "Smooth scrolls to the projects area." },
  { phrase: "Show Stack", action: "Navigates to the skills and expertise section." },
  { phrase: "Switch Theme", action: "Toggles between Dark and Light mode." },
  { phrase: "Open Admin", action: "Triggers the admin authentication terminal." }
];

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showCommands, setShowCommands] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>('home');
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const sectionRefs = {
    home: useRef<HTMLElement>(null),
    work: useRef<HTMLElement>(null),
    skills: useRef<HTMLElement>(null)
  };

  useEffect(() => {
    const loadData = async () => {
      const fetched = await dbService.fetchProjects();
      setProjects(fetched.length > 0 ? fetched : INITIAL_PROJECTS);
    };
    loadData();
  }, []);

  useEffect(() => {
    document.body.classList.toggle('light-mode', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '-50% 0px -50% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id.replace('-section', '') as ActiveSection;
          setActiveSection(id);
        }
      });
    }, options);

    Object.values(sectionRefs).forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, []);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    tags.add('All');
    projects.forEach(p => p.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (activeFilter === 'All') return projects;
    return projects.filter(p => p.tags.includes(activeFilter));
  }, [projects, activeFilter]);

  const navigateTo = (section: ActiveSection) => {
    setIsMenuOpen(false);
    const element = document.getElementById(`${section}-section`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <div className="min-h-screen selection:bg-indigo-500/30 flex flex-col transition-colors duration-400">
      {/* Background Effect */}
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600 rounded-full blur-[180px] animate-gradient-slow-1" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600 rounded-full blur-[180px] animate-gradient-slow-2" />
      </div>

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 glass py-6 shadow-xl">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigateTo('home')}>
            <Logo className="w-10 h-10 group-hover:rotate-90 transition-transform duration-700" />
            <div className="text-3xl font-black font-heading tracking-tighter gradient-text uppercase">Cognify</div>
          </div>
          
          <div className="flex items-center gap-6">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
            <button 
              onClick={() => {
                setIsMenuOpen(!isMenuOpen);
                if (isMenuOpen) setShowCommands(false);
              }}
              className="p-2 text-indigo-400 hover:text-indigo-600 transition-colors z-[60]"
              aria-label="Toggle Menu"
            >
              <div className="w-8 h-6 flex flex-col justify-between relative">
                <span className={`w-full h-1 bg-current rounded-full transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-[10px]' : ''}`}></span>
                <span className={`w-full h-1 bg-current rounded-full transition-all duration-300 ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
                <span className={`w-full h-1 bg-current rounded-full transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-[10px]' : ''}`}></span>
              </div>
            </button>
          </div>
        </div>
      </nav>

      {/* Universal Navigation Overlay */}
      <div className={`fixed inset-0 z-50 transition-all duration-500 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={() => { setIsMenuOpen(false); setShowCommands(false); }}></div>
        <div className={`absolute top-0 right-0 w-[85%] md:w-[600px] h-full bg-[#050810] border-l border-white/5 p-16 pt-32 flex flex-col gap-10 transition-transform duration-500 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
          {!showCommands ? (
            <div className="space-y-6">
              <button onClick={() => navigateTo('home')} className={`block text-4xl font-black font-heading tracking-tighter uppercase transition-colors text-left w-full ${activeSection === 'home' ? 'text-indigo-500' : 'text-white hover:text-indigo-400'}`}>Home</button>
              <button onClick={() => navigateTo('work')} className={`block text-4xl font-black font-heading tracking-tighter uppercase transition-colors text-left w-full ${activeSection === 'work' ? 'text-indigo-500' : 'text-white hover:text-indigo-400'}`}>Manifest</button>
              <button onClick={() => navigateTo('skills')} className={`block text-4xl font-black font-heading tracking-tighter uppercase transition-colors text-left w-full ${activeSection === 'skills' ? 'text-indigo-500' : 'text-white hover:text-indigo-400'}`}>Stack</button>
              <button onClick={() => setShowCommands(true)} className="block text-2xl font-bold font-heading tracking-tight text-indigo-400 hover:text-white uppercase transition-colors text-left w-full mt-10">Voice Assistant Commands</button>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in duration-300">
               <button onClick={() => setShowCommands(false)} className="flex items-center gap-2 text-gray-500 hover:text-white uppercase text-[10px] font-black tracking-widest mb-4">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                 Back
               </button>
               <h3 className="text-4xl font-black font-heading tracking-tighter uppercase text-white">Voice Commands</h3>
               <div className="space-y-6">
                  {VOICE_COMMANDS.map((cmd, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/5 space-y-2">
                       <div className="text-indigo-400 font-black text-sm uppercase tracking-widest">"{cmd.phrase}"</div>
                       <div className="text-gray-400 text-xs font-light">{cmd.action}</div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          <button 
            onClick={() => {
              setIsMenuOpen(false);
              setIsAIChatOpen(true);
            }} 
            className="mt-4 px-10 py-5 bg-indigo-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-500 transition-all text-sm self-start"
          >
            Interface Cognify-AI
          </button>
          
          <div className="mt-auto pt-12 border-t border-white/5 space-y-8">
             <div>
               <div className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-600 mb-6">Neural Link Status</div>
               <div className="flex items-center gap-4 text-xs font-mono text-indigo-400/60 uppercase">
                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                 Synchronization Active
               </div>
             </div>
             <div className="flex gap-4">
                {['LinkedIn', 'GitHub'].map(social => (
                  <div key={social} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-indigo-600/20 transition-colors cursor-pointer group">
                    <span className="text-[8px] font-black uppercase text-gray-600 group-hover:text-white transition-colors">{social}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 pt-24 space-y-32">
        <section id="home-section" ref={sectionRefs.home} className="min-h-[calc(100vh-6rem)] flex flex-col justify-center px-8 animate-in fade-in duration-700">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full glass text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] border border-indigo-500/20">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              System Primary Interface
            </div>
            <h1 className="text-7xl md:text-[10rem] font-black font-heading leading-[0.9] tracking-tighter">
              Evolution <br /> <span className="gradient-text">Through Tech.</span>
            </h1>
            <p className="text-2xl text-muted max-w-2xl font-light leading-relaxed">
              Cognify delivers high-performance engineering, intelligent cloud architecture, and next-gen AI systems for the global enterprise.
            </p>
            <div className="flex gap-6 pt-4">
               <button onClick={() => navigateTo('work')} className="px-12 py-6 bg-indigo-600 text-white font-black uppercase tracking-widest text-[11px] rounded-full hover:scale-105 transition-all">Launch Manifest</button>
            </div>
          </div>
        </section>

        <section id="work-section" ref={sectionRefs.work} className="py-20 px-8 animate-in slide-in-from-bottom-10 fade-in duration-700">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
              <div className="space-y-4">
                 <h2 className="text-6xl font-black font-heading tracking-tighter uppercase">Manifest</h2>
                 <p className="text-muted text-xl font-light">Synthesized solutions and core breakthroughs.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {allTags.map(tag => (
                  <button key={tag} onClick={() => setActiveFilter(tag)} className={`px-8 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border ${activeFilter === tag ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-transparent border-gray-800 text-muted hover:text-indigo-500'}`}>{tag}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredProjects.map((p) => (
                <div key={p.id} className="group glass rounded-[2.5rem] overflow-hidden border border-gray-800/50 hover:border-indigo-500/40 transition-all duration-700 bg-card">
                  <div className="aspect-video relative overflow-hidden bg-black">
                     <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-100" />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />
                  </div>
                  <div className="p-10 space-y-6">
                     <div className="flex gap-2">
                        {p.tags.map(t => <span key={t} className="text-[8px] font-black uppercase tracking-widest px-2 py-1 bg-indigo-600/10 text-indigo-400 rounded border border-indigo-500/10">{t}</span>)}
                     </div>
                     <h3 className="text-2xl font-black font-heading text-main">{p.title}</h3>
                     <p className="text-muted text-sm font-light leading-relaxed h-12 overflow-hidden line-clamp-2">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="skills-section" ref={sectionRefs.skills} className="py-20 px-8 animate-in slide-in-from-bottom-10 fade-in duration-700">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
            <div className="space-y-12">
              <h2 className="text-6xl font-black font-heading tracking-tighter uppercase">Expertise</h2>
              <div className="space-y-10">
                 {SKILLS.map(s => (
                   <div key={s.name} className="space-y-4">
                      <div className="flex justify-between items-end">
                         <span className="text-[10px] font-black uppercase tracking-widest text-muted">{s.name}</span>
                         <span className="text-xl font-black">{s.level}%</span>
                      </div>
                      <div className="h-px w-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                         <div className="h-full bg-indigo-600 transition-all duration-[2000ms]" style={{ width: `${s.level}%` }} />
                      </div>
                   </div>
                 ))}
              </div>
            </div>
            <div className="aspect-square glass p-12 rounded-[4rem] border-indigo-500/5 bg-card">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={SKILLS}>
                   <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#111827' : '#e5e7eb'} vertical={false} />
                   <XAxis dataKey="name" stroke={theme === 'dark' ? '#374151' : '#9ca3af'} fontSize={8} tickLine={false} axisLine={false} />
                   <YAxis hide />
                   <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} contentStyle={{ backgroundColor: theme === 'dark' ? '#02040a' : '#ffffff', border: '1px solid #1f2937', borderRadius: '1rem', textTransform: 'uppercase', fontSize: '10px' }} />
                   <Bar dataKey="level" barSize={35} radius={[10, 10, 0, 0]}>
                     {SKILLS.map((_, i) => <Cell key={`c-${i}`} fill="#6366f1" />)}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-20 px-8 border-t border-gray-900 dark:bg-[#010206] bg-gray-50 relative z-10 overflow-hidden mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col items-center space-y-10">
          <div className="flex flex-col items-center gap-4">
            <Logo className="w-10 h-10" />
            <div className="text-2xl font-black font-heading gradient-text uppercase tracking-tighter">Cognify</div>
          </div>
          <div className="flex flex-col items-center gap-6">
            <div className="h-px w-16 bg-gray-300 dark:bg-gray-900" />
            <div className="text-muted hover:text-indigo-500 transition-all text-[10px] font-mono tracking-[0.3em] uppercase cursor-pointer" onClick={() => setIsAdminOpen(true)}>
              &copy; Cognify 2026
            </div>
          </div>
        </div>
      </footer>

      <AIAssistant isOpen={isAIChatOpen} onToggle={setIsAIChatOpen} />
      <VoiceAssistant onCommand={(cmd, args) => {
        if (cmd === 'navigateTo') navigateTo(args.section as ActiveSection);
        if (cmd === 'toggleTheme') toggleTheme();
        if (cmd === 'openAdmin') setIsAdminOpen(true);
      }} />
      {isAdminOpen && <AdminModal initialProjects={projects} onClose={() => setIsAdminOpen(false)} onRefresh={() => window.location.reload()} />}
    </div>
  );
}
