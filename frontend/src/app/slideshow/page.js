"use client";
import { useEffect, useState, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Play, Pause, X, ChevronLeft, ChevronRight, Maximize, Minimize,
  Settings, Zap, Clock, Image as ImageIcon, Info, Star, LayoutGrid, Award, ShieldCheck,
  Presentation, MapPin
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function SlideshowPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-slate-950 flex items-center justify-center text-white">Initializing Engine...</div>}>
      <SlideshowContent />
    </Suspense>
  );
}

function SlideshowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if we are currently playing a slideshow
  const isPlayingParam = searchParams.get('play') === 'true';
  const categoryParam = searchParams.get('category') || 'All';
  const distinctionParam = searchParams.get('distinction');
  const projectIdFilter = searchParams.get('projectId');

  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);

  // Settings
  const [effect, setEffect] = useState('zoom');
  const [duration, setDuration] = useState(6);
  const [showInfo, setShowInfo] = useState(true);
  const [isRandom, setIsRandom] = useState(false);

  const slideshowRef = useRef(null);
  const uiTimeout = useRef(null);

  const categories = ['Residential', 'Commercial', 'Industrial', 'Healthcare', 'Infrastructure', 'Educational'];

  // 1. Fetch Data based on Selection
  useEffect(() => {
    // 1. If we aren't supposed to play anything yet, stop here.
    if (!isPlayingParam && !projectIdFilter) return;

    // 2. CLEAR PREVIOUS DATA immediately to prevent "ghost" images
    setLoading(true);
    setImages([]);
    setCurrentIndex(0);

    let url = `${API_URL}/api/slideshow`;

    if (projectIdFilter) {
      url = `${API_URL}/api/projects/${projectIdFilter}`;
    } else {
      const params = new URLSearchParams();
      if (categoryParam !== 'All') params.append('category', categoryParam);
      if (distinctionParam) params.append('distinction', distinctionParam);
      url += `?${params.toString()}`;
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        // Handle both single project (data.images) and category list (data array)
        const final = projectIdFilter ? data.images : data;

        if (final && final.length > 0) {
          const formatted = final.map(img => ({
            ...img,
            project_id: data.id || img.project_id,
            project_name: data.name || img.project_name,
            category: data.category || img.category,
            location: data.location || img.location,
          }));
          setImages(formatted);
        } else {
          // If the array is empty, ensure the state is empty
          setImages([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setImages([]);
        setLoading(false);
      });
  }, [isPlayingParam, categoryParam, distinctionParam, projectIdFilter]);

  // 2. Playback Timer
  useEffect(() => {
    // We only loop if we have images and auto-play is on.
    // Removed the "isPlayingParam" check so it loops even for single project shows.
    if (!isAutoPlaying || images.length <= 1) return;

    const intervalId = setInterval(() => {
      setCurrentIndex(prev =>
        isRandom
          ? Math.floor(Math.random() * images.length)
          : (prev + 1) % images.length
      );
    }, duration * 1000);

    return () => clearInterval(intervalId);
  }, [isAutoPlaying, images, duration, isRandom]);

  const handleExit = () => {
    if (projectIdFilter) {
      // If we are in a single project slideshow, return to that project's details
      router.push(`/project/${projectIdFilter}`);
    } else {
      // Otherwise return to the presentation portal
      router.push('/slideshow');
    }
  };

  // 1. ADD THIS: Listener to detect Esc key / Browser Fullscreen exit
  useEffect(() => {
    const handler = () => {
      setIsFocusMode(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // 2. UPDATE: Simplify your toggle function (Optional but cleaner)
  const toggleFocusMode = () => {
    if (!document.fullscreenElement) {
      if (slideshowRef.current?.requestFullscreen) {
        slideshowRef.current.requestFullscreen().catch(console.error);
      }
      // We don't strictly need setIsFocusMode(true) here 
      // because the listener above will catch the change automatically!
      setIsFocusMode(true);
    } else {
      document.exitFullscreen();
      setIsFocusMode(false);
    }
  };

  const handleMouseMove = () => {
    setShowUI(true);
    if (uiTimeout.current) clearTimeout(uiTimeout.current);
    if (isFocusMode && !showSettings) uiTimeout.current = setTimeout(() => setShowUI(false), 3000);
  };

  const variants = {
    // 1. FADE: Classic cross-dissolve
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 1 }
    },
    // 2. SLIDE: Horizontal push
    slide: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '-100%' },
      transition: { duration: 0.8, ease: "easeInOut" }
    },
    // 3. ZOOM: Scale from small to full
    zoom: {
      initial: { opacity: 0, scale: 0.5 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 1.2 },
      transition: { duration: 1 }
    },
    // 4. CAROUSEL: 3D-like depth slide
    carousel: {
      initial: { x: 300, rotateY: 45, opacity: 0, scale: 0.8 },
      animate: { x: 0, rotateY: 0, opacity: 1, scale: 1 },
      exit: { x: -300, rotateY: -45, opacity: 0, scale: 0.8 },
      transition: { duration: 0.8, ease: "circOut" }
    },
    // 5. FLIP: 3D card flip
    flip: {
      initial: { rotateY: 90, opacity: 0 },
      animate: { rotateY: 0, opacity: 1 },
      exit: { rotateY: -90, opacity: 0 },
      transition: { duration: 0.7 }
    },
    // 6. KEN BURNS: The Default - Slow panning and zooming
    'ken-burns': {
      initial: { opacity: 0, scale: 1, x: "0%", y: "0%" },
      animate: {
        opacity: 1,
        scale: 1.2,
        x: "-2%",
        y: "-2%",
        transition: {
          opacity: { duration: 1.5 },
          scale: { duration: duration + 1, ease: "linear" },
          x: { duration: duration + 1, ease: "linear" },
          y: { duration: duration + 1, ease: "linear" }
        }
      },
      exit: { opacity: 0, transition: { duration: 1.5 } }
    }
  };

  // --- RENDER MODE A: THE SELECTION DASHBOARD ---
  if (!isPlayingParam && !projectIdFilter) {
    return (
      <div className="space-y-6 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Presentation Portal</h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg">Select a curated playlist to launch the cinematic kiosk.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Option 1: All Projects */}
            <PresentationCard
              title="Master Exhibition"
              desc="Cycle through every visual asset in the firm's repository."
              icon={<LayoutGrid size={32} />}
              color="bg-blue-600"
              onClick={() => router.push('/slideshow?play=true&category=All')}
            />

            {/* Option 2: Featured Showcase */}
            <PresentationCard
              title="Featured Showcase"
              desc="Highlight only the firm's top-tier, starred projects."
              icon={<Star size={32} fill="white" />}
              color="bg-amber-500"
              onClick={() => router.push('/slideshow?play=true&distinction=featured')}
            />

            <PresentationCard
              title="Award Winning"
              desc="Showcase projects recognized for excellence, innovation, and outstanding achievements."
              icon={<Award size={32} />}
              color="bg-emerald-500"
              onClick={() => router.push('/slideshow?play=true&distinction=award')}
            />

            <PresentationCard
              title="Landmarks"
              desc="Present iconic projects that define spaces and leave a lasting impact."
              icon={<MapPin size={32} />}
              color="bg-purple-500"
              onClick={() => router.push('/slideshow?play=true&distinction=landmark')}
            />

            <PresentationCard
              title="Premium"
              desc="Display high-value projects showcasing exceptional quality and craftsmanship."
              icon={<ShieldCheck size={32} />}
              color="bg-rose-500"
              onClick={() => router.push('/slideshow?play=true&distinction=premium')}
            />

            <PresentationCard
              title="Recently Completed"
              desc="Explore the firm's latest completed projects and recent accomplishments."
              icon={<Clock size={32} />}
              color="bg-blue-500"
              onClick={() => router.push('/slideshow?play=true&distinction=recent')}
            />

            {/* Option 3: Curated Building Types */}
            <div className="lg:col-span-3 mt-10">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Building Types & Categories</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => router.push(`/slideshow?play=true&category=${cat}`)}
                    className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl hover:shadow-xl hover:-translate-y-1 transition-all text-left group"
                  >
                    <div className="w-10 h-10 bg-slate-50 dark:bg-slate-950 rounded-xl flex items-center text-slate-600 dark:text-slate-300 justify-center mb-4 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      <ImageIcon size={20} />
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight">{cat}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER MODE B: THE CINEMATIC PLAYER ---
  if (loading) {
    return (
      <div className="h-[90vh] rounded-[1rem] bg-slate-950 flex flex-col items-center justify-center text-white">
        <p className="animate-pulse font-black uppercase tracking-widest"> Compiling Assets... </p>
        <button onClick={() => router.push("/slideshow")}
          className="mt-8 text-xs text-blue-400 underline" > Cancel and return
        </button>
      </div>
    );
  }
  if (images.length === 0) {
    return (
      <div className="h-[90vh] rounded-[1rem] bg-white dark:bg-slate-950
text-slate-900 dark:text-white flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-2">No Images Found</h2>
        <p className="text-slate-400 dark:text-slate-400 mb-8"> This category doesn't contain any slideshow images yet. </p>
        <button onClick={() => router.push("/slideshow")} className="px-6 py-3 bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors" > Return to Presentation Portal </button>
      </div>);
  }

  const currentImg = images?.[currentIndex];
  if (!currentImg) return null;

  return (
    <div ref={slideshowRef} onMouseMove={handleMouseMove} className={`relative overflow-hidden bg-black
        ${isFocusMode
        ? 'h-screen w-full rounded-none'
        : 'h-[90vh] w-full max-w-7xl rounded-[1rem] shadow-[0_40px_100px_rgba(0,0,0,0.7)] border border-white/5'
      } ${isFocusMode && !showUI ? 'cursor-none' : 'cursor-default'}`} style={{ transformStyle: 'preserve-3d' }}>
      <AnimatePresence mode="wait">
        <motion.div key={`${effect}-${currentIndex}`} className="absolute inset-0" {...variants[effect]}>
          <img src={`${API_URL}/uploads/${currentImg.file_path}`} alt={currentImg.project_name} className="w-full h-full object-cover" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.85)] z-20" />
      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent transition-opacity duration-1000 pointer-events-none z-10 ${showInfo ? 'opacity-100' : 'opacity-0'}`} />

      <AnimatePresence>
        {showUI && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="z-[60] absolute inset-0 pointer-events-none">

            <div className="absolute top-8 left-8 right-8 flex justify-between items-center z-[100] pointer-events-auto">
              <button onClick={handleExit} className="bg-white/10 backdrop-blur-md p-3 rounded-full hover:bg-red-600 text-white transition-all shadow-2xl border border-white/10">
                <X size={24} />
              </button>

              <div className="flex gap-4">
                <button onClick={() => setShowSettings(!showSettings)} className="bg-white/10 backdrop-blur-md p-3 rounded-full text-white hover:bg-blue-600 transition-all"><Settings size={20} className={showSettings ? 'rotate-90' : ''} /></button>
                <button onClick={toggleFocusMode} className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs font-bold hover:bg-white/20 transition-all border border-white/10">
                  {isFocusMode ? <Minimize size={18} /> : <Maximize size={18} />}
                  {isFocusMode ? "EXIT FOCUS" : "FOCUS MODE"}</button>
              </div>
            </div>
            <div className="absolute inset-y-0 left-0 flex items-center px-6 z-[70] pointer-events-auto"><button onClick={() => setCurrentIndex((currentIndex - 1 + images.length) % images.length)} className="text-white/30 hover:text-white p-4 rounded-full backdrop-blur-sm transition-all"><ChevronLeft size={48} /></button></div>
            <div className="absolute inset-y-0 right-0 flex items-center px-6 z-[70] pointer-events-auto"><button onClick={() => setCurrentIndex((currentIndex + 1) % images.length)} className="text-white/30 hover:text-white p-4 rounded-full backdrop-blur-sm transition-all"><ChevronRight size={48} /></button></div>
            <div className="absolute bottom-12 right-12 z-[80] pointer-events-auto"><button onClick={() => setIsAutoPlaying(!isAutoPlaying)} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all">{isAutoPlaying ? <Pause size={28} fill="black" /> : <Play size={28} fill="black" className="ml-1" />}</button></div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInfo && ( // Removed "showUI &&"
          <div className="absolute bottom-12 left-12 text-white z-[99] pointer-events-auto"
          >
            <Link
              href={`/project/${currentImg.project_id}`}
              className="group/info block cursor-pointer"
            >
              <div className="flex flex-wrap gap-2 mb-4">
                {currentImg.is_award_winning === 1 && <span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Award</span>}
                {currentImg.is_landmark === 1 && <span className="bg-purple-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Landmark</span>}
                {currentImg.is_premium === 1 && <span className="bg-rose-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Premium</span>}
                {currentImg.is_recent === 1 && <span className="bg-blue-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Recent</span>}
                {currentImg.is_featured === 1 && <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Featured</span>}
              </div>
              <div className="flex flex-col">
                <span className="text-blue-400 font-black uppercase tracking-[0.3em] text-[10px] mb-2 inline-block border-b border-blue-400 pb-1 group-hover/info:text-white group-hover/info:border-white transition-all">
                  {currentImg.category} • VIEW DETAILS
                </span>
                <h1 className="text-5xl md:text-6xl font-bold mb-1 tracking-tighter group-hover/info:translate-x-2 transition-transform duration-300">
                  {currentImg.project_name}
                </h1>
                <p className="text-xl text-slate-400 font-light group-hover/info:text-slate-200 transition-colors">
                  {currentImg.location}
                </p>
              </div>
            </Link>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
            className="absolute top-0 right-0 h-full w-80 bg-slate-900/95 backdrop-blur-xl text-white p-8 z-[110] border-l border-white/10 shadow-2xl pointer-events-auto"
          >
            <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
              <Settings size={20} /> Settings
            </h2>
            <div className="space-y-8">
              <section>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-4 tracking-widest">
                  Transition Effect
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'ken-burns', label: 'Ken Burns' },
                    { id: 'fade', label: 'Fade' },
                    { id: 'slide', label: 'Slide' },
                    { id: 'zoom', label: 'Zoom' },
                    { id: 'carousel', label: 'Carousel' },
                    { id: 'flip', label: '3D Flip' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setEffect(t.id)}
                      className={`py-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-tighter transition-all
          ${effect === t.id
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                          : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-4 tracking-widest">Speed ({duration}s)</label>
                <input type="range" min="2" max="20" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </section>
              <section className="space-y-4">
                <PresentationCard variant="toggle" label="Show Project Info" active={showInfo} onClick={() => setShowInfo(!showInfo)} icon={<Info size={16} />} />
                <PresentationCard variant="toggle" label="Shuffle Gallery" active={isRandom} onClick={() => setIsRandom(!isRandom)} icon={<ImageIcon size={16} />} />
              </section>
            </div>
            <button onClick={() => setShowSettings(false)} className="mt-12 w-full bg-blue-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-900/20 transition-all">Apply Settings</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 overflow-hidden z-[90]"><motion.div key={currentIndex} initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: duration, ease: "linear" }} className="h-full bg-blue-600" /></div>
    </div>
  );
}

function PresentationCard({
  variant = "card",
  title,
  desc,
  icon,
  color,
  onClick,
  label,
  active,
}) {
  if (variant === "toggle") {
    return (
      <div
        className="flex items-center justify-between group cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400
group-hover:text-slate-900
dark:group-hover:text-white transition-colors">
          {icon}
          <span className="text-xs font-bold uppercase tracking-wider">
            {label}
          </span>
        </div>

        <div
          className={`w-10 h-5 rounded-full relative transition-colors ${active ? "bg-blue-600" : "bg-slate-700"
            }`}
        >
          <div
            className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${active ? "right-1" : "left-1"
              }`}
          />
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="relative group overflow-hidden bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 text-left hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
    >
      <div
        className={`w-16 h-16 ${color} text-white rounded-[1.5rem] flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>

      <h2 className="text-2xl font-extrabold font-black text-slate-900 dark:text-white mb-2">{title}</h2>
      <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{desc}</p>

      <div className="mt-8 flex items-center gap-2 text-blue-600 font-bold text-sm tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">
        Launch Presentation <ChevronRight size={16} />
      </div>
    </button>
  );
}