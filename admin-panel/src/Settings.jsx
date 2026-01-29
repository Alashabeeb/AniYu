import { doc, getDoc, setDoc } from 'firebase/firestore';
import { AlertTriangle, Download, Save, Settings as SettingsIcon, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from './firebase';

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Config State
    const [config, setConfig] = useState({
        maintenanceMode: false,
        enableAds: true,
        minVersion: "1.0.0",
        privacyUrl: "",
        termsUrl: ""
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            // We use a specific document 'global' in 'app_config' collection
            const docRef = doc(db, "app_config", "global");
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                setConfig({ ...config, ...docSnap.data() });
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, "app_config", "global"), config, { merge: true });
            alert("App Settings Updated Successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const toggleSwitch = (key) => {
        setConfig(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (loading) return <div style={{padding:40, textAlign:'center'}}>Loading Configuration...</div>;

    return (
        <>
        <style>{`
            .settings-container { padding: 24px; max-width: 800px; margin: 0 auto; }
            .page-header { margin-bottom: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 20px; }
            .page-title { font-size: 1.8rem; font-weight: 800; color: #1f2937; display: flex; align-items: center; gap: 12px; margin: 0; }
            .page-subtitle { color: #6b7280; margin-top: 5px; font-size: 0.95rem; }

            .section-card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; margin-bottom: 20px; overflow: hidden; }
            .card-header { padding: 20px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 10px; }
            .card-title { font-weight: 700; color: #374151; font-size: 1rem; margin: 0; }
            .card-body { padding: 24px; }

            .control-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
            .control-row:last-child { margin-bottom: 0; }
            .control-info h4 { margin: 0 0 5px 0; font-size: 0.95rem; color: #111827; }
            .control-info p { margin: 0; font-size: 0.85rem; color: #6b7280; }

            .toggle-btn { background: none; border: none; cursor: pointer; padding: 0; color: #d1d5db; transition: color 0.2s; }
            .toggle-btn.on { color: #2563eb; }
            .toggle-btn.danger.on { color: #dc2626; }

            .input-group { margin-bottom: 15px; }
            .input-label { display: block; font-size: 0.85rem; font-weight: 600; color: #374151; margin-bottom: 8px; }
            .text-input { width: 100%; padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.95rem; outline: none; transition: border 0.2s; }
            .text-input:focus { border-color: #2563eb; }

            .save-bar { position: sticky; bottom: 20px; background: #1f2937; color: white; padding: 15px 24px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); animation: slideUp 0.3s ease-out; }
            .btn-save { background: #2563eb; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
            .btn-save:hover { background: #3b82f6; }
            .btn-save:disabled { opacity: 0.7; cursor: not-allowed; }

            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            
            @media (max-width: 640px) {
                .settings-container { padding: 16px; }
                .save-bar { flex-direction: column; gap: 10px; text-align: center; }
                .btn-save { width: 100%; justify-content: center; }
            }
        `}</style>

        <div className="settings-container">
            <div className="page-header">
                <h1 className="page-title"><SettingsIcon size={32} /> Global Settings</h1>
                <p className="page-subtitle">Control application behavior remotely.</p>
            </div>

            {/* CARD 1: APP STATUS */}
            <div className="section-card">
                <div className="card-header">
                    <AlertTriangle size={20} className="text-orange-500" color="#f97316"/>
                    <h3 className="card-title">Emergency Controls</h3>
                </div>
                <div className="card-body">
                    <div className="control-row">
                        <div className="control-info">
                            <h4>Maintenance Mode</h4>
                            <p>If enabled, users will see a "Under Maintenance" screen and cannot access the app.</p>
                        </div>
                        <button className={`toggle-btn danger ${config.maintenanceMode ? 'on' : ''}`} onClick={() => toggleSwitch('maintenanceMode')}>
                            {config.maintenanceMode ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* CARD 2: VERSIONING */}
            <div className="section-card">
                <div className="card-header">
                    <Download size={20} color="#2563eb"/>
                    <h3 className="card-title">App Versioning</h3>
                </div>
                <div className="card-body">
                    <div className="input-group">
                        <label className="input-label">Minimum Required Version</label>
                        <input 
                            type="text" 
                            className="text-input" 
                            placeholder="e.g. 1.0.5" 
                            value={config.minVersion}
                            onChange={(e) => setConfig({...config, minVersion: e.target.value})}
                        />
                        <p style={{fontSize:'0.8rem', color:'#9ca3af', marginTop:5}}>Users with a lower version number will be forced to update.</p>
                    </div>
                </div>
            </div>

            {/* CARD 3: MONETIZATION */}
            <div className="section-card">
                <div className="card-header">
                    <Shield size={20} color="#10b981"/>
                    <h3 className="card-title">Monetization & Legal</h3>
                </div>
                <div className="card-body">
                    <div className="control-row">
                        <div className="control-info">
                            <h4>Enable Ads</h4>
                            <p>Toggle Google AdMob ads globally.</p>
                        </div>
                        <button className={`toggle-btn ${config.enableAds ? 'on' : ''}`} onClick={() => toggleSwitch('enableAds')}>
                            {config.enableAds ? <ToggleRight size={40} /> : <ToggleLeft size={40} />}
                        </button>
                    </div>
                    <div style={{borderTop:'1px solid #f3f4f6', margin:'20px 0'}}></div>
                    <div className="input-group">
                        <label className="input-label">Privacy Policy URL</label>
                        <input type="text" className="text-input" value={config.privacyUrl} onChange={e => setConfig({...config, privacyUrl: e.target.value})} placeholder="https://..." />
                    </div>
                </div>
            </div>

            {/* SAVE BAR */}
            <div className="save-bar">
                <span>You have unsaved changes.</span>
                <button className="btn-save" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving..." : <><Save size={18}/> Save Changes</>}
                </button>
            </div>
        </div>
        </>
    );
}