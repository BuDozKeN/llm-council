import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authEvent, setAuthEvent] = useState(null); // Track auth events like PASSWORD_RECOVERY
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false); // Persist password reset state

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Get initial session (this also processes any tokens in the URL hash)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes - this handles magic links, password recovery, etc.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      setUser(session?.user ?? null);
      setAuthEvent(event);

      // If we get a PASSWORD_RECOVERY event, set the flag (persists until password is updated)
      if (event === 'PASSWORD_RECOVERY') {
        setNeedsPasswordReset(true);
      }

      // Clear the URL hash after processing auth tokens
      if (window.location.hash && (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')) {
        // Use replaceState to remove hash without triggering a reload
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  const signIn = async (email, password) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
  };

  const updatePassword = async (newPassword) => {
    if (!supabase) throw new Error('Supabase not configured');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    // Clear the password reset flag after successful update
    setNeedsPasswordReset(false);
  };

  const value = {
    user,
    loading,
    authEvent,
    needsPasswordReset,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
