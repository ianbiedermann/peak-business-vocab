import { useState, useEffect, useCallback } from 'react';
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
  const [subscription, setSubscription] = useState<SubscriptionData>({ subscribed: false });
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false);

  // Memoized subscription check function - JETZT MIT STRIPE CHECK!
  const checkSubscription = useCallback(async () => {
    if (!user || !session) {
      console.log('❌ No user/session available for subscription check');
      return;
    }

    if (subscriptionLoading) {
      console.log('⏳ Subscription check already in progress, skipping...');
      return;
    }
    
    setSubscriptionLoading(true);
    console.log('🔄 Checking subscription status from Stripe...');
    
    try {
      // ERST: Stripe via check-subscription Edge Function prüfen
      // Hole den aktuellen Access Token direkt von Supabase
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData?.session?.access_token) {
          console.error('❌ Kein gültiger Access Token verfügbar:', sessionError?.message);
          await checkDatabaseOnly(); // Fallback
          return;
        }
        
        const accessToken = sessionData.session.access_token;
        
        // Jetzt mit frischem Token die Edge Function aufrufen
        const { data: stripeData, error: stripeError } = await supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });


      if (stripeError) {
        console.error('❌ Stripe check error:', stripeError.message);
        // Fallback: Supabase-Datenbank prüfen
        await checkDatabaseOnly();
        return;
      }

      if (stripeData) {
        const subscriptionData: SubscriptionData = {
          subscribed: stripeData.subscribed || false,
          subscription_tier: stripeData.subscription_tier,
          subscription_end: stripeData.subscription_end,
          cancel_at_period_end: stripeData.cancel_at_period_end
        };

        console.log('✅ Subscription status from Stripe:', {
          user_id: user.id,
          email: user.email,
          subscribed: subscriptionData.subscribed,
          tier: subscriptionData.subscription_tier,
          end_date: subscriptionData.subscription_end
        });
        
        setSubscription(subscriptionData);
        setSubscriptionChecked(true);
      } else {
        console.log('ℹ️ No subscription data from Stripe');
        setSubscription({ subscribed: false });
        setSubscriptionChecked(true);
      }
    } catch (error) {
      console.error('❌ Error checking subscription from Stripe:', error);
      // Fallback: Nur Datenbank prüfen
      await checkDatabaseOnly();
    } finally {
      setSubscriptionLoading(false);
    }
  }, [user, session, subscriptionLoading]);

  // Fallback: Nur Supabase-Datenbank prüfen
  const checkDatabaseOnly = async () => {
    if (!user) return;
    
    console.log('🔄 Fallback: Checking subscription from database only...');
    
    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
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
        const now = new Date();
        const endDate = data.subscription_end ? new Date(data.subscription_end) : null;
        const isActive = !endDate || endDate > now;

        const subscriptionData: SubscriptionData = {
          subscribed: isActive && (data.subscribed === true),
          subscription_tier: data.subscription_tier || 'Premium',
          subscription_end: data.subscription_end
        };

        console.log('✅ Subscription status from database:', subscriptionData);
        setSubscription(subscriptionData);
        setSubscriptionChecked(true);
      } else {
        console.log('ℹ️ No subscription data found');
        setSubscription({ subscribed: false });
        setSubscriptionChecked(true);
      }
    } catch (error) {
      console.error('❌ Error checking subscription from database:', error);
      setSubscription({ subscribed: false });
      setSubscriptionChecked(true);
    }
  };

  // Nur einmalige Subscription-Prüfung nach Login
  useEffect(() => {
    if (user && session && !subscriptionChecked && !subscriptionLoading) {
      console.log('👤 User available and subscription not checked yet, checking now...');
      // Kleine Verzögerung um andere Auth-Prozesse abzuwarten
      const timeoutId = setTimeout(() => {
        checkSubscription();
      }, 1500);

      return () => clearTimeout(timeoutId);
    }
  }, [user, session, subscriptionChecked, subscriptionLoading, checkSubscription]);

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
          setSubscription({ subscribed: false });
          setSubscriptionChecked(false);
          setSubscriptionLoading(false);
        } else if (event === 'SIGNED_IN') {
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
  }, []);

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
    checkSubscription, // Exportiere die Function für manuellen Refresh
  };
}
