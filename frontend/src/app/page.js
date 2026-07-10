"use client";
import { useEffect, useState } from 'react';
import { Database, Image as ImageIcon, Folders, Star, Clock, Plus, ArrowRight, MapPin, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Home() {
  const [isAdmin, setIsAdmin] = useState(false);

  const [stats, setStats] = useState({
    projects: 0,
    assets: 0,
    featured: 0,
    storage: '0 MB',
    activity: []
  });
  const [loading, setLoading] = useState(true);

  // 👇 Helper goes here
  const activityLabel = {
    PROJECT_CREATE: "New Project",
    PROJECT_DELETE: "Project Deleted",
    IMAGE_ADD: "Images Uploaded",
    IMAGE_DELETE: "Image Deleted"
  };

  useEffect(() => {

    const token = localStorage.getItem('token');
    setIsAdmin(!!token);

    // Optional: If not logged in, you could redirect them to the gallery
    // if (!token) { router.push('/gallery'); return; }

    fetch(`${API_URL}/api/stats`, {
      headers: { 'Authorization': `Bearer ${token}` } // Send token to backend
    })
      .then(res => res.json())
      .then(data => { setStats(data); setLoading(false); });
  }, []);

  if (loading) return <div className="p-10 animate-pulse text-slate-400">Loading Dashboard...</div>;

  return (
    <div>
      <header className="mb-10">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-5">
          {isAdmin ? "Enterprise Dashboard" : "Project Showcase"}
        </h1>

        {isAdmin ? (
          <p className="text-slate-500 dark:text-slate-400">
            Welcome back, Admin. Here is an overview of your media repository.
          </p>
        ) : (
          <div className="bg-white dark:bg-slate-900 border p-4 rounded-[1rem] border-slate-200 dark:border-slate-800 mb-8 text-slate-600 dark:text-slate-300 space-y-2">
            Welcome to our Integrated Project Repository. Centralizing the collective
            built-environment intelligence of Consultants Collaborative Partnership.
            This master portal unites our multidisciplinary teams of architects,
            project managers, civil/structural engineers, MEPF specialists, and BIM
            coordinators working seamlessly across our regional hubs in Lagos, Abuja,
            and Kigali.
            From initial schematic concepts and sustainable green building
            certifications to structural documentation and lifecycle construction
            management, this platform tracks our journey of delivering excellence
            from inception to completion.
            Explore our decades of expertise driving innovation in the
            built-environment sector, organized by technical discipline, geographic
            region, and specialized asset category.
          </div>
        )}
      </header>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6 mb-12`}>
        {/* Card 1: Total Projects */}
        <Link href="/gallery" className="flex flex-col group h-full">
          <StatCard
            icon={<Folders className="text-blue-600" />}
            label="Total Projects"
            value={stats.projects}
            color="bg-blue-50 dark:bg-blue-950/40"
          />
        </Link>
        
        {/* Card 3: Featured Projects */}
        <Link href="/gallery?filter=featured" className="flex flex-col group h-full">
          <StatCard
            icon={<Star className="text-amber-600" />}
            label="Featured Projects"
            value={stats.featured || 0}
            color="bg-amber-50 dark:bg-amber-950/40"
          />
        </Link>

        {/* Card 2: Total Images */}
        <Link href="/gallery" className="flex flex-col group h-full">
          <StatCard
            icon={<ImageIcon className="text-purple-600" />}
            label="Total Images"
            value={stats.assets}
            color="bg-purple-50 dark:bg-purple-950/40"
          />
        </Link>

        {/* Card 4: Storage Used */}
        {isAdmin && (
          <div className="flex flex-col h-full">
            <StatCard
              icon={<Database className="text-emerald-600" />}
              label="Storage Used"
              value={stats.storage}
              color="bg-emerald-50 dark:bg-emerald-950/40"
            />
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm p-8 mb-8 overflow-hidden">
        <div className="max-h-75 overflow-y-auto custom-scrollbar p-8">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Portfolio Distribution</h3>
          <div className="space-y-2 flex-1 mb-0">
            {stats.categoryData?.length > 0 ? stats.categoryData.map((cat, i) => {
              // Logic: Calculate % based on total projects
              const percentage = ((cat.count / stats.projects) * 100).toFixed(0);

              return (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{cat.name}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{percentage}%</span>
                  </div>
                  {/* THE BAR */}
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">{cat.count} projects total</p>
                </div>
              );
            }) : (
              <div className="h-full flex items-center justify-center text-slate-300 dark:text-slate-600 italic text-sm text-center">
                Upload projects to generate <br /> portfolio analytics.
              </div>
            )}
          </div>

          <Link href="/gallery" className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between group">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Full Inventory</span>
            <ChevronRight size={16} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {isAdmin ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Clock size={18} className="text-slate-400 dark:text-slate-500" /> Recent Activity
            </h3>
            <Link href="/gallery" className="text-xs font-bold text-blue-600 hover:underline">View repository</Link>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {stats?.activity?.length > 0 ? (
              stats.activity.map((item, index) => (
                <div
                  key={index}
                  className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                      {item.action_type?.charAt(0)}
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.project_name}
                      </p>

                      <p className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        {activityLabel[item.action_type] || item.action_type} • {new Date(item.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                    {activityLabel[item.action_type] || item.action_type}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-sm italic">
                No recent activity found.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Recently Added Projects</h3>
            <Link href="/gallery" className="flex items-center gap-2 text-blue-600 font-bold text-xs hover:gap-3 transition-all">BROWSE ALL <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.highlights?.map((project) => (
              <Link key={project.id} href={`/project/${project.id}?from=dashboard`} className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all duration-500">
                <div className="relative aspect-[16/10] overflow-hidden cursor-pointer">
                  {project.thumbnail ? (
                    <img
                      src={`${API_URL}/uploads/thumb_${project.thumbnail}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      alt={project.name}
                      onError={(e) => {
                        // If the thumbnail fails, try loading the original
                        e.target.src = `${API_URL}/uploads/${project.thumbnail}`;
                      }}
                    />
                  ) : (
                    /* SHOW THIS IF PROJECT HAS NO IMAGES */
                    <div className="flex items-center justify-center w-full h-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm">
                      No image available for {project.name}
                    </div>
                  )}

                  <div className="absolute top-3 left-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-2 py-0.5 rounded text-[9px] font-bold uppercase text-slate-800 dark:text-white">
                    {project.category}
                  </div>
                </div>

                <div className="p-6">
                  <h4 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-blue-600 transition-colors truncate">{project.name}</h4>
                  <p className="text-slate-400 dark:text-slate-500 text-xs flex items-center gap-1 mt-1 font-medium "><MapPin size={12} /> {project.location}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[140px] transition-all group-hover:shadow-md">
      <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}