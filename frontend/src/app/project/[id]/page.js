"use client";
import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, Trash2, Calendar, MapPin, Play, Star, X,
    User, DollarSign, Briefcase, Landmark, Edit3, Plus, Upload, Save, RotateCcw
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function ProjectDetails() {
    const { id } = useParams();
    const router = useRouter();

    const searchParams = useSearchParams();

    // NEW: Check where the user came from
    const from = searchParams.get('from');
    const backPath = from === 'dashboard' ? '/' : '/gallery';
    const backLabel = from === 'dashboard' ? 'Back to Dashboard' : 'Back to Repository';

    // 1. ALL DATA STATES
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false); // Controls the Popup
    const [editData, setEditData] = useState(null);    // Holds the form data
    const [selectedImage, setSelectedImage] = useState(null);
    const [showUpload, setShowUpload] = useState(false);
    const [newFiles, setNewFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [editTagInput, setEditTagInput] = useState("");
    const [editTagList, setEditTagList] = useState([]);
    const [saving, setSaving] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // 2. FETCH DATA ONCE
    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsAdmin(!!token);

        const fetchProject = async () => {
            try {
                const res = await fetch(`${API_URL}/api/projects/${id}`);
                const data = await res.json();
                setProject(data);

                // Pre-fill the edit form
                setEditData({
                    ...data,
                    is_featured: data.is_featured === 1,
                    // Ensure we use the correct key from DB
                    client_partner: data.client_partner || data.partner
                });

                if (data.tags) {
                    setEditTagList(data.tags.split(',').map(t => t.trim()).filter(t => t !== ""));
                } else {
                    setEditTagList([]);
                }

                setLoading(false);
            } catch (err) {
                console.error("Fetch error:", err);
                setLoading(false);
            }
        };
        fetchProject();
    }, [id]);

    const handleEditTagKeyDown = (e) => {
        if (e.key === 'Enter' && editTagInput.trim()) {
            e.preventDefault();
            const tag = editTagInput.trim();
            if (!editTagList.includes(tag)) {
                setEditTagList([...editTagList, tag]);
            }
            setEditTagInput("");
        }
    };

    const removeEditTag = (tagToRemove) => {
        setEditTagList(editTagList.filter(t => t !== tagToRemove));
    };

    // 3. SAVE EDITS FUNCTION
    const handleUpdate = async (e) => {
        if (e) e.preventDefault();

        const token = localStorage.getItem('token');
        if (!token) {
            alert("Admin session required. Please login.");
            router.push('/login');
            return;
        }

        setSaving(true);
        const dataWithTags = {
            ...editData,
            tags: editTagList.join(', ')
        };

        try {
            const res = await fetch(`${API_URL}/api/projects/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(dataWithTags)
            });

            if (res.ok) {
                setProject({ ...project, ...dataWithTags, is_featured: editData.is_featured ? 1 : 0 });
                setIsEditing(false);
            } else {
                const errData = await res.json();
                alert(errData.error || "Session expired. Please login again.");
                if (res.status === 401 || res.status === 403) router.push('/login');
            }
        } catch (error) {
            alert("Server connection failed.");
        } finally {
            setSaving(false);
        }
    };

    // 4. MEDIA FUNCTIONS (Upload/Delete)
    const handleAddMedia = async () => {
        const token = localStorage.getItem('token');
        if (!token) return alert("Please login first.");

        setUploading(true);
        const fd = new FormData();
        for (let f of newFiles) fd.append('images', f);

        try {
            const res = await fetch(`${API_URL}/api/projects/${id}/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, // Token required here too
                body: fd
            });

            if (res.ok) {
                const refresh = await fetch(`${API_URL}/api/projects/${id}`);
                setProject(await refresh.json());
                setNewFiles([]);
                setShowUpload(false);
            } else {
                alert("Upload unauthorized. Please login.");
            }
        } catch (e) {
            alert("Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const deleteImage = async (e, imageId) => {
        e.stopPropagation();
        if (!confirm("Delete this image?")) return;

        const token = localStorage.getItem('token');
        if (!token) {
            alert("Admin login required.");
            router.push('/login');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/images/${imageId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` } // FIXED: Added missing header
            });

            if (res.ok) {
                setProject({ ...project, images: project.images.filter(img => img.id !== imageId) });
            } else {
                alert("Unauthorized action.");
            }
        } catch (err) {
            alert("Error communicating with server.");
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.3em]">Loading Asset Hub...</div>;
    if (!project) return <div className="p-20 text-center text-slate-900 dark:text-white">Project not found</div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 text-slate-900 dark:text-white">
            <div className="max-w-6xl mx-auto">

                {/* TOP NAVIGATION */}
                <div className="flex justify-between items-center mb-8">
                    <Link href={backPath} className="flex items-center text-blue-600 hover:underline font-bold text-xs uppercase tracking-widest">
                        <ArrowLeft className="w-4 h-4 mr-2" /> {backLabel}
                    </Link>
                    <div className="flex gap-3">
                        {/* THE BUTTON THAT OPENS THE POPUP (No Reloads) */}
                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => setIsEditing(true)}
                                className="bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 px-6 py-3 rounded-xl font-bold flex items-center gap-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-sm shadow-sm"
                            >
                                <Edit3 size={18} /> Edit Details
                            </button>
                        )}
                        <Link href={`/slideshow?projectId=${id}`} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-3 hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/50
                         transition-all text-sm">
                            <Play size={18} fill="currentColor" /> Play Slideshow
                        </Link>
                    </div>
                </div>

                {/* PROJECT DATA CARD */}
                <div className="bg-white dark:bg-slate-900 rounded-[1rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mb-12">
                    <div className="p-10 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-3 py-1 rounded text-[10px] font-black border border-slate-200 dark:border-slate-700 uppercase tracking-widest">{project.category}</span>
                            {project.is_featured === 1 && <span className="bg-amber-500 text-white px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm"><Star size={10} fill="currentColor" /> Featured</span>}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-4 text-slate-900 dark:text-white">{project.name}</h1>
                        <p className="flex items-center text-slate-400 dark:text-slate-500 gap-2 text-lg italic"><MapPin size={18} className="text-blue-500" /> {project.location}</p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
                        <InfoBox icon={<User size={14} />} label="Project Manager" value={project.project_manager} />
                        <InfoBox
                            icon={<DollarSign size={14} />}
                            label="Project Value"
                            value={
                                project.project_value &&
                                    !isNaN(Number(project.project_value))
                                    ? `$${Number(project.project_value).toLocaleString()}`
                                    : "---"
                            }
                            color="text-blue-600"
                        />
                        <InfoBox icon={<Briefcase size={14} />} label="Client Name" value={project.client_name} />
                        <InfoBox icon={<Landmark size={14} />} label="Partner" value={project.partner} />
                    </div>

                    <div className="p-10">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Description</p>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg max-w-4xl whitespace-pre-line mb-8">{project.description || "No description."}</p>
                        <div className="inline-flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <Calendar className="text-blue-500" size={20} />
                            <div><p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Completion</p><p className="text-slate-900 dark:text-white text-lg font-bold">{project.completion_date || "Not Set"}</p></div>
                        </div>
                    </div>

                    {/* Inside your Project Details Card, below the description */}
                    {/* DISCOVERY TAGS */}
                    {project.tags && project.tags.trim() !== "" && (
                        <div className="p-10">
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Discovery Tags</p>
                            <div className="flex flex-wrap gap-2">
                                {project.tags.split(',').map((tag, index) => (
                                    tag.trim() !== "" && (
                                        <span key={index} className="px-4 py-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 text-[11px] font-bold rounded-xl border border-blue-100 dark:border-blue-800">
                                            #{tag.trim()}
                                        </span>
                                    )
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* LARGE IMAGE GRID (3 COLUMNS) */}
                <div className="mb-20">
                    <div className="flex justify-between items-end mb-8">
                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Media Assets <span className="text-sm font-bold bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full text-blue-600 dark:text-blue-300 ml-2">{project.images?.length || 0} assets</span></h2>
                        {isAdmin && (
                            <button onClick={() => setShowUpload(!showUpload)} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${showUpload ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>{showUpload ? <X size={16} /> : <Plus size={16} />} {showUpload ? 'Cancel' : 'Add Media'}</button>
                        )}
                    </div>

                    {showUpload && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10 bg-blue-50 dark:bg-blue-950 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-[2.5rem] p-12 flex flex-col md:flex-row items-center gap-10">
                            <div className="flex-1"><h4 className="font-bold text-blue-900 dark:text-blue-300 text-xl">Upload New Assets</h4><p className="text-blue-700/60 dark:text-blue-300/70 font-medium">Add high-resolution visuals to this project.</p></div>
                            <input type="file" multiple accept="image/*" id="extra" className="hidden" onChange={(e) => setNewFiles(e.target.files)} />
                            <label htmlFor="extra" className="bg-white dark:bg-slate-900 px-10 py-5 rounded-2xl border border-blue-200 dark:border-blue-800 text-blue-600 font-bold cursor-pointer hover:shadow-md transition-all text-sm">{newFiles.length > 0 ? `${newFiles.length} files selected` : 'Browse'}</label>
                            <button onClick={handleAddMedia} disabled={!newFiles.length || uploading} className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-200 dark:shadow-blue-950/50 transition-all">{uploading ? 'Processing...' : 'Push Now'}</button>
                        </motion.div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {project.images?.map(img => (
                            <div key={img.id} onClick={() => setSelectedImage(img.file_path)} className="group h-40 bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative">
                                <img src={`${API_URL}/uploads/thumb_${img.file_path}`} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000" />
                                {isAdmin && (
                                    <button onClick={(e) => deleteImage(e, img.id)} className="absolute top-3 right-3 z-30 p-2 bg-red-600 text-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-110"><Trash2 size={18} /></button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* --- POPUP EDIT MODAL (Fixed and Stationary) --- */}
                <AnimatePresence>
                    {isEditing && (
                        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                            {/* Dark Blurred Backdrop */}
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditing(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />

                            {/* Stationary Form Card */}
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                                <div className="p-8 border-b bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                                    <div><h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Edit Project Details</h2><p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-1">Project Ref: {id}</p></div>
                                    <button onClick={() => setIsEditing(false)} className="p-3 bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl text-slate-400 dark:text-slate-500 hover:text-red-500 border border-slate-200 dark:border-slate-700"><X size={20} /></button>
                                </div>
                                <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto p-10 space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <EditField label="Project Name" value={editData?.name} onChange={v => setEditData({ ...editData, name: v })} />
                                        <div><label className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase mb-2 block">Category</label>
                                            <select value={editData?.category} onChange={e => setEditData({ ...editData, category: e.target.value })} className="appearance-none text-slate-900 dark:text-white w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none">
                                                {['Residential', 'Commercial', 'Industrial', 'Healthcare', 'Infrastructure', 'Premium', 'Landmark', 'Recently Completed', 'Award Winning'].map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <EditField label="Manager" value={editData?.project_manager} onChange={v => setEditData({ ...editData, project_manager: v })} />
                                        <EditField
                                            label="Value"
                                            value={
                                                editData?.project_value
                                                    ? Number(editData.project_value).toLocaleString()
                                                    : ""
                                            }
                                            onChange={(v) => {
                                                const rawValue = v.replace(/\D/g, "");

                                                setEditData({
                                                    ...editData,
                                                    project_value: rawValue,
                                                });
                                            }}
                                        />
                                        <EditField label="Location" value={editData?.location} onChange={v => setEditData({ ...editData, location: v })} />
                                        <EditField label="Completion Date" type="date" value={editData?.completion_date} onChange={v => setEditData({ ...editData, completion_date: v })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <EditField label="Client Name" value={editData?.client_name} onChange={v => setEditData({ ...editData, client_name: v })} />
                                        <EditField label="Partner" value={editData?.partner} onChange={v => setEditData({ ...editData, partner: v })} />
                                    </div>
                                    {/* TAG EDITING SECTION */}
                                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1">
                                            Discovery Tags
                                        </label>
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                placeholder="Type a new tag and press Enter..."
                                                value={editTagInput}
                                                onChange={(e) => setEditTagInput(e.target.value)}
                                                onKeyDown={handleEditTagKeyDown}
                                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                                            />
                                            <div className="flex flex-wrap gap-2">
                                                {editTagList.map((tag, index) => (
                                                    <span
                                                        key={index}
                                                        className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 px-3 py-1.5 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-800"
                                                    >
                                                        #{tag}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeEditTag(tag)}
                                                            className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-900 rounded-full transition-colors"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Description</label><textarea rows="3" value={editData?.description} onChange={e => setEditData({ ...editData, description: e.target.value })} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none" /></div>
                                    <div onClick={() => setEditData({ ...editData, is_featured: !editData.is_featured })} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer select-none active:scale-[0.99] flex justify-between items-center ${editData?.is_featured ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500' : 'bg-slate-50 dark:bg-slate-800 border-transparent'}`}>
                                        <div className="flex items-center gap-3"><Star size={20} fill={editData?.is_featured ? "#f59e0b" : "none"} className={editData?.is_featured ? "text-amber-500" : "text-slate-400 dark:text-slate-500"} /><span className="text-sm font-bold text-amber-900 dark:text-amber-300">Featured Status</span></div>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${editData?.is_featured ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editData?.is_featured ? 'right-1' : 'left-1'}`} /></div>
                                    </div>
                                </form>
                                <div className="p-8 border-t bg-slate-50 dark:bg-slate-800 flex gap-4">
                                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-4 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-white dark:hover:bg-slate-900 rounded-2xl transition-all border border-transparent">Discard</button>
                                    <button
                                        type="submit" // Changed to submit
                                        disabled={saving}
                                        onClick={handleUpdate} // Explicitly call handleUpdate
                                        className="flex-[2] py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 dark:shadow-blue-950/50 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Saving Specs...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} />
                                                Save Edits
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* --- LIGHTBOX (IMAGE VIEWER) --- */}
                <AnimatePresence>
                    {selectedImage && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[2000] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-12" onClick={() => setSelectedImage(null)}>
                            <button className="absolute top-8 right-8 text-white bg-white/10 p-4 rounded-full hover:bg-red-500 transition-all"><X size={32} /></button>
                            <motion.img initial={{ scale: 0.9 }} animate={{ scale: 1 }} src={`${API_URL}/uploads/${selectedImage}`} className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// HELPER COMPONENTS
function InfoBox({ label, value, color = "text-slate-800 dark:text-slate-200", icon }) {
    return (
        <div className="p-8"><p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">{icon} {label}</p><p className={`text-xl font-bold tracking-tight truncate ${color}`}>{value || "---"}</p></div>
    );
}

function EditField({ label, value, onChange, type = "text" }) {
    return (
        <div className="flex flex-col"><label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 block ml-1">{label}</label><input type={type} value={value || ""} onChange={e => onChange(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" /></div>
    );
}