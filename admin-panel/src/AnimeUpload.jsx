import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import {
    Edit,
    FileVideo,
    Film,
    Image as ImageIcon,
    Loader2,
    PlayCircle,
    Plus,
    Sparkles,
    Trash2,
    Upload
} from 'lucide-react';
import { useState } from 'react';
import { db, storage } from './firebase';

const GENRES_LIST = [
  "Action", "Adventure", "Comedy", "Drama", "Fantasy", 
  "Horror", "Magic", "Mecha", "Music", "Mystery", 
  "Psychological", "Romance", "Sci-Fi", "Slice of Life", 
  "Sports", "Supernatural", "Thriller", "Isekai"
];

const AGE_RATINGS = ["All", "12+", "16+", "18+"];

export default function AnimeUpload() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [viewState, setViewState] = useState('form'); 
  const [createdAnimeId, setCreatedAnimeId] = useState(null);

  // --- HEADER STATE (Anime Details) ---
  const [animeCover, setAnimeCover] = useState(null);
  const [animeTitle, setAnimeTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedAge, setSelectedAge] = useState('12+');

  // --- BODY STATE (Episode Details) ---
  const [epCover, setEpCover] = useState(null);
  const [epTitle, setEpTitle] = useState('');
  const [epNumber, setEpNumber] = useState('1');
  const [epVideo, setEpVideo] = useState(null);

  // --- HANDLERS ---
  const handleFileChange = (e, setter) => {
    if (e.target.files[0]) setter(e.target.files[0]);
  };

  const toggleGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      if (selectedGenres.length >= 3) return; 
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const uploadFile = (file, path) => {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (path.includes('episodes')) setProgress(Math.round(p));
        },
        (error) => reject(error),
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });
  };

  // --- THE PUBLISH LOGIC ---
  const handlePublish = async (e) => {
    e.preventDefault();
    if (!animeTitle || !animeCover || !epVideo) {
      alert("Required: Anime Title, Cover Image, and Episode Video.");
      return;
    }

    setLoading(true);
    setStatus('Uploading Files to Storage...');
    setProgress(0);

    try {
      // 1. Upload All Files in Parallel
      const [animeCoverUrl, epCoverUrl, epVideoUrl] = await Promise.all([
        uploadFile(animeCover, 'covers'),
        uploadFile(epCover, 'episode_thumbnails'),
        uploadFile(epVideo, 'episodes')
      ]);

      let animeId = createdAnimeId;

      // 2. Create Anime Series Document (If not already created in this session)
      if (!animeId) {
        setStatus('Creating Anime Database Entry...');
        const animeRef = await addDoc(collection(db, 'anime'), {
          title: animeTitle,
          synopsis,
          genres: selectedGenres,
          ageRating: selectedAge,
          images: { jpg: { image_url: animeCoverUrl } },
          createdAt: serverTimestamp(),
          type: 'TV'
        });
        animeId = animeRef.id;
        setCreatedAnimeId(animeId);
      } else {
        setStatus('Updating Existing Series...');
      }

      // 3. Create Episode Document (Linked to Anime)
      setStatus('Linking Episode to Series...');
      await addDoc(collection(db, 'anime', animeId, 'episodes'), {
        title: epTitle || `Episode ${epNumber}`,
        number: Number(epNumber),
        videoUrl: epVideoUrl,
        thumbnailUrl: epCoverUrl || animeCoverUrl, // Fallback to anime cover if no thumb
        createdAt: serverTimestamp()
      });

      setStatus('Published Successfully!');
      setViewState('success');

    } catch (error) {
      console.error(error);
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---
  const handleEditAnime = () => setViewState('form');
  
  const handleAddNewEpisodeOnly = () => {
    setViewState('form');
    setEpTitle('');
    setEpNumber(prev => String(Number(prev) + 1));
    setEpCover(null);
    setEpVideo(null);
    setProgress(0);
    setStatus('');
    alert(`Ready to add Episode ${Number(epNumber) + 1} for "${animeTitle}"`);
  };

  const handleDeleteAnime = async () => {
    if (!createdAnimeId) return;
    if (!window.confirm("Are you sure? This will delete the Anime series record.")) return;

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'anime', createdAnimeId));
      setCreatedAnimeId(null);
      setAnimeTitle(''); setSynopsis(''); setSelectedGenres([]); setAnimeCover(null);
      setEpTitle(''); setEpVideo(null); setEpCover(null);
      setViewState('form');
    } catch (e) { alert("Error: " + e.message); } finally { setLoading(false); }
  };

  // --- VIEW: SUCCESS SCREEN ---
  if (viewState === 'success') {
    return (
      <div className="container" style={{ textAlign: 'center', maxWidth: '600px', marginTop: '50px' }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Sparkles size={40} color="#16a34a" />
            </div>
            <h1 style={{ fontSize: '2rem', fontWeight: 900, margin: 0 }}>Published!</h1>
            <p style={{ color: '#6b7280', margin: '10px 0 30px 0' }}>"{animeTitle}" is now live on the app.</p>

            <button onClick={handleEditAnime} className="input-field" style={{ marginBottom: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Edit size={20} /> Edit Series Details
            </button>
            <button onClick={handleAddNewEpisodeOnly} className="btn-publish" style={{ marginBottom: 15 }}>
              <Plus size={22} /> Add Next Episode
            </button>
            <button onClick={handleDeleteAnime} className="input-field" style={{ color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Trash2 size={20} /> Delete Series
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- VIEW: FORM SCREEN ---
  return (
    <div className="container">
      
      {/* PAGE HEADER */}
      <div className="page-header">
        <div className="page-title">
          <h1>Studio Upload</h1>
          <p>Create a new series and upload episodes.</p>
        </div>
        <div style={{ padding: '8px 16px', background: '#eff6ff', color: '#2563eb', borderRadius: '30px', fontWeight: 700, fontSize: '0.85rem' }}>
          {createdAnimeId ? "Editing Mode" : "New Series"}
        </div>
      </div>

      <form onSubmit={handlePublish}>
        
        {/* ================= CARD 1: HEADER (ANIME DETAILS) ================= */}
        <div className="card">
          <div className="card-header blue">
            <Film size={24} />
            <span>HEADER: Anime Details</span>
          </div>
          
          <div className="card-body">
            <div className="grid-12">
              
              {/* Left: Cover Image */}
              <div>
                <span className="form-label">1. Cover Picture</span>
                <input type="file" accept="image/*" className="hidden" id="animeCover" onChange={(e) => handleFileChange(e, setAnimeCover)} />
                <label htmlFor="animeCover" className={`upload-zone ${animeCover ? 'active' : ''}`}>
                  {animeCover ? (
                    <img src={URL.createObjectURL(animeCover)} alt="Preview" />
                  ) : (
                    <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                      <ImageIcon size={40} style={{ marginBottom: 10 }} />
                      <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Upload Portrait</div>
                    </div>
                  )}
                </label>
              </div>

              {/* Right: Details */}
              <div>
                <div className="form-group">
                  <span className="form-label">2. Anime Title</span>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Attack on Titan"
                    value={animeTitle}
                    onChange={e => setAnimeTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <span className="form-label">3. Synopsis</span>
                  <textarea 
                    className="textarea-field" 
                    placeholder="Write a summary..."
                    value={synopsis}
                    onChange={e => setSynopsis(e.target.value)}
                  ></textarea>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="form-label">4. Genre (Max 3)</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: selectedGenres.length === 3 ? '#ef4444' : '#9ca3af' }}>
                      {selectedGenres.length}/3
                    </span>
                  </div>
                  <div className="chips-container">
                    {GENRES_LIST.map(g => (
                      <div 
                        key={g} 
                        className={`chip ${selectedGenres.includes(g) ? 'selected' : ''}`}
                        onClick={() => toggleGenre(g)}
                      >
                        {g}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <span className="form-label">5. Age Rating</span>
                  <div className="chips-container">
                    {AGE_RATINGS.map(r => (
                      <div 
                        key={r} 
                        className={`chip ${selectedAge === r ? 'selected' : ''}`}
                        onClick={() => setSelectedAge(r)}
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* ================= CARD 2: BODY (EPISODE DETAILS) ================= */}
        <div className="card">
          <div className="card-header purple">
            <PlayCircle size={24} />
            <span>BODY: Episode Upload</span>
          </div>

          <div className="card-body">
            <div className="grid-2">
              
              {/* Left Column */}
              <div>
                <div className="form-group">
                  <span className="form-label">1. Episode Cover</span>
                  <input type="file" accept="image/*" className="hidden" id="epCover" onChange={(e) => handleFileChange(e, setEpCover)} />
                  <label htmlFor="epCover" className={`upload-zone upload-zone-small ${epCover ? 'active' : ''}`}>
                    {epCover ? (
                      <img src={URL.createObjectURL(epCover)} alt="Preview" />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                        <ImageIcon size={30} style={{ marginBottom: 10 }} />
                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Upload Thumb</div>
                      </div>
                    )}
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 20 }}>
                  <div style={{ width: '100px' }}>
                    <span className="form-label">2. No.</span>
                    <input 
                      type="number" 
                      className="input-field" 
                      style={{ textAlign: 'center' }}
                      value={epNumber}
                      onChange={e => setEpNumber(e.target.value)}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <span className="form-label">3. Episode Title</span>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. The Beginning"
                      value={epTitle}
                      onChange={e => setEpTitle(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Video */}
              <div>
                <div className="form-group" style={{ height: '100%' }}>
                  <span className="form-label">4. Episode Video</span>
                  <input type="file" accept="video/*" className="hidden" id="epVideo" onChange={(e) => handleFileChange(e, setEpVideo)} />
                  <label htmlFor="epVideo" className={`upload-zone ${epVideo ? 'active' : ''}`} style={{ minHeight: '260px' }}>
                    {epVideo ? (
                      <div style={{ textAlign: 'center', color: '#7c3aed' }}>
                        <FileVideo size={50} style={{ marginBottom: 15 }} />
                        <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{epVideo.name}</div>
                        <div style={{ fontSize: '0.8rem', marginTop: 5 }}>READY TO UPLOAD</div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#9ca3af' }}>
                        <Upload size={50} style={{ marginBottom: 15 }} />
                        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Drag & Drop Video</div>
                        <div style={{ fontSize: '0.8rem', marginTop: 5 }}>MP4, MKV (Max 2GB)</div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* --- PUBLISH BUTTON --- */}
        <div style={{ paddingBottom: 100 }}>
          {loading ? (
            <div className="card" style={{ padding: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <Loader2 className="animate-spin" color="#4f46e5" size={30} />
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.2rem' }}>{status}</div>
                  <div style={{ color: '#9ca3af' }}>Please keep this tab open.</div>
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#4f46e5' }}>{progress}%</div>
            </div>
          ) : (
            <button type="submit" className="btn-publish">
              <Sparkles size={24} color="#facc15" /> PUBLISH ANIME
            </button>
          )}
        </div>

      </form>
    </div>
  );
}