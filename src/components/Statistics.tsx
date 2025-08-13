import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, TrendingUp, Calendar } from "lucide-react";
import { useVocabularyStore } from "../hooks/useVocabularyStore";
import { format, subDays, subMonths, subYears, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';

interface StatisticsProps {
  onBack: () => void;
}

type TimeRange = '7days' | '1month' | '1year' | 'all';

export function Statistics({ onBack }: StatisticsProps) {
  const { getAppStats } = useVocabularyStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  
  const stats = getAppStats();
  
  const getFilteredStats = () => {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '7days':
        startDate = subDays(now, 7);
        break;
      case '1month':
        startDate = subMonths(now, 1);
        break;
      case '1year':
        startDate = subYears(now, 1);
        break;
      case 'all':
        return stats.dailyStats;
      default:
        startDate = subDays(now, 7);
    }
    
    return stats.dailyStats.filter(stat => new Date(stat.date) >= startDate);
  };

  const filteredStats = getFilteredStats();
  
  const totalLearned = filteredStats.reduce((sum, stat) => sum + stat.newLearned, 0);
  const totalReviewed = filteredStats.reduce((sum, stat) => sum + stat.reviewed, 0);
  const maxDaily = Math.max(...filteredStats.map(stat => stat.newLearned + stat.reviewed), 1);
  
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7days': return 'Letzte 7 Tage';
      case '1month': return 'Letzter Monat';
      case '1year': return 'Letztes Jahr';
      case 'all': return 'Gesamt';
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
          <h1 className="text-2xl font-bold">Statistiken</h1>
        </div>

        {/* Time Range Selector */}
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => setTimeRange('7days')}
              variant={timeRange === '7days' ? 'default' : 'outline'}
              size="sm"
            >
              7 Tage
            </Button>
            <Button
              onClick={() => setTimeRange('1month')}
              variant={timeRange === '1month' ? 'default' : 'outline'}
              size="sm"
            >
              1 Monat
            </Button>
            <Button
              onClick={() => setTimeRange('1year')}
              variant={timeRange === '1year' ? 'default' : 'outline'}
              size="sm"
            >
              1 Jahr
            </Button>
            <Button
              onClick={() => setTimeRange('all')}
              variant={timeRange === 'all' ? 'default' : 'outline'}
              size="sm"
            >
              Alles
            </Button>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Neu gelernt</span>
            </div>
            <div className="text-2xl font-bold text-primary">{totalLearned}</div>
            <div className="text-xs text-muted-foreground">{getTimeRangeLabel()}</div>
          </Card>
          
          <Card className="p-4 bg-success/5">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Wiederholt</span>
            </div>
            <div className="text-2xl font-bold text-success">{totalReviewed}</div>
            <div className="text-xs text-muted-foreground">{getTimeRangeLabel()}</div>
          </Card>
        </div>

        {/* Chart */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Aktivität - {getTimeRangeLabel()}
          </h3>
          
          {filteredStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Keine Daten für diesen Zeitraum</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredStats.map((stat, index) => {
                const total = stat.newLearned + stat.reviewed;
                const percentage = maxDaily > 0 ? (total / maxDaily) * 100 : 0;
                
                return (
                  <div key={stat.date} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {format(new Date(stat.date), 'EEE, dd.MM', { locale: de })}
                      </span>
                      <span className="font-medium">{total}</span>
                    </div>
                    
                    <div className="relative h-6 bg-muted rounded-full overflow-hidden">
                      {stat.newLearned > 0 && (
                        <div
                          className="absolute left-0 top-0 h-full bg-primary rounded-full"
                          style={{ width: `${(stat.newLearned / maxDaily) * 100}%` }}
                        />
                      )}
                      {stat.reviewed > 0 && (
                        <div
                          className="absolute left-0 top-0 h-full bg-success rounded-full"
                          style={{ 
                            left: `${(stat.newLearned / maxDaily) * 100}%`,
                            width: `${(stat.reviewed / maxDaily) * 100}%` 
                          }}
                        />
                      )}
                    </div>
                    
                    {total > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        {stat.newLearned > 0 && (
                          <span className="text-primary">
                            {stat.newLearned} neu
                          </span>
                        )}
                        {stat.reviewed > 0 && (
                          <span className="text-success">
                            {stat.reviewed} wiederholt
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Legend */}
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-full" />
              <span>Neu gelernt</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-success rounded-full" />
              <span>Wiederholt</span>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
