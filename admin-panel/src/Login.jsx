import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Lock, Mail, ShieldCheck } from "lucide-react"; // ✅ Added ShieldCheck for logo
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Attempt to sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Check the User's Role in Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role || 'user';

        // 3. ⛔ SECURITY CHECK: Allowed Roles List
        const allowedRoles = ['admin', 'super_admin', 'anime_producer', 'manga_producer'];

        if (allowedRoles.includes(role)) {
          // ✅ Role is allowed -> Go to Dashboard
          navigate("/");
        } else {
          // ❌ Role is NOT allowed (e.g. regular "user") -> Kick them out
          await signOut(auth);
          setError("⛔ Access Denied: This area is for Staff and Producers only.");
        }
      } else {
        // Edge case: User exists in Auth but has no Firestore profile
        await signOut(auth);
        setError("Error: User profile not found.");
      }

    } catch (err) {
      console.error(err);
      // Friendly error messages
      if (err.code === 'auth/invalid-credential') {
        setError("Incorrect email or password.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    {/* ✅ Internal CSS: Guarantees styling works without Tailwind */}
    <style>{`
      .login-wrapper {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #f3f4f6;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .login-card {
        background: white;
        width: 100%;
        max-width: 400px;
        padding: 40px;
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        border: 1px solid #e5e7eb;
      }
      .brand-section { text-align: center; margin-bottom: 30px; }
      .brand-title { font-size: 1.8rem; font-weight: 900; color: #2563eb; margin: 0; letter-spacing: -1px; }
      .brand-sub { color: #6b7280; font-size: 0.85rem; margin-top: 5px; font-weight: 500; }
      
      .error-alert {
        background: #fef2f2;
        color: #dc2626;
        padding: 12px;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 600;
        text-align: center;
        margin-bottom: 20px;
        border: 1px solid #fecaca;
      }

      .input-group { margin-bottom: 20px; }
      .label { display: block; font-size: 0.85rem; font-weight: 700; color: #374151; margin-bottom: 6px; }
      .input-wrapper { position: relative; }
      .input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
      
      .form-input {
        width: 100%;
        padding: 12px 12px 12px 40px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 1rem;
        outline: none;
        transition: all 0.2s;
        box-sizing: border-box;
      }
      .form-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }

      .btn-submit {
        width: 100%;
        background-color: #2563eb;
        color: white;
        padding: 14px;
        border: none;
        border-radius: 8px;
        font-weight: 700;
        font-size: 1rem;
        cursor: pointer;
        transition: background-color 0.2s;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 10px;
      }
      .btn-submit:hover { background-color: #1d4ed8; }
      .btn-submit:disabled { background-color: #93c5fd; cursor: not-allowed; }

      .spinner {
        width: 20px; height: 20px;
        border: 2px solid #ffffff;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      .footer { margin-top: 25px; text-align: center; font-size: 0.75rem; color: #9ca3af; }
    `}</style>

    <div className="login-wrapper">
      <div className="login-card">
        
        {/* Header */}
        <div className="brand-section">
          <div style={{display:'flex', justifyContent:'center', marginBottom: 15}}>
            <div style={{background: '#eff6ff', padding: 12, borderRadius: '50%', color: '#2563eb'}}>
               <ShieldCheck size={32} />
            </div>
          </div>
          <h1 className="brand-title">AniYu Panel</h1>
          <p className="brand-sub">Authorized Personnel Only</p>
        </div>

        {/* Error Alert */}
        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleLogin}>
          
          {/* Email Input */}
          <div className="input-group">
            <label className="label">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                type="email"
                required
                className="form-input"
                placeholder="email@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="input-group">
            <label className="label">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? <div className="spinner"></div> : "Sign In to Dashboard"}
          </button>

        </form>

        <div className="footer">
          &copy; {new Date().getFullYear()} AniYu Admin System
        </div>
      </div>
    </div>
    </>
  );
}