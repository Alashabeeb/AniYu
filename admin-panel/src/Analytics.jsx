import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { BookOpen, PieChart as PieChartIcon, TrendingUp, Users, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from './firebase';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Analytics() {
    const [loading, setLoading] = useState(true);
    const [topAnime, setTopAnime] = useState([]);
    const [topManga, setTopManga] = useState([]);
    const [genreData, setGenreData] = useState([]);
    const [growthData, setGrowthData] = useState([]);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            // 1. Fetch Top Anime by Views
            const animeSnap = await getDocs(query(collection(db, "anime"), orderBy("views", "desc")));
            const animeList = animeSnap.docs.map(d => d.data());
            setTopAnime(animeList.slice(0, 5).map(a => ({ name: a.title.substring(0, 15) + '...', views: a.views || 0 })));

            // 2. Fetch Top Manga by Views
            const mangaSnap = await getDocs(query(collection(db, "manga"), orderBy("views", "desc")));
            const mangaList = mangaSnap.docs.map(d => d.data());
            setTopManga(mangaList.slice(0, 5).map(m => ({ name: m.title.substring(0, 15) + '...', views: m.views || 0 })));

            // 3. Process Genres (Combine Anime & Manga)
            const genreCounts = {};
            [...animeList, ...mangaList].forEach(item => {
                if (item.genre && Array.isArray(item.genre)) {
                    item.genre.forEach(g => {
                        genreCounts[g] = (genreCounts[g] || 0) + 1;
                    });
                }
            });
            const genreArray = Object.keys(genreCounts).map(key => ({ name: key, value: genreCounts[key] }));
            setGenreData(genreArray.sort((a, b) => b.value - a.value).slice(0, 6)); // Top 6 Genres

            // 4. User Growth (Last 7 Days) - Estimated from timestamps
            const usersSnap = await getDocs(collection(db, "users"));
            const users = usersSnap.docs.map(d => d.data());
            
            // Group users by creation date (simple logic)
            const dateMap = {};
            users.forEach(u => {
                if(u.createdAt && u.createdAt.toDate) {
                    const date = u.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    dateMap[date] = (dateMap[date] || 0) + 1;
                }
            });
            // Convert to array and take last 7 entries (simplified)
            const growthArray = Object.keys(dateMap).map(k => ({ date: k, users: dateMap[k] }));
            setGrowthData(growthArray.slice(-7));

        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={{padding:50, textAlign:'center', color:'#6b7280'}}>Loading Analytics...</div>;

    return (
        <>
        <style>{`
            .analytics-container { padding: 24px; }
            .analytics-header { margin-bottom: 30px; }
            .analytics-title { font-size: 1.8rem; font-weight: 800; display: flex; align-items: center; gap: 10px; color: #1e3a8a; margin: 0; }
            
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
            .chart-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
            .chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .chart-title { font-size: 1.1rem; font-weight: 700; color: #374151; display: flex; align-items: center; gap: 8px; margin: 0; }
            
            @media (max-width: 768px) {
                .analytics-container { padding: 16px; }
                .grid-2 { grid-template-columns: 1fr; }
            }
        `}</style>

        <div className="analytics-container">
            <div className="analytics-header">
                <h1 className="analytics-title">
                    <TrendingUp size={32} /> Advanced Analytics
                </h1>
                <p style={{color:'#6b7280', marginTop:5}}>Deep dive into your content performance.</p>
            </div>

            {/* Row 1: Top Content */}
            <div className="grid-2">
                <div className="chart-card">
                    <div className="chart-header">
                        <h3 className="chart-title"><Video size={20} className="text-blue-500"/> Top 5 Anime</h3>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={topAnime} layout="vertical" margin={{left: 30}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                <Tooltip />
                                <Bar dataKey="views" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card">
                    <div className="chart-header">
                        <h3 className="chart-title"><BookOpen size={20} className="text-purple-500"/> Top 5 Manga</h3>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={topManga} layout="vertical" margin={{left: 30}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12}} />
                                <Tooltip />
                                <Bar dataKey="views" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Row 2: Genres & Growth */}
            <div className="grid-2">
                <div className="chart-card">
                    <div className="chart-header">
                        <h3 className="chart-title"><PieChartIcon size={20} className="text-green-500"/> Popular Genres</h3>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={genreData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                                    {genreData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="chart-card">
                    <div className="chart-header">
                        <h3 className="chart-title"><Users size={20} className="text-orange-500"/> User Growth</h3>
                    </div>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <LineChart data={growthData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tick={{fontSize: 12}} />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="users" stroke="#f97316" strokeWidth={3} dot={{r: 4}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
        </>
    );
}