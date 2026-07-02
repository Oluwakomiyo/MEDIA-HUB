"use client";
import { useEffect, useState } from 'react';
import { Database, Image as ImageIcon, Folders, Star, Clock, Plus, ArrowRight, MapPin } from 'lucide-react';
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
        <h1 className="text-3xl font-bold text-slate-900">{isAdmin ? "Enterprise Dashboard" : "Project Showcase"}</h1>
        <p className="text-slate-500">{isAdmin ? "Welcome back, Admin. Here is an overview of your media repository." : "Explore our latest architectural and engineering achievements."}</p>
      </header>

      <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6 mb-12`}>
        {/* Card 1: Total Projects */}
        <Link href="/gallery" className="flex flex-col group h-full">
          <StatCard
            icon={<Folders className="text-blue-600" />}
            label="Total Projects"
            value={stats.projects}
            color="bg-blue-50"
          />
        </Link>

        {/* Card 2: Total Assets */}
        <Link href="/gallery" className="flex flex-col group h-full">
          <StatCard
            icon={<ImageIcon className="text-purple-600" />}
            label="Total Assets"
            value={stats.assets}
            color="bg-purple-50"
          />
        </Link>

        {/* Card 3: Featured Projects */}
        <Link href="/gallery?filter=featured" className="flex flex-col group h-full">
          <StatCard
            icon={<Star className="text-amber-600" />}
            label="Featured Projects"
            value={stats.featured || 0}
            color="bg-amber-50"
          />
        </Link>

        {/* Card 4: Storage Used */}
        {isAdmin && (
          <div className="flex flex-col h-full">
            <StatCard
              icon={<Database className="text-emerald-600" />}
              label="Storage Used"
              value={stats.storage}
              color="bg-emerald-50"
            />
          </div>
        )}
      </div>

      {isAdmin ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock size={18} className="text-slate-400" /> Recent Activity
            </h3>
            <Link href="/gallery" className="text-xs font-bold text-blue-600 hover:underline">View repository</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {stats?.activity?.length > 0 ? (
              stats.activity.map((item, index) => (
                <div
                  key={index}
                  className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                      {item.action_type?.charAt(0)}
                    </div>

                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {item.project_name}
                      </p>

                      <p className="text-xs text-slate-400 uppercase tracking-widest">
                        {activityLabel[item.action_type] || item.action_type} • {new Date(item.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {activityLabel[item.action_type] || item.action_type}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-slate-400 text-sm italic">
                No recent activity found.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Recently Added Projects</h3>
            <Link href="/gallery" className="flex items-center gap-2 text-blue-600 font-bold text-xs hover:gap-3 transition-all">BROWSE ALL <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {stats.highlights?.map((project) => (
              <Link key={project.id} href={`/project/${project.id}?from=dashboard`} className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-500">
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
                    <div className="flex items-center justify-center w-full h-full bg-slate-100 text-slate-500 text-sm">
                      No image available for {project.name}
                    </div>
                  )}

                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-0.5 rounded text-[9px] font-bold uppercase text-slate-800">
                    {project.category}
                  </div>
                </div>

                <div className="p-6">
                  <h4 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors truncate">{project.name}</h4>
                  <p className="text-slate-400 text-xs flex items-center gap-1 mt-1 font-medium italic"><MapPin size={12} /> {project.location}</p>
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
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between min-h-[140px] transition-all group-hover:shadow-md">
      <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}