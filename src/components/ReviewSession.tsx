import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Lightbulb, RotateCcw, ArrowLeft } from "lucide-react";
import { Vocabulary } from '../types/vocabulary';
import { useVocabularyStore } from '../hooks/useVocabularyStore';

interface ReviewSessionProps {
  vocabularies: Vocabulary[];
  onComplete: () => void;
  onBack: () => void;
}

export function ReviewSession({ vocabularies, onComplete, onBack }: ReviewSessionProps) {
  const { moveVocabularyToBox, resetVocabularyToBox1, updateDailyStats } = useVocabularyStore();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [results, setResults] = useState<Map<string, boolean>>(new Map());
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);

  if (vocabularies.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center space-y-6">
          <div className="space-y-4">
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <h2 className="text-2xl font-bold">Keine Wiederholungen fällig</h2>
            <p className="text-muted-foreground">
              Komme später wieder, um deine Vokabeln zu wiederholen!
            </p>
          </div>
          
          <Button onClick={onBack} className="w-full">
            Zurück zur Startseite
          </Button>
        </Card>
      </div>
    );
  }

  const currentVocab = vocabularies[currentIndex];
  const isLastVocabulary = currentIndex === vocabularies.length - 1;

  const checkAnswer = () => {
    const correct = userInput.toLowerCase().trim() === currentVocab.english.toLowerCase();
    
    // Show feedback
    setFeedback(correct ? 'correct' : 'incorrect');
    setTimeout(() => setFeedback(null), 600);
    
    setResults(prev => new Map(prev).set(currentVocab.id, correct));
    
    if (correct) {
      // Move to next box
      const nextBox = Math.min(currentVocab.box + 1, 6);
      moveVocabularyToBox(currentVocab.id, nextBox, true);
    } else {
      // Reset to box 1
      resetVocabularyToBox1(currentVocab.id);
    }
    
    setTimeout(() => {
      if (isLastVocabulary) {
        // Complete review session
        const correctCount = Array.from(results.values()).filter(Boolean).length + (correct ? 1 : 0);
        updateDailyStats(0, vocabularies.length);
        onComplete();
      } else {
        // Move to next vocabulary
        setCurrentIndex(prev => prev + 1);
        setUserInput('');
        setShowHint(false);
        setCurrentAttempt(0);
      }
    }, 600);
  };

  const markAsTypo = () => {
    // Treat as correct answer
    setFeedback('correct');
    setTimeout(() => setFeedback(null), 600);
    
    setResults(prev => new Map(prev).set(currentVocab.id, true));
    const nextBox = Math.min(currentVocab.box + 1, 6);
    moveVocabularyToBox(currentVocab.id, nextBox, true);
    
    setTimeout(() => {
      if (isLastVocabulary) {
        const correctCount = Array.from(results.values()).filter(Boolean).length + 1;
        updateDailyStats(0, vocabularies.length);
        onComplete();
      } else {
        setCurrentIndex(prev => prev + 1);
        setUserInput('');
        setShowHint(false);
        setCurrentAttempt(0);
      }
    }, 600);
  };

  const showHintHandler = () => {
    setShowHint(true);
  };

  const isCorrect = userInput.toLowerCase().trim() === currentVocab.english.toLowerCase();
  const hasError = currentAttempt > 0 && !isCorrect && userInput.length > 0;

  return (
    <div className={`min-h-screen bg-background p-4 transition-colors duration-150 ${
      feedback === 'correct' ? 'bg-green-500/20' : 
      feedback === 'incorrect' ? 'bg-red-500/20' : ''
    }`}>
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {vocabularies.length}
          </span>
        </div>

        <Card className="p-6 space-y-6">
          <div className="text-center space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm text-muted-foreground uppercase tracking-wide">
                Wiederholung • Box {currentVocab.box}
              </h3>
              <div className="text-sm text-muted-foreground">
                Schreibe auf Englisch
              </div>
            </div>
            <div className="text-2xl font-semibold">
              {currentVocab.german}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Englische Übersetzung..."
                className={`text-lg h-12 ${hasError ? 'border-destructive' : ''}`}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    if (userInput.trim()) {
                      setCurrentAttempt(prev => prev + 1);
                      checkAnswer();
                    }
                  }
                }}
              />
              
              {showHint && (
                <div className="flex items-center gap-2 text-warning">
                  <Lightbulb className="h-4 w-4" />
                  <span>Tipp: Beginnt mit "{currentVocab.english[0].toUpperCase()}"</span>
                </div>
              )}
              
              {hasError && (
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span>Nicht korrekt. Versuche es nochmal!</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => {
                  if (userInput.trim()) {
                    setCurrentAttempt(prev => prev + 1);
                    checkAnswer();
                  }
                }} 
                className="gap-2"
                disabled={!userInput.trim()}
              >
                <CheckCircle className="h-4 w-4" />
                Prüfen
              </Button>
              
              {!showHint && (
                <Button onClick={showHintHandler} variant="outline" className="gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Tipp
                </Button>
              )}
            </div>

            {hasError && (
              <Button onClick={markAsTypo} variant="outline" className="w-full gap-2">
                <RotateCcw className="h-4 w-4" />
                War nur ein Tippfehler
              </Button>
            )}
          </div>

          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground text-center">
              Fortschritt
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-primary to-success h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentIndex) / vocabularies.length) * 100}%` }}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}