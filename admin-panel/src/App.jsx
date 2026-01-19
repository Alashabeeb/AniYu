import { collection, doc, getCountFromServer, getDocs, updateDoc } from 'firebase/firestore';
import { BookOpen, CheckCircle, ChevronDown, Flag, LayoutDashboard, LogOut, Video, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AnimeUpload from './AnimeUpload';
import { db } from './firebase';
import Users from './Users';

// --- HELPER: FORMAT DATES ---
const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const getDayName = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
const getMonthName = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short' });

// --- 1. DASHBOARD COMPONENT ---
function Dashboard() {
  const [metric, setMetric] = useState('total'); 
  const [timeRange, setTimeRange] = useState('daily'); 
  
  const [rawData, setRawData] = useState([]); 
  const [chartData, setChartData] = useState([]); 
  const [stats, setStats] = useState({ users: 0, reports: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Users for Graph & Stats
        const userSnapshot = await getDocs(collection(db, "users"));
        const users = userSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Ensure dates are valid JS Dates for the graph logic
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
          lastActiveAt: doc.data().lastActiveAt?.toDate ? doc.data().lastActiveAt.toDate() : new Date(0), 
        }));

        // Fetch Reports Count
        const reportsSnap = await getCountFromServer(collection(db, "reports"));

        setRawData(users);
        setStats({ users: users.length, reports: reportsSnap.data().count }); 
      } catch (e) {
        console.error("Error fetching real data:", e);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (rawData.length === 0) return;

    const now = new Date();
    let buckets = [];
    
    // Create Time Buckets
    if (timeRange === 'daily') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(now.getDate() - i); d.setHours(0,0,0,0);
        buckets.push({ date: d, label: getDayName(d) });
      }
    } else if (timeRange === 'weekly') {
      for (let i = 3; i >= 0; i--) {
        const d = new Date(); d.setDate(now.getDate() - (i * 7)); d.setHours(0,0,0,0);
        buckets.push({ date: d, label: `Wk -${i}` });
      }
    } else if (timeRange === 'monthly') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(now.getMonth() - i); d.setDate(1); d.setHours(0,0,0,0);
        buckets.push({ date: d, label: getMonthName(d) });
      }
    }

    // Fill Buckets
    const processed = buckets.map((bucket, index) => {
      const nextBucketDate = buckets[index + 1]?.date || new Date(9999, 0, 1); 

      if (metric === 'total') {
        const count = rawData.filter(u => u.createdAt < nextBucketDate).length;
        return { name: bucket.label, value: count };
      } else {
        const count = rawData.filter(u => u.lastActiveAt >= bucket.date && u.lastActiveAt < nextBucketDate).length;
        return { name: bucket.label, value: count };
      }
    });

    setChartData(processed);
  }, [rawData, metric, timeRange]);

  return (
    <div className="p-6 space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <div className="flex gap-4">
          <div className="relative">
            <select className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded shadow-sm" value={metric} onChange={(e) => setMetric(e.target.value)}>
              <option value="total">Total Users</option>
              <option value="active">Active Users</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><ChevronDown size={16} /></div>
          </div>
          <div className="relative">
            <select className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded shadow-sm" value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><ChevronDown size={16} /></div>
          </div>
        </div>
      </div>

      {/* Chart */}
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
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Area type="monotone" dataKey="value" stroke={metric === 'total' ? '#2563eb' : '#10b981'} strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">Total Registered</p>
            <h2 className="text-3xl font-bold text-gray-800 mt-2">{stats.users}</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">Pending Reports</p>
            <h2 className="text-3xl font-bold text-red-600 mt-2">{stats.reports}</h2>
        </div>
      </div>

      {/* User Management Table */}
      <div className="pt-4">
        <h2 className="text-xl font-bold mb-4 px-1">User Management</h2>
        <div className="border-t border-gray-200 pt-4">
            <Users />
        </div>
      </div>
    </div>
  );
}

// --- 2. REPORTS PAGE ---
function Reports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const snap = await getDocs(collection(db, "reports"));
                setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        fetchReports();
    }, []);

    const updateStatus = async (id, status) => {
        await updateDoc(doc(db, "reports", id), { status });
        setReports(reports.map(r => r.id === id ? { ...r, status } : r));
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Flag className="text-red-500"/> Reports</h1>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4">Reason</th>
                            <th className="p-4">Target Content</th>
                            <th className="p-4">Reported By</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="6" className="p-8 text-center">Loading...</td></tr> : 
                         reports.length === 0 ? <tr><td colSpan="6" className="p-8 text-center">No reports found.</td></tr> :
                         reports.map(r => (
                            <tr key={r.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-semibold text-red-600">{r.reason}</td>
                                <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={r.targetContent}>{r.targetContent || "Media/Post"}</td>
                                <td className="p-4 text-sm">{r.reportedBy}</td>
                                <td className="p-4 text-sm">{formatDate(r.createdAt)}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {r.status || 'pending'}
                                    </span>
                                </td>
                                <td className="p-4 flex gap-2">
                                    <button onClick={() => updateStatus(r.id, 'resolved')} className="text-green-500 hover:bg-green-50 p-1 rounded" title="Mark Resolved"><CheckCircle size={18}/></button>
                                    <button onClick={() => updateStatus(r.id, 'dismissed')} className="text-gray-400 hover:bg-gray-50 p-1 rounded" title="Dismiss"><XCircle size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- 3. PLACEHOLDER PAGES ---
function MangaUpload() { return <div className="p-6"><h1 className="text-2xl font-bold">Manga Upload</h1><p className="text-gray-500">Form coming soon...</p></div>; }

// --- 4. MAIN LAYOUT ---
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
          {/* DASHBOARD */}
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/')}`}>
            <LayoutDashboard size={20} /> <span className="font-medium">Dashboard</span>
          </Link>
          
          {/* UPLOADS */}
          <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Content</div>
          <Link to="/upload-anime" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/upload-anime')}`}>
            <Video size={20} /> <span className="font-medium">Anime Upload</span>
          </Link>
          <Link to="/upload-manga" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/upload-manga')}`}>
            <BookOpen size={20} /> <span className="font-medium">Manga Upload</span>
          </Link>

          {/* MANAGEMENT */}
          <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Management</div>
          <Link to="/reports" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/reports')}`}>
            <Flag size={20} /> <span className="font-medium">Reports</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg w-full transition-colors"><LogOut size={20} /> <span className="font-medium">Logout</span></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto w-full">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload-anime" element={<AnimeUpload />} />
          <Route path="/upload-manga" element={<MangaUpload />} />
          <Route path="/reports" element={<Reports />} />
          {/* Hidden Route for Users (Access via Dashboard Card) */}
          <Route path="/users" element={<Users />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() { return <Router><Layout /></Router>; }