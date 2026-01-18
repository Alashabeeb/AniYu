import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

// 1. THE DICTIONARY
const TRANSLATIONS: any = {
    'English': {
        // TABS
        tabHome: "Home", tabCommunity: "Community", tabManga: "Manga", tabProfile: "Profile",
        
        // HOME SCREEN
        trending: "Trending Now", recommended: "Recommended for You", favorites: "My Favorites ❤️",
        searchAnime: "Search anime...", noResults: "No results found.",

        // FEED SCREEN
        all: "All", trendingTab: "Trending", people: "People", posts: "Posts",
        searchPeople: "Search people...", searchPosts: "Search posts...",
        newPost: "New Post", notifications: "Notifications",

        // PROFILE SCREEN
        editProfile: "Edit Profile", following: "Following", followers: "Followers",
        watched: "Watched", logOut: "Log Out", bioEmpty: "No bio yet.",
        
        // SETTINGS SCREEN
        settings: "Settings",
        membership: "MEMBERSHIP", subscription: "Subscription", email: "Email", changePass: "Change Password",
        appExp: "APP EXPERIENCE", streamCell: "Stream on Cellular", darkMode: "Dark Mode", quality: "Video Quality",
        langHeader: "LANGUAGE", appLang: "App Language", audioLang: "Audio Language", subtitles: "Subtitles",
        data: "DATA & STORAGE", notifs: "Pop-up Notifications", downloads: "Manage Downloads", clearHist: "Clear Watch History",
        privacy: "PRIVACY & SAFETY", restriction: "Content Restriction", blocked: "Blocked Users", delete: "Delete My Account",
        manage: "Manage", free: "Free Plan",
        
        // COMMON
        cancel: "Cancel", save: "Save", error: "Error", success: "Success",
        deleteConfirm: "Are you sure?", deleteForever: "Delete Forever"
    },
    'Spanish': {
        tabHome: "Inicio", tabCommunity: "Comunidad", tabManga: "Manga", tabProfile: "Perfil",
        trending: "Tendencias", recommended: "Recomendados", favorites: "Mis Favoritos ❤️",
        searchAnime: "Buscar anime...", noResults: "Sin resultados.",
        all: "Todo", trendingTab: "Tendencias", people: "Personas", posts: "Publicaciones",
        searchPeople: "Buscar personas...", searchPosts: "Buscar posts...",
        newPost: "Nuevo Post", notifications: "Notificaciones",
        editProfile: "Editar Perfil", following: "Siguiendo", followers: "Seguidores",
        watched: "Visto", logOut: "Cerrar Sesión", bioEmpty: "Sin biografía.",
        settings: "Configuración",
        membership: "MEMBRESÍA", subscription: "Suscripción", email: "Correo", changePass: "Cambiar Contraseña",
        appExp: "EXPERIENCIA", streamCell: "Datos Móviles", darkMode: "Modo Oscuro", quality: "Calidad Video",
        langHeader: "IDIOMA", appLang: "Idioma App", audioLang: "Audio", subtitles: "Subtítulos",
        data: "DATOS", notifs: "Notificaciones", downloads: "Descargas", clearHist: "Borrar Historial",
        privacy: "PRIVACIDAD", restriction: "Restricción", blocked: "Bloqueados", delete: "Eliminar Cuenta",
        manage: "Gestionar", free: "Plan Gratuito",
        cancel: "Cancelar", save: "Guardar", error: "Error", success: "Éxito",
        deleteConfirm: "¿Estás seguro?", deleteForever: "Eliminar"
    },
    'French': {
        tabHome: "Accueil", tabCommunity: "Communauté", tabManga: "Manga", tabProfile: "Profil",
        trending: "Tendances", recommended: "Recommandé", favorites: "Favoris ❤️",
        searchAnime: "Chercher anime...", noResults: "Aucun résultat.",
        all: "Tout", trendingTab: "Tendances", people: "Personnes", posts: "Posts",
        searchPeople: "Chercher personnes...", searchPosts: "Chercher posts...",
        newPost: "Nouveau Post", notifications: "Notifications",
        editProfile: "Modifier Profil", following: "Abonnements", followers: "Abonnés",
        watched: "Vu", logOut: "Déconnexion", bioEmpty: "Pas de bio.",
        settings: "Paramètres",
        membership: "ABONNEMENT", subscription: "Forfait", email: "E-mail", changePass: "Mot de Passe",
        appExp: "EXPÉRIENCE", streamCell: "Streaming Cellulaire", darkMode: "Mode Sombre", quality: "Qualité Vidéo",
        langHeader: "LANGUE", appLang: "Langue App", audioLang: "Audio", subtitles: "Sous-titres",
        data: "DONNÉES", notifs: "Notifications", downloads: "Téléchargements", clearHist: "Effacer Historique",
        privacy: "CONFIDENTIALITÉ", restriction: "Restriction", blocked: "Bloqués", delete: "Supprimer Compte",
        manage: "Gérer", free: "Gratuit",
        cancel: "Annuler", save: "Enregistrer", error: "Erreur", success: "Succès",
        deleteConfirm: "Êtes-vous sûr?", deleteForever: "Supprimer"
    }
};

const LanguageContext = createContext({
    language: 'English',
    setLanguage: (lang: string) => {},
    t: (key: string) => key, 
});

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
    const [language, setLanguageState] = useState('English');

    useEffect(() => {
        loadLanguage();
    }, []);

    const loadLanguage = async () => {
        const stored = await AsyncStorage.getItem('appLanguage');
        if (stored) setLanguageState(stored);
    };

    const setLanguage = async (lang: string) => {
        setLanguageState(lang);
        await AsyncStorage.setItem('appLanguage', lang);
    };

    // The Magic Translator Function
    const t = (key: string) => {
        const dict = TRANSLATIONS[language] || TRANSLATIONS['English'];
        return dict[key] || TRANSLATIONS['English'][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);