import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Trophy, BookOpen } from "lucide-react";
import { useVocabularyStore } from "../hooks/useVocabularyStore";
import { BOX_INTERVALS } from "../types/vocabulary";

interface BoxViewProps {
  onBack: () => void;
}

export function BoxView({ onBack }: BoxViewProps) {
  const { getVocabulariesByBox } = useVocabularyStore();

  const formatTimeUntilReview = (nextReview: Date | undefined) => {
    if (!nextReview) return "Bereit zur Wiederholung";
    
    const now = new Date();
    const diff = nextReview.getTime() - now.getTime();
    
    if (diff <= 0) return "Bereit zur Wiederholung";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `in ${days} Tag${days > 1 ? 'en' : ''}`;
    } else {
      return `in ${hours} Stunde${hours > 1 ? 'n' : ''}`;
    }
  };

  const getBoxInfo = (boxNumber: number) => {
    const vocabularies = getVocabulariesByBox(boxNumber);
    
    switch (boxNumber) {
      case 0:
        return {
          title: "Nicht begonnen",
          description: "Vokabeln, die noch nicht gelernt wurden",
          color: "text-muted-foreground",
          bgColor: "bg-muted/20",
          icon: BookOpen
        };
      case 1:
        return {
          title: "Box 1 (24h)",
          description: "Nach 24 Stunden wiederholbar",
          color: "text-primary",
          bgColor: "bg-primary/10",
          icon: Clock
        };
      case 2:
        return {
          title: "Box 2 (48h)",
          description: "Nach 48 Stunden wiederholbar",
          color: "text-primary",
          bgColor: "bg-primary/15",
          icon: Clock
        };
      case 3:
        return {
          title: "Box 3 (96h)",
          description: "Nach 96 Stunden wiederholbar",
          color: "text-primary",
          bgColor: "bg-primary/20",
          icon: Clock
        };
      case 4:
        return {
          title: "Box 4 (192h)",
          description: "Nach 192 Stunden wiederholbar",
          color: "text-warning",
          bgColor: "bg-warning/10",
          icon: Clock
        };
      case 5:
        return {
          title: "Box 5 (384h)",
          description: "Nach 384 Stunden wiederholbar",
          color: "text-warning",
          bgColor: "bg-warning/15",
          icon: Clock
        };
      case 6:
        return {
          title: "Gemeistert",
          description: "Erfolgreich gelernte Vokabeln",
          color: "text-success",
          bgColor: "bg-success/10",
          icon: Trophy
        };
      default:
        return {
          title: `Box ${boxNumber}`,
          description: "",
          color: "text-foreground",
          bgColor: "bg-background",
          icon: BookOpen
        };
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Vokabel-Boxen</h1>
        </div>

        {/* Boxes */}
        <div className="space-y-4">
          {[0, 1, 2, 3, 4, 5, 6].map(boxNumber => {
            const vocabularies = getVocabulariesByBox(boxNumber);
            const info = getBoxInfo(boxNumber);
            const Icon = info.icon;

            return (
              <Card key={boxNumber} className={`p-6 ${info.bgColor}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className={`h-6 w-6 ${info.color} mt-1`} />
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className={`font-semibold ${info.color}`}>
                          {info.title}
                        </h3>
                        <span className={`text-xl font-bold ${info.color}`}>
                          {vocabularies.length}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {info.description}
                      </p>
                      
                      {vocabularies.length > 0 && boxNumber >= 1 && boxNumber <= 5 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Nächste Wiederholung:
                          </p>
                          <div className="space-y-1">
                            {vocabularies.slice(0, 3).map((vocab, index) => (
                              <div key={vocab.id} className="text-xs">
                                <span className="font-medium">{vocab.english}</span>
                                <span className="text-muted-foreground ml-2">
                                  {formatTimeUntilReview(vocab.nextReview)}
                                </span>
                              </div>
                            ))}
                            {vocabularies.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{vocabularies.length - 3} weitere...
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {vocabularies.length > 0 && boxNumber === 6 && (
                        <div className="space-y-1">
                          {vocabularies.slice(0, 3).map((vocab, index) => (
                            <div key={vocab.id} className="text-xs">
                              <span className="font-medium">{vocab.english}</span>
                              <span className="text-muted-foreground ml-2">
                                → {vocab.german}
                              </span>
                            </div>
                          ))}
                          {vocabularies.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{vocabularies.length - 3} weitere...
                            </div>
                          )}
                        </div>
                      )}

                      {vocabularies.length > 0 && boxNumber === 0 && (
                        <div className="space-y-1">
                          {vocabularies.slice(0, 3).map((vocab, index) => (
                            <div key={vocab.id} className="text-xs">
                              <span className="font-medium">{vocab.english}</span>
                              <span className="text-muted-foreground ml-2">
                                → {vocab.german}
                              </span>
                            </div>
                          ))}
                          {vocabularies.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{vocabularies.length - 3} weitere...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Legend */}
        <Card className="p-4 bg-muted/30">
          <h3 className="font-medium mb-2">Spaced Repetition System</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Neue Vokabeln starten in Box 0</p>
            <p>• Nach dem Lernen → Box 1 (24h Wartezeit)</p>
            <p>• Bei korrekter Wiederholung → nächste Box</p>
            <p>• Bei Fehlern → zurück zu Box 1</p>
            <p>• Box 6 = dauerhaft gelernt</p>
          </div>
        </Card>
      </div>
    </div>
  );
}