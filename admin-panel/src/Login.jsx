import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ArrowRight, Lock, User } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from './firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Fetch User Role
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role;

        // ✅ ALLOWED ROLES LIST
        const allowedRoles = ['admin', 'super_admin', 'anime_producer', 'manga_producer'];

        if (allowedRoles.includes(role)) {
          navigate('/'); // Success
        } else {
          await auth.signOut();
          throw new Error("Access Denied: You do not have staff privileges.");
        }
      } else {
        await auth.signOut();
        throw new Error("User profile not found.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Invalid credentials.");
      await auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f3f4f6' }}>
      <div className="card" style={{ width: '100%', maxWidth: '450px', margin: '20px', padding: 0 }}>
        
        <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', padding: '40px', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', backdropFilter: 'blur(10px)' }}>
            <Lock size={36} color="white" />
          </div>
          <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>AniYu Admin</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: '10px 0 0 0', fontWeight: 500 }}>Secure Access Portal</p>
        </div>

        <div className="card-body" style={{ padding: '40px' }}>
          {error && (
            <div style={{ background: '#fef2f2', color: '#dc2626', padding: '15px', borderRadius: '12px', marginBottom: '25px', fontSize: '0.9rem', fontWeight: 600, border: '1px solid #fecaca', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <span className="form-label" style={{ color: '#4b5563' }}>Email Address</span>
              <div style={{ position: 'relative' }}>
                <User size={20} style={{ position: 'absolute', top: 18, left: 15, color: '#9ca3af' }} />
                <input 
                  type="email" 
                  className="input-field" 
                  style={{ paddingLeft: 45 }}
                  placeholder="staff@aniyu.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 30 }}>
              <span className="form-label" style={{ color: '#4b5563' }}>Password</span>
              <div style={{ position: 'relative' }}>
                <Lock size={20} style={{ position: 'absolute', top: 18, left: 15, color: '#9ca3af' }} />
                <input 
                  type="password" 
                  className="input-field" 
                  style={{ paddingLeft: 45 }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-publish" disabled={loading} style={{ fontSize: '1rem', padding: '18px' }}>
              {loading ? "Verifying..." : <>Login to Dashboard <ArrowRight size={20} /></>}
            </button>
          </form>
        </div>
        
        <div style={{ background: '#f9fafb', padding: '20px', textAlign: 'center', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>Protected System • Authorized Personnel Only</p>
        </div>
      </div>
    </div>
  );
}