import { initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { addDoc, arrayRemove, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  Clock,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  Plus,
  Save,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  User,
  Users as UsersIcon,
  X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { auth, db, firebaseConfig } from './firebase';

// --- HELPER: SMART TIME FORMATTING ---
const formatLastActive = (timestamp) => {
    if (!timestamp) return <span className="text-gray-400 italic">Never</span>;
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    // ✅ If active in last 5 minutes -> SHOW "ACTIVE NOW"
    if (diffInSeconds < 300) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-green-600"></span> Active Now
            </span>
        );
    }

    // Otherwise show relative time
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function Users() {
  // --- STATE ---
  const [view, setView] = useState('list'); 
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [myRole, setMyRole] = useState(null);

  // Create User State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', username: '', role: 'user' });

  // Edit State
  const [selectedUser, setSelectedUser] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', rank: 'GENIN', role: 'user', isBanned: false });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Social Data State
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [loadingSocials, setLoadingSocials] = useState(false);
  const [socialTab, setSocialTab] = useState('followers'); 

  // --- FETCH USERS & MY ROLE ---
  useEffect(() => {
    fetchUsers();
    
    const fetchMyRole = async () => {
        if (auth.currentUser) {
            try {
                const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
                if (snap.exists()) setMyRole(snap.data().role);
            } catch (e) { console.error("Error fetching my role", e); }
        }
    };
    fetchMyRole();
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      // Sort by Last Active (most recent first)
      const usersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      usersData.sort((a, b) => {
          const timeA = a.lastActiveAt?.toDate ? a.lastActiveAt.toDate() : new Date(0);
          const timeB = b.lastActiveAt?.toDate ? b.lastActiveAt.toDate() : new Date(0);
          return timeB - timeA; // Descending order
      });

      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- CREATE USER LOGIC ---
  const handleCreateUser = async (e) => {
      e.preventDefault();
      if(!newUser.email || !newUser.password || !newUser.username) return alert("Please fill all fields");
      
      if ((newUser.role === 'admin' || newUser.role === 'super_admin') && myRole !== 'super_admin') {
          return alert("⛔ ACCESS DENIED: Only the Super Admin (Owner) can create other Staff/Admins.");
      }

      setCreating(true);
      let secondaryApp = null; 

      try {
          secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
          const secondaryAuth = getAuth(secondaryApp);

          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newUser.email, newUser.password);
          const uid = userCredential.user.uid;

          await setDoc(doc(db, "users", uid), {
              username: newUser.username,
              email: newUser.email,
              role: newUser.role, 
              rank: 'GENIN',
              createdAt: serverTimestamp(),
              lastActiveAt: serverTimestamp(), // Default to now so it's not null
              isBanned: false,
              searchKeywords: [newUser.username.toLowerCase(), newUser.email.toLowerCase()]
          });

          await signOut(secondaryAuth);
          
          alert(`Success! Created ${newUser.role} account for "${newUser.username}".`);
          setShowCreateModal(false);
          setNewUser({ email: '', password: '', username: '', role: 'user' });
          fetchUsers(); 

      } catch (error) {
          alert("Error creating user: " + error.message);
      } finally {
          setCreating(false);
      }
  };

  // --- ACTIONS ---
  
  const handleViewUser = async (user) => {
      setSelectedUser(user);
      setEditForm({
          username: user.username || '',
          rank: user.rank || 'GENIN',
          role: user.role || 'user',
          isBanned: user.isBanned || false
      });
      setView('details');
      
      setLoadingSocials(true);
      setFollowersList([]);
      setFollowingList([]);
      
      try {
          if (user.followers && user.followers.length > 0) {
              const idsToFetch = user.followers.slice(0, 50);
              const promises = idsToFetch.map(uid => getDoc(doc(db, "users", uid)));
              const snaps = await Promise.all(promises);
              const resolvedFollowers = snaps.map(s => s.exists() ? { id: s.id, ...s.data() } : { id: s.id, username: 'Unknown User' });
              setFollowersList(resolvedFollowers);
          }

          if (user.following && user.following.length > 0) {
              const idsToFetch = user.following.slice(0, 50);
              const promises = idsToFetch.map(uid => getDoc(doc(db, "users", uid)));
              const snaps = await Promise.all(promises);
              const resolvedFollowing = snaps.map(s => s.exists() ? { id: s.id, ...s.data() } : { id: s.id, username: 'Unknown User' });
              setFollowingList(resolvedFollowing);
          }

      } catch (e) {
          console.error("Error loading socials:", e);
      } finally {
          setLoadingSocials(false);
      }
  };

  const handleSaveChanges = async (e) => {
      e.preventDefault();
      if(!selectedUser) return;

      if (selectedUser.role === 'super_admin' && myRole !== 'super_admin') {
          return alert("⛔ ACCESS DENIED: You cannot edit the Super Admin account.");
      }

      setSaving(true);

      try {
          const userRef = doc(db, "users", selectedUser.id);
          
          const updates = {
              username: editForm.username,
              rank: editForm.rank,
              role: editForm.role,
              isBanned: editForm.isBanned
          };

          if (editForm.isBanned && !selectedUser.isBanned) {
              if (selectedUser.role === 'super_admin') throw new Error("You cannot ban the Owner.");

              const currentCount = selectedUser.banCount || 0;
              const newCount = currentCount + 1;
              
              let durationHours = newCount >= 4 ? 168 : 24;
              let durationText = newCount >= 4 ? "7 Days" : "24 Hours";

              const banExpiresAt = new Date();
              banExpiresAt.setHours(banExpiresAt.getHours() + durationHours);

              updates.banCount = newCount;
              updates.banExpiresAt = banExpiresAt;

              await addDoc(collection(db, "users", selectedUser.id, "notifications"), {
                  title: "Account Suspended ⛔",
                  body: `Your account has been suspended for ${durationText}. Access will be restored on ${banExpiresAt.toLocaleString()}.`,
                  read: false,
                  createdAt: serverTimestamp(),
                  type: 'system'
              });

              alert(`⛔ Banning User (Strike #${newCount})\nDuration: ${durationText}\nExpires: ${banExpiresAt.toLocaleString()}`);
          } 
          else if (!editForm.isBanned && selectedUser.isBanned) {
              updates.banExpiresAt = null;
              await addDoc(collection(db, "users", selectedUser.id, "notifications"), {
                  title: "Account Restored ✅",
                  body: "Your account suspension has been lifted. Welcome back!",
                  read: false,
                  createdAt: serverTimestamp(),
                  type: 'system'
              });
          }

          await updateDoc(userRef, updates);

          const updatedUser = { ...selectedUser, ...updates };
          setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
          setSelectedUser(updatedUser);
          
          alert("User profile updated successfully!");
      } catch (error) {
          alert("Error updating user: " + error.message);
      } finally {
          setSaving(false);
      }
  };

  const handleDeleteUser = async () => {
    if (selectedUser.role === 'super_admin') {
        return alert("⛔ ACCESS DENIED: The Super Admin cannot be deleted.");
    }

    if (selectedUser.role === 'admin' && myRole !== 'super_admin') {
        return alert("⛔ ACCESS DENIED: You cannot delete another Administrator.");
    }

    const confirmMsg = `⚠️ DANGER ZONE ⚠️\n\nThis will PERMANENTLY DELETE user "${selectedUser.username}".\n\nAre you sure you want to proceed?`;
    if (!window.confirm(confirmMsg)) return;

    setDeleting(true);
    const targetUid = selectedUser.id;

    try {
        if (selectedUser.followers && selectedUser.followers.length > 0) {
            const updates = selectedUser.followers.map(followerId => 
                updateDoc(doc(db, "users", followerId), { following: arrayRemove(targetUid) }).catch(e => {})
            );
            await Promise.all(updates);
        }

        if (selectedUser.following && selectedUser.following.length > 0) {
            const updates = selectedUser.following.map(followingId => 
                updateDoc(doc(db, "users", followingId), { followers: arrayRemove(targetUid) }).catch(e => {})
            );
            await Promise.all(updates);
        }

        const postsQuery = query(collection(db, 'posts'), where('userId', '==', targetUid));
        const postsSnap = await getDocs(postsQuery);
        const postDeletes = postsSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(postDeletes);

        await deleteDoc(doc(db, "users", targetUid));

        alert(`User "${selectedUser.username}" has been deleted from the database.`);
        await fetchUsers();
        setView('list');

    } catch (error) {
        console.error(error);
        alert("Error deleting user: " + error.message);
    } finally {
        setDeleting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("UID Copied!");
  };

  // --- RENDER: USER DETAILS VIEW ---
  if (view === 'details' && selectedUser) {
      return (
        <div className="container">
            <button onClick={() => setView('list')} style={{ display: 'flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', cursor: 'pointer', color: '#6b7280', fontWeight: 600, marginBottom: 20 }}>
                <ArrowLeft size={18} /> Back to Users
            </button>

            <div className="card">
                <div className="card-header blue" style={{ display:'flex', alignItems:'center', gap: 20, padding: 30 }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', fontWeight:'bold', color:'#2563eb', border:'2px solid #bfdbfe', overflow:'hidden', flexShrink: 0 }}>
                        {selectedUser.avatar ? <img src={selectedUser.avatar} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} /> : (selectedUser.username ? selectedUser.username[0].toUpperCase() : <User size={40} />)}
                    </div>
                    <div style={{flex: 1}}>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>{selectedUser.username}</h1>
                        <div style={{ display:'flex', alignItems:'center', gap: 10, marginTop: 5, color: '#6b7280', fontSize:'0.9rem' }}>
                            <span style={{ display:'flex', alignItems:'center', gap: 5 }}><Mail size={14}/> {selectedUser.email}</span>
                            <span style={{ display:'flex', alignItems:'center', gap: 5, cursor:'pointer' }} onClick={() => copyToClipboard(selectedUser.id)} title="Copy UID"><Copy size={14}/> {selectedUser.id}</span>
                        </div>
                    </div>
                    
                    {selectedUser.role !== 'super_admin' && (
                        <button 
                            onClick={handleDeleteUser}
                            disabled={deleting}
                            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '10px 15px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                        >
                            {deleting ? <Loader2 className="animate-spin" size={20}/> : <Trash2 size={20} />}
                            {deleting ? "Deleting..." : "Delete User"}
                        </button>
                    )}
                </div>

                <div className="card-body">
                    <form onSubmit={handleSaveChanges}>
                        <div className="grid-2">
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20, display:'flex', alignItems:'center', gap:10 }}>
                                    <Shield size={20} className="text-blue-600"/> Edit Profile
                                </h3>
                                
                                <div className="form-group">
                                    <span className="form-label">Username</span>
                                    <input type="text" className="input-field" value={editForm.username} onChange={(e) => setEditForm({...editForm, username: e.target.value})} />
                                </div>

                                <div className="form-group">
                                    <span className="form-label">Rank</span>
                                    <select className="input-field" value={editForm.rank} onChange={(e) => setEditForm({...editForm, rank: e.target.value})}>
                                        {["GENIN", "CHUNIN", "JONIN", "ANBU", "KAGE"].map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <span className="form-label">Role</span>
                                    <select 
                                        className="input-field" 
                                        value={editForm.role} 
                                        onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                                        disabled={selectedUser.role === 'super_admin' && myRole !== 'super_admin'}
                                    >
                                        <option value="user">User</option>
                                        <option value="anime_producer">Anime Producer</option>
                                        <option value="manga_producer">Manga Producer</option>
                                        <option value="admin">Admin (Moderator)</option>
                                        {myRole === 'super_admin' && <option value="super_admin">Super Admin</option>}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <span className="form-label">Account Status</span>
                                    <div style={{ display:'flex', gap: 10 }}>
                                        <button type="button" onClick={() => setEditForm({...editForm, isBanned: false})} className={`chip ${!editForm.isBanned ? 'selected' : ''}`} style={{ flex: 1, textAlign: 'center', justifyContent:'center', background: !editForm.isBanned ? '#10b981' : 'white', borderColor: !editForm.isBanned ? '#10b981' : '#e5e7eb' }}>
                                            <CheckCircle size={16} style={{marginRight:5}}/> Active
                                        </button>
                                        
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                if (selectedUser.role === 'super_admin') return alert("You cannot ban the Owner.");
                                                setEditForm({...editForm, isBanned: true});
                                            }} 
                                            className={`chip ${editForm.isBanned ? 'selected' : ''}`} 
                                            style={{ flex: 1, textAlign: 'center', justifyContent:'center', background: editForm.isBanned ? '#ef4444' : 'white', borderColor: editForm.isBanned ? '#ef4444' : '#e5e7eb', opacity: selectedUser.role === 'super_admin' ? 0.5 : 1 }}
                                        >
                                            <Ban size={16} style={{marginRight:5}}/> Ban User
                                        </button>
                                    </div>

                                    {selectedUser.isBanned && (
                                        <div style={{marginTop: 15, padding: 15, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c'}}>
                                            <div style={{fontWeight: 800, fontSize: '0.9rem', marginBottom: 5}}>⛔ USER IS BANNED</div>
                                            <div style={{fontSize: '0.85rem'}}>
                                                <strong>Strike Count:</strong> {selectedUser.banCount || 1}<br/>
                                                <strong>Expires:</strong> {formatDate(selectedUser.banExpiresAt)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button type="submit" className="btn-publish" disabled={saving} style={{ width: '100%', padding: '15px', marginTop: 20 }}>
                                    {saving ? "Saving..." : <><Save size={20}/> Save Changes</>}
                                </button>
                            </div>

                            {/* Right Column: Stats & Socials */}
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20, display:'flex', alignItems:'center', gap:10 }}>
                                    <Clock size={20} className="text-gray-500"/> Activity & Socials
                                </h3>
                                
                                <div style={{ background:'#f9fafb', padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', display:'flex', flexDirection:'column', gap: 15, marginBottom: 20 }}>
                                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                                        <div>
                                            <div style={{fontSize:'0.7rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase'}}>Joined</div>
                                            <div style={{fontWeight:600}}>{formatDate(selectedUser.createdAt)}</div>
                                        </div>
                                        <div>
                                            <div style={{fontSize:'0.7rem', fontWeight:700, color:'#9ca3af', textTransform:'uppercase'}}>Last Active</div>
                                            <div style={{fontWeight:600}}>{formatLastActive(selectedUser.lastActiveAt)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card" style={{ border: '1px solid #e5e7eb', boxShadow: 'none' }}>
                                    <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
                                        <button type="button" onClick={() => setSocialTab('followers')} style={{ flex: 1, padding: 15, background: socialTab === 'followers' ? 'white' : '#f9fafb', borderBottom: socialTab === 'followers' ? '2px solid #2563eb' : 'none', fontWeight: 700, color: socialTab === 'followers' ? '#2563eb' : '#6b7280', cursor:'pointer' }}>Followers ({selectedUser.followers?.length || 0})</button>
                                        <button type="button" onClick={() => setSocialTab('following')} style={{ flex: 1, padding: 15, background: socialTab === 'following' ? 'white' : '#f9fafb', borderBottom: socialTab === 'following' ? '2px solid #2563eb' : 'none', fontWeight: 700, color: socialTab === 'following' ? '#2563eb' : '#6b7280', cursor:'pointer' }}>Following ({selectedUser.following?.length || 0})</button>
                                    </div>
                                    <div style={{ padding: 0, maxHeight: 300, overflowY: 'auto' }}>
                                        {loadingSocials ? <div style={{ padding: 30, display:'flex', justifyContent:'center', alignItems:'center', color:'#6b7280', gap:10 }}><Loader2 className="animate-spin"/> Loading profiles...</div> : (
                                            <>
                                                {socialTab === 'followers' && (followersList.length === 0 ? <div style={{padding:20, textAlign:'center', color:'#9ca3af', fontStyle:'italic'}}>No followers found.</div> : followersList.map(u => (<div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 15px', borderBottom:'1px solid #f3f4f6' }}><div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', fontWeight:'bold', color:'#2563eb', overflow:'hidden', flexShrink: 0 }}>{u.avatar ? <img src={u.avatar} style={{width:'100%', height:'100%', objectFit:'cover'}}/> : u.username?.[0].toUpperCase()}</div><div style={{flex:1}}><div style={{fontSize:'0.9rem', fontWeight:600}}>{u.username}</div><div style={{fontSize:'0.7rem', color:'#9ca3af'}}>{u.rank || 'GENIN'}</div></div><button onClick={() => handleViewUser(u)} style={{background:'none', border:'none', cursor:'pointer', color:'#2563eb'}}><ExternalLink size={14}/></button></div>)))}
                                                {socialTab === 'following' && (followingList.length === 0 ? <div style={{padding:20, textAlign:'center', color:'#9ca3af', fontStyle:'italic'}}>Not following anyone.</div> : followingList.map(u => (<div key={u.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 15px', borderBottom:'1px solid #f3f4f6' }}><div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.8rem', fontWeight:'bold', color:'#2563eb', overflow:'hidden', flexShrink: 0 }}>{u.avatar ? <img src={u.avatar} style={{width:'100%', height:'100%', objectFit:'cover'}}/> : u.username?.[0].toUpperCase()}</div><div style={{flex:1}}><div style={{fontSize:'0.9rem', fontWeight:600}}>{u.username}</div><div style={{fontSize:'0.7rem', color:'#9ca3af'}}>{u.rank || 'GENIN'}</div></div><button onClick={() => handleViewUser(u)} style={{background:'none', border:'none', cursor:'pointer', color:'#2563eb'}}><ExternalLink size={14}/></button></div>)))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      );
  }

  // --- RENDER: LIST VIEW ---
  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield size={28} className="text-blue-600" /> 
          User Management
        </h1>
        <div style={{display:'flex', gap:10}}>
            <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search users..." 
                    className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <button 
                onClick={() => setShowCreateModal(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
            >
                <Plus size={20}/> Create Staff
            </button>
        </div>
      </div>

      {showCreateModal && (
          <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50}}>
              <div style={{background:'white', padding:30, borderRadius:16, width:400, boxShadow:'0 20px 50px rgba(0,0,0,0.2)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
                      <h2 style={{margin:0, fontSize:'1.2rem', fontWeight:800}}>Create New Account</h2>
                      <button onClick={() => setShowCreateModal(false)} style={{background:'none', border:'none', cursor:'pointer'}}><X/></button>
                  </div>
                  <form onSubmit={handleCreateUser}>
                      <div className="form-group">
                          <span className="form-label">Email</span>
                          <input type="email" required className="input-field" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
                      </div>
                      <div className="form-group">
                          <span className="form-label">Password</span>
                          <input type="password" required className="input-field" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                      </div>
                      <div className="form-group">
                          <span className="form-label">Username</span>
                          <input type="text" required className="input-field" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                      </div>
                      <div className="form-group">
                          <span className="form-label">Account Role</span>
                          <select className="input-field" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                              <option value="user">Regular User</option>
                              <option value="anime_producer">Anime Producer (Upload Only)</option>
                              <option value="manga_producer">Manga Producer (Upload Only)</option>
                              {myRole === 'super_admin' && <option value="admin">Admin (Moderator)</option>}
                          </select>
                      </div>
                      <button type="submit" disabled={creating} className="btn-publish" style={{width:'100%', marginTop:10}}>
                          {creating ? <Loader2 className="animate-spin"/> : "Create Account"}
                      </button>
                  </form>
              </div>
          </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-semibold text-gray-600">User Profile</th>
              <th className="p-4 font-semibold text-gray-600">UID</th>
              <th className="p-4 font-semibold text-gray-600">Role</th>
              <th className="p-4 font-semibold text-gray-600">Last Active</th> {/* ✅ NEW COLUMN */}
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading users...</td></tr>
            ) : filteredUsers.length === 0 ? (
               <tr><td colSpan="6" className="p-8 text-center text-gray-500">No users found.</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleViewUser(user)}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 'bold', color: '#2563eb', overflow: 'hidden', flexShrink: 0 }}>
                        {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover"/> : (user.username ? user.username[0].toUpperCase() : "U")}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm hover:text-blue-600 transition-colors">{user.username || "Unknown"}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200 cursor-pointer" onClick={() => copyToClipboard(user.id)} title="Copy">
                        {user.id.substring(0, 8)}...
                    </span>
                  </td>
                  <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                          user.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                          user.role?.includes('producer') ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-700'
                      }`}>
                          {user.role === 'super_admin' && <ShieldAlert size={12} style={{marginRight:4, display:'inline'}}/>}
                          {user.role || 'user'}
                      </span>
                  </td>
                  
                  {/* ✅ SMART LAST ACTIVE COLUMN */}
                  <td className="p-4 text-sm font-medium text-gray-600">
                      {formatLastActive(user.lastActiveAt)}
                  </td>
                  
                  <td className="p-4">
                    {user.isBanned ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Banned</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button onClick={() => handleViewUser(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-semibold flex items-center gap-1">
                      <UsersIcon size={16}/> Details
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