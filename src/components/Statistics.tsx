import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, TrendingUp, Calendar } from "lucide-react";

// Mock data für die Demo
const mockStats = {
  dailyStats: [
    { date: '2024-08-13', newLearned: 12, reviewed: 8 },
    { date: '2024-08-12', newLearned: 15, reviewed: 12 },
    { date: '2024-08-11', newLearned: 8, reviewed: 15 },
    { date: '2024-08-10', newLearned: 20, reviewed: 10 },
    { date: '2024-08-09', newLearned: 6, reviewed: 18 },
    { date: '2024-08-08', newLearned: 18, reviewed: 14 },
    { date: '2024-08-07', newLearned: 10, reviewed: 22 },
    { date: '2024-08-06', newLearned: 14, reviewed: 16 },
    { date: '2024-08-05', newLearned: 9, reviewed: 11 },
    { date: '2024-08-04', newLearned: 22, reviewed: 7 },
    { date: '2024-08-03', newLearned: 11, reviewed: 19 },
    { date: '2024-08-02', newLearned: 16, reviewed: 13 },
    { date: '2024-08-01', newLearned: 13, reviewed: 20 },
    { date: '2024-07-31', newLearned: 19, reviewed: 9 }
  ]
};

interface StatisticsProps {
  onBack?: () => void;
}

type TimeRange = '7days' | '1month' | '1year' | 'all';

export default function Statistics({ onBack }: StatisticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  
  const stats = mockStats;
  
  const getFilteredStats = () => {
    const now = new Date();
    let daysBack: number;
    
    switch (timeRange) {
      case '7days':
        daysBack = 7;
        break;
      case '1month':
        daysBack = 30;
        break;
      case '1year':
        daysBack = 365;
        break;
      case 'all':
        return stats.dailyStats;
      default:
        daysBack = 7;
    }
    
    return stats.dailyStats.slice(0, daysBack);
  };

  const filteredStats = getFilteredStats().reverse(); // Chronologische Reihenfolge
  
  const totalLearned = filteredStats.reduce((sum, stat) => sum + stat.newLearned, 0);
  const totalReviewed = filteredStats.reduce((sum, stat) => sum + stat.reviewed, 0);
  const maxDaily = Math.max(...filteredStats.map(stat => Math.max(stat.newLearned, stat.reviewed)), 1);
  
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case '7days': return 'Letzte 7 Tage';
      case '1month': return 'Letzter Monat';
      case '1year': return 'Letztes Jahr';
      case 'all': return 'Gesamt';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${day}.${month}`;
  };

  const getDayLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return days[date.getDay()];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {onBack && (
            <Button onClick={onBack} variant="outline" size="sm" className="bg-white/70 backdrop-blur">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-3xl font-bold text-gray-800">Lernstatistiken</h1>
        </div>

        {/* Time Range Selector */}
        <Card className="p-4 bg-white/80 backdrop-blur shadow-lg">
          <div className="grid grid-cols-4 gap-2">
            <Button
              onClick={() => setTimeRange('7days')}
              variant={timeRange === '7days' ? 'default' : 'outline'}
              size="sm"
              className="transition-all duration-200"
            >
              7 Tage
            </Button>
            <Button
              onClick={() => setTimeRange('1month')}
              variant={timeRange === '1month' ? 'default' : 'outline'}
              size="sm"
              className="transition-all duration-200"
            >
              1 Monat
            </Button>
            <Button
              onClick={() => setTimeRange('1year')}
              variant={timeRange === '1year' ? 'default' : 'outline'}
              size="sm"
              className="transition-all duration-200"
            >
              1 Jahr
            </Button>
            <Button
              onClick={() => setTimeRange('all')}
              variant={timeRange === 'all' ? 'default' : 'outline'}
              size="sm"
              className="transition-all duration-200"
            >
              Alles
            </Button>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-6 w-6" />
              <span className="text-blue-100">Neu gelernt</span>
            </div>
            <div className="text-3xl font-bold">{totalLearned}</div>
            <div className="text-blue-100 text-sm mt-1">{getTimeRangeLabel()}</div>
          </Card>
          
          <Card className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-6 w-6" />
              <span className="text-green-100">Wiederholt</span>
            </div>
            <div className="text-3xl font-bold">{totalReviewed}</div>
            <div className="text-green-100 text-sm mt-1">{getTimeRangeLabel()}</div>
          </Card>

          <Card className="p-6 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-6 w-6" />
              <span className="text-purple-100">Gesamt</span>
            </div>
            <div className="text-3xl font-bold">{totalLearned + totalReviewed}</div>
            <div className="text-purple-100 text-sm mt-1">Vokabeln bearbeitet</div>
          </Card>
        </div>

        {/* Chart */}
        <Card className="p-6 bg-white/90 backdrop-blur shadow-lg">
          <h3 className="text-xl font-semibold mb-6 flex items-center gap-3 text-gray-800">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            Tägliche Aktivität - {getTimeRangeLabel()}
          </h3>
          
          {filteredStats.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Keine Daten für diesen Zeitraum</p>
            </div>
          ) : (
            <div className="relative">
              {/* Y-Axis Labels */}
              <div className="absolute left-0 w-10 flex flex-col justify-between text-xs text-gray-500 z-10" style={{ top: '30px', height: '220px' }}>
                <span className="text-right pr-2">{Math.max(...filteredStats.map(stat => stat.newLearned + stat.reviewed))}</span>
                <span className="text-right pr-2">{Math.round(Math.max(...filteredStats.map(stat => stat.newLearned + stat.reviewed)) * 0.75)}</span>
                <span className="text-right pr-2">{Math.round(Math.max(...filteredStats.map(stat => stat.newLearned + stat.reviewed)) * 0.5)}</span>
                <span className="text-right pr-2">{Math.round(Math.max(...filteredStats.map(stat => stat.newLearned + stat.reviewed)) * 0.25)}</span>
                <span className="text-right pr-2 font-semibold">0</span>
              </div>
              
              {/* Chart Area with Horizontal Scroll */}
              <div className="ml-12 overflow-x-auto">
                <div 
                  className="relative"
                  style={{ minWidth: `${filteredStats.length * 50}px` }}
                >
                  {/* Grid Lines - positioned to match the actual chart area */}
                  <div className="absolute left-0 right-0 pointer-events-none" style={{ top: '30px', height: '220px' }}>
                    <div className="h-full relative">
                      <div className="absolute bottom-0 w-full border-b-2 border-gray-400"></div>
                      <div className="absolute bottom-1/4 w-full border-b border-gray-200"></div>
                      <div className="absolute bottom-1/2 w-full border-b border-gray-200"></div>
                      <div className="absolute bottom-3/4 w-full border-b border-gray-200"></div>
                      <div className="absolute top-0 w-full border-b border-gray-200"></div>
                    </div>
                  </div>

                  {/* Chart Container - bars aligned with bottom grid line */}
                  <div 
                    className="relative mb-4" 
                    style={{ height: '250px', paddingTop: '30px' }}
                  >
                    {/* Chart area with exact height matching grid */}
                    <div className="flex items-end gap-2" style={{ height: '220px' }}>
                      {filteredStats.map((stat, index) => {
                        const total = stat.newLearned + stat.reviewed;
                        const maxTotal = Math.max(...filteredStats.map(s => s.newLearned + s.reviewed));
                        const totalHeightPx = maxTotal > 0 ? (total / maxTotal) * 220 : 0;
                        const newLearnedHeightPx = maxTotal > 0 ? (stat.newLearned / maxTotal) * 220 : 0;
                        const reviewedHeightPx = maxTotal > 0 ? (stat.reviewed / maxTotal) * 220 : 0;
                        
                        return (
                          <div key={stat.date} className="flex flex-col items-center justify-end" style={{ minWidth: '40px', height: '100%' }}>
                            {/* Stacked Bar - built from bottom up */}
                            {(stat.newLearned > 0 || stat.reviewed > 0) && (
                              <div 
                                className="w-5 flex flex-col rounded-t-lg overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md"
                                style={{ 
                                  height: `${Math.max(totalHeightPx, total > 0 ? 4 : 0)}px`
                                }}
                              >
                                {/* Reviewed (Bottom part - green) */}
                                {stat.reviewed > 0 && (
                                  <div
                                    className="bg-gradient-to-t from-green-500 to-green-400 transition-all duration-300 hover:from-green-600 hover:to-green-500 flex items-center justify-center"
                                    style={{ 
                                      height: `${reviewedHeightPx}px`
                                    }}
                                  >
                                    {stat.reviewed >= 3 && reviewedHeightPx > 15 && (
                                      <span className="text-xs font-bold text-white text-center">
                                        {stat.reviewed}
                                      </span>
                                    )}
                                  </div>
                                )}
                                
                                {/* New Learned (Top part - blue) */}
                                {stat.newLearned > 0 && (
                                  <div
                                    className="bg-gradient-to-t from-blue-600 to-blue-500 transition-all duration-300 hover:from-blue-700 hover:to-blue-600 flex items-center justify-center"
                                    style={{ 
                                      height: `${newLearnedHeightPx}px`
                                    }}
                                  >
                                    {stat.newLearned >= 3 && newLearnedHeightPx > 15 && (
                                      <span className="text-xs font-bold text-white text-center">
                                        {stat.newLearned}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* X-Axis Labels - positioned below the chart */}
                  <div className="flex gap-2">
                    {filteredStats.map((stat) => (
                      <div key={`label-${stat.date}`} className="flex justify-center" style={{ minWidth: '40px' }}>
                        <div className="text-xs text-gray-600 font-medium">
                          {formatDate(stat.date)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Legend */}
        <Card className="p-4 bg-white/80 backdrop-blur shadow-lg">
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-gradient-to-t from-green-500 to-green-400 rounded shadow-sm" />
              <span className="font-medium text-gray-700">Wiederholt (unten)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 bg-gradient-to-t from-blue-600 to-blue-500 rounded shadow-sm" />
              <span className="font-medium text-gray-700">Neu gelernt (oben)</span>
            </div>
          </div>
          <div className="text-center text-xs text-gray-500 mt-2">
            Die Balken sind horizontal scrollbar bei vielen Datenpunkten
          </div>
        </Card>

      </div>
    </div>
  );
}
