import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Calendar } from 'lucide-react';

export function SubscriptionManager() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Premium Features
        </CardTitle>
        <CardDescription>
          Premium-Funktionen kommen bald!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Status:</span>
          <Badge variant="default">
            Kostenlos für alle
          </Badge>
        </div>
        
        <div className="flex flex-col items-center gap-3 py-6">
          <Calendar className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <h3 className="font-semibold text-lg">Coming Soon</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Premium-Features sind in Entwicklung.<br />
              Derzeit sind alle Funktionen kostenlos verfügbar!
            </p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-center text-muted-foreground">
            🎉 Nutze alle Features kostenlos, solange sie verfügbar sind!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
