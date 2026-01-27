import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getCountFromServer, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Bell, BookOpen, ChevronDown, Edit, Eye, Flag, LayoutDashboard, LogOut, ThumbsUp, Users as UsersIcon, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, Route, BrowserRouter as Router, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// ✅ IMPORT PAGES
import AnimeUpload from './AnimeUpload';
import Login from './Login';
import MangaUpload from './MangaUpload';
import Notifications from './Notifications';
import Reports from './Reports';
import Users from './Users';
import { auth, db } from './firebase';

// --- HELPER: FORMAT DATES FOR CHART ---
const formatDateLabel = (date, range) => {
    if (range === '24h') return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ✅ 1. PROTECTED ROUTE WRAPPER
const ProtectedRoute = ({ role, allowedRoles, children }) => {
  if (!role) return <div className="p-10 text-center"><span className="loader"></span> Loading...</div>;
  if (!allowedRoles.includes(role)) {
    return <div className="p-10 text-center text-red-500 font-bold">⛔ Access Denied</div>;
  }
  return children;
};

// --- 2. DASHBOARD COMPONENT ---
function Dashboard({ role, userId }) {
  const navigate = useNavigate();
  
  // ✅ DROPDOWN STATE
  const [metric, setMetric] = useState('registrations'); // 'registrations' (Total) | 'activity' (Active)
  const [timeRange, setTimeRange] = useState('week');    // '24h' | 'week' | 'month' | 'all'
  
  // Data State
  const [allUsers, setAllUsers] = useState([]); 
  const [chartData, setChartData] = useState([]); 
  const [contentList, setContentList] = useState([]); 
  
  const [stats, setStats] = useState({ 
      users: 0, 
      activeUsers: 0, 
      anime: 0, 
      manga: 0, 
      reports: 0,
      totalViews: 0, 
      totalLikes: 0  
  });

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || isSuperAdmin;
  const isProducer = role === 'anime_producer' || role === 'manga_producer';

  // 1. FETCH DATA (Runs Once)
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isAdmin) {
            // Fetch All Users for client-side filtering
            const userSnapshot = await getDocs(collection(db, "users"));
            const usersData = userSnapshot.docs.map(doc => ({
              id: doc.id, ...doc.data(),
              createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(0),
              lastActiveAt: doc.data().lastActiveAt?.toDate ? doc.data().lastActiveAt.toDate() : new Date(0), 
            }));
            setAllUsers(usersData); 

            // Fetch Counts
            const rSnap = await getCountFromServer(collection(db, "reports"));
            const aSnap = await getCountFromServer(collection(db, "anime"));
            const mSnap = await getCountFromServer(collection(db, "manga"));
            
            setStats(prev => ({ 
                ...prev,
                anime: aSnap.data().count,
                manga: mSnap.data().count,
                reports: rSnap.data().count 
            }));
        } 
        else if (isProducer) {
            // Producer Logic (Unchanged)
            const collectionName = role === 'anime_producer' ? 'anime' : 'manga';
            const q = query(collection(db, collectionName), where("uploaderId", "==", userId));
            const snapshot = await getDocs(q);
            const myContent = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setContentList(myContent);

            let views = 0, likes = 0;
            myContent.forEach(item => { views += (item.views || 0); likes += (item.likes || 0); });

            setStats({ 
                users: 0, activeUsers: 0, anime: role === 'anime_producer' ? myContent.length : 0, manga: role === 'manga_producer' ? myContent.length : 0, 
                reports: 0, totalViews: views, totalLikes: likes
            });

            const topContent = [...myContent].sort((a,b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
            setChartData(topContent.map(item => ({ name: item.title.length > 15 ? item.title.substring(0,12)+'...' : item.title, value: item.views || 0 })));
        }
      } catch (e) { console.error("Error fetching data:", e); }
    };
    if (role && userId) fetchData();
  }, [role, userId]); 

  // 2. ✅ DYNAMIC FILTER ENGINE (Chart & Stats)
  useEffect(() => {
    if (!isAdmin || allUsers.length === 0) return;

    const now = new Date();
    let startTime = new Date();
    let buckets = [];
    
    // --- A. Define Time Buckets ---
    if (timeRange === '24h') {
        startTime = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        // Create 6 buckets of 4 hours
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getTime() - (i * 4 * 60 * 60 * 1000));
            buckets.push({ date: d, label: formatDateLabel(d, '24h') });
        }
    } else if (timeRange === 'week') {
        startTime = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
        // Create 7 buckets of 1 day
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(now.getDate() - i); d.setHours(0,0,0,0);
            buckets.push({ date: d, label: formatDateLabel(d, 'week') });
        }
    } else if (timeRange === 'month') {
        startTime = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        // Create 6 buckets of 5 days
        for (let i = 5; i >= 0; i--) {
            const d = new Date(); d.setDate(now.getDate() - (i * 5)); d.setHours(0,0,0,0);
            buckets.push({ date: d, label: formatDateLabel(d, 'month') });
        }
    } else {
        // All Time (Default to last 30 days visualization for sanity)
        startTime = new Date(0); 
        for (let i = 5; i >= 0; i--) {
            const d = new Date(); d.setDate(now.getDate() - (i * 5));
            buckets.push({ date: d, label: formatDateLabel(d, 'month') });
        }
    }

    // --- B. Calculate Stats Numbers ---
    const filteredNewUsers = allUsers.filter(u => u.createdAt >= startTime).length;
    const filteredActiveUsers = allUsers.filter(u => u.lastActiveAt >= startTime).length;

    setStats(prev => ({
        ...prev,
        users: timeRange === 'all' ? allUsers.length : filteredNewUsers,
        activeUsers: filteredActiveUsers
    }));

    // --- C. Generate Chart Data ---
    const processChart = buckets.map((bucket, index) => {
        const nextBucketDate = buckets[index + 1]?.date || new Date(); 
        
        let count = 0;
        if (metric === 'registrations') {
            // Count users CREATED in this bucket
            count = allUsers.filter(u => u.createdAt >= bucket.date && u.createdAt < nextBucketDate).length;
        } else {
            // Count users ACTIVE in this bucket (approximate)
            count = allUsers.filter(u => u.lastActiveAt >= bucket.date && u.lastActiveAt < nextBucketDate).length;
        }
        
        return { name: bucket.label, value: count };
    });

    setChartData(processChart);

  }, [timeRange, metric, allUsers, isAdmin]);

  // --- RENDER PRODUCER ---
  if (isProducer) {
      return (
        <div className="p-6 space-y-8">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                {role === 'anime_producer' ? <Video className="text-blue-600"/> : <BookOpen className="text-purple-600"/>} Studio Dashboard
            </h1>
            {/* Same Producer Dashboard UI... */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm font-medium">Total Views</p>
                    <h2 className="text-3xl font-bold text-blue-600 mt-2 flex items-center gap-2"><Eye size={24}/> {stats.totalViews.toLocaleString()}</h2>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm font-medium">Total Likes</p>
                    <h2 className="text-3xl font-bold text-green-600 mt-2 flex items-center gap-2"><ThumbsUp size={24}/> {stats.totalLikes.toLocaleString()}</h2>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm font-medium">Uploads</p>
                    <h2 className="text-3xl font-bold text-gray-800 mt-2 flex items-center gap-2">
                        {role === 'anime_producer' ? <Video size={24}/> : <BookOpen size={24}/>} {role === 'anime_producer' ? stats.anime : stats.manga}
                    </h2>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
                <h3 className="font-bold text-lg mb-4 text-gray-700">Top 5 Most Viewed</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                        <Tooltip cursor={{fill: '#f3f4f6'}} />
                        <Bar dataKey="value" fill={role === 'anime_producer' ? '#3b82f6' : '#8b5cf6'} radius={[4, 4, 0, 0]} barSize={50} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center"><h3 className="font-bold text-lg">My Library</h3><Link to={role === 'anime_producer' ? "/upload-anime" : "/upload-manga"} className="text-blue-600 font-bold text-sm hover:underline">+ Upload New</Link></div>
                <table className="w-full text-left"><thead className="bg-gray-50 border-b border-gray-100"><tr><th className="p-4 text-sm font-semibold text-gray-600">Cover</th><th className="p-4 text-sm font-semibold text-gray-600">Title</th><th className="p-4 text-sm font-semibold text-gray-600">Views</th><th className="p-4 text-sm font-semibold text-gray-600">Status</th><th className="p-4 text-sm font-semibold text-gray-600">Action</th></tr></thead><tbody>{contentList.map(item => (<tr key={item.id} className="border-b hover:bg-gray-50"><td className="p-4"><img src={item.images?.jpg?.image_url} className="w-10 h-14 object-cover rounded" /></td><td className="p-4 font-bold text-gray-800">{item.title}</td><td className="p-4 text-blue-600 font-mono">{item.views || 0}</td><td className="p-4"><span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600">{item.status || 'Ongoing'}</span></td><td className="p-4"><button onClick={() => navigate(role === 'anime_producer' ? '/upload-anime' : '/upload-manga', { state: { editId: item.id } })} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 font-bold text-xs hover:bg-blue-100"><Edit size={14}/> Edit</button></td></tr>))}</tbody></table>
            </div>
        </div>
      );
  }

  // --- RENDER ADMIN DASHBOARD ---
  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">System Overview</h1>
        
        <div className="flex gap-4">
            {/* ✅ METRIC DROPDOWN: (Total vs Active) */}
            <div className="relative">
                <select 
                    className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded shadow-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                >
                    <option value="registrations">New Registrations</option>
                    <option value="activity">User Activity</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><ChevronDown size={16} /></div>
            </div>

            {/* ✅ TIME RANGE DROPDOWN: (24h, Week, Month) */}
            <div className="relative">
                <select 
                    className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded shadow-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                >
                    <option value="24h">Last 24 Hours</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="all">All Time</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><ChevronDown size={16} /></div>
            </div>
        </div>
      </div>

      {/* CHART */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
        <h3 className="text-sm font-bold text-gray-400 mb-2 uppercase flex items-center gap-2">
            {metric === 'registrations' ? '📈 Registration Growth' : '🔥 Activity Trends'}
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                {timeRange === '24h' ? '24 HOURS' : timeRange === 'week' ? '7 DAYS' : timeRange === 'month' ? '30 DAYS' : 'ALL TIME'}
            </span>
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metric === 'registrations' ? "#2563eb" : "#16a34a"} stopOpacity={0.1}/>
                <stop offset="95%" stopColor={metric === 'registrations' ? "#2563eb" : "#16a34a"} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Area 
                type="monotone" 
                dataKey="value" 
                stroke={metric === 'registrations' ? "#2563eb" : "#16a34a"} 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorValue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* CARD 1: USERS */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">
                {timeRange === 'all' ? 'Total Users' : 'New Users'}
                <span className="ml-2 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{timeRange === '24h' ? '24H' : timeRange.toUpperCase()}</span>
            </p>
            <h2 className="text-3xl font-bold text-gray-800 mt-2">{stats.users}</h2>
        </div>

        {/* CARD 2: ACTIVE USERS */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">
                Active Users
                <span className="ml-2 text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-bold">{timeRange === '24h' ? '24H' : timeRange.toUpperCase()}</span>
            </p>
            <h2 className="text-3xl font-bold text-green-600 mt-2">{stats.activeUsers}</h2>
        </div>

        {/* CARD 3: ANIME */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">Total Anime</p>
            <h2 className="text-3xl font-bold text-blue-600 mt-2">{stats.anime}</h2>
        </div>

        {/* CARD 4: MANGA */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">Total Manga</p>
            <h2 className="text-3xl font-bold text-purple-600 mt-2">{stats.manga}</h2>
        </div>
      </div>

      <div className="pt-4">
        <h2 className="text-xl font-bold mb-4 px-1">User Management</h2>
        <div className="border-t border-gray-200 pt-4"><Users /></div>
      </div>
    </div>
  );
}

// --- 4. MAIN LAYOUT ---
function Layout({ logout, role, userId }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50";

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || isSuperAdmin;
  const isAnimeProducer = role === 'anime_producer';
  const isMangaProducer = role === 'manga_producer';

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-full md:relative z-10">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-black text-blue-600 tracking-tighter">
            AniYu<span className="text-gray-400 font-normal text-sm ml-1">
              {isSuperAdmin ? 'Owner' : isAdmin ? 'Admin' : 'Studio'}
            </span>
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/')}`}>
            <LayoutDashboard size={20} /> <span className="font-medium">Dashboard</span>
          </Link>
          
          <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Content</div>
          
          {(isAnimeProducer || isAdmin) && (
            <Link to="/upload-anime" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/upload-anime')}`}>
                <Video size={20} /> <span className="font-medium">Anime Upload</span>
            </Link>
          )}
          
          {(isMangaProducer || isAdmin) && (
            <Link to="/upload-manga" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/upload-manga')}`}>
                <BookOpen size={20} /> <span className="font-medium">Manga Upload</span>
            </Link>
          )}

          {isAdmin && (
            <>
                <div className="pt-4 pb-2 px-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Management</div>
                <Link to="/notifications" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/notifications')}`}>
                    <Bell size={20} /> <span className="font-medium">Notifications</span>
                </Link>
                <Link to="/reports" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/reports')}`}>
                    <Flag size={20} /> <span className="font-medium">Reports</span>
                </Link>
                <Link to="/users" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/users')}`}>
                    <UsersIcon size={20} /> <span className="font-medium">Users</span>
                </Link>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-lg w-full transition-colors">
            <LogOut size={20} /> <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto w-full">
        <Routes>
          <Route path="/" element={<Dashboard role={role} userId={userId} />} />
          
          <Route path="/upload-anime" element={
              <ProtectedRoute role={role} allowedRoles={['admin', 'super_admin', 'anime_producer']}>
                  <AnimeUpload />
              </ProtectedRoute>
          } />
          
          <Route path="/upload-manga" element={
              <ProtectedRoute role={role} allowedRoles={['admin', 'super_admin', 'manga_producer']}>
                  <MangaUpload />
              </ProtectedRoute>
          } />

          <Route path="/notifications" element={
              <ProtectedRoute role={role} allowedRoles={['admin', 'super_admin']}>
                  <Notifications />
              </ProtectedRoute>
          } />

          <Route path="/reports" element={
              <ProtectedRoute role={role} allowedRoles={['admin', 'super_admin']}>
                  <Reports />
              </ProtectedRoute>
          } />

          <Route path="/users" element={
              <ProtectedRoute role={role} allowedRoles={['admin', 'super_admin']}>
                  <Users />
              </ProtectedRoute>
          } />
        </Routes>
      </div>
    </div>
  );
}

// ✅ MAIN APP COMPONENT
export default function App() { 
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
          try {
            const userDoc = await getDoc(doc(db, "users", u.uid));
            if (userDoc.exists()) {
                setRole(userDoc.data().role);
            }
          } catch(e) { console.error(e); }
          setUser(u);
      } else {
          setUser(null);
          setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogout = () => { auth.signOut(); };

  if (loading) return <div className="h-screen w-full flex items-center justify-center text-blue-600 font-bold">Loading Admin Panel...</div>;

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/*" element={user ? <Layout logout={handleLogout} role={role} userId={user.uid} /> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  ); 
}