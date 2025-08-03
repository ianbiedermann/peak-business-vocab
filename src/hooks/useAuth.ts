import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionData {
  subscribed: boolean;
  subscription_tier?: string;
  subscription_end?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData>({ subscribed: false });
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);

  // Memoized subscription check function
  const checkSubscription = useCallback(async () => {
    if (!user) {
      console.log('❌ No user available for subscription check');
      return;
    }

    if (subscriptionLoading) {
      console.log('⏳ Subscription check already in progress, skipping...');
      return;
    }
    
    setSubscriptionLoading(true);
    console.log('🔄 Checking subscription status from database...');
    
    try {
      // Abfrage der subscribers-Tabelle mit user_id
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Kein Eintrag gefunden - User ist nicht Premium
          console.log('ℹ️ No subscription found - user is free tier');
          setSubscription({ subscribed: false });
        } else {
          console.error('❌ Database error:', error.message);
          setSubscription({ subscribed: false });
        }
        setSubscriptionChecked(true);
        return;
      }

      if (data) {
        // Prüfe ob Subscription noch aktiv ist
        const now = new Date();
        const endDate = data.subscription_end ? new Date(data.subscription_end) : null;
        
        // Wenn kein end_date gesetzt ist, oder das end_date in der Zukunft liegt
        const isActive = !endDate || endDate > now;

        const subscriptionData: SubscriptionData = {
          subscribed: isActive && (data.subscribed === true), // Prüfe auch das subscribed-Feld
          subscription_tier: data.subscription_tier || 'Premium',
          subscription_end: data.subscription_end
        };

        console.log('✅ Subscription status loaded:', {
          user_id: user.id,
          subscribed: subscriptionData.subscribed,
          tier: subscriptionData.subscription_tier,
          end_date: subscriptionData.subscription_end,
          raw_data: data
        });
        
        setSubscription(subscriptionData);
        setSubscriptionChecked(true);
      } else {
        console.log('ℹ️ No subscription data found');
        setSubscription({ subscribed: false });
        setSubscriptionChecked(true);
      }
    } catch (error) {
      console.error('❌ Error checking subscription:', error);
      // Bei Fehler auf false setzen
      setSubscription({ subscribed: false });
      setSubscriptionChecked(true);
    } finally {
      setSubscriptionLoading(false);
    }
  }, [user, subscriptionLoading]);

  // Nur einmalige Subscription-Prüfung nach Login
  useEffect(() => {
    // Nur prüfen wenn:
    // 1. User ist eingeloggt
    // 2. Subscription wurde noch nicht geprüft
    // 3. Gerade kein Check läuft
    if (user && !subscriptionChecked && !subscriptionLoading) {
      console.log('👤 User available and subscription not checked yet, checking now...');
      // Kleine Verzögerung um andere Auth-Prozesse abzuwarten
      const timeoutId = setTimeout(() => {
        checkSubscription();
      }, 1500);

      return () => clearTimeout(timeoutId);
    }
  }, [user, subscriptionChecked, subscriptionLoading, checkSubscription]);

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
          // User logged out - reset everything
          console.log('👋 User signed out');
          setSubscription({ subscribed: false });
          setSubscriptionChecked(false);
          setSubscriptionLoading(false);
        } else if (event === 'SIGNED_IN') {
          // User signed in - reset subscription state
          console.log('👋 User signed in - resetting subscription state');
          setSubscriptionChecked(false);
          setSubscriptionLoading(false);
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
  }, []); // Läuft nur einmal beim Mount

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setSubscription({ subscribed: false });
      setSubscriptionChecked(false);
      setSubscriptionLoading(false);
    }
    return { error };
  };


  return {
    user,
    session,
    loading,
    signOut,
    isAuthenticated: !!user,
    subscription,
    subscriptionLoading,
    subscriptionChecked,
  };
}
