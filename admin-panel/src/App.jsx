import { collection, getDocs } from 'firebase/firestore';
import { ChevronDown, LayoutDashboard, LogOut, Upload, Users as UsersIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from './firebase';
import Users from './Users';

// --- HELPER: FORMAT DATES ---
const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const getDayName = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
const getMonthName = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short' });

// --- 1. DASHBOARD COMPONENT ---
function Dashboard() {
  const [metric, setMetric] = useState('total'); // 'total' or 'active'
  const [timeRange, setTimeRange] = useState('daily'); // 'daily', 'weekly', 'monthly'
  
  const [rawData, setRawData] = useState([]); // All users from DB
  const [chartData, setChartData] = useState([]); // Processed data for graph
  const [stats, setStats] = useState({ users: 0, anime: 0 });

  // 1. Fetch Real Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const users = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Convert Firebase Timestamp to JS Date, or fallback to now if missing
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
          lastActiveAt: doc.data().lastActiveAt?.toDate ? doc.data().lastActiveAt.toDate() : new Date(0), // Default to old date if never active
        }));

        setRawData(users);
        setStats({ users: users.length, anime: 0 }); // Update card stats
      } catch (e) {
        console.error("Error fetching real data:", e);
      }
    };
    fetchData();
  }, []);

  // 2. Process Data when Filters Change
  useEffect(() => {
    if (rawData.length === 0) return;

    const now = new Date();
    let buckets = [];
    
    // --- STEP A: Create Buckets (X-Axis) ---
    if (timeRange === 'daily') {
      // Last 7 Days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        d.setHours(0,0,0,0);
        buckets.push({ date: d, label: getDayName(d), count: 0 });
      }
    } else if (timeRange === 'weekly') {
      // Last 4 Weeks
      for (let i = 3; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - (i * 7));
        d.setHours(0,0,0,0);
        buckets.push({ date: d, label: `Wk -${i}`, count: 0 });
      }
    } else if (timeRange === 'monthly') {
      // Last 6 Months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        d.setDate(1); 
        d.setHours(0,0,0,0);
        buckets.push({ date: d, label: getMonthName(d), count: 0 });
      }
    }

    // --- STEP B: Fill Buckets with Data (Y-Axis) ---
    const processed = buckets.map((bucket, index) => {
      const nextBucketDate = buckets[index + 1]?.date || new Date(9999, 0, 1); // Future date for last bucket

      if (metric === 'total') {
        // COUNT: How many users existed BEFORE the end of this bucket?
        // (Cumulative Growth)
        const count = rawData.filter(u => u.createdAt < nextBucketDate).length;
        return { name: bucket.label, value: count };
      } else {
        // ACTIVE: How many users were active WITHIN this bucket's timeframe?
        const count = rawData.filter(u => 
          u.lastActiveAt >= bucket.date && u.lastActiveAt < nextBucketDate
        ).length;
        return { name: bucket.label, value: count };
      }
    });

    setChartData(processed);
  }, [rawData, metric, timeRange]);

  return (
    <div className="p-6 space-y-8">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        
        <div className="flex gap-4">
          {/* Dropdowns */}
          <div className="relative">
            <select 
              className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded leading-tight focus:outline-none focus:border-blue-500 shadow-sm"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
            >
              <option value="total">Total Users</option>
              <option value="active">Active Users</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <ChevronDown size={16} />
            </div>
          </div>

          <div className="relative">
            <select 
              className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded leading-tight focus:outline-none focus:border-blue-500 shadow-sm"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <ChevronDown size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* --- GRAPH SECTION --- */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metric === 'total' ? '#2563eb' : '#10b981'} stopOpacity={0.1}/>
                <stop offset="95%" stopColor={metric === 'total' ? '#2563eb' : '#10b981'} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={metric === 'total' ? '#2563eb' : '#10b981'} 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorValue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* --- STAT CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">Total Registered</p>
            <div className="flex justify-between items-center mt-2">
                <h2 className="text-3xl font-bold text-gray-800">{stats.users}</h2>
                <UsersIcon className="text-blue-500 bg-blue-50 p-2 rounded-lg" size={40} />
            </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">Anime Database</p>
            <div className="flex justify-between items-center mt-2">
                <h2 className="text-3xl font-bold text-gray-800">{stats.anime}</h2>
                <Upload className="text-purple-500 bg-purple-50 p-2 rounded-lg" size={40} />
            </div>
        </div>
      </div>

      {/* --- USER MANAGEMENT TABLE --- */}
      <div className="pt-4">
        <h2 className="text-xl font-bold mb-4 px-1">Recent Users</h2>
        <div className="border-t border-gray-200 pt-4">
            <Users />
        </div>
      </div>

    </div>
  );
}

// --- 2. PLACEHOLDER PAGES ---
function UploadContent() { return <div className="p-6"><h1 className="text-2xl font-bold">Upload Anime & Manga</h1></div>; }

// --- 3. MAIN LAYOUT ---
function Layout() {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50";

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full md:relative z-10">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-black text-blue-600 tracking-tighter">AniYu<span className="text-gray-400 font-normal text-sm ml-1">Admin</span></h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/')}`}><LayoutDashboard size={20} /> <span className="font-medium">Dashboard</span></Link>
          <Link to="/users" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/users')}`}><UsersIcon size={20} /> <span className="font-medium">Users</span></Link>
          <Link to="/upload" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/upload')}`}><Upload size={20} /> <span className="font-medium">Upload</span></Link>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg w-full transition-colors"><LogOut size={20} /> <span className="font-medium">Logout</span></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto w-full">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<Users />} />
          <Route path="/upload" element={<UploadContent />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() { return <Router><Layout /></Router>; }