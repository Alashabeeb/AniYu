import { useEffect, useState } from 'react';
import { Link, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
// 👇 FIX: We rename 'Users' to 'UsersIcon' here to avoid conflict
import { collection, getCountFromServer } from 'firebase/firestore';
import { LayoutDashboard, LogOut, Upload, Users as UsersIcon } from 'lucide-react';
import { db } from './firebase';
import Users from './Users'; // This is your Page

// --- 1. DASHBOARD COMPONENT ---
function Dashboard() {
  const [stats, setStats] = useState({ users: 0, anime: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const userSnap = await getCountFromServer(collection(db, "users"));
        setStats({ users: userSnap.data().count, anime: 0 });
      } catch (e) {
        console.error("Error fetching stats:", e);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Users</p>
              <h2 className="text-3xl font-bold text-blue-600">{stats.users}</h2>
            </div>
            {/* 👇 FIX: Use the renamed icon here */}
            <UsersIcon className="text-blue-200" size={32} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Anime Uploads</p>
              <h2 className="text-3xl font-bold text-purple-600">{stats.anime}</h2>
            </div>
            <Upload className="text-purple-200" size={32} />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- 2. PLACEHOLDER PAGES ---
function UploadContent() { return <div className="p-6"><h1 className="text-2xl font-bold">Upload Anime & Manga</h1></div>; }

// --- 3. MAIN LAYOUT & NAVIGATION ---
function Layout() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50";

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-black text-blue-600 tracking-tighter">AniYu<span className="text-gray-400 font-normal text-sm ml-1">Admin</span></h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/')}`}>
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </Link>
          
          <Link to="/users" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/users')}`}>
            <UsersIcon size={20} /> {/* 👇 FIX: Use renamed icon */}
            <span className="font-medium">Users</span>
          </Link>
          
          <Link to="/upload" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/upload')}`}>
            <Upload size={20} />
            <span className="font-medium">Upload Content</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg w-full transition-colors">
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/upload" element={<UploadContent />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}