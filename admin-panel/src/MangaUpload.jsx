import {
    addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import {
    ArrowLeft,
    BookOpen,
    Eye,
    FileText,
    Image as ImageIcon,
    Loader2,
    Plus,
    Search,
    Sparkles,
    Star,
    Trash2,
    Upload
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
const STATUS_OPTIONS = ["Ongoing", "Completed", "Upcoming"];

export default function MangaUpload() {
  // --- GLOBAL STATE ---
  const [view, setView] = useState('list');
  const [mangaList, setMangaList] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [libraryTab, setLibraryTab] = useState('Ongoing'); // ✅ New Tab State
  
  // --- FORM STATE ---
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [createdMangaId, setCreatedMangaId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // --- DETAILS VIEW STATE ---
  const [selectedManga, setSelectedManga] = useState(null);
  const [selectedMangaChapters, setSelectedMangaChapters] = useState([]);

  // HEADER STATE (Manga Form)
  const [mangaCover, setMangaCover] = useState(null); 
  const [existingCoverUrl, setExistingCoverUrl] = useState(''); 
  const [mangaTitle, setMangaTitle] = useState('');
  const [author, setAuthor] = useState(''); 
  const [releaseYear, setReleaseYear] = useState(''); 
  const [synopsis, setSynopsis] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedAge, setSelectedAge] = useState('12+');
  
  // ✅ NEW: Status State
  const [mangaStatus, setMangaStatus] = useState('Ongoing');

  // BODY STATE (Chapter Form)
  const [chapters, setChapters] = useState([]);
  const [deletedChapters, setDeletedChapters] = useState([]);

  // --- FETCH LIST ON MOUNT ---
  useEffect(() => {
    fetchMangaList();
  }, []);

  const fetchMangaList = async () => {
    setLoadingList(true);
    try {
      const q = query(collection(db, 'manga'), orderBy('views', 'desc'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMangaList(list);
    } catch (error) { console.error("Error fetching list:", error); } finally { setLoadingList(false); }
  };

  // --- ACTIONS ---

  const handleCreateNew = () => {
    setCreatedMangaId(null);
    setIsEditMode(false);
    setMangaTitle(''); setAuthor(''); setReleaseYear(''); setSynopsis(''); setSelectedGenres([]); setExistingCoverUrl(''); setMangaCover(null);
    setMangaStatus('Ongoing'); // Reset Status
    setChapters([{ id: Date.now(), number: 1, title: '', file: null, isNew: true }]);
    setDeletedChapters([]);
    setView('form');
  };

  const handleEdit = async (manga) => {
    setCreatedMangaId(manga.id);
    setIsEditMode(true);
    setMangaTitle(manga.title);
    setAuthor(manga.author || '');
    setReleaseYear(manga.year || ''); 
    setSynopsis(manga.synopsis);
    setSelectedGenres(manga.genres || []);
    setSelectedAge(manga.ageRating || '12+');
    setExistingCoverUrl(manga.images?.jpg?.image_url || '');
    setMangaCover(null);
    
    // ✅ Set Status
    const currentStatus = manga.status === 'Released' ? 'Ongoing' : (manga.status || 'Ongoing');
    setMangaStatus(currentStatus);

    setDeletedChapters([]);
    
    setStatus('Fetching chapters...');
    try {
      const q = query(collection(db, 'manga', manga.id, 'chapters'), orderBy('number', 'asc'));
      const chSnap = await getDocs(q);
      const fetchedChapters = chSnap.docs.map(doc => ({
        id: doc.id, 
        number: doc.data().number, 
        title: doc.data().title,
        existingFileUrl: doc.data().fileUrl,
        file: null, 
        isNew: false
      }));
      setChapters(fetchedChapters.length > 0 ? fetchedChapters : [{ id: Date.now(), number: 1, title: '', file: null, isNew: true }]);
      setView('form');
    } catch (e) { alert(e.message); }
    setStatus('');
  };

  const handleViewDetails = async (manga) => {
    setSelectedManga(manga);
    setView('details');
    try {
      const q = query(collection(db, 'manga', manga.id, 'chapters'), orderBy('number', 'asc'));
      const chSnap = await getDocs(q);
      const fetchedChaps = chSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSelectedMangaChapters(fetchedChaps);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (manga) => {
    if (!window.confirm(`WARNING: This will permanently delete "${manga.title}" along with ALL its chapters.\n\nAre you sure?`)) return;
    
    setMangaList(prev => prev.filter(m => m.id !== manga.id));
    if (view === 'details') setView('list');

    try {
      if (manga.images?.jpg?.image_url) {
        try { await deleteObject(ref(storage, manga.images.jpg.image_url)); } catch (e) {}
      }

      const chSnapshot = await getDocs(collection(db, 'manga', manga.id, 'chapters'));
      const deletePromises = chSnapshot.docs.map(async (docSnap) => {
          const ch = docSnap.data();
          if (ch.fileUrl) try { await deleteObject(ref(storage, ch.fileUrl)); } catch (e) {}
          return deleteDoc(doc(db, 'manga', manga.id, 'chapters', docSnap.id));
      });

      await Promise.all(deletePromises);
      await deleteDoc(doc(db, 'manga', manga.id));
      alert(`"${manga.title}" deleted.`);

    } catch (e) { alert("Error: " + e.message); fetchMangaList(); }
  };

  // --- FORM LOGIC ---
  const addChapterForm = () => {
    const nextNum = chapters.length > 0 ? Number(chapters[chapters.length - 1].number) + 1 : 1;
    setChapters([...chapters, { id: Date.now(), number: nextNum, title: '', file: null, isNew: true }]);
  };

  const removeChapterForm = (index) => {
    const chToRemove = chapters[index];
    if (!chToRemove.isNew && chToRemove.id) {
        setDeletedChapters(prev => [...prev, chToRemove]);
    }
    const newChaps = [...chapters]; 
    newChaps.splice(index, 1); 
    setChapters(newChaps); 
  };

  const updateChapterState = (index, field, value) => { const newChaps = [...chapters]; newChaps[index][field] = value; setChapters(newChaps); };

  const handleFileChange = (e, setter) => { if (e.target.files[0]) setter(e.target.files[0]); };
  
  const uploadFile = (file, path) => {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      uploadTask.on('state_changed', 
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (path.includes('chapters')) setProgress(Math.round(p));
        },
        (error) => reject(error),
        async () => { 
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ url, size: uploadTask.snapshot.totalBytes });
        }
      );
    });
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!mangaTitle) { alert("Manga Title is required."); return; }
    if (!isEditMode && !mangaCover) { alert("Cover Image is required."); return; }
    
    setLoading(true);
    setStatus('Saving Manga Details...');
    setProgress(0);

    try {
      const coverResult = await uploadFile(mangaCover, 'manga_covers');
      const finalCoverUrl = coverResult?.url || existingCoverUrl;
      let mangaId = createdMangaId;

      const mangaData = {
        title: mangaTitle, 
        author: author || 'Unknown',
        year: releaseYear || 'N/A', 
        synopsis, 
        genres: selectedGenres, 
        ageRating: selectedAge,
        images: { jpg: { image_url: finalCoverUrl } }, 
        type: 'Manga', 
        status: mangaStatus, // ✅ Save Status
        updatedAt: serverTimestamp()
      };

      if (isEditMode && mangaId) {
        await updateDoc(doc(db, 'manga', mangaId), mangaData);
      } else {
        const ref = await addDoc(collection(db, 'manga'), { ...mangaData, createdAt: serverTimestamp(), views: 0, rating: 0 });
        mangaId = ref.id;
        setCreatedMangaId(mangaId);
      }

      if (deletedChapters.length > 0) {
          setStatus('Removing deleted chapters...');
          for (const delCh of deletedChapters) {
              try {
                  await deleteDoc(doc(db, 'manga', mangaId, 'chapters', delCh.id));
                  if (delCh.existingFileUrl) await deleteObject(ref(storage, delCh.existingFileUrl)).catch(e => {});
              } catch (e) { console.error(e); }
          }
      }

      const totalOps = chapters.length;
      let completedOps = 0;

      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        setStatus(`Uploading Chapter ${ch.number}...`);
        
        if (!ch.file && !ch.existingFileUrl) continue;

        const fileResult = await uploadFile(ch.file, 'manga_chapters');

        const chData = {
          title: ch.title || `Chapter ${ch.number}`, 
          number: Number(ch.number),
          fileUrl: fileResult?.url || ch.existingFileUrl,
          updatedAt: serverTimestamp()
        };

        if (ch.isNew) {
           await addDoc(collection(db, 'manga', mangaId, 'chapters'), { ...chData, createdAt: serverTimestamp() });
        } else {
           await updateDoc(doc(db, 'manga', mangaId, 'chapters', ch.id), chData);
        }
        completedOps++;
        setProgress(Math.round((completedOps / totalOps) * 100));
      }

      setStatus('Success!');
      setView('success');
      fetchMangaList();

    } catch (error) { console.error(error); alert('Error: ' + error.message); } finally { setLoading(false); }
  };

  // --- RENDER: DETAILS VIEW ---
  if (view === 'details' && selectedManga) {
    return (
      <div className="container">
        <button onClick={() => setView('list')} style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', fontWeight: 600, marginBottom: 20 }}>
          <ArrowLeft size={18} /> Back to Library
        </button>

        <div className="grid-12">
          {/* HEADER */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card-header purple">
              <BookOpen size={20} />
              <span>Manga Details</span>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ width: '100%', aspectRatio: '2/3', borderRadius: 15, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', position:'relative' }}>
                <img src={selectedManga.images?.jpg?.image_url} alt={selectedManga.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{position:'absolute', top:10, right:10, background: selectedManga.status === 'Completed' ? '#10b981' : selectedManga.status === 'Upcoming' ? '#eab308' : '#8b5cf6', color:'white', padding:'5px 10px', borderRadius:8, fontWeight:'bold', fontSize:'0.8rem'}}>
                    {selectedManga.status || 'Ongoing'}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                <div>
                   <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#111827', margin: 0 }}>{selectedManga.title}</h1>
                   <p style={{margin:0, color:'#6b7280', fontWeight:600}}>By {selectedManga.author}</p>
                   <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                      {selectedManga.genres?.map(g => <span key={g} className="chip" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>{g}</span>)}
                   </div>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#4b5563', lineHeight: '1.5' }}>
                  {selectedManga.synopsis || "No synopsis available."}
                </div>
                <div style={{ background: '#f9fafb', padding: 15, borderRadius: 12, border: '1px solid #e5e7eb', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                  <div><div style={{fontSize:'0.75rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase'}}>Views</div><div style={{fontSize:'1.2rem', fontWeight:800, color:'#111827'}}><Eye size={16} style={{display:'inline', marginRight:5}}/> {selectedManga.views || 0}</div></div>
                  <div><div style={{fontSize:'0.75rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase'}}>Chapters</div><div style={{fontSize:'1.2rem', fontWeight:800, color:'#111827'}}><BookOpen size={16} style={{display:'inline', marginRight:5}}/> {selectedMangaChapters.length}</div></div>
                  <div style={{gridColumn:'span 2'}}><div style={{fontSize:'0.75rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase'}}>Fan Rating</div><div style={{fontSize:'1.2rem', fontWeight:800, color:'#eab308'}}><Star size={16} fill="#eab308" style={{display:'inline', marginRight:5}}/> {selectedManga.score ? `${Number(selectedManga.score).toFixed(1)}/5` : "N/A"}</div></div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
             <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
                <BookOpen className="text-purple-600"/> Chapters List
             </h2>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                {selectedMangaChapters.map(ch => (
                  <div key={ch.id} className="card" style={{ marginBottom: 0, padding: 20, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div style={{fontWeight:700}}>Ch. {ch.number} - {ch.title}</div>
                      <a href={ch.fileUrl} target="_blank" className="chip" style={{fontSize:'0.8rem'}}>View File</a>
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
    // ✅ FILTER LOGIC
    const filteredMangaList = mangaList.filter(item => {
        const itemStatus = item.status === 'Released' ? 'Ongoing' : (item.status || 'Ongoing');
        return itemStatus === libraryTab;
    });

    return (
      <div className="container">
        <div className="card" style={{ marginBottom: 30, background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', border: 'none' }}>
           <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '50px 20px', textAlign: 'center' }}>
              <div style={{ color: 'white', marginBottom: 15 }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0 }}>Manga Studio</h1>
                <p style={{ opacity: 0.9, marginTop: 5 }}>Manage your manga library</p>
              </div>
              <button onClick={handleCreateNew} className="btn-publish" style={{ width: 'auto', padding: '15px 40px', background: 'white', color: '#8b5cf6', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}><Plus size={24} /> UPLOAD NEW MANGA</button>
           </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Library ({filteredMangaList.length})</h2>
            <div style={{ position: 'relative' }}><input type="text" placeholder="Search..." style={{ padding: '10px 15px 10px 40px', borderRadius: 10, border: '1px solid #e5e7eb' }} /><Search size={18} style={{ position: 'absolute', left: 12, top: 12, color: '#9ca3af' }} /></div>
          </div>

          {/* ✅ TABS */}
          <div style={{ display: 'flex', gap: 10, borderBottom: '2px solid #e5e7eb', paddingBottom: 10 }}>
              {STATUS_OPTIONS.map(status => (
                  <button 
                    key={status}
                    onClick={() => setLibraryTab(status)}
                    style={{
                        padding: '8px 20px',
                        borderRadius: 20,
                        border: 'none',
                        background: libraryTab === status ? '#8b5cf6' : 'transparent',
                        color: libraryTab === status ? 'white' : '#6b7280',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                  >
                      {status}
                  </button>
              ))}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 20 }}>
          {filteredMangaList.length === 0 && <div style={{textAlign:'center', color:'#9ca3af', padding:40}}>No manga found in {libraryTab}.</div>}

          {filteredMangaList.map((manga, index) => (
            <div key={manga.id} className="card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: 20, gap: 20 }}>
                <div style={{ width: 60, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0, position:'relative' }}>
                    <img src={manga.images?.jpg?.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{position:'absolute', bottom:0, width:'100%', background: manga.status === 'Completed' ? 'rgba(16, 185, 129, 0.9)' : manga.status === 'Upcoming' ? 'rgba(234, 179, 8, 0.9)' : 'rgba(139, 92, 246, 0.9)', color:'white', fontSize:'0.5rem', textAlign:'center', fontWeight:'bold', textTransform:'uppercase'}}>
                        {manga.status || 'Ongoing'}
                    </div>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', fontWeight: 700 }}>{manga.title}</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems:'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8b5cf6' }}>#{index + 1}</span>
                      <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>• <Eye size={12} style={{display:'inline', verticalAlign:'middle'}}/> {manga.views || 0}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                   <button onClick={() => handleViewDetails(manga)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontWeight: 600 }}>View</button>
                   <button onClick={() => handleEdit(manga)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                   <button onClick={() => handleDelete(manga)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
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
            <p style={{ color: '#6b7280', marginBottom: 30 }}>Manga "{mangaTitle}" updated.</p>
            <button onClick={() => setView('list')} className="btn-publish"><ArrowLeft size={20} /> Back to Library</button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER: FORM VIEW ---
  return (
    <div className="container">
      <button onClick={() => setView('list')} style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', fontWeight: 600, marginBottom: 20 }}>
        <ArrowLeft size={18} /> Back to List
      </button>

      <div className="page-header">
        <div className="page-title"><h1>{isEditMode ? "Edit Manga" : "New Manga Upload"}</h1></div>
        {!loading && (
           <button onClick={handlePublish} className="btn-publish" style={{ width: 'auto', padding: '12px 30px', fontSize: '1rem' }}>Save Changes</button>
        )}
      </div>

      <form onSubmit={handlePublish}>
        {/* DETAILS HEADER */}
        <div className="card">
          <div className="card-header blue" style={{justifyContent:'space-between'}}>
              <div style={{display:'flex', alignItems:'center', gap:10}}><BookOpen size={24} /> <span>Header: Manga Details</span></div>
              
              {/* ✅ STATUS SELECTOR */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background:'white', padding:'5px 15px', borderRadius:12, border:'1px solid #bfdbfe' }}>
                  <span style={{fontSize:'0.85rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase'}}>Status:</span>
                  <select 
                    value={mangaStatus} 
                    onChange={(e) => setMangaStatus(e.target.value)}
                    style={{border:'none', fontWeight:700, color: mangaStatus === 'Completed' ? '#10b981' : mangaStatus === 'Upcoming' ? '#eab308' : '#8b5cf6', outline:'none', fontSize:'0.95rem'}}
                  >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
              </div>
          </div>
          <div className="card-body">
            <div className="grid-12">
              <div>
                <span className="form-label">Cover</span>
                <input type="file" className="hidden" id="mangaCover" onChange={(e) => handleFileChange(e, setMangaCover)} />
                <label htmlFor="mangaCover" className={`upload-zone ${mangaCover ? 'active' : ''}`}>
                  {mangaCover ? <img src={URL.createObjectURL(mangaCover)} /> : existingCoverUrl ? <img src={existingCoverUrl} /> : <div style={{textAlign:'center', color:'#9ca3af'}}><ImageIcon size={30}/> Upload</div>}
                </label>
              </div>
              <div>
                <div className="grid-3" style={{marginBottom:0, display:'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 20}}>
                    <div className="form-group"><span className="form-label">Title</span><input type="text" className="input-field" value={mangaTitle} onChange={e => setMangaTitle(e.target.value)} /></div>
                    <div className="form-group"><span className="form-label">Author</span><input type="text" className="input-field" value={author} onChange={e => setAuthor(e.target.value)} /></div>
                    <div className="form-group"><span className="form-label">Year</span><input type="number" className="input-field" placeholder="2024" value={releaseYear} onChange={e => setReleaseYear(e.target.value)} /></div>
                </div>
                <div className="form-group"><span className="form-label">Synopsis</span><textarea className="textarea-field" value={synopsis} onChange={e => setSynopsis(e.target.value)}></textarea></div>
                <div className="form-group"><span className="form-label">Genres</span><div className="chips-container">{GENRES_LIST.map(g => <div key={g} className={`chip ${selectedGenres.includes(g) ? 'selected' : ''}`} onClick={() => { if(selectedGenres.includes(g)) setSelectedGenres(prev=>prev.filter(x=>x!==g)); else if(selectedGenres.length<3) setSelectedGenres([...selectedGenres, g]); }}>{g}</div>)}</div></div>
                <div className="form-group"><span className="form-label">Age Rating</span><div className="chips-container">{AGE_RATINGS.map(r => <div key={r} className={`chip ${selectedAge === r ? 'selected' : ''}`} onClick={() => setSelectedAge(r)}>{r}</div>)}</div></div>
              </div>
            </div>
          </div>
        </div>

        {/* CHAPTERS LIST */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 15, display: 'flex', alignItems: 'center', gap: 10 }}><BookOpen color="#8b5cf6" /> Chapters ({chapters.length})</h2>
          
          {chapters.map((ch, index) => (
            <div key={ch.id} className="card" style={{ border: '2px solid #f3f4f6' }}>
              <div className="card-header purple" style={{ padding: '15px 20px', background: '#f9fafb', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1rem' }}>Chapter {ch.number}</span>
                {chapters.length > 1 && <button type="button" onClick={() => removeChapterForm(index)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={18} /></button>}
              </div>
              <div className="card-body" style={{ padding: 20 }}>
                <div className="grid-2">
                   <div>
                      <div style={{display:'flex', gap:10}}>
                         <div style={{width:80}}><span className="form-label">No.</span><input type="number" className="input-field" value={ch.number} onChange={(e) => updateChapterState(index, 'number', e.target.value)} /></div>
                         <div style={{flex:1}}><span className="form-label">Title</span><input type="text" className="input-field" value={ch.title} onChange={(e) => updateChapterState(index, 'title', e.target.value)} /></div>
                      </div>
                   </div>
                   <div>
                      <div className="form-group" style={{marginBottom:0}}>
                         <span className="form-label">Chapter File (PDF/Zip) {ch.existingFileUrl && "(Uploaded)"}</span>
                         <input type="file" className="hidden" id={`ch-${ch.id}`} onChange={(e) => updateChapterState(index, 'file', e.target.files[0])} />
                         <label htmlFor={`ch-${ch.id}`} className={`upload-zone ${ch.file ? 'active' : ''}`} style={{ minHeight: 120 }}>
                            {ch.file ? <div style={{textAlign:'center', color:'#7c3aed'}}><FileText size={30}/><div>{ch.file.name}</div></div> : ch.existingFileUrl ? <div style={{textAlign:'center', color:'#10b981'}}><FileText size={30}/><div>File Exists</div></div> : <div style={{textAlign:'center', color:'#9ca3af'}}><Upload size={30}/> Upload File</div>}
                         </label>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addChapterForm} className="btn-publish" style={{ background: '#f3f4f6', color: '#4b5563', border: '2px dashed #d1d5db', boxShadow: 'none' }}><Plus size={24} /> ADD MORE CHAPTER</button>
        </div>

        {/* LOADING BAR */}
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