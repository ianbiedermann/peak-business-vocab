import { Card } from "@/components/ui/card";
import { BarChart3, BookOpen, Target, Trophy, Volume2, RefreshCw, FileText } from "lucide-react";
import { useVocabularyStore } from "../hooks/useVocabularyStore";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { Button } from "@/components/ui/button";

interface DashboardProps {
  onStartLearning: () => void;
  onStartReview: () => void;
  onViewBoxes: () => void;
  onViewStatistics: () => void;
  onViewLists: () => void;
}

export function Dashboard({ onStartLearning, onStartReview, onViewBoxes, onViewStatistics, onViewLists }: DashboardProps) {
  const { getAppStats, getVocabulariesForReview } = useVocabularyStore();
  const stats = getAppStats();
  const reviewCount = getVocabulariesForReview().length;

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
              <ProfileModal />
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
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Nicht begonnen</span>
            </div>
            <div className="text-xl font-bold">{stats.notStarted}</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-4 w-4 text-warning" />
              <span className="text-sm text-muted-foreground">In Bearbeitung</span>
            </div>
            <div className="text-xl font-bold text-warning">{stats.inProgress}</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Gemeistert</span>
            </div>
            <div className="text-xl font-bold text-success">{stats.mastered}</div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Gesamt</span>
            </div>
            <div className="text-xl font-bold">{stats.totalVocabularies}</div>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={onStartLearning} 
            className="w-full h-14 text-lg bg-gradient-to-r from-primary to-primary-hover"
            size="lg"
            disabled={stats.notStarted === 0}
          >
            <BookOpen className="mr-2 h-5 w-5" />
            Neue Vokabeln lernen
            {stats.notStarted === 0 && <span className="ml-2 text-xs">(Alle gelernt!)</span>}
          </Button>

          <Button 
            onClick={onStartReview} 
            variant="outline"
            className="w-full h-14 text-lg border-success text-success hover:bg-success/10"
            size="lg"
            disabled={reviewCount === 0}
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Wiederholen ({reviewCount})
            {reviewCount === 0 && <span className="ml-2 text-xs">(Keine fällig)</span>}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={onViewBoxes} 
              variant="outline"
              className="h-12"
            >
              <Target className="mr-2 h-4 w-4" />
              Boxen ansehen
            </Button>

            <Button 
              onClick={onViewStatistics} 
              variant="outline"
              className="h-12"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Statistiken
            </Button>
          </div>
          
          <Button
            onClick={onViewLists}
            variant="outline"
            className="w-full h-12"
          >
            <FileText className="mr-2 h-4 w-4" />
            Listen verwalten
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