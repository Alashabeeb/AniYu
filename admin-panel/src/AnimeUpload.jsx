import {
    addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import {
    ArrowLeft,
    Captions,
    Download,
    Eye,
    FileVideo,
    Film,
    Image as ImageIcon,
    Loader2,
    PlayCircle,
    Plus,
    Search,
    Sparkles,
    Star,
    Trash2,
    Upload,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { db, storage } from './firebase';

const GENRES_LIST = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", 
  "Horror", "Magic", "Mecha", "Music", "Mystery", 
  "Psychological", "Romance", "Sci-Fi", "Slice of Life", 
  "Sports", "Supernatural", "Thriller", "Isekai"
];

const AGE_RATINGS = ["All", "12+", "16+", "18+"];
const LANGUAGES = ["English", "Spanish", "Portuguese", "French", "German", "Indonesian", "Arabic", "Russian", "Japanese", "Chinese"];

export default function AnimeUpload() {
  // --- GLOBAL STATE ---
  const [view, setView] = useState('list'); // 'list', 'form', 'details', 'success'
  const [animeList, setAnimeList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  
  // --- FORM STATE ---
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [createdAnimeId, setCreatedAnimeId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // --- DETAILS VIEW STATE ---
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [selectedAnimeEpisodes, setSelectedAnimeEpisodes] = useState([]);

  // HEADER STATE (Anime Form)
  const [animeCover, setAnimeCover] = useState(null); 
  const [existingCoverUrl, setExistingCoverUrl] = useState(''); 
  const [animeTitle, setAnimeTitle] = useState('');
  const [totalEpisodes, setTotalEpisodes] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedAge, setSelectedAge] = useState('12+');

  // BODY STATE (Episode Form)
  const [episodes, setEpisodes] = useState([]);

  // --- FETCH LIST ON MOUNT ---
  useEffect(() => {
    fetchAnimeList();
  }, []);

  const fetchAnimeList = async () => {
    setLoadingList(true);
    try {
      const snapshot = await getDocs(collection(db, 'anime'));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnimeList(list);
    } catch (error) { console.error("Error fetching list:", error); } finally { setLoadingList(false); }
  };

  // --- ACTIONS ---

  const handleCreateNew = () => {
    setCreatedAnimeId(null);
    setIsEditMode(false);
    setAnimeTitle(''); setTotalEpisodes(''); setSynopsis(''); setSelectedGenres([]); setExistingCoverUrl(''); setAnimeCover(null);
    setEpisodes([{ id: Date.now(), number: 1, title: '', videoFile: null, thumbFile: null, subtitles: [], isNew: true }]);
    setView('form');
  };

  const handleEdit = async (anime) => {
    setCreatedAnimeId(anime.id);
    setIsEditMode(true);
    setAnimeTitle(anime.title);
    setTotalEpisodes(anime.totalEpisodes || ''); 
    setSynopsis(anime.synopsis);
    setSelectedGenres(anime.genres || []);
    setSelectedAge(anime.ageRating || '12+');
    setExistingCoverUrl(anime.images?.jpg?.image_url || '');
    setAnimeCover(null);
    
    // Fetch Episodes
    setStatus('Fetching episodes...');
    try {
      const q = query(collection(db, 'anime', anime.id, 'episodes'), orderBy('number', 'asc'));
      const epSnap = await getDocs(q);
      const fetchedEps = epSnap.docs.map(doc => ({
        id: doc.id, 
        number: doc.data().number, 
        title: doc.data().title,
        existingVideoUrl: doc.data().videoUrl, 
        existingThumbUrl: doc.data().thumbnailUrl,
        existingSubtitles: doc.data().subtitles || [],
        subtitles: (doc.data().subtitles || []).map((sub, idx) => ({ id: Date.now() + idx, language: sub.language, url: sub.url, file: null })),
        videoFile: null, 
        thumbFile: null, 
        isNew: false
      }));
      setEpisodes(fetchedEps.length > 0 ? fetchedEps : [{ id: Date.now(), number: 1, title: '', videoFile: null, thumbFile: null, subtitles: [], isNew: true }]);
      setView('form');
    } catch (e) { alert(e.message); }
    setStatus('');
  };

  const handleViewDetails = async (anime) => {
    setSelectedAnime(anime);
    setView('details');
    try {
      const q = query(collection(db, 'anime', anime.id, 'episodes'), orderBy('number', 'asc'));
      const epSnap = await getDocs(q);
      const fetchedEps = epSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSelectedAnimeEpisodes(fetchedEps);
    } catch (e) { console.error(e); }
  };

  // --- DEEP DELETE FUNCTION ---
  const handleDelete = async (anime) => {
    if (!window.confirm(`WARNING: This will permanently delete "${anime.title}" along with ALL its episodes and files.\n\nAre you sure?`)) return;
    
    setAnimeList(prev => prev.filter(a => a.id !== anime.id));
    if (view === 'details') setView('list');

    try {
      if (anime.images?.jpg?.image_url) {
        try { await deleteObject(ref(storage, anime.images.jpg.image_url)); } catch (e) { console.warn("Cover not found"); }
      }

      const epSnapshot = await getDocs(collection(db, 'anime', anime.id, 'episodes'));
      
      const deletePromises = epSnapshot.docs.map(async (docSnap) => {
          const ep = docSnap.data();
          if (ep.videoUrl) try { await deleteObject(ref(storage, ep.videoUrl)); } catch (e) {}
          if (ep.thumbnailUrl && ep.thumbnailUrl !== anime.images?.jpg?.image_url) try { await deleteObject(ref(storage, ep.thumbnailUrl)); } catch (e) {}
          if (ep.subtitles) {
              for (const sub of ep.subtitles) {
                  if (sub.url) try { await deleteObject(ref(storage, sub.url)); } catch (e) {}
              }
          }
          return deleteDoc(doc(db, 'anime', anime.id, 'episodes', docSnap.id));
      });

      await Promise.all(deletePromises);
      await deleteDoc(doc(db, 'anime', anime.id));
      alert(`"${anime.title}" has been completely deleted.`);

    } catch (e) { 
        alert("Error during deletion: " + e.message); 
        fetchAnimeList();
    }
  };

  // --- FORM LOGIC ---
  const addEpisodeForm = () => {
    const nextNum = episodes.length > 0 ? Number(episodes[episodes.length - 1].number) + 1 : 1;
    setEpisodes([...episodes, { id: Date.now(), number: nextNum, title: '', videoFile: null, thumbFile: null, subtitles: [], isNew: true }]);
  };
  const removeEpisodeForm = (index) => { const newEps = [...episodes]; newEps.splice(index, 1); setEpisodes(newEps); };
  const updateEpisodeState = (index, field, value) => { const newEps = [...episodes]; newEps[index][field] = value; setEpisodes(newEps); };

  const addSubtitle = (epIndex) => {
    const newEps = [...episodes];
    newEps[epIndex].subtitles.push({ id: Date.now(), language: 'English', file: null, url: '' });
    setEpisodes(newEps);
  };
  const removeSubtitle = (epIndex, subIndex) => {
    const newEps = [...episodes];
    newEps[epIndex].subtitles.splice(subIndex, 1);
    setEpisodes(newEps);
  };
  const updateSubtitle = (epIndex, subIndex, field, value) => {
    const newEps = [...episodes];
    newEps[epIndex].subtitles[subIndex][field] = value;
    setEpisodes(newEps);
  };

  const handleFileChange = (e, setter) => { if (e.target.files[0]) setter(e.target.files[0]); };
  
  const uploadFile = (file, path) => {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on('state_changed', 
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (path.includes('episodes')) setProgress(Math.round(p));
        },
        (error) => reject(error),
        async () => { resolve(await getDownloadURL(uploadTask.snapshot.ref)); }
      );
    });
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!animeTitle) { alert("Anime Title is required."); return; }
    if (!isEditMode && !animeCover) { alert("Cover Image is required."); return; }
    
    setLoading(true);
    setStatus('Saving Anime Details...');
    setProgress(0);

    try {
      const newCoverUrl = await uploadFile(animeCover, 'covers');
      const finalCoverUrl = newCoverUrl || existingCoverUrl;
      let animeId = createdAnimeId;

      const animeData = {
        title: animeTitle, 
        totalEpisodes: totalEpisodes || 'Unknown', 
        synopsis, 
        genres: selectedGenres, 
        ageRating: selectedAge,
        images: { jpg: { image_url: finalCoverUrl } }, 
        type: 'TV', 
        updatedAt: serverTimestamp()
      };

      if (isEditMode && animeId) {
        await updateDoc(doc(db, 'anime', animeId), animeData);
      } else {
        const ref = await addDoc(collection(db, 'anime'), { ...animeData, createdAt: serverTimestamp(), views: 0, rating: 0 });
        animeId = ref.id;
        setCreatedAnimeId(animeId);
      }

      const totalOps = episodes.length;
      let completedOps = 0;

      for (let i = 0; i < episodes.length; i++) {
        const ep = episodes[i];
        setStatus(`Uploading Episode ${ep.number} media & subtitles...`);
        
        if (!ep.videoFile && !ep.existingVideoUrl) continue;

        const vidUrl = await uploadFile(ep.videoFile, 'episodes');
        const thumbUrl = await uploadFile(ep.thumbFile, 'episode_thumbnails');

        const finalSubtitles = [];
        for (const sub of ep.subtitles) {
            const subUrl = await uploadFile(sub.file, 'subtitles');
            finalSubtitles.push({
                language: sub.language,
                url: subUrl || sub.url
            });
        }

        const epData = {
          title: ep.title || `Episode ${ep.number}`, 
          number: Number(ep.number),
          videoUrl: vidUrl || ep.existingVideoUrl,
          thumbnailUrl: thumbUrl || ep.existingThumbUrl || finalCoverUrl,
          subtitles: finalSubtitles,
          updatedAt: serverTimestamp()
        };

        if (ep.isNew) {
           await addDoc(collection(db, 'anime', animeId, 'episodes'), { ...epData, downloads: 0, createdAt: serverTimestamp() });
        } else {
           await updateDoc(doc(db, 'anime', animeId, 'episodes', ep.id), epData);
        }
        completedOps++;
        setProgress(Math.round((completedOps / totalOps) * 100));
      }

      setStatus('Success!');
      setView('success');
      fetchAnimeList();

    } catch (error) { console.error(error); alert('Error: ' + error.message); } finally { setLoading(false); }
  };

  // --- RENDER: DETAILS VIEW ---
  if (view === 'details' && selectedAnime) {
    return (
      <div className="container">
        <button onClick={() => setView('list')} style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', fontWeight: 600, marginBottom: 20 }}>
          <ArrowLeft size={18} /> Back to Library
        </button>

        <div className="grid-12">
          {/* HEADER (LEFT SIDEBAR) */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-header blue">
              <Film size={20} />
              <span>Anime Details</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: 15, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                <img src={selectedAnime.images?.jpg?.image_url} alt={selectedAnime.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                <div>
                   <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#111827', margin: 0 }}>{selectedAnime.title}</h1>
                   <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                      {selectedAnime.genres?.map(g => <span key={g} className="chip" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>{g}</span>)}
                   </div>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.5' }}>
                  {selectedAnime.synopsis || "No synopsis available."}
                </div>
                <div style={{ background: '#f9fafb', padding: 15, borderRadius: 12, border: '1px solid #e5e7eb', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                  <div><div style={{fontSize:'0.75rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase'}}>Views</div><div style={{fontSize:'1.2rem', fontWeight:800, color:'#111827'}}><Eye size={16} style={{display:'inline', marginRight:5}}/> {selectedAnime.views || 0}</div></div>
                  <div><div style={{fontSize:'0.75rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase'}}>Total Eps</div><div style={{fontSize:'1.2rem', fontWeight:800, color:'#111827'}}><PlayCircle size={16} style={{display:'inline', marginRight:5}}/> {selectedAnime.totalEpisodes || selectedAnimeEpisodes.length}</div></div>
                  <div style={{gridColumn:'span 2'}}><div style={{fontSize:'0.75rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase'}}>Fan Rating</div><div style={{fontSize:'1.2rem', fontWeight:800, color:'#eab308'}}><Star size={16} fill="#eab308" style={{display:'inline', marginRight:5}}/> {selectedAnime.rating || "N/A"}</div></div>
                </div>
              </div>
            </div>
          </div>

          {/* BODY (EPISODES LIST) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
             <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                <PlayCircle className="text-purple-600"/> Episodes List
             </h2>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20 }}>
                {selectedAnimeEpisodes.map(ep => (
                  <div key={ep.id} className="card" style={{ marginBottom: 0, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                    <div style={{ width: '100%', height: 140, backgroundColor: '#000', position: 'relative' }}>
                      <img src={ep.thumbnailUrl || selectedAnime.images?.jpg?.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                      <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700 }}>EP {ep.number}</div>
                    </div>
                    <div style={{ padding: 15 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 10px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ep.title}</h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#2563eb', fontWeight: 600 }}>
                            <Captions size={14} /> <span>{(ep.subtitles || []).length} Subs</span>
                         </div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#6b7280' }}>
                            <Download size={14} /> <span>{ep.downloads || 0}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: LIST VIEW ---
  if (view === 'list') {
    return (
      <div className="container">
        <div className="card" style={{ marginBottom: 30, background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', border: 'none' }}>
           <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', textAlign: 'center' }}>
              <div style={{ color: 'white', marginBottom: 15 }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0 }}>Anime Studio</h1>
                <p style={{ opacity: 0.9, marginTop: 5 }}>Manage your library and upload new content</p>
              </div>
              <button onClick={handleCreateNew} className="btn-publish" style={{ width: 'auto', padding: '15px 40px', background: 'white', color: '#4f46e5', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}><Plus size={24} /> UPLOAD NEW ANIME</button>
           </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Library ({animeList.length})</h2>
          <div style={{ position: 'relative' }}><input type="text" placeholder="Search..." style={{ padding: '10px 15px 10px 40px', borderRadius: 10, border: '1px solid #e5e7eb' }} /><Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: '#9ca3af' }} /></div>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          {animeList.map(anime => (
            <div key={anime.id} className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: 20, gap: 20 }}>
                <div style={{ width: 60, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}><img src={anime.images?.jpg?.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', fontWeight: 700 }}>{anime.title}</h3>
                  <div style={{ display: 'flex', gap: 8 }}>{anime.genres?.slice(0, 3).map(g => <span key={g} className="chip" style={{padding:'2px 8px', fontSize:'0.75rem'}}>{g}</span>)}</div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                   <button onClick={() => handleViewDetails(anime)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontWeight: 600 }}>View</button>
                   <button onClick={() => handleEdit(anime)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>Edit Anime</button>
                   <button onClick={() => handleDelete(anime)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- RENDER: SUCCESS SCREEN ---
  if (view === 'success') {
    return (
      <div className="container" style={{ textAlign: 'center', marginTop: 50 }}>
        <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
          <div className="card-body" style={{ alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
            <Sparkles size={50} color="#16a34a" style={{ marginBottom: 20 }} />
            <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>Success!</h1>
            <p style={{ color: '#6b7280', marginBottom: 30 }}>Changes saved for "{animeTitle}".</p>
            <button onClick={() => setView('list')} className="btn-publish"><ArrowLeft size={20} /> Back to Library</button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: FORM VIEW (BULK UPLOAD/EDIT) ---
  return (
    <div className="container">
      <button onClick={() => setView('list')} style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', fontWeight: 600, marginBottom: 20 }}>
        <ArrowLeft size={18} /> Back to List
      </button>

      <div className="page-header">
        <div className="page-title"><h1>{isEditMode ? "Manage Series" : "New Series Upload"}</h1></div>
        
        {/* Only show button if not loading (Loading bar replaces it) */}
        {!loading && (
           <button onClick={handlePublish} className="btn-publish" style={{ width: 'auto', padding: '12px 30px', fontSize: '1rem' }}>Save All Changes</button>
        )}
      </div>

      <form onSubmit={handlePublish}>
        {/* HEADER: ANIME DETAILS */}
        <div className="card">
          <div className="card-header blue"><Film size={24} /> <span>Header: Anime Details</span></div>
          <div className="card-body">
            <div className="grid-12">
              <div>
                <span className="form-label">Cover</span>
                <input type="file" className="hidden" id="animeCover" onChange={(e) => handleFileChange(e, setAnimeCover)} />
                <label htmlFor="animeCover" className={`upload-zone ${animeCover ? 'active' : ''}`}>
                  {animeCover ? <img src={URL.createObjectURL(animeCover)} /> : existingCoverUrl ? <img src={existingCoverUrl} /> : <div style={{textAlign:'center', color:'#9ca3af'}}><ImageIcon size={30}/> Upload</div>}
                </label>
              </div>
              <div>
                <div className="grid-2" style={{marginBottom:0}}>
                    <div className="form-group"><span className="form-label">Title</span><input type="text" className="input-field" value={animeTitle} onChange={e => setAnimeTitle(e.target.value)} /></div>
                    <div className="form-group"><span className="form-label">Total Episodes</span><input type="number" className="input-field" placeholder="e.g. 12" value={totalEpisodes} onChange={e => setTotalEpisodes(e.target.value)} /></div>
                </div>
                <div className="form-group"><span className="form-label">Synopsis</span><textarea className="textarea-field" value={synopsis} onChange={e => setSynopsis(e.target.value)}></textarea></div>
                <div className="form-group"><span className="form-label">Genres</span><div className="chips-container">{GENRES_LIST.map(g => <div key={g} className={`chip ${selectedGenres.includes(g) ? 'selected' : ''}`} onClick={() => { if(selectedGenres.includes(g)) setSelectedGenres(prev=>prev.filter(x=>x!==g)); else if(selectedGenres.length<3) setSelectedGenres([...selectedGenres, g]); }}>{g}</div>)}</div></div>
                <div className="form-group"><span className="form-label">Age Rating</span><div className="chips-container">{AGE_RATINGS.map(r => <div key={r} className={`chip ${selectedAge === r ? 'selected' : ''}`} onClick={() => setSelectedAge(r)}>{r}</div>)}</div></div>
              </div>
            </div>
          </div>
        </div>

        {/* BODY: EPISODE LIST */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10 }}><PlayCircle color="#8b5cf6" /> Episodes ({episodes.length})</h2>
          
          {episodes.map((ep, index) => (
            <div key={ep.id} className="card" style={{ border: '2px solid #f3f4f6' }}>
              <div className="card-header purple" style={{ padding: '15px 20px', background: '#f9fafb', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1rem' }}>Episode {ep.number} Form</span>
                {episodes.length > 1 && <button type="button" onClick={() => removeEpisodeForm(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>}
              </div>
              <div className="card-body" style={{ padding: 20 }}>
                <div className="grid-2">
                   <div>
                      <div className="form-group">
                         <span className="form-label">Thumbnail</span>
                         <input type="file" className="hidden" id={`thumb-${ep.id}`} onChange={(e) => updateEpisodeState(index, 'thumbFile', e.target.files[0])} />
                         <label htmlFor={`thumb-${ep.id}`} className="upload-zone upload-zone-small">
                            {ep.thumbFile ? <img src={URL.createObjectURL(ep.thumbFile)} /> : ep.existingThumbUrl ? <img src={ep.existingThumbUrl} /> : <div style={{textAlign:'center', color:'#9ca3af'}}><ImageIcon /> Thumb</div>}
                         </label>
                      </div>
                      <div style={{display:'flex', gap:10}}>
                         <div style={{width:80}}><span className="form-label">No.</span><input type="number" className="input-field" value={ep.number} onChange={(e) => updateEpisodeState(index, 'number', e.target.value)} /></div>
                         <div style={{flex:1}}><span className="form-label">Title</span><input type="text" className="input-field" value={ep.title} onChange={(e) => updateEpisodeState(index, 'title', e.target.value)} /></div>
                      </div>
                   </div>
                   <div>
                      <div className="form-group">
                         <span className="form-label">Video File {ep.existingVideoUrl && "(Uploaded)"}</span>
                         <input type="file" accept="video/*" className="hidden" id={`vid-${ep.id}`} onChange={(e) => updateEpisodeState(index, 'videoFile', e.target.files[0])} />
                         <label htmlFor={`vid-${ep.id}`} className={`upload-zone ${ep.videoFile ? 'active' : ''}`} style={{ minHeight: 180 }}>
                            {ep.videoFile ? <div style={{textAlign:'center', color:'#7c3aed'}}><FileVideo size={40}/><div>{ep.videoFile.name}</div></div> : ep.existingVideoUrl ? <div style={{textAlign:'center', color:'#10b981'}}><FileVideo size={40}/><div>Video Exists</div><div style={{fontSize:10}}>Click to Replace</div></div> : <div style={{textAlign:'center', color:'#9ca3af'}}><Upload size={40}/> Upload Video</div>}
                         </label>
                      </div>
                      
                      {/* Subtitles Section */}
                      <div className="form-group" style={{marginTop: 20, background: '#f8fafc', padding: 15, borderRadius: 12, border: '1px dashed #e2e8f0'}}>
                          <div style={{display:'flex', justifyContent:'space-between', marginBottom:10}}>
                             <span className="form-label" style={{marginBottom:0}}>Subtitles ({ep.subtitles.length})</span>
                             <button type="button" onClick={() => addSubtitle(index)} style={{fontSize:'0.75rem', fontWeight:700, color:'#2563eb', background:'none', border:'none', cursor:'pointer'}}>+ Add Language</button>
                          </div>
                          <div style={{display:'flex', flexDirection:'column', gap:10}}>
                             {ep.subtitles.map((sub, subIdx) => (
                                <div key={sub.id} style={{display:'flex', gap:10, alignItems:'center'}}>
                                   <select className="input-field" style={{padding:'8px', fontSize:'0.85rem', width:120}} value={sub.language} onChange={(e) => updateSubtitle(index, subIdx, 'language', e.target.value)}>
                                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                                   </select>
                                   <div style={{flex:1, position:'relative'}}>
                                      <input type="file" className="hidden" id={`sub-${sub.id}`} onChange={(e) => updateSubtitle(index, subIdx, 'file', e.target.files[0])} />
                                      <label htmlFor={`sub-${sub.id}`} style={{display:'block', padding:'8px 12px', background:'white', border:'1px solid #cbd5e1', borderRadius:8, fontSize:'0.85rem', cursor:'pointer', color:'#475569', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                         {sub.file ? sub.file.name : sub.url ? "Existing Subtitle" : "Select .SRT File"}
                                      </label>
                                   </div>
                                   <button type="button" onClick={() => removeSubtitle(index, subIdx)} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer'}}><X size={16}/></button>
                                </div>
                             ))}
                             {ep.subtitles.length === 0 && <div style={{fontSize:'0.8rem', color:'#94a3b8', fontStyle:'italic'}}>No subtitles added.</div>}
                          </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addEpisodeForm} className="btn-publish" style={{ background: '#f3f4f6', color: '#4b5563', border: '2px dashed #d1d5db', boxShadow: 'none' }}><Plus size={24} /> ADD MORE EPISODE</button>
        </div>

        {/* LOADING BAR (FOOTER) */}
        {loading && (
            <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', width: '90%', maxWidth: 600, background: 'white', padding: 20, borderRadius: 20, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', border: '1px solid #e5e7eb', zIndex: 100 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                  <Loader2 className="animate-spin" color="#4f46e5" />
                  <div>
                    <div style={{ fontWeight: 800, color: '#1f2937' }}>{status}</div>
                    <div style={{ fontSize: '0.85rem', color: '#9ca3af' }}>Please do not close this tab.</div>
                  </div>
                </div>
                <div style={{ fontWeight: 900, color: '#4f46e5', fontSize: '1.2rem' }}>{progress}%</div>
              </div>
              <div style={{ width: '100%', height: 8, background: '#f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: '#4f46e5', transition: 'width 0.3s ease' }}></div>
              </div>
            </div>
        )}

      </form>
    </div>
  );
}