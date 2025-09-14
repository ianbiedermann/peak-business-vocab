import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Volume2, ArrowRight, CheckCircle, XCircle, Lightbulb, RotateCcw } from "lucide-react";
import { Vocabulary, LearningSession } from '../types/vocabulary';
import { useVocabularyStore } from '../hooks/useVocabularyStore';

interface LearningSessionProps {
  vocabularies: Vocabulary[];
  onComplete: () => void;
  onBack: () => void;
}

export function LearningSessionComponent({ vocabularies, onComplete, onBack }: LearningSessionProps) {
  const { moveVocabulariesToBox, updateDailyStats } = useVocabularyStore();
  
  const [session, setSession] = useState<LearningSession>({
    vocabularies,
    currentPhase: 'introduction',
    currentIndex: 0,
    matchedPairs: new Set(),
    mistakes: new Map()
  });
  
  const [userInput, setUserInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [shuffledEnglish, setShuffledEnglish] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [answered, setAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize shuffled English translations for matching phase
  useEffect(() => {
    if (session.currentPhase === 'matching') {
      const english = vocabularies.map(v => v.english);
      setShuffledEnglish([...english].sort(() => Math.random() - 0.5));
    }
  }, [session.currentPhase, vocabularies]);

  // Explizit alle States zurücksetzen wenn sich Index oder Phase ändert
  useEffect(() => {
    // Timeout um sicherzustellen, dass mobile Browser den State richtig zurücksetzen
    const resetTimeout = setTimeout(() => {
      setFeedback(null);
      setSelectedAnswer(null);
      setUserInput('');
      setShowHint(false);
      setCurrentAttempt(0);
      setAnswered(false);
      setIsProcessing(false);
      
      // Auto-focus für Writing-Phase auf mobilen Geräten
      if (session.currentPhase === 'writing' && inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);

    return () => clearTimeout(resetTimeout);
  }, [session.currentIndex, session.currentPhase]);

  // Zusätzlicher Fokus-Effect speziell für Writing-Phase
  useEffect(() => {
    if (session.currentPhase === 'writing' && inputRef.current) {
      // Kleines Delay für bessere Mobile-Kompatibilität
      const focusTimeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      
      return () => clearTimeout(focusTimeout);
    }
  }, [session.currentPhase, session.currentIndex]);

  const currentVocab = vocabularies[session.currentIndex];

  // Memoized Antwortoptionen - werden nur neu generiert wenn sich currentIndex oder Phase ändert
  const answerOptions = useMemo(() => {
    if (session.currentPhase !== 'matching' || !currentVocab || shuffledEnglish.length === 0) {
      return [];
    }
    
    const correctAnswer = currentVocab.english;
    const options = new Set<string>();
    options.add(correctAnswer);
    
    // Füge andere englische Übersetzungen hinzu bis wir 5 haben
    const otherEnglish = shuffledEnglish.filter(eng => eng !== correctAnswer);
    
    while (options.size < 5 && otherEnglish.length > 0) {
      const randomIndex = Math.floor(Math.random() * otherEnglish.length);
      options.add(otherEnglish[randomIndex]);
    }
    
    // Falls wir weniger als 5 verschiedene Vokabeln haben, fülle mit den vorhandenen auf
    if (options.size < 5) {
      const allEnglish = vocabularies.map(v => v.english);
      for (const eng of allEnglish) {
        if (options.size >= 5) break;
        options.add(eng);
      }
    }
    
    // Konvertiere zu Array und mische
    return Array.from(options).sort(() => Math.random() - 0.5);
  }, [session.currentPhase, session.currentIndex, shuffledEnglish, currentVocab?.english, vocabularies]);

  const speakWord = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      
      // Try to find a male voice
      const voices = speechSynthesis.getVoices();
      const maleVoice = voices.find(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.toLowerCase().includes('male') || voice.name.toLowerCase().includes('david'))
      );
      
      if (maleVoice) {
        utterance.voice = maleVoice;
      }
      
      speechSynthesis.speak(utterance);
    }
  };

  const nextInIntroduction = () => {
    if (session.currentIndex < vocabularies.length - 1) {
      setSession(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    } else {
      setSession(prev => ({ ...prev, currentPhase: 'matching', currentIndex: 0 }));
    }
  };

  const handleMatch = (englishTranslation: string) => {
    if (isProcessing) return; // Verhindert mehrfache Klicks
    
    const currentVocab = vocabularies[session.currentIndex];
    const isCorrect = currentVocab.english === englishTranslation;
    
    setIsProcessing(true);
    setSelectedAnswer(englishTranslation);
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    
    if (isCorrect) {
      const newMatched = new Set(session.matchedPairs);
      newMatched.add(currentVocab.id);
      
      setTimeout(() => {
        // Explizit alle visuellen States zurücksetzen
        setFeedback(null);
        setSelectedAnswer(null);
        setIsProcessing(false);
        
        setSession(prev => ({ ...prev, matchedPairs: newMatched }));
        
        // Check if all pairs are matched
        if (newMatched.size === vocabularies.length) {
          setSession(prev => ({ ...prev, currentPhase: 'writing', currentIndex: 0 }));
        } else {
          // Find next unmatched vocabulary
          const nextIndex = vocabularies.findIndex(v => !newMatched.has(v.id));
          setSession(prev => ({ ...prev, currentIndex: nextIndex }));
        }
      }, 600);
    } else {
      // Bei falscher Antwort zurücksetzen
      setTimeout(() => {
        setFeedback(null);
        setSelectedAnswer(null);
        setIsProcessing(false);
      }, 1000);
    }
  };

  const checkWriting = () => {
    const currentVocab = vocabularies[session.currentIndex];
    const correct = userInput.toLowerCase().trim() === currentVocab.english.toLowerCase();
    
    // Show feedback
    setFeedback(correct ? 'correct' : 'incorrect');
    setAnswered(true);
    
    if (correct) {
      setTimeout(() => {
        goToNext();
      }, 600);
    } else {
      setCurrentAttempt(prev => prev + 1);
    }
  };

  const goToNext = () => {
    // Explizit alle States zurücksetzen
    setAnswered(false);
    setFeedback(null);
    setSelectedAnswer(null);
    setUserInput('');
    setShowHint(false);
    setCurrentAttempt(0);
    setIsProcessing(false);
    
    if (session.currentIndex < vocabularies.length - 1) {
      setSession(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
      // Focus auf nächstes Input-Feld setzen
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // All completed - move to box 1
      const vocabIds = vocabularies.map(v => v.id);
      moveVocabulariesToBox(vocabIds, 1);
      updateDailyStats(vocabularies.length, 0);
      onComplete(); // Direkt zum Parent
    }
  };

  const markAsTypo = () => {
    // Treat as correct answer
    setFeedback('correct');
    
    setTimeout(() => {
      goToNext();
    }, 600);
  };

  const showHintHandler = () => {
    setShowHint(true);
  };

  if (session.currentPhase === 'introduction') {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <Button onClick={onBack} variant="outline" size="sm">
              ← Zurück
            </Button>
            <span className="text-sm text-muted-foreground">
              {session.currentIndex + 1} / {vocabularies.length}
            </span>
          </div>

          <Card className="p-8 text-center space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm text-muted-foreground uppercase tracking-wide">
                  Englisch
                </h3>
                <div className="text-3xl font-bold text-primary">
                  {currentVocab.english}
                </div>
              </div>
              
              <Button
                onClick={() => speakWord(currentVocab.english)}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Volume2 className="h-5 w-5" />
                Anhören
              </Button>
              
              <div className="space-y-2">
                <h3 className="text-sm text-muted-foreground uppercase tracking-wide">
                  Deutsch
                </h3>
                <div className="text-xl text-foreground">
                  {currentVocab.german}
                </div>
              </div>
            </div>

            <Button onClick={nextInIntroduction} size="lg" className="w-full gap-2">
              {session.currentIndex < vocabularies.length - 1 ? 'Weiter' : 'Zum Matching'}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (session.currentPhase === 'matching') {
    const unmatchedVocabs = vocabularies.filter(v => !session.matchedPairs.has(v.id));

    return (
      <div className={`min-h-screen bg-background p-4 transition-colors duration-150 ${
        feedback === 'correct' ? 'bg-green-500/20' : 
        feedback === 'incorrect' ? 'bg-red-500/20' : ''
      }`}>
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <Button onClick={onBack} variant="outline" size="sm">
              ← Zurück
            </Button>
            <span className="text-sm text-muted-foreground">
              {session.currentIndex + 1} / {vocabularies.length}
            </span>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Wähle die richtige englische Übersetzung
            </h3>
            
            {unmatchedVocabs.length > 0 && currentVocab && answerOptions.length > 0 && (
              <div className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                  <div className="text-lg font-semibold text-primary text-center">
                    {currentVocab.german}
                  </div>
                </div>
                
                <div className="grid gap-2">
                  {answerOptions.map((english, index) => {
                    const isSelected = selectedAnswer === english;
                    const isCorrectAnswer = feedback === 'correct' && isSelected;
                    const isIncorrectAnswer = feedback === 'incorrect' && isSelected;
                    
                    return (
                      <Button
                        key={`${session.currentIndex}-${english}-${index}`}
                        onClick={() => handleMatch(english)}
                        variant="outline"
                        disabled={isProcessing}
                        className={`h-auto p-4 text-left justify-start transition-all duration-300 ${
                          isCorrectAnswer ? 'bg-green-500/20 border-green-500 text-green-700' :
                          isIncorrectAnswer ? 'bg-red-500/20 border-red-500 text-red-700' :
                          'hover:bg-accent'
                        }`}
                      >
                        {english}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (session.currentPhase === 'writing') {
    const isCorrect = userInput.toLowerCase().trim() === currentVocab.english.toLowerCase();
    const hasError = answered && !isCorrect;

    return (
      <div className={`min-h-screen bg-background p-4 transition-colors duration-150 ${
        feedback === 'correct' ? 'bg-green-500/20' : 
        feedback === 'incorrect' ? 'bg-red-500/20' : ''
      }`}>
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <Button onClick={onBack} variant="outline" size="sm">
              ← Zurück
            </Button>
            <span className="text-sm text-muted-foreground">
              {session.currentIndex + 1} / {vocabularies.length}
            </span>
          </div>

          <Card className="p-6 space-y-6">
            <div className="text-center space-y-4">
              <h3 className="text-sm text-muted-foreground uppercase tracking-wide">
                Schreibe auf Englisch
              </h3>
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
                    if (e.key === 'Enter' && !answered) {
                      if (userInput.trim()) {
                        checkWriting();
                      }
                    }
                  }}
                  disabled={answered}
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

              {/* Button Grid - Tipp links, Prüfen rechts */}
              <div className="grid grid-cols-2 gap-3">
                {!answered ? (
                  <>
                    {/* Tipp Button (links) */}
                    {!showHint && (
                      <Button onClick={showHintHandler} variant="outline" className="gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Tipp
                      </Button>
                    )}
                    {showHint && <div></div>} {/* Platzhalter wenn Tipp bereits angezeigt */}
                    
                    {/* Prüfen Button (rechts) - für bessere Daumen-Erreichbarkeit */}
                    <Button 
                      onClick={() => {
                        if (userInput.trim()) {
                          checkWriting();
                        }
                      }} 
                      className="gap-2"
                      disabled={!userInput.trim()}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Prüfen
                    </Button>
                  </>
                ) : (
                  // Nach der Antwort - nur bei falscher Antwort
                  !isCorrect && (
                    <>
                      {/* War nur ein Tippfehler Button (links) */}
                      <Button onClick={markAsTypo} variant="outline" className="gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Tippfehler
                      </Button>
                      
                      {/* Weiter Button (rechts) */}
                      <Button onClick={goToNext} className="gap-2">
                        Weiter
                      </Button>
                    </>
                  )
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
