import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, BookOpen, Target, Trophy, Volume2, RefreshCw, FileText, LogOut, Crown } from "lucide-react";
import { useVocabularyStore } from "../hooks/useVocabularyStore";
import { useAuth } from "../hooks/useAuth";
import { SubscriptionManager } from "@/components/SubscriptionManager";

interface DashboardProps {
  onStartLearning: () => void;
  onStartReview: () => void;
  onViewBoxes: () => void;
  onViewStatistics: () => void;
  onViewLists: () => void;
}

export function Dashboard({ onStartLearning, onStartReview, onViewBoxes, onViewStatistics, onViewLists }: DashboardProps) {
  const { getAppStats, getVocabulariesForReview } = useVocabularyStore();
  const { signOut, subscription } = useAuth();
  const stats = getAppStats();
  const reviewCount = getVocabulariesForReview().length;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex-1" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-success bg-clip-text text-transparent text-center">
              PeakEnglish
            </h1>
            <div className="flex-1 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground text-center">Business Englisch meistern</p>
        </div>

        {/* Today's Progress */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-success/5 border-primary/20">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Heute
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.todayLearned}</div>
              <div className="text-sm text-muted-foreground">Neu gelernt</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{stats.todayReviewed}</div>
              <div className="text-sm text-muted-foreground">Wiederholt</div>
            </div>
          </div>
        </Card>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground leading-tight break-words">Nicht begonnen</span>
            </div>
            <div className="text-lg sm:text-xl font-bold">{stats.notStarted}</div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-2 mb-2">
              <RefreshCw className="h-4 w-4 text-warning flex-shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground leading-tight break-words">In Bearbeitung</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-warning">{stats.inProgress}</div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-2 mb-2">
              <Trophy className="h-4 w-4 text-success flex-shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground leading-tight break-words">Gemeistert</span>
            </div>
            <div className="text-lg sm:text-xl font-bold text-success">{stats.mastered}</div>
          </Card>
          
          <Card className="p-3 sm:p-4">
            <div className="flex items-center gap-1 sm:gap-2 mb-2">
              <Volume2 className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground leading-tight break-words">Gesamt</span>
            </div>
            <div className="text-lg sm:text-xl font-bold">{stats.totalVocabularies}</div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={onStartLearning} 
            className="w-full h-16 text-base sm:text-lg bg-gradient-to-r from-primary to-primary-hover min-h-[4rem]"
            size="lg"
            disabled={stats.notStarted === 0}
          >
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <BookOpen className="h-5 w-5 flex-shrink-0" />
              <span className="break-words text-center leading-tight">
                Neue Vokabeln lernen
              </span>
              {stats.notStarted === 0 && <span className="text-xs opacity-80 break-words">(Alle gelernt!)</span>}
            </div>
          </Button>

          <Button 
            onClick={onStartReview} 
            variant="outline"
            className="w-full h-16 text-base sm:text-lg border-success text-success hover:bg-success/10 min-h-[4rem]"
            size="lg"
            disabled={reviewCount === 0}
          >
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <RefreshCw className="h-5 w-5 flex-shrink-0" />
              <span className="break-words text-center leading-tight">
                Wiederholen ({reviewCount})
              </span>
              {reviewCount === 0 && <span className="text-xs opacity-80 break-words">(Keine fällig)</span>}
            </div>
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={onViewBoxes} 
              variant="outline"
              className="h-14 min-h-[3.5rem] text-sm"
            >
              <div className="flex flex-col items-center gap-1">
                <Target className="h-4 w-4" />
                <span className="text-xs leading-tight break-words text-center">Boxen ansehen</span>
              </div>
            </Button>

            <Button 
              onClick={onViewStatistics} 
              variant="outline"
              className="h-14 min-h-[3.5rem] text-sm"
            >
              <div className="flex flex-col items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                <span className="text-xs leading-tight break-words text-center">Statistiken</span>
              </div>
            </Button>
          </div>
          
          <Button
            onClick={onViewLists}
            variant="outline"
            className="w-full h-14 min-h-[3.5rem] text-sm sm:text-base"
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="h-4 w-4 flex-shrink-0" />
              <span className="break-words text-center leading-tight">Listen verwalten</span>
            </div>
          </Button>
        </div>

        {/* Subscription Manager */}
        <div className="flex justify-center">
          <SubscriptionManager />
        </div>
        {/* Fortschrittsanzeige entfernt */}
      </div>
    </div>
  );
}