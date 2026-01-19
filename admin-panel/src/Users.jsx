import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { Ban, CheckCircle, Copy, Search, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from './firebase';

// Helper to format timestamps
const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
    });
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(usersList);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const toggleBan = async (userId, currentStatus) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { isBanned: !currentStatus });
      setUsers(users.map(u => u.id === userId ? { ...u, isBanned: !currentStatus } : u));
    } catch (error) { alert("Error: " + error.message); }
  };

  const changeRank = async (userId, newRank) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { rank: newRank });
      setUsers(users.map(u => u.id === userId ? { ...u, rank: newRank } : u));
    } catch (error) { alert("Error: " + error.message); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("UID Copied!");
  };

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
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search users (Name, Email, UID)..." 
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-semibold text-gray-600">User Profile</th>
              <th className="p-4 font-semibold text-gray-600">UID</th>
              <th className="p-4 font-semibold text-gray-600">Joined</th>
              <th className="p-4 font-semibold text-gray-600">Last Active</th>
              <th className="p-4 font-semibold text-gray-600">Rank</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-gray-500">Loading users...</td></tr>
            ) : filteredUsers.length === 0 ? (
               <tr><td colSpan="7" className="p-8 text-center text-gray-500">No users found.</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  {/* 1. User Profile */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {user.username ? user.username[0].toUpperCase() : "U"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{user.username || "Unknown"}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* 2. UID (Click to Copy) */}
                  <td className="p-4">
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => copyToClipboard(user.id)} title="Click to copy UID">
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                            {user.id.substring(0, 8)}...
                        </span>
                        <Copy size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>

                  {/* 3. Joined Date */}
                  <td className="p-4 text-sm text-gray-600">
                    {formatDate(user.createdAt)}
                  </td>

                  {/* 4. Last Active Date */}
                  <td className="p-4 text-sm text-gray-600">
                    {formatDate(user.lastActiveAt)}
                  </td>

                  {/* 5. Rank */}
                  <td className="p-4">
                    <select 
                      value={user.rank || "GENIN"} 
                      onChange={(e) => changeRank(user.id, e.target.value)}
                      className="bg-gray-100 border-none text-xs rounded-md px-2 py-1 cursor-pointer font-medium text-gray-700 hover:bg-gray-200 focus:outline-none"
                    >
                      {["GENIN", "CHUNIN", "JONIN", "ANBU", "KAGE"].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>

                  {/* 6. Status */}
                  <td className="p-4">
                    {user.isBanned ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Banned
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </td>

                  {/* 7. Actions */}
                  <td className="p-4">
                    <button 
                      onClick={() => toggleBan(user.id, user.isBanned)}
                      className={`p-2 rounded-lg transition-colors ${
                        user.isBanned 
                        ? "text-green-600 hover:bg-green-50" 
                        : "text-red-500 hover:bg-red-50"
                      }`}
                      title={user.isBanned ? "Unban User" : "Ban User"}
                    >
                      {user.isBanned ? <CheckCircle size={18} /> : <Ban size={18} />}
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