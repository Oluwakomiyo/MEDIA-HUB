"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Upload, ArrowLeft, CheckCircle2, Star,
    Info, Briefcase, User, DollarSign, MapPin, Calendar, FileText, X, Award, Clock, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import {
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    closestCenter,
    DragOverlay,
} from "@dnd-kit/core";

import {
    SortableContext,
    useSortable,
    rectSortingStrategy,
    arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function AddProject() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [tagInput, setTagInput] = useState("");
    const [tagList, setTagList] = useState([]);
    const [activeId, setActiveId] = useState(null);


    const categories = [
        'Residential', 'Commercial', 'Industrial', 'Healthcare',
        'Infrastructure', 'Educational'
    ];

    // 1. FORM STATE
    const [formData, setFormData] = useState({
        name: '',
        category: 'Residential',
        description: '',
        location: '',
        client_name: '',
        completion_date: '',
        project_manager: '',
        project_value: '',
        partner: '',
        is_featured: false,
        is_award_winning: false,
        is_landmark: false,
        is_recently_completed: false,
        is_premium: false
    });

    const [selectedFiles, setSelectedFiles] = useState([]);

    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("addProjectForm");

        if (saved) {
            const parsed = JSON.parse(saved);

            setFormData(parsed.formData);
            setTagList(parsed.tagList || []);
            setTagInput(parsed.tagInput || "");
        }

        setHydrated(true);
    }, []);


    useEffect(() => {
        if (!hydrated) return;

        localStorage.setItem(
            "addProjectForm",
            JSON.stringify({
                formData,
                tagList,
                tagInput
            })
        );
    }, [formData, tagList, tagInput, hydrated]);

    const createThumbnail = (file, maxSize = 500) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                const scale = Math.min(
                    maxSize / img.width,
                    maxSize / img.height,
                    1
                );

                const canvas = document.createElement("canvas");

                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);

                const ctx = canvas.getContext("2d");

                ctx.drawImage(
                    img,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                canvas.toBlob(
                    (blob) => {
                        URL.revokeObjectURL(url);

                        if (!blob) {
                            reject(new Error("Could not create thumbnail"));
                            return;
                        }

                        resolve(URL.createObjectURL(blob));
                    },
                    "image/jpeg",
                    0.8
                );
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Could not load image"));
            };

            img.src = url;
        });
    };


    const handleFiles = async (files) => {
        const incomingFiles = Array.from(files);

        if (incomingFiles.length + selectedFiles.length > 20) {
            alert('Maximum 20 images allowed');
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp"
        ];

        const validFiles = incomingFiles.filter(file =>
            allowedTypes.includes(file.type)
        );

        const invalidFiles = incomingFiles.filter(file =>
            !allowedTypes.includes(file.type)
        );

        if (invalidFiles.length > 0) {
            alert("Only JPG, PNG, and WEBP images are allowed.");
        }

        const arr = await Promise.all(
            validFiles.map(async (file) => ({
                id: crypto.randomUUID(),
                file,
                preview: await createThumbnail(file),
            }))
        );

        setSelectedFiles(prev => [...prev, ...arr]);
    };

    const sortableIds = useMemo(
        () => selectedFiles.map(item => item.id),
        [selectedFiles]
    );

    const activeItem = useMemo(
        () => selectedFiles.find(item => item.id === activeId) || null,
        [selectedFiles, activeId]
    );

    const filesRef = useRef([]);

    useEffect(() => {
        filesRef.current = selectedFiles;
    }, [selectedFiles]);

    useEffect(() => {
        return () => {
            filesRef.current.forEach((item) => {
                if (item.preview) {
                    URL.revokeObjectURL(item.preview);
                }
            });
        };
    }, []);


    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragEnd = useCallback(({ active, over }) => {
        setActiveId(null);

        if (!over) return;
        if (active.id === over.id) return;

        setSelectedFiles((current) => {
            const oldIndex = current.findIndex(
                (item) => item.id === active.id
            );

            const newIndex = current.findIndex(
                (item) => item.id === over.id
            );

            console.log({
                active: active.id,
                over: over.id,
                oldIndex,
                newIndex,
            });

            if (oldIndex === -1 || newIndex === -1) {
                return current;
            }

            return arrayMove(current, oldIndex, newIndex);
        });
    }, []);


    const handleDragStart = useCallback(({ active }) => {
        setActiveId(active.id);
    }, []);

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
    }, []);




    // 2. SUBMIT LOGIC
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const token = localStorage.getItem('token'); // Get the token

        const finalData = {
            ...formData,
            tags: tagList.join(", ")
        };

        try {
            const res = await fetch(`${API_URL}/api/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Add Header
                },
                body: JSON.stringify(finalData)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Failed to create project');

            if (data.id && selectedFiles.length > 0) {
                const imageFormData = new FormData();

                for (let i = 0; i < selectedFiles.length; i++) {
                    imageFormData.append('images', selectedFiles[i].file);
                }

                // first image is the cover
                imageFormData.append('coverIndex', '0');

                const uploadRes = await fetch(`${API_URL}/api/projects/${data.id}/upload`,
                    {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }, // Add Header
                        body: imageFormData
                    }
                );

                if (!uploadRes.ok) {
                    const err = await uploadRes.json().catch(() => ({}));

                    console.log("Upload status:", uploadRes.status);
                    console.log("Upload error:", err);

                    throw new Error(err.error || "Image upload failed");
                }
            }

            setSuccess(true);
            localStorage.removeItem("addProjectForm");
            setTimeout(() => router.push(`/project/${data.id}`), 2000);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Something went wrong with the upload!");
        } finally {
            setLoading(false);
        }
    };

    // 3. REMOVE FILE PREVIEW LOGIC
    const removeFile = useCallback((id) => {
        setSelectedFiles((prev) => {
            const removed = prev.find(item => item.id === id);

            if (removed?.preview) {
                URL.revokeObjectURL(removed.preview);
            }

            return prev.filter(item => item.id !== id);
        });
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            const tag = tagInput.trim();

            if (
                !tagList.some(
                    t => t.toLowerCase() === tag.toLowerCase()
                )
            ) {
                setTagList([...tagList, tag]);
            }
            setTagInput("");
        }
    };

    const removeTag = (tagToRemove) => {
        setTagList(tagList.filter(t => t !== tagToRemove));
    };

    const handleProjectValueChange = (e) => {
        const raw = e.target.value.replace(/\D/g, ""); // Remove everything except digits

        setFormData({
            ...formData,
            project_value: raw
        });
    };

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
                <CheckCircle2 className="w-20 h-20 text-green-500 mb-4 animate-bounce" />
                <h1 className="text-4xl font-black tracking-tighter">Project Published</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Opening project details...</p>
            </div>
        );
    }
    
    // Helper to handle Enter key
    
    return (
        <div className="space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-slate-900">
            <div className="max-w-4xl mx-auto">

                {/* HEADER */}
                <header className="mb-10">
                    <Link href="/" className="flex items-center text-blue-600 mb-4 hover:underline font-bold text-xs uppercase tracking-widest">
                        <ArrowLeft size={16} className="mr-2" /> Back to Dashboard
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Create New Project</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 text-base">Register project specifications and media assets.</p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* SECTION 1: IDENTITY */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Info size={16} className="text-blue-500" /> Project Identity
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <FormGroup label="Project Name">
                                <input required type="text" value={formData.name} placeholder="e.g. Grand Central Station" className="form-input"
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            </FormGroup>

                            <FormGroup label="Category">
                                <select value={formData.category} className="form-input appearance-none bg-white"
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </FormGroup>
                        </div>
                    </div>

                    {/* SECTION 2: STAKEHOLDERS */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Briefcase size={16} className="text-blue-500" /> Stakeholders & Value
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <FormGroup label="Project Manager" icon={<User size={14} />}>
                                <input type="text" value={formData.project_manager} placeholder="Manager Name" className="form-input"
                                    onChange={(e) => setFormData({ ...formData, project_manager: e.target.value })} />
                            </FormGroup>

                            <FormGroup label="Project Value" icon={<DollarSign size={14} />}>
                                <input
                                    type="text"
                                    placeholder="e.g. 10,000,000"
                                    className="form-input"
                                    value={
                                        formData.project_value
                                            ? Number(formData.project_value).toLocaleString()
                                            : ""
                                    }
                                    onChange={handleProjectValueChange}
                                />
                            </FormGroup>

                            <FormGroup label="Client Name">
                                <input type="text" value={formData.client_name} placeholder="Organization Name" className="form-input"
                                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })} />
                            </FormGroup>

                            <FormGroup label="Partner">
                                <input type="text" value={formData.partner} placeholder="Key Contact" className="form-input"
                                    onChange={(e) => setFormData({ ...formData, partner: e.target.value })} />
                            </FormGroup>
                        </div>
                    </div>

                    {/* SECTION 3: LOGISTICS */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <MapPin size={16} className="text-blue-500" /> Location & Schedule
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                            <FormGroup label="Site Location">
                                <input required type="text" value={formData.location} placeholder="City, State" className="form-input"
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
                            </FormGroup>

                            <FormGroup label="Completion Date">
                                <input type="date" value={formData.completion_date} className="form-input"
                                    onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })} />
                            </FormGroup>
                        </div>

                        <FormGroup label="Detailed Description">
                            <textarea required rows="3" value={formData.description} placeholder="Overview of architectural scope..." className="form-input resize-none"
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}></textarea>
                        </FormGroup>
                    </div>

                    {/* SECTION 4: MEDIA */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Upload size={16} className="text-blue-500" /> Media & Visibility
                        </h3>
                        <div
                            className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40 group mb-8
    ${isDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40" : "border-slate-200 dark:border-slate-700 hover:border-blue-300"}
  `}
                            onDragOver={(e) => {
                                e.preventDefault();

                                if (
                                    e.dataTransfer.types.includes("Files") &&
                                    !isDragging
                                ) {
                                    setIsDragging(true);
                                }
                            }}

                            onDragLeave={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget)) {
                                    setIsDragging(false);
                                }
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragging(false);
                                handleFiles(e.dataTransfer.files);
                            }}
                        >
                            <input
                                type="file"
                                multiple
                                accept=".jpg,.jpeg,.png,.webp"
                                className="hidden"
                                id="file-upload"
                                onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
                            />
                            <label htmlFor="file-upload" className="cursor-pointer">
                                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                                    <Upload className="text-blue-600" />
                                </div>
                                <p className="text-lg font-bold text-slate-700 dark:text-slate-200">Select Visual Assets</p>
                                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">{selectedFiles?.length > 0 ? `${selectedFiles.length} files staged` : 'Drag or click to browse'}</p>
                            </label>
                        </div>
                        {selectedFiles.length > 0 && (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={({ active }) => setActiveId(active.id)}
                                onDragEnd={handleDragEnd}
                                onDragCancel={() => setActiveId(null)}
                            >
                                <SortableContext
                                    items={sortableIds}
                                    strategy={rectSortingStrategy}
                                >
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-8">
                                        {selectedFiles.map((item, index) => (
                                            <SortableImage
                                                key={item.id}
                                                item={item}
                                                index={index}
                                                removeFile={removeFile}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>

                                <DragOverlay dropAnimation={null}>
                                    {activeItem && (
                                        <div className="rounded-2xl overflow-hidden shadow-2xl">
                                            <img
                                                src={activeItem.preview}
                                                alt=""
                                                draggable={false}
                                                className="w-full h-28 object-cover"
                                            />
                                        </div>
                                    )}
                                </DragOverlay>
                            </DndContext>
                        )}

                    </div>

                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Project Distinctions</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <StatusCheckbox label="Featured" icon={<Star size={14} />} color="amber"
                                checked={formData.is_featured} onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })} />

                            <StatusCheckbox label="Award Winning" icon={<Award size={14} />} color="emerald"
                                checked={formData.is_award_winning} onChange={(e) => setFormData({ ...formData, is_award_winning: e.target.checked })} />

                            <StatusCheckbox label="Landmark" icon={<MapPin size={14} />} color="purple"
                                checked={formData.is_landmark} onChange={(e) => setFormData({ ...formData, is_landmark: e.target.checked })} />

                            <StatusCheckbox label="Recently Completed" icon={<Clock size={14} />} color="blue"
                                checked={formData.is_recently_completed} onChange={(e) => setFormData({ ...formData, is_recently_completed: e.target.checked })} />

                            <StatusCheckbox label="Premium" icon={<ShieldCheck size={14} />} color="rose"
                                checked={formData.is_premium} onChange={(e) => setFormData({ ...formData, is_premium: e.target.checked })} />
                        </div>
                    </div>

                    {/* SECTION 5: DISCOVERY TAGS */}
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-600">
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Discovery Tags / BIM keywords</h3>
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Type a tag and press Enter (e.g. Eco-Friendly, Steel, Award)"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="form-input"
                            />
                            <div className="flex flex-wrap gap-2">
                                {tagList.map(tag => (
                                    <span key={tag} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 px-3 py-1.5 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-800">
                                        #{tag}
                                        <button type="button" onClick={() => removeTag(tag)}><X size={12} /></button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        type="submit"
                        className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 dark:shadow-blue-950/50 disabled:bg-slate-300 dark:disabled:bg-slate-700">
                        {loading ? "Publishing to Hub..." : "Publish Project to Repository"}
                    </button>
                </form>
            </div>

            <style jsx>{`
  .form-input {
    width: 100%;
    padding: 1rem;
    background-color: #f8fafc;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    border-radius: 1rem;
    font-weight: 600;
    outline: none;
    transition: all 0.2s ease;
  }

  .form-input::placeholder {
    color: #94a3b8;
  }

  .form-input:focus {
    background-color: #ffffff;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }

  :global(.dark) .form-input {
    background-color: #1e293b;
    color: #ffffff;
    border-color: #334155;
  }

  :global(.dark) .form-input::placeholder {
    color: #64748b;
  }

  :global(.dark) .form-input:focus {
    background-color: #0f172a;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
  }
`}</style>
        </div>
    );
}

function FormGroup({ label, children, icon }) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                {label}
            </label>
            {children}
        </div>
    );
}

function StatusCheckbox({ label, icon, color, checked, onChange }) {
    const colors = {
        amber: "bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 text-amber-600 border-amber-100",
        emerald: "bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 text-emerald-600 border-emerald-100",
        purple: "bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300 text-purple-600 border-purple-100",
        blue: "bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 text-blue-600 border-blue-100",
        rose: "bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 text-rose-600 border-rose-100"
    };
    return (
        <label className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${checked ? colors[color] : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-black-100 dark:border-black-900'}`}>
            <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
            {icon}
            <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
        </label>
    );
}

const SortableImage = React.memo(function SortableImage({
    item,
    index,
    removeFile
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        willChange: isDragging ? "transform" : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`relative group rounded-2xl overflow-hidden border
                border-slate-200 dark:border-slate-700
                bg-slate-50 dark:bg-slate-800
                cursor-grab active:cursor-grabbing
                ${isDragging ? "z-50 opacity-50" : ""}
            `}
        >
            <img
                src={item.preview}
                alt=""
                draggable={false}
                loading="lazy"
                decoding="async"
                className="w-full h-28 object-cover select-none"
            />

            <div className="p-2">
                <p className="text-xs truncate">
                    {item.file.name}
                </p>
            </div>

            {index === 0 && (
                <div className="absolute top-2 left-2 px-2 py-1 rounded bg-blue-600 text-white text-[10px] font-bold">
                    Cover
                </div>
            )}

            <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => removeFile(item.id)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition"
            >
                ✕
            </button>
        </div>
    );
});