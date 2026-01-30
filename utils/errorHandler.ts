export const getFriendlyErrorMessage = (error: any): string => {
    const message = error.message || error.toString();
    const code = error.code;

    // 1. Network & Connection
    if (message.includes('network-request-failed') || code === 'auth/network-request-failed') {
        return "Please check your internet connection and try again.";
    }
    if (code === 'unavailable') {
        return "Our servers are currently busy. Please try again later.";
    }

    // 2. Authentication (Login/Register)
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        return "Incorrect email or password.";
    }
    if (code === 'auth/email-already-in-use') {
        return "This email is already registered. Try logging in instead.";
    }
    if (code === 'auth/weak-password') {
        return "Password should be at least 6 characters.";
    }
    if (code === 'auth/too-many-requests') {
        return "Too many failed attempts. Access temporarily locked. Try again later.";
    }
    if (code === 'auth/requires-recent-login') {
        return "For security, please log out and log back in to perform this action.";
    }

    // 3. Permissions & Rules
    if (message.includes('permission-denied') || code === 'permission-denied') {
        return "⛔ You do not have permission to do this.";
    }

    // 4. Default Fallback (Clean up raw Firebase text)
    // Removes "Firebase: " prefix if it exists
    return message.replace("Firebase: ", "").replace("Error (", "").replace(").", "");
};