import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Crown, Settings } from 'lucide-react';

export function SubscriptionManager() {
  const { subscription, session, checkSubscription } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

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
      
      // Open Stripe checkout in a new tab
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
    if (!session) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      
      // Open customer portal in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open customer portal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSubscription = async () => {
    setLoading(true);
    try {
      await checkSubscription();
      toast({
        title: "Success",
        description: "Subscription status refreshed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh subscription status.",
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
          Manage your premium subscription
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
            <span>Expires:</span>
            <span className="text-sm text-muted-foreground">
              {new Date(subscription.subscription_end).toLocaleDateString()}
            </span>
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
            <Button 
              onClick={handleManageSubscription} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Settings className="h-4 w-4 mr-2" />
              Manage Subscription
            </Button>
          )}
          
          <Button 
            onClick={handleRefreshSubscription} 
            disabled={loading}
            variant="ghost"
            size="sm"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Refresh Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}