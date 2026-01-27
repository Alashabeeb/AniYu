import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getCountFromServer, getDoc, getDocs, query, where } from 'firebase/firestore';
import { Bell, BookOpen, ChevronDown, Edit, Eye, Flag, LayoutDashboard, LogOut, ThumbsUp, Users as UsersIcon, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, Route, BrowserRouter as Router, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AnimeUpload from './AnimeUpload';
import { auth, db } from './firebase';
import Login from './Login';
import MangaUpload from './MangaUpload';
import Notifications from './Notifications';
import Users from './Users';

// --- HELPER: FORMAT DATES ---
const getDayName = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
const getMonthName = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short' });

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
  const [metric, setMetric] = useState('total'); 
  const [timeRange, setTimeRange] = useState('daily'); 
  
  // Data State
  const [chartData, setChartData] = useState([]); 
  const [contentList, setContentList] = useState([]); // For Producers List
  const [stats, setStats] = useState({ 
      users: 0, 
      anime: 0, 
      manga: 0, 
      reports: 0,
      totalViews: 0, // For Producers
      totalLikes: 0  // For Producers
  });

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || isSuperAdmin;
  const isProducer = role === 'anime_producer' || role === 'manga_producer';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ----------------------------------
        // 🅰️ ADMIN VIEW (System Stats)
        // ----------------------------------
        if (isAdmin) {
            const userSnapshot = await getDocs(collection(db, "users"));
            const usersData = userSnapshot.docs.map(doc => ({
              id: doc.id, ...doc.data(),
              createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
              lastActiveAt: doc.data().lastActiveAt?.toDate ? doc.data().lastActiveAt.toDate() : new Date(0), 
            }));

            // Prepare Chart Data (User Growth)
            const now = new Date();
            let buckets = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(); d.setDate(now.getDate() - i); d.setHours(0,0,0,0);
                buckets.push({ date: d, label: getDayName(d) });
            }
            const chartDataProcessed = buckets.map((bucket, index) => {
                const nextBucketDate = buckets[index + 1]?.date || new Date(9999, 0, 1); 
                const count = usersData.filter(u => u.createdAt < nextBucketDate).length;
                return { name: bucket.label, value: count };
            });
            setChartData(chartDataProcessed);

            // Fetch Counts
            const rSnap = await getCountFromServer(collection(db, "reports"));
            const aSnap = await getCountFromServer(collection(db, "anime"));
            const mSnap = await getCountFromServer(collection(db, "manga"));
            
            setStats({ 
                users: usersData.length, 
                anime: aSnap.data().count,
                manga: mSnap.data().count,
                reports: rSnap.data().count 
            });
        } 
        
        // ----------------------------------
        // 🅱️ PRODUCER VIEW (My Content Stats)
        // ----------------------------------
        else if (isProducer) {
            const collectionName = role === 'anime_producer' ? 'anime' : 'manga';
            
            // 1. Fetch THEIR Content
            const q = query(collection(db, collectionName), where("uploaderId", "==", userId));
            const snapshot = await getDocs(q);
            
            const myContent = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setContentList(myContent);

            // 2. Calculate Aggregates
            let views = 0, likes = 0;
            myContent.forEach(item => {
                views += (item.views || 0);
                likes += (item.likes || 0);
            });

            setStats({ 
                users: 0, 
                anime: role === 'anime_producer' ? myContent.length : 0, 
                manga: role === 'manga_producer' ? myContent.length : 0, 
                reports: 0,
                totalViews: views,
                totalLikes: likes
            });

            // 3. Prepare Chart (Top 5 Content by Views)
            // Sort by views desc, take top 5
            const topContent = [...myContent].sort((a,b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
            
            setChartData(topContent.map(item => ({
                name: item.title.length > 15 ? item.title.substring(0,12)+'...' : item.title,
                value: item.views || 0
            })));
        }

      } catch (e) { console.error("Error fetching dashboard data:", e); }
    };
    if (role && userId) fetchData();
  }, [role, userId]); 

  // --- RENDER PRODUCER DASHBOARD ---
  if (isProducer) {
      return (
        <div className="p-6 space-y-8">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                {role === 'anime_producer' ? <Video className="text-blue-600"/> : <BookOpen className="text-purple-600"/>} 
                Studio Dashboard
            </h1>

            {/* 1. STAT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm font-medium">Total Views (All Time)</p>
                    <h2 className="text-3xl font-bold text-blue-600 mt-2 flex items-center gap-2"><Eye size={24}/> {stats.totalViews.toLocaleString()}</h2>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm font-medium">Total Engagement (Likes)</p>
                    <h2 className="text-3xl font-bold text-green-600 mt-2 flex items-center gap-2"><ThumbsUp size={24}/> {stats.totalLikes.toLocaleString()}</h2>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm font-medium">Total Uploads</p>
                    <h2 className="text-3xl font-bold text-gray-800 mt-2 flex items-center gap-2">
                        {role === 'anime_producer' ? <Video size={24}/> : <BookOpen size={24}/>} 
                        {role === 'anime_producer' ? stats.anime : stats.manga}
                    </h2>
                </div>
            </div>

            {/* 2. PERFORMANCE GRAPH */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
                <h3 className="font-bold text-lg mb-4 text-gray-700">Top 5 Most Viewed</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f3f4f6'}} />
                        <Bar dataKey="value" fill={role === 'anime_producer' ? '#3b82f6' : '#8b5cf6'} radius={[4, 4, 0, 0]} barSize={50} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* 3. CONTENT LIST TABLE */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg">My Library</h3>
                    <Link to={role === 'anime_producer' ? "/upload-anime" : "/upload-manga"} className="text-blue-600 font-bold text-sm hover:underline">+ Upload New</Link>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 text-sm font-semibold text-gray-600">Cover</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">Title</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">Views</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">Likes</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">Status</th>
                            <th className="p-4 text-sm font-semibold text-gray-600">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {contentList.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-400">No uploads yet.</td></tr>
                        ) : (
                            contentList.map(item => (
                                <tr key={item.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4"><img src={item.images?.jpg?.image_url} className="w-10 h-14 object-cover rounded" /></td>
                                    <td className="p-4 font-bold text-gray-800">{item.title}</td>
                                    <td className="p-4 text-blue-600 font-mono">{item.views || 0}</td>
                                    <td className="p-4 text-green-600 font-mono">{item.likes || 0}</td>
                                    <td className="p-4"><span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-600">{item.status || 'Ongoing'}</span></td>
                                    <td className="p-4">
                                        <button 
                                            onClick={() => navigate(role === 'anime_producer' ? '/upload-anime' : '/upload-manga', { state: { editId: item.id } })} // Pass ID to edit
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 font-bold text-xs hover:bg-blue-100"
                                        >
                                            <Edit size={14}/> Edit
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      );
  }

  // --- RENDER ADMIN DASHBOARD (System Wide) ---
  return (
    <div className="p-6 space-y-8">
      {/* ... (Kept the Admin Header/Controls same as before) ... */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">System Overview</h1>
        <div className="flex gap-4">
            {/* Admin Controls */}
            <div className="relative">
                <select className="appearance-none bg-white border border-gray-200 text-gray-700 py-2 px-4 pr-8 rounded shadow-sm" value={metric} onChange={(e) => setMetric(e.target.value)}>
                <option value="total">Total Users</option>
                <option value="active">Active Users</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700"><ChevronDown size={16} /></div>
            </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
            <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">Total Registered</p>
            <h2 className="text-3xl font-bold text-gray-800 mt-2">{stats.users}</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">Total Anime</p>
            <h2 className="text-3xl font-bold text-blue-600 mt-2">{stats.anime}</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">Total Manga</p>
            <h2 className="text-3xl font-bold text-purple-600 mt-2">{stats.manga}</h2>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <p className="text-gray-500 text-sm font-medium">Pending Reports</p>
            <h2 className="text-3xl font-bold text-red-600 mt-2">{stats.reports}</h2>
        </div>
      </div>

      <div className="pt-4">
        <h2 className="text-xl font-bold mb-4 px-1">User Management</h2>
        <div className="border-t border-gray-200 pt-4"><Users /></div>
      </div>
    </div>
  );
}

// --- 3. REPORTS PAGE (Admin Only) ---
// (Kept exact same code as before)
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
                        <tr><th className="p-4">Reason</th><th className="p-4">Target</th><th className="p-4">By</th><th className="p-4">Status</th><th className="p-4">Action</th></tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan="5" className="p-8 text-center">Loading...</td></tr> : reports.map(r => (
                            <tr key={r.id} className="border-b hover:bg-gray-50">
                                <td className="p-4 font-bold text-red-600">{r.reason}</td>
                                <td className="p-4 text-sm text-gray-600 max-w-xs truncate">{r.targetContent || "Content"}</td>
                                <td className="p-4 text-sm">{r.reportedBy}</td>
                                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${r.status==='resolved'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{r.status||'pending'}</span></td>
                                <td className="p-4 flex gap-2"><button onClick={()=>updateStatus(r.id,'resolved')}><CheckCircle className="text-green-500" size={18}/></button><button onClick={()=>updateStatus(r.id,'dismissed')}><XCircle className="text-gray-400" size={18}/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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