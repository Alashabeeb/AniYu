import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { Ban, CheckCircle, Search, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from './firebase';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch Users from Firebase
  useEffect(() => {
    fetchUsers();
  }, []);

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

  // 2. Ban / Unban Logic
  const toggleBan = async (userId, currentStatus) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        isBanned: !currentStatus // Toggle true/false
      });
      // Refresh list locally
      setUsers(users.map(user => 
        user.id === userId ? { ...user, isBanned: !currentStatus } : user
      ));
    } catch (error) {
      alert("Error updating user: " + error.message);
    }
  };

  // 3. Change Rank Logic
  const changeRank = async (userId, newRank) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { rank: newRank });
      setUsers(users.map(user => 
        user.id === userId ? { ...user, rank: newRank } : user
      ));
    } catch (error) {
      alert("Error changing rank: " + error.message);
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
            placeholder="Search users..." 
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 font-semibold text-gray-600">User</th>
              <th className="p-4 font-semibold text-gray-600">Rank</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="p-8 text-center text-gray-500">Loading users...</td></tr>
            ) : filteredUsers.length === 0 ? (
               <tr><td colSpan="4" className="p-8 text-center text-gray-500">No users found.</td></tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {user.username ? user.username[0].toUpperCase() : "U"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{user.username || "Unknown"}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <select 
                      value={user.rank || "GENIN"} 
                      onChange={(e) => changeRank(user.id, e.target.value)}
                      className="bg-gray-100 border-none text-sm rounded-md px-2 py-1 cursor-pointer font-medium text-gray-700 hover:bg-gray-200"
                    >
                      {["GENIN", "CHUNIN", "JONIN", "ANBU", "KAGE"].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
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
                      {user.isBanned ? <CheckCircle size={20} /> : <Ban size={20} />}
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