import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, TrendingUp, Calendar } from "lucide-react";
import { useVocabularyStore } from "../hooks/useVocabularyStore";

interface StatisticsProps {
  onBack?: () => void;
}

type TimeRange = "7days" | "1month" | "1year" | "all";

export default function Statistics({ onBack }: StatisticsProps) {
  const { getAppStats } = useVocabularyStore();
  const [timeRange, setTimeRange] = useState<TimeRange>("7days");

  // Echte Daten aus Store holen
  const stats = getAppStats();
  const dailyStats = stats?.dailyStats ?? [];

  const getFilteredStats = () => {
    const now = new Date();
    let daysBack: number;

    switch (timeRange) {
      case "7days":
        daysBack = 7;
        break;
      case "1month":
        daysBack = 30;
        break;
      case "1year":
        daysBack = 365;
        break;
      case "all":
        return dailyStats;
      default:
        daysBack = 7;
    }

    return dailyStats.slice(0, daysBack);
  };

  const filteredStats = (getFilteredStats() ?? []).reverse(); // Absicherung + Chronologie

  const totalLearned = filteredStats.reduce(
    (sum, stat) => sum + (stat?.newLearned ?? 0),
    0
  );
  const totalReviewed = filteredStats.reduce(
    (sum, stat) => sum + (stat?.reviewed ?? 0),
    0
  );

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "7days":
        return "Letzte 7 Tage";
      case "1month":
        return "Letzter Monat";
      case "1year":
        return "Letztes Jahr";
      case "all":
        return "Gesamt";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return `${date.getDate()}.${date.getMonth() + 1}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          {onBack && (
            <Button
              onClick={onBack}
              variant="outline"
              size="sm"
              className="bg-white/70 backdrop-blur"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-3xl font-bold text-gray-800">Lernstatistiken</h1>
        </div>

        {/* Time Range Selector */}
        <Card className="p-4 bg-white/80 backdrop-blur shadow-lg">
          <div className="grid grid-cols-4 gap-2">
            <Button
              onClick={() => setTimeRange("7days")}
              variant={timeRange === "7days" ? "default" : "outline"}
              size="sm"
            >
              7 Tage
            </Button>
            <Button
              onClick={() => setTimeRange("1month")}
              variant={timeRange === "1month" ? "default" : "outline"}
              size="sm"
            >
              1 Monat
            </Button>
            <Button
              onClick={() => setTimeRange("1year")}
              variant={timeRange === "1year" ? "default" : "outline"}
              size="sm"
            >
              1 Jahr
            </Button>
            <Button
              onClick={() => setTimeRange("all")}
              variant={timeRange === "all" ? "default" : "outline"}
              size="sm"
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
            <div className="text-3xl font-bold">
              {totalLearned + totalReviewed}
            </div>
            <div className="text-purple-100 text-sm mt-1">
              Vokabeln bearbeitet
            </div>
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
            <div className="flex gap-2 overflow-x-auto">
              {filteredStats.map((stat) => {
                const total = (stat?.newLearned ?? 0) + (stat?.reviewed ?? 0);
                const maxTotal = Math.max(
                  ...filteredStats.map(
                    (s) => (s?.newLearned ?? 0) + (s?.reviewed ?? 0)
                  ),
                  1
                );
                const totalHeight = (total / maxTotal) * 200;
                const reviewedHeight = ((stat?.reviewed ?? 0) / maxTotal) * 200;
                const learnedHeight = ((stat?.newLearned ?? 0) / maxTotal) * 200;

                return (
                  <div
                    key={stat.date}
                    className="flex flex-col items-center"
                    style={{ minWidth: "30px" }}
                  >
                    <div
                      className="flex flex-col w-5 rounded overflow-hidden"
                      style={{ height: `${totalHeight}px` }}
                    >
                      <div
                        className="bg-green-500"
                        style={{ height: `${reviewedHeight}px` }}
                      ></div>
                      <div
                        className="bg-blue-500"
                        style={{ height: `${learnedHeight}px` }}
                      ></div>
                    </div>
                    <span className="text-xs mt-1">{formatDate(stat.date)}</span>
                  </div>
                );
              })}
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
