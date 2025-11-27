import { useState } from 'react';
import { User, LogOut, RefreshCw, Loader2, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { syncLocalToSupabase, SyncProgress } from '@/services/syncService';
import { toast } from '@/hooks/use-toast';

export function ProfileModal() {
  const { user, isAuthenticated, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setLoginError('E-Mail oder Passwort ist falsch.');
        } else if (error.message.includes('Email not confirmed')) {
          setLoginError('Bitte bestätige zuerst deine E-Mail-Adresse.');
        } else {
          setLoginError(error.message);
        }
      } else {
        // Success - clear form
        setEmail('');
        setPassword('');
        toast({
          title: 'Erfolgreich angemeldet',
          description: 'Du bist jetzt eingeloggt.',
        });
      }
    } catch (error) {
      setLoginError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Fehler beim Abmelden',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Abgemeldet',
        description: 'Du wurdest erfolgreich abgemeldet.',
      });
      setIsOpen(false);
    }
  };

  const handleSync = async () => {
    if (!user?.id) return;
    
    setIsSyncing(true);
    setSyncProgress(null);

    try {
      const result = await syncLocalToSupabase(user.id, (progress) => {
        setSyncProgress(progress);
      });

      if (result.success) {
        const totalUploaded = result.listsUploaded + result.vocabulariesUploaded + result.statsUploaded;
        toast({
          title: 'Synchronisation erfolgreich',
          description: `${result.listsUploaded} Listen, ${result.vocabulariesUploaded} Vokabeln und ${result.statsUploaded} Statistiken hochgeladen.`,
        });
      } else {
        toast({
          title: 'Synchronisation teilweise fehlgeschlagen',
          description: result.errors.join('. '),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Synchronisation fehlgeschlagen',
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const getProgressText = () => {
    if (!syncProgress) return 'Vorbereiten...';
    
    const phaseLabels = {
      lists: 'Listen',
      vocabularies: 'Vokabeln',
      stats: 'Statistiken',
    };
    
    return `${phaseLabels[syncProgress.phase]}: ${syncProgress.current}/${syncProgress.total}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <User className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        {isAuthenticated && user ? (
          // Logged in state
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Angemeldet als</h4>
              <p className="text-sm font-medium truncate">{user.email}</p>
            </div>
            
            <div className="space-y-2">
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full"
                variant="default"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {getProgressText()}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Aktualisieren
                  </>
                )}
              </Button>
              
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="w-full"
                disabled={isSyncing}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Abmelden
              </Button>
            </div>
          </div>
        ) : (
          // Not logged in state
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Anmelden</h4>
              <p className="text-sm text-muted-foreground">
                Melde dich an, um deine Daten zu synchronisieren.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">E-Mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="deine@email.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    disabled={isLoggingIn}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm">Passwort</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                    disabled={isLoggingIn}
                  />
                </div>
              </div>
            </div>
            
            {loginError && (
              <p className="text-sm text-destructive">{loginError}</p>
            )}
            
            <Button
              type="submit"
              className="w-full"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Anmelden...
                </>
              ) : (
                'Anmelden'
              )}
            </Button>
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
