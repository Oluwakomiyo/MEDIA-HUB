"use client";
import { useEffect, useState, Suspense } from 'react';
import {
    ArrowLeft, Search, SlidersHorizontal, Star, // Ensure Star is here
    MapPin, Trash2, ChevronDown, X
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function GalleryContent() {
    const searchParams = useSearchParams();
    const filterParam = searchParams.get('filter');

    const [projects, setProjects] = useState([]);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All Categories");
    const [selectedYear, setSelectedYear] = useState("All Years");
    const [isFeaturedOnly, setIsFeaturedOnly] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsAdmin(!!token); // Set to true if token exists
    }, []);

    useEffect(() => {
        fetch(`${API_URL}/api/projects`)
            .then(res => res.json())
            .then(data => {
                setProjects(data);
                // IF coming from dashboard "Featured" link, enable the toggle immediately
                if (filterParam === 'featured') {
                    setIsFeaturedOnly(true);
                    setShowAdvanced(true); // Show the filter bar so they see why it's filtered
                } else {
                    setFilteredProjects(data);
                }
            });
    }, [filterParam]);

    // Multi-filter logic
    useEffect(() => {
        let result = [...projects];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(p => {
                // Check Project Name
                const inName = p.name?.toLowerCase().includes(query);
                // Check Location
                const inLocation = p.location?.toLowerCase().includes(query);
                // Check Manager
                const inManager = p.project_manager?.toLowerCase().includes(query);
                // Check Client
                const inClient = p.client_name?.toLowerCase().includes(query);
                // Check Description
                const inDesc = p.description?.toLowerCase().includes(query);
                // Check Tags
                const inTags = p.tags?.toLowerCase().includes(query);

                // Return true if the query is found in ANY of these
                return inName || inLocation || inManager || inClient || inDesc || inTags;
            });
        }

        if (selectedCategory !== "All Categories") {
            result = result.filter(p => p.category === selectedCategory);
        }

        // --- C. YEAR DROPDOWN ---
        if (selectedYear !== "All Years") {
            result = result.filter(p => {
                if (!p.completion_date) return false;
                const year = new Date(p.completion_date).getFullYear().toString();
                return year === selectedYear;
            });
        }

        // --- D. FEATURED STATUS TOGGLE ---
        if (isFeaturedOnly) {
            result = result.filter(p => p.is_featured === 1);
        }

        // ... (Keep your Category, Year, and Featured filters below this)
        setFilteredProjects(result);
    }, [searchQuery, selectedCategory, selectedYear, isFeaturedOnly, projects]);

    // --- PASTE THIS CODE INSIDE GalleryContent ---
    const deleteProject = async (id) => {
        // 1. Ask for confirmation (Professional standard)
        if (!window.confirm("Are you sure? This will permanently remove the project and all its images.")) {
            return;
        }

        const token = localStorage.getItem('token');

        try {
            // 2. Call the backend API
            const res = await fetch(`${API_URL}/api/projects/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}` // <--- ADD TOKEN
                }
            });

            if (res.ok) {
                // 3. Update the UI state immediately (Optimistic UI)
                setProjects(prev => prev.filter(p => p.id !== id));
                setFilteredProjects(prev => prev.filter(p => p.id !== id));
            } else {
                alert("Error deleting project from server.");
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert("Failed to connect to the server.");
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 text-slate-900 dark:text-white">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <Link href="/" className="flex items-center text-blue-600 mb-1 hover:underline text-sm font-medium">
                        <ArrowLeft className="w-3 h-3 mr-2" /> Back
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Project Gallery</h1>
                </div>

                {/* COMPACT FILTER BAR */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8 overflow-hidden">
                    <div className="flex flex-col md:flex-row items-center p-3 gap-3">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, manager, description, or #tags..."
                                className="w-full pl-10 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-blue-500"
                            />
                        </div>

                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all border ${showAdvanced ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                }`}
                        >
                            <SlidersHorizontal size={14} />
                            Filters {isFeaturedOnly && " (1 active)"}
                        </button>
                    </div>

                    {showAdvanced && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 block ml-1">Category</label>
                                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-none text-slate-900 dark:text-white outline-none focus:border-blue-500">
                                    <option value="All Categories">All Categories</option>
                                    {['Residential', 'Commercial', 'Industrial', 'Healthcare', 'Infrastructure', 'Premium', 'Landmark', 'Recently Completed', 'Award Winning'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 block ml-1">Year</label>
                                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="appearance-none w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium outline-none text-slate-900 dark:text-white outline-none focus:border-blue-500">
                                    <option value="All Years">All Years</option>
                                    {[...new Set(projects.map(p => new Date(p.completion_date).getFullYear().toString()))].sort().map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>

                            <div className="flex flex-col justify-end">
                                {/* CORRECTED: Featured Toggle Button */}
                                <button
                                    onClick={() => setIsFeaturedOnly(!isFeaturedOnly)}
                                    className={`flex items-center justify-between w-full p-2 border rounded-lg transition-all ${isFeaturedOnly ? 'bg-amber-500 border-amber-500 text-white shadow-sm' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 text-xs font-bold">
                                        <Star size={14} fill={isFeaturedOnly ? "white" : "none"} />
                                        Featured Only
                                    </div>
                                    <span className="text-[9px] font-black">{isFeaturedOnly ? 'ON' : 'OFF'}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* PROJECT GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                        <div key={project.id} className="group bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative">

                            {/* RESTORED: Visual Star Badge on the Card */}
                            {project.is_featured === 1 && (
                                <div className="absolute top-3 right-3 bg-amber-500 text-white p-1 rounded-full shadow-lg z-20 border border-white/20">
                                    <Star size={12} fill="white" />
                                </div>
                            )}

                            {isAdmin && (
                                <button
                                    onClick={() => deleteProject(project.id)}
                                    className="absolute top-3 right-3 z-30 p-2 bg-red-600 text-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110"
                                    title="Delete Project"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}

                            <Link href={`/project/${project.id}`}>
                                <div className="relative aspect-[16/10] overflow-hidden cursor-pointer">
                                    {project.cover_image ? (
                                        <img
                                            src={`${API_URL}/uploads/thumb_${project.cover_image}`}
                                            alt={project.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center w-full h-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm">
                                            No image available for {project.name}
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-2 py-0.5 rounded text-[9px] font-bold uppercase text-slate-800 dark:text-slate-100">
                                        {project.category}
                                    </div>
                                </div>
                            </Link>

                            <div className="p-4">
                                <h3 className="font-bold text-slate-900 dark:text-white text-base mb-0.5">{project.name}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs mb-3 flex items-center gap-1"><MapPin size={12} /> {project.location}</p>
                                {/* Tiny Tag Previews */}
                                {project.tags && (
                                    <div className="flex flex-wrap gap-1 mb-4">
                                        {project.tags.split(',').slice(0, 3).map((tag, i) => (
                                            <span key={i} className="text-[9px] font-bold text-slate-400 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                {tag.trim()}
                                            </span>
                                        ))}
                                        {project.tags.split(',').length > 3 && (
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">+{project.tags.split(',').length - 3} more</span>
                                        )}
                                    </div>
                                )}
                                <Link href={`/project/${project.id}`}>
                                    <button className="w-full py-2 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-xs font-bold">
                                        View Details
                                    </button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}



export default function Gallery() {
    return (
        <Suspense fallback={<div className="p-20 text-center text-slate-400 dark:text-slate-500 font-medium">Initializing Gallery...</div>}>
            <GalleryContent />
        </Suspense>
    );
}