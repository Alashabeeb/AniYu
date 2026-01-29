import {
    addDoc, collection, deleteDoc, doc, getDoc, getDocs,
    limit, orderBy, query, serverTimestamp, updateDoc, where
} from 'firebase/firestore';
import {
    Ban, ChevronDown, ChevronUp, Clock, FileText,
    Loader2, MessageSquare, Search, Trash2, User
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from './firebase';

// --- HELPER: FORMAT DATES ---
const formatDate = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
};

export default function Comments() {
    const [posts, setPosts] = useState([]);
    const [commentsMap, setCommentsMap] = useState({}); // Stores comments for each post: { postId: [comment1, comment2] }
    const [loading, setLoading] = useState(true);
    const [expandedPostId, setExpandedPostId] = useState(null); // Which post is expanded
    const [loadingComments, setLoadingComments] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        fetchPosts();
    }, []);

    // 1. Fetch Main Posts (Roots)
    const fetchPosts = async () => {
        setLoading(true);
        try {
            // Fetch latest 50 items
            const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
            const snap = await getDocs(q);
            
            // Filter client-side to get only Main Posts (no parentId)
            const allItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const mainPosts = allItems.filter(item => !item.parentId);
            
            setPosts(mainPosts);
        } catch (error) {
            console.error("Error fetching posts:", error);
        } finally {
            setLoading(false);
        }
    };

    // 2. Fetch Comments for a specific Post
    const fetchCommentsForPost = async (postId) => {
        if (commentsMap[postId]) return; // Already fetched
        
        setLoadingComments(true);
        try {
            const q = query(
                collection(db, "posts"), 
                where("parentId", "==", postId),
                orderBy("createdAt", "desc")
            );
            const snap = await getDocs(q);
            const postComments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            setCommentsMap(prev => ({ ...prev, [postId]: postComments }));
        } catch (e) {
            console.error("Error fetching sub-comments:", e);
        } finally {
            setLoadingComments(false);
        }
    };

    const togglePost = (postId) => {
        if (expandedPostId === postId) {
            setExpandedPostId(null); // Collapse
        } else {
            setExpandedPostId(postId); // Expand
            fetchCommentsForPost(postId); // Load comments
        }
    };

    // --- ACTIONS (Delete / Ban) ---

    const handleDelete = async (itemId, isMainPost, parentId = null) => {
        if (!window.confirm("Are you sure you want to delete this content?")) return;
        setActionLoading(itemId);
        try {
            await deleteDoc(doc(db, "posts", itemId));
            
            if (isMainPost) {
                // If Post, remove from main list
                setPosts(prev => prev.filter(p => p.id !== itemId));
                // Optional: You could recursively delete comments here if needed
            } else {
                // If Comment, remove from the specific post's comment list
                setCommentsMap(prev => ({
                    ...prev,
                    [parentId]: prev[parentId].filter(c => c.id !== itemId)
                }));
            }
        } catch (e) {
            alert("Error deleting: " + e.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleBanUser = async (item, isMainPost, parentId = null) => {
        if (!window.confirm(`Ban user @${item.username || 'unknown'}?`)) return;
        setActionLoading(item.id);
        
        try {
            const userRef = doc(db, "users", item.userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const banExpires = new Date();
                banExpires.setHours(banExpires.getHours() + 24); // 24 Hour Ban
                
                await updateDoc(userRef, {
                    isBanned: true,
                    banExpiresAt: banExpires,
                    banCount: (userSnap.data().banCount || 0) + 1
                });

                await addDoc(collection(db, "users", item.userId, "notifications"), {
                    title: "Account Suspended ⛔",
                    body: `You have been banned for 24h due to offensive content.`,
                    read: false,
                    createdAt: serverTimestamp(),
                    type: 'system'
                });
                alert(`User @${item.username} has been banned.`);
            } else {
                alert(`User document not found. They may be deleted. Proceeding to delete content.`);
            }

            // Delete content after banning
            await handleDelete(item.id, isMainPost, parentId);

        } catch (e) {
            console.error(e);
            alert("Error: " + e.message);
        } finally {
            setActionLoading(null);
        }
    };

    const filteredPosts = posts.filter(p => 
        p.text?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
        <style>{`
            .page-container { padding: 24px; max-width: 900px; margin: 0 auto; }
            .header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 15px; flex-wrap: wrap; }
            .page-title { font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 10px; color: #1f2937; margin: 0; }
            
            .search-box { position: relative; width: 300px; max-width: 100%; }
            .search-input { width: 100%; padding: 10px 10px 10px 40px; border: 1px solid #e5e7eb; border-radius: 8px; outline: none; }
            .search-icon { position: absolute; left: 12px; top: 12px; color: #9ca3af; }

            /* POST CARD */
            .post-card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 20px; overflow: hidden; transition: box-shadow 0.2s; }
            .post-card:hover { box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
            
            .post-header { padding: 20px; display: flex; gap: 15px; }
            .avatar { width: 45px; height: 45px; border-radius: 50%; background: #f3f4f6; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
            .avatar img { width: 100%; height: 100%; object-fit: cover; }
            
            .post-content { flex: 1; }
            .meta-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
            .username { font-weight: 700; color: #111827; }
            .time { font-size: 0.8rem; color: #9ca3af; display: flex; align-items: center; gap: 4px; }
            
            .text-content { color: #374151; line-height: 1.5; font-size: 0.95rem; white-space: pre-wrap; margin-bottom: 10px; }
            .media-indicator { font-size: 0.8rem; color: #2563eb; display: flex; align-items: center; gap: 5px; background: #eff6ff; padding: 5px 10px; border-radius: 6px; width: fit-content; }

            .post-footer { background: #f9fafb; padding: 10px 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
            .comment-toggle { border: none; background: none; font-weight: 600; color: #4b5563; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.9rem; }
            .comment-toggle:hover { color: #2563eb; }

            .action-group { display: flex; gap: 8px; }
            .btn-action { padding: 6px 10px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; display: flex; align-items: center; gap: 5px; font-size: 0.8rem; font-weight: 600; }
            .btn-delete { background: white; color: #ef4444; border-color: #fecaca; }
            .btn-delete:hover { background: #fee2e2; }
            .btn-ban { background: white; color: #4b5563; border-color: #e5e7eb; }
            .btn-ban:hover { background: #f3f4f6; color: #111827; }

            /* DROPDOWN COMMENTS AREA */
            .comments-section { background: #f8fafc; border-top: 1px solid #e5e7eb; padding: 0 20px 20px 20px; animation: slideDown 0.2s ease-out; }
            .comments-header { font-size: 0.8rem; font-weight: 700; color: #64748b; text-transform: uppercase; padding: 15px 0 10px; display: block; border-bottom: 1px dashed #cbd5e1; margin-bottom: 10px; }
            
            .comment-item { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
            .comment-item:last-child { border-bottom: none; }
            .comment-avatar { width: 30px; height: 30px; border-radius: 50%; background: #e2e8f0; overflow: hidden; flex-shrink: 0; }
            .comment-avatar img { width: 100%; height: 100%; object-fit: cover; }
            
            .comment-body { flex: 1; }
            .comment-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
            .comment-user { font-weight: 700; font-size: 0.85rem; color: #334155; }
            .comment-text { font-size: 0.9rem; color: #475569; line-height: 1.4; }
            .comment-actions { display: flex; gap: 5px; }
            .icon-btn { padding: 4px; border: none; background: none; cursor: pointer; color: #94a3b8; border-radius: 4px; }
            .icon-btn:hover { background: #e2e8f0; color: #475569; }
            .icon-btn.danger:hover { background: #fee2e2; color: #ef4444; }

            @keyframes slideDown { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
            
            @media (max-width: 768px) {
                .page-container { padding: 15px; }
                .header-bar { flex-direction: column; align-items: stretch; }
                .search-box { width: 100%; }
            }
        `}</style>

        <div className="page-container">
            <div className="header-bar">
                <h1 className="page-title">
                    <MessageSquare size={28} className="text-blue-600" color="#2563eb"/> Moderation Feed
                </h1>
                <div className="search-box">
                    <Search className="search-icon" size={18}/>
                    <input 
                        type="text" 
                        className="search-input" 
                        placeholder="Search posts or users..." 
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="feed">
                {loading ? (
                    <div style={{textAlign:'center', padding:40, color:'#9ca3af'}}>Loading feed...</div>
                ) : filteredPosts.length === 0 ? (
                    <div style={{textAlign:'center', padding:40, color:'#9ca3af'}}>No posts found.</div>
                ) : (
                    filteredPosts.map(post => (
                        <div key={post.id} className="post-card">
                            {/* MAIN POST CONTENT */}
                            <div className="post-header">
                                <div className="avatar">
                                    {post.userAvatar ? <img src={post.userAvatar} /> : <User size={20} color="#9ca3af"/>}
                                </div>
                                <div className="post-content">
                                    <div className="meta-row">
                                        <span className="username">{post.displayName || post.username || 'Anonymous'}</span>
                                        <span className="time"><Clock size={12}/> {formatDate(post.createdAt)}</span>
                                    </div>
                                    <div className="text-content">
                                        {post.text || <span style={{fontStyle:'italic', color:'#9ca3af'}}>No text content</span>}
                                    </div>
                                    {post.mediaUrl && (
                                        <div className="media-indicator">
                                            <FileText size={14}/> Attachment
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* FOOTER ACTIONS */}
                            <div className="post-footer">
                                <button className="comment-toggle" onClick={() => togglePost(post.id)}>
                                    {expandedPostId === post.id ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
                                    {post.commentCount || 0} Comments
                                </button>

                                <div className="action-group">
                                    <button 
                                        className="btn-action btn-ban"
                                        onClick={() => handleBanUser(post, true)}
                                        disabled={actionLoading === post.id}
                                    >
                                        <Ban size={14}/> Ban
                                    </button>
                                    <button 
                                        className="btn-action btn-delete"
                                        onClick={() => handleDelete(post.id, true)}
                                        disabled={actionLoading === post.id}
                                    >
                                        {actionLoading === post.id ? <Loader2 className="animate-spin" size={14}/> : <Trash2 size={14}/>} Delete
                                    </button>
                                </div>
                            </div>

                            {/* COMMENTS DROPDOWN SECTION */}
                            {expandedPostId === post.id && (
                                <div className="comments-section">
                                    <span className="comments-header">Replies</span>
                                    
                                    {loadingComments ? (
                                        <div style={{padding:10, textAlign:'center', color:'#9ca3af', fontSize:'0.8rem'}}>Loading comments...</div>
                                    ) : (commentsMap[post.id] && commentsMap[post.id].length > 0) ? (
                                        commentsMap[post.id].map(comment => (
                                            <div key={comment.id} className="comment-item">
                                                <div className="comment-avatar">
                                                    {comment.userAvatar ? <img src={comment.userAvatar} /> : <User size={16} color="#9ca3af"/>}
                                                </div>
                                                <div className="comment-body">
                                                    <div className="comment-meta">
                                                        <span className="comment-user">@{comment.username}</span>
                                                        <div className="comment-actions">
                                                            <button 
                                                                className="icon-btn" 
                                                                title="Ban User"
                                                                onClick={() => handleBanUser(comment, false, post.id)}
                                                            >
                                                                <Ban size={14}/>
                                                            </button>
                                                            <button 
                                                                className="icon-btn danger" 
                                                                title="Delete Comment"
                                                                onClick={() => handleDelete(comment.id, false, post.id)}
                                                            >
                                                                <Trash2 size={14}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="comment-text">{comment.text}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{padding:10, textAlign:'center', color:'#9ca3af', fontSize:'0.8rem', fontStyle:'italic'}}>No comments yet.</div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
        </>
    );
}