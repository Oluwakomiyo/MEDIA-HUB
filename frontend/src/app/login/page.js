"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from "next-themes";
import { Lock, User, ArrowRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Login() {
    const [form, setForm] = useState({ username: '', password: '' });
    const [error, setError] = useState("");
    const router = useRouter();
    const { setTheme } = useTheme();

    useEffect(() => {
        setTheme("light");
    }, [setTheme]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(""); // Clear previous errors

        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const data = await res.json();

            if (res.ok) {
                // 1. Save the token
                localStorage.setItem('token', data.token);

                // 2. Redirect to Dashboard and Refresh the App
                // This ensures the Sidebar 'sees' the token and shows Admin items
                window.location.href = "/";
            } else {
                setError(data.error || "Login failed");
            }
        } catch (err) {
            setError("Could not connect to server");
        }
    };

    return (
        <div className="h-[90vh] bg-slate-950 flex items-center justify-center p-6 rounded-2xl">
            <div className="w-full max-w-md bg-slate-900 rounded-[1.5rem] border border-slate-800 p-10 shadow-2xl">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 mx-auto shadow-lg shadow-blue-900/20">
                    <Lock className="text-white" size={28} />
                </div>
                <h1 className="text-2xl font-black text-white text-center tracking-tight mb-2">Management Login</h1>
                <p className="text-slate-500 text-center text-sm mb-8 font-medium uppercase tracking-widest">Admin Authorization Required</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="relative">
                        <User className="absolute left-4 top-4 text-slate-500" size={18} />
                        <input type="text" placeholder="Username" className="w-full bg-slate-800 border border-slate-700 p-4 pl-12 rounded-2xl text-white outline-none focus:border-blue-500"
                            onChange={e => setForm({ ...form, username: e.target.value })} />
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-4 top-4 text-slate-500" size={18} />
                        <input type="password" placeholder="Password" className="w-full bg-slate-800 border border-slate-700 p-4 pl-12 rounded-2xl text-white outline-none focus:border-blue-500"
                            onChange={e => setForm({ ...form, password: e.target.value })} />
                    </div>
                    {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                        Enter Workspace <ArrowRight size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
}