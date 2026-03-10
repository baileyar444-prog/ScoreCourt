import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let isFetchingProfile = false; 

    // THE MASTER ESCAPE HATCH: Never let the app stay blank for more than 2 seconds
    const fallbackTimer = setTimeout(() => {
      if (isMounted && loading) {
        console.warn("Auth check timed out. Forcing load.");
        setLoading(false);
      }
    }, 2000);

    const loadProfile = async (userId) => {
      if (isFetchingProfile) return;
      isFetchingProfile = true;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
          
        if (!error && data && isMounted) {
          setProfile(data);
        } else if (isMounted) {
          setProfile({ is_pro: false, full_name: null });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        if (isMounted) setProfile({ is_pro: false, full_name: null });
      } finally {
        isFetchingProfile = false;
        if (isMounted) {
          setLoading(false);
          clearTimeout(fallbackTimer);
        }
      }
    };

    // 1. Initial Page Load Check
    // We check the session once when the app boots up
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      
      if (error) {
        console.error("Session error:", error);
        setLoading(false);
        clearTimeout(fallbackTimer);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // If they are logged in, fetch the profile BEFORE turning off the loading screen
        loadProfile(session.user.id);
      } else {
        // Not logged in? Show the app immediately.
        setLoading(false);
        clearTimeout(fallbackTimer);
      }
    });

    // 2. Active Session Listener
    // This watches for login/logout button clicks while the app is already running
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;
      
      // We ignore the 'INITIAL_SESSION' event so it doesn't race against our getSession() check above!
      if (event === 'INITIAL_SESSION') return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        loadProfile(currentSession.user.id);
      } else {
        setProfile(null);
        setLoading(false);
        clearTimeout(fallbackTimer);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      subscription?.unsubscribe();
    };
  }, []); // Only run once on mount

  const value = {
    session,
    user,
    profile,
    loading,
    signOut: () => {
      // Fire the logout request but don't wait for it
      supabase.auth.signOut().catch(console.error);
      
      // Obliterate all Supabase tokens from local memory instantly
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Wipe the React state
      setSession(null);
      setUser(null);
      setProfile(null);
      
      // Hard redirect to clear everything out
      window.location.replace("/");
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};