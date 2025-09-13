import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Lightbulb, RotateCcw, ArrowLeft, RefreshCw } from "lucide-react";
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
  const [answered, setAnswered] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isRetryAttempt, setIsRetryAttempt] = useState(false);

  // Ref für das Input-Feld um es fokussieren zu können
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-Focus beim ersten Laden der Komponente
  useEffect(() => {
    if (inputRef.current && !answered && !saving) {
      // Kurze Verzögerung damit der DOM vollständig gerendert ist
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-Focus bei jeder neuen Vokabel
  useEffect(() => {
    if (inputRef.current && !answered && !saving) {
      // Kurze Verzögerung für bessere UX nach Vokabel-Wechsel
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, answered, saving]);

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

  const isCorrect = userInput.toLowerCase().trim() === currentVocab.english.toLowerCase();
  const hasError = answered && !isCorrect;

  const checkAnswer = async () => {
    const correct = userInput.toLowerCase().trim() === currentVocab.english.toLowerCase();
    setFeedback(correct ? 'correct' : 'incorrect');
    setResults(prev => new Map(prev).set(currentVocab.id, correct));
    setAnswered(true);

    if (correct && !isRetryAttempt) {
      // Nur beim ERSTEN richtigen Versuch Box hochstufen
      setSaving(true);
      try {
        // KRITISCH: Alle asynchronen Operationen nacheinander awaiten
        const nextBox = Math.min(currentVocab.box + 1, 6);
        
        // 1. Vokabel verschieben und warten bis komplett fertig
        await moveVocabularyToBox(currentVocab.id, nextBox, true);
        
        // 2. Statistiken aktualisieren und warten bis fertig
        // ANNAHME: updateDailyStats sollte auch async sein und awaited werden
        if (updateDailyStats.constructor.name === 'AsyncFunction') {
          await updateDailyStats(0, 1);
        } else {
          updateDailyStats(0, 1);
        }
        
        // 3. Kurz warten um sicherzustellen, dass alle DB-Operationen committed sind
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setSaving(false);
        
        // 4. Dann automatisch weiter
        setTimeout(() => {
          goToNext();
        }, 300);
        
      } catch (error) {
        console.error('Error moving vocabulary to box:', error);
        setSaving(false);
        // Bei Fehler trotzdem weitermachen, aber länger warten
        setTimeout(() => {
          goToNext();
        }, 1000);
      }
    } else if (correct && isRetryAttempt) {
      // Bei richtigem Retry: Einfach zur nächsten Vokabel (Vokabel bleibt in Box 1)
      setTimeout(() => {
        goToNext();
      }, 800);
    } else if (!correct && !isRetryAttempt) {
      // Bei falscher Antwort SOFORT in Box 1 zurücksetzen (nur beim ersten Mal)
      setSaving(true);
      try {
        await resetVocabularyToBox1(currentVocab.id);
        
        // Zusätzliche Wartezeit für DB-Commit
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setSaving(false);
      } catch (error) {
        console.error('Error resetting vocabulary to box 1:', error);
        setSaving(false);
      }
      // User kann jetzt erneut versuchen oder als Tippfehler markieren
    } else {
      // Falscher Retry - einfach zur nächsten Vokabel (bleibt in Box 1)
      setTimeout(() => {
        goToNext();
      }, 1500);
    }
  };

  const goToNext = () => {
    setAnswered(false);
    setFeedback(null);
    setUserInput('');
    setShowHint(false);
    setCurrentAttempt(0);
    setIsRetryAttempt(false); // Reset retry flag

    if (isLastVocabulary) {
      onComplete();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const markAsTypo = async () => {
    setFeedback('correct');
    setSaving(true);
    
    try {
      // Bei Tippfehler: Vokabel wieder in ursprüngliche Box oder eine höhere setzen
      // Da sie bereits in Box 1 zurückgesetzt wurde, setzen wir sie wieder in die ursprüngliche Box
      const nextBox = Math.min(currentVocab.box + 1, 6);
      
      // 1. Vokabel verschieben
      await moveVocabularyToBox(currentVocab.id, nextBox, true);
      
      // 2. Statistiken aktualisieren
      if (updateDailyStats.constructor.name === 'AsyncFunction') {
        await updateDailyStats(0, 1);
      } else {
        updateDailyStats(0, 1);
      }
      
      // 3. Warten für DB-Commit
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setSaving(false);
      
      setTimeout(() => {
        goToNext();
      }, 300);
      
    } catch (error) {
      console.error('Error marking as typo:', error);
      setSaving(false);
      setTimeout(() => {
        goToNext();
      }, 1000);
    }
  };

  const retryAnswer = () => {
    // Reset für neuen Versuch - aber Box bleibt bereits auf 1 gesetzt
    setAnswered(false);
    setFeedback(null);
    setUserInput('');
    setShowHint(false);
    setIsRetryAttempt(true); // Markiere als Wiederholungsversuch
    
    // Input fokussieren für neuen Versuch
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
  };

  const showHintHandler = () => {
    setShowHint(true);
    // Nach dem Hint wieder fokussieren
    setTimeout(() => {
      if (inputRef.current && !answered && !saving) {
        inputRef.current.focus();
      }
    }, 100);
  };

  return (
    <div className={`min-h-screen bg-background p-4 transition-colors duration-150 ${
      feedback === 'correct' ? 'bg-green-500/20' : 
      feedback === 'incorrect' ? 'bg-red-500/20' : ''
    }`}>
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <Button onClick={onBack} variant="outline" size="sm" disabled={saving}>
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
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Englische Übersetzung..."
                className={`text-lg h-12 ${hasError ? 'border-destructive' : ''}`}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !answered && !saving) {
                    if (userInput.trim()) {
                      setCurrentAttempt(prev => prev + 1);
                      checkAnswer();
                    }
                  }
                }}
                disabled={answered || saving}
                autoFocus
              />
              {showHint && (
                <div className="flex items-center gap-2 text-warning">
                  <Lightbulb className="h-4 w-4" />
                  <span>Tipp: Beginnt mit "{currentVocab.english[0].toUpperCase()}"</span>
                </div>
              )}
              {hasError && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span>Nicht korrekt. Versuche es nochmal!</span>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg border border-muted-foreground/20">
                    <div className="text-sm text-muted-foreground mb-1">Richtige Antwort:</div>
                    <div className="font-semibold text-foreground">{currentVocab.english}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Button Grid */}
            <div className="grid grid-cols-2 gap-3">
              {!answered ? (
                <>
                  {/* Tipp Button (links) */}
                  {!showHint && (
                    <Button 
                      onClick={showHintHandler} 
                      variant="outline" 
                      className="gap-2"
                      disabled={saving}
                    >
                      <Lightbulb className="h-4 w-4" />
                      Tipp
                    </Button>
                  )}
                  {showHint && <div></div>}
                  
                  {/* Prüfen Button (rechts) - für bessere Daumen-Erreichbarkeit */}
                  <Button 
                    onClick={() => {
                      if (userInput.trim()) {
                        setCurrentAttempt(prev => prev + 1);
                        checkAnswer();
                      }
                    }} 
                    className="gap-2"
                    disabled={!userInput.trim() || saving}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Prüfen
                  </Button>
                </>
              ) : (
                <>
                  {isCorrect ? (
                    // Bei richtiger Antwort
                    <div className="col-span-2 text-center text-success font-semibold">
                      {isRetryAttempt ? "Gut! Zur nächsten Vokabel..." : "Richtig! Lade nächste Vokabel..."}
                    </div>
                  ) : (
                    // Bei falscher Antwort: Tippfehler oder Erneut versuchen
                    <>
                      <Button 
                        onClick={markAsTypo} 
                        variant="outline" 
                        className="gap-2"
                        disabled={saving}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Tippfehler
                      </Button>
                      
                      <Button 
                        onClick={retryAnswer} 
                        className="gap-2"
                        disabled={saving}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Erneut versuchen
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
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
