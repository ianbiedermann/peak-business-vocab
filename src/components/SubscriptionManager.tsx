import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Crown, Settings } from 'lucide-react';

export function SubscriptionManager() {
  const { subscription, session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);

  const handleSubscribe = async () => {
    if (!session) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: "Error",
        description: "Failed to create checkout session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!session) {
      toast({
        title: "Fehler",
        description: "Keine aktive Session gefunden. Bitte logge dich erneut ein.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    console.log('🚀 Starting customer portal request...');
    console.log('Session token available:', !!session.access_token);
    console.log('User email:', session.user?.email);
    
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log('📨 Response from customer-portal:', { data, error });

      if (error) {
        console.error('❌ Supabase function error:', error);
        
        if (error.message?.includes('No Stripe customer found')) {
          toast({
            title: "Kein Stripe-Kunde gefunden",
            description: "Du hast noch kein Premium-Abo abgeschlossen. Bitte abonniere zuerst Premium.",
            variant: "destructive",
          });
        } else if (error.message?.includes('Customer portal is not enabled')) {
          toast({
            title: "Customer Portal nicht aktiviert",
            description: "Das Stripe Customer Portal ist nicht konfiguriert. Kontaktiere den Support.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Fehler",
            description: `Fehler beim Öffnen des Kundenportals: ${error.message}`,
            variant: "destructive",
          });
        }
        return;
      }
      
      if (!data?.url) {
        console.error('❌ No URL in response:', data);
        toast({
          title: "Fehler",
          description: "Keine Portal-URL vom Server erhalten.",
          variant: "destructive",
        });
        return;
      }

      // NEW: Store subscription status if available
      if (data.subscription) {
        setSubscriptionStatus(data.subscription);
        console.log('📊 Subscription status:', data.subscription);
      }
      
      console.log('✅ Opening customer portal:', data.url);
      window.open(data.url, '_blank');
      
      toast({
        title: "Erfolgreich",
        description: "Kundenportal wurde geöffnet!",
      });
      
    } catch (error) {
      console.error('💥 Unexpected error:', error);
      
      toast({
        title: "Unerwarteter Fehler",
        description: `Ein unerwarteter Fehler ist aufgetreten: ${error.message || 'Unbekannter Fehler'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Subscription Status
        </CardTitle>
        <CardDescription>
          {subscription.subscribed 
            ? "Monatliches Premium-Abo - jederzeit kündbar" 
            : "Upgrade zu Premium für alle Features"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Status:</span>
          <Badge variant={subscription.subscribed ? "default" : "secondary"}>
            {subscription.subscribed ? "Premium" : "Free"}
          </Badge>
        </div>
        
        {subscription.subscription_end && (
          <div className="flex items-center justify-between">
            <span>
              {subscription.cancel_at_period_end 
                ? "Läuft aus am:" 
                : "Verlängert sich am:"
              }
            </span>
            <div className="text-right">
              <span className="text-sm text-muted-foreground">
                {new Date(subscription.subscription_end).toLocaleDateString('de-DE')}
              </span>
              {subscription.cancel_at_period_end && (
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Abo gekündigt
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {!subscription.subscribed ? (
            <Button 
              onClick={handleSubscribe} 
              disabled={loading}
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Subscribe to Premium
            </Button>
          ) : (
            <>
              <Button 
                onClick={handleManageSubscription} 
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Settings className="h-4 w-4 mr-2" />
                Abo verwalten & kündigen
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Bei Kündigung bleibt Premium bis zum Monatsende aktiv
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
