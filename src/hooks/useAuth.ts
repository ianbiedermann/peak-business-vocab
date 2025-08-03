import { useState, useEffect } from 'react';
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

  // Lade Subscription-Status aus localStorage beim Start
  const loadSubscriptionFromStorage = () => {
    try {
      const stored = localStorage.getItem('subscription_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Prüfe ob die Daten nicht zu alt sind (max 1 Stunde)
        if (parsed.timestamp && Date.now() - parsed.timestamp < 3600000) {
          setSubscription(parsed.data);
          console.log('📦 Loaded subscription from storage:', parsed.data);
          return true;
        }
      }
    } catch (error) {
      console.error('Error loading subscription from storage:', error);
    }
    return false;
  };

  // Speichere Subscription-Status in localStorage
  const saveSubscriptionToStorage = (data: SubscriptionData) => {
    try {
      const toStore = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem('subscription_data', JSON.stringify(toStore));
      console.log('💾 Saved subscription to storage:', data);
    } catch (error) {
      console.error('Error saving subscription to storage:', error);
    }
  };

  const checkSubscription = async (forceCheck: boolean = false) => {
    if (!session) {
      console.log('❌ No session available for subscription check');
      return;
    }
    
    // Verhindere mehrfache gleichzeitige Calls
    if (subscriptionLoading && !forceCheck) {
      console.log('⚠️ Subscription check already in progress, skipping...');
      return;
    }

    setSubscriptionLoading(true);
    console.log('🔄 Checking subscription status...');
    
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!error && data) {
        console.log('✅ Subscription check successful:', data);
        setSubscription(data);
        saveSubscriptionToStorage(data);
      } else {
        console.error('❌ Subscription check failed:', error);
        // Bei Fehler, behalte den aktuellen Status
      }
    } catch (error) {
      console.error('❌ Error checking subscription:', error);
      // Bei Fehler, behalte den aktuellen Status
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Initialer Load beim App-Start
  useEffect(() => {
    console.log('🚀 Initializing auth...');
    
    // Lade Subscription aus localStorage als Fallback
    const hasStoredSubscription = loadSubscriptionFromStorage();

    // Set up auth state listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, !!session);
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          // Warte kurz, damit Session vollständig initialisiert ist
          setTimeout(async () => {
            await checkSubscription();
          }, 500);
        } else {
          // User logged out
          setSubscription({ subscribed: false });
          localStorage.removeItem('subscription_data');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('🔍 Checking existing session:', !!session);
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        // Prüfe Subscription Status
        // Falls wir bereits cached data haben, lade trotzdem fresh data im Hintergrund
        if (hasStoredSubscription) {
          // Background refresh
          setTimeout(async () => {
            await checkSubscription();
          }, 1000);
        } else {
          // Sofortige Prüfung wenn keine cached data
          setTimeout(async () => {
            await checkSubscription();
          }, 500);
        }
      }
    });

    return () => authSubscription.unsubscribe();
  }, []);

  // Automatische Überprüfung alle 5 Minuten (nur wenn User eingeloggt ist)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      console.log('🔄 Automatic subscription check...');
      await checkSubscription();
    }, 5 * 60 * 1000); // 5 Minuten

    return () => clearInterval(interval);
  }, [user]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
      setSubscription({ subscribed: false });
      localStorage.removeItem('subscription_data');
    }
    return { error };
  };

  // Erweiterte checkSubscription Funktion für manuelle Aufrufe
  const refreshSubscription = async () => {
    return await checkSubscription(true); // Force check
  };

  return {
    user,
    session,
    loading,
    signOut,
    isAuthenticated: !!user,
    subscription,
    checkSubscription: refreshSubscription, // Verwende die force-version für manuelle Aufrufe
    subscriptionLoading
  };
}
