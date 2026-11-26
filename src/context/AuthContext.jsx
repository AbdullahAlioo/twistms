import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

const DEMO_SELLER = {
  id: 'demo-seller-101',
  email: 'seller@twistms.com',
  full_name: 'Marcus Vance',
  role: 'seller',
  phone: '+1 (512) 555-0199',
  agency_name: 'TwistMS Elite Advisory',
  current_plan: 'Free',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
};

const DEMO_ADMIN = {
  id: 'admin-101',
  email: 'admin@twistms.com',
  full_name: 'TwistMS Platform Administrator',
  role: 'admin',
  phone: '+1 (512) 555-0100',
  agency_name: 'TwistMS Executive Review Desk',
  current_plan: 'Premium',
  avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
};

const LOCAL_USER_KEY = 'twistms_current_user_v2';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user profile on startup
  useEffect(() => {
    async function initAuth() {
      if (isSupabaseConfigured) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id);
          }
        } catch (err) {
          console.warn('Error loading Supabase session:', err);
        }
      } else {
        // Fallback local user if stored
        try {
          const saved = localStorage.getItem(LOCAL_USER_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            setUser(parsed);
            setProfile(parsed);
          } else {
            // Default to demo seller so user can test the Seller Dashboard immediately
            setUser(DEMO_SELLER);
            setProfile(DEMO_SELLER);
            localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(DEMO_SELLER));
          }
        } catch (e) {
          console.error(e);
        }
      }
      setLoading(false);
    }

    initAuth();

    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      });

      return () => {
        subscription?.unsubscribe();
      };
    }
  }, []);

  async function fetchProfile(userId) {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
      }
    } catch (e) {
      console.warn('Error fetching profile:', e);
    }
  }

  // Sign up new user (Seller or Buyer)
  async function signUp({ email, password, fullName, phone, role = 'seller', plan = 'Free' }) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            role,
            current_plan: plan,
          },
        },
      });
      if (error) {
        if (error.message && error.message.toLowerCase().includes('rate limit')) {
          throw new Error('Supabase email rate limit exceeded. Please disable "Confirm email" in your Supabase Dashboard under Authentication -> Providers -> Email.');
        }
        throw error;
      }
      return data;
    }

    // Local fallback registration
    const newUser = {
      id: `user-${Date.now()}`,
      email,
      full_name: fullName,
      phone: phone || '',
      role,
      agency_name: 'Independent Seller',
      current_plan: plan,
      created_at: new Date().toISOString(),
    };
    setUser(newUser);
    setProfile(newUser);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser));
    return { user: newUser };
  }

  // Sign in existing user
  async function signIn({ email, password }) {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data;
    }

    // Local fallback sign in
    const existing = {
      ...DEMO_SELLER,
      email,
      full_name: email.split('@')[0],
    };
    setUser(existing);
    setProfile(existing);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(existing));
    return { user: existing };
  }

  // Sign out
  async function signOut() {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem(LOCAL_USER_KEY);
  }

  // Instant plan selection without payment gateway
  async function selectPlan(newPlan) {
    if (isSupabaseConfigured && user?.id) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            current_plan: newPlan,
            plan_selected_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) throw error;
        setProfile((prev) => ({ ...prev, current_plan: newPlan }));
        return { success: true };
      } catch (err) {
        console.warn('Failed to update plan in Supabase:', err);
      }
    }

    // Fallback local update
    const updated = {
      ...(profile || user || DEMO_SELLER),
      current_plan: newPlan,
      plan_selected_at: new Date().toISOString(),
    };
    setUser(updated);
    setProfile(updated);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
    return { success: true };
  }

  // Update profile info
  async function updateProfile(updates) {
    if (isSupabaseConfigured && user?.id) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id);
        if (error) throw error;
      } catch (err) {
        console.error(err);
      }
    }

    const updated = { ...(profile || user), ...updates };
    setUser(updated);
    setProfile(updated);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
    return { success: true };
  }

  function loginAsAdmin() {
    setUser(DEMO_ADMIN);
    setProfile(DEMO_ADMIN);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(DEMO_ADMIN));
    return { success: true, user: DEMO_ADMIN };
  }

  function loginAsDemoSeller() {
    setUser(DEMO_SELLER);
    setProfile(DEMO_SELLER);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(DEMO_SELLER));
    return { success: true, user: DEMO_SELLER };
  }

  const isAdmin = Boolean(
    profile?.role === 'admin' ||
    user?.email === 'admin@twistms.com' ||
    user?.id === 'admin-101'
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: profile || user,
        loading,
        currentPlan: profile?.current_plan || user?.current_plan || 'Free',
        isAdmin,
        signUp,
        signIn,
        signOut,
        selectPlan,
        updateProfile,
        loginAsAdmin,
        loginAsDemoSeller,
        isConfigured: isSupabaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
