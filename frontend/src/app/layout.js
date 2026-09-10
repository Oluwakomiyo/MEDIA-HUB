"use client"; // Add this at the top to use usePathname
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { LayoutDashboard, Image as ImageIcon, PlayCircle, PlusSquare, Lock as LockIcon, LogOut, Sun, Moon, BookOpen } from 'lucide-react';
import { ThemeProvider, useTheme } from 'next-themes'
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {

  const pathname = usePathname();
  const isSlideshow = pathname === '/slideshow';
  const [isOnline, setIsOnline] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsAdmin(!!token); // Set to true if token exists
  }, [pathname]); // Re-check whenever user navigates

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('http://localhost:5000/');
        if (res.ok) setIsOnline(true);
        else setIsOnline(false);
      } catch {
        setIsOnline(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAdmin(false);
    window.location.href = "/"; // Send back to dashboard
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className}
    bg-slate-50 dark:bg-slate-950
    text-slate-900 dark:text-slate-100
    `} suppressHydrationWarning
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <div className="flex min-h-screen select-none">
            {/* SIDEBAR */}
            <aside className="w-56 bg-slate-900 text-slate-300 flex flex-col fixed h-full">
              <div className="p-6 select-none mt-3">
                <h2 className="text-white text-xl font-bold tracking-tight flex items-center">
                  <div className="w-auto h-10 rounded-lg flex items-center justify-center text-xs flex-shrink-0"><img src="/ccplogo.png" alt="CCP Logo" className='h-20 w-auto'></img></div>
                  <span className="text-lg font-bold tracking-wider text-white text-center leading-tight flex-shrink-0">
                    MEDIA <br />HUB
                  </span>
                </h2>
              </div>

              <nav className="flex-1 px-4 space-y-2 mt-4">
                <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" href="/" />
                <SidebarItem icon={<ImageIcon size={20} />} label="Project Gallery" href="/gallery" />
                {isAdmin && (
                  <SidebarItem icon={<PlusSquare size={20} />} label="Add Project" href="/add-project" />
                )}
                <SidebarItem icon={<PlayCircle size={20} />} label="Slideshow" href="/slideshow" />                
              </nav>

              <div className="flex items-center gap-3 mx-auto px-4 py-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest select-none">Interface</p>
                <ThemeToggle />
              </div>

              <div className="p-6 border-t border-slate-800 space-y-4 mx-auto">

                <div className="px-2">
                  {isAdmin ? (
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 text-red-400 hover:text-red-300 font-bold text-[10px] uppercase tracking-widest transition-colors select-none"
                    >
                      <LogOut size={14} /> Logout Admin
                    </button>
                  ) : (
                    <Link
                      href="/login"
                      className="flex items-center gap-2 text-slate-500 hover:text-blue-400 font-bold text-[10px] uppercase tracking-widest transition-colors select-none"
                    >
                      <LockIcon size={14} /> Admin Login
                    </Link>
                  )}
                </div>
                <div className={`rounded-xl p-4 transition-colors ${isOnline ? 'bg-slate-800/50' : 'bg-red-900/20'}`}>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Status</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className={`text-xs font-bold ${isOnline ? 'text-white' : 'text-red-400'}`}>
                      {isOnline ? 'Server Active' : 'Server Offline'}
                    </span>
                  </div>
                </div>
              </div>
              <footer className="mt-auto p-6 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[10px] text-slate-500 text-center">
                  &copy; {new Date().getFullYear()} CCP Project Gallery. All rights reserved.
                </p>
              </footer>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 ml-56 p-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg border border-slate-700 transition-all"
    >
      {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-blue-400" />}
    </button>
  );
}

function SidebarItem({ icon, label, href }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'hover:bg-slate-800 hover:text-white'
        }`}
    >
      <span className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`}>
        {icon}
      </span>
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
}