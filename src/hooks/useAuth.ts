import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
  cancel_at_period_end?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Alle User haben jetzt automatisch "Premium" - keine echte Subscription mehr
  const [subscription] = useState<SubscriptionData>({ 
    subscribed: true,
    subscription_tier: 'Premium',
    subscription_end: undefined,
    cancel_at_period_end: false
  });
  
  const [subscriptionLoading] = useState(false);
  const [subscriptionChecked] = useState(true);

  useEffect(() => {
    console.log('🚀 Initializing auth...');
    
    // Set up auth state listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, !!session);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
        } else if (event === 'SIGNED_IN') {
          console.log('👋 User signed in - all features available');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('🔍 Checking existing session:', !!session);
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => authSubscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
    }
    return { error };
  };

  // Dummy function für Komponenten die checkSubscription noch aufrufen
  const checkSubscription = async () => {
    console.log('ℹ️ checkSubscription called - all users have premium access');
  };

  return {
    user,
    session,
    loading,
    signOut,
    isAuthenticated: !!user,
    subscription, // Immer subscribed: true
    subscriptionLoading, // Immer false
    subscriptionChecked, // Immer true
    checkSubscription, // Dummy function
  };
}
