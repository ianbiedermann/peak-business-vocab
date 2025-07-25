import { useState, useEffect } from 'react';
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
  const [shuffledGerman, setShuffledGerman] = useState<string[]>([]);

  // Initialize shuffled German translations for matching phase
  useEffect(() => {
    if (session.currentPhase === 'matching') {
      const german = vocabularies.map(v => v.german);
      setShuffledGerman([...german].sort(() => Math.random() - 0.5));
    }
  }, [session.currentPhase, vocabularies]);

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

  const handleMatch = (germanTranslation: string) => {
    const currentVocab = vocabularies[session.currentIndex];
    if (currentVocab.german === germanTranslation) {
      const newMatched = new Set(session.matchedPairs);
      newMatched.add(currentVocab.id);
      
      setSession(prev => ({ ...prev, matchedPairs: newMatched }));
      
      // Check if all pairs are matched
      if (newMatched.size === vocabularies.length) {
        setSession(prev => ({ ...prev, currentPhase: 'writing', currentIndex: 0 }));
      } else {
        // Find next unmatched vocabulary
        const nextIndex = vocabularies.findIndex(v => !newMatched.has(v.id));
        setSession(prev => ({ ...prev, currentIndex: nextIndex }));
      }
    }
  };

  const checkWriting = () => {
    const currentVocab = vocabularies[session.currentIndex];
    const correct = userInput.toLowerCase().trim() === currentVocab.english.toLowerCase();
    
    if (correct) {
      if (session.currentIndex < vocabularies.length - 1) {
        setSession(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
        setUserInput('');
        setShowHint(false);
        setCurrentAttempt(0);
      } else {
        // All completed - move to box 1
        const vocabIds = vocabularies.map(v => v.id);
        moveVocabulariesToBox(vocabIds, 1);
        updateDailyStats(vocabularies.length, 0);
        setSession(prev => ({ ...prev, currentPhase: 'completed' }));
      }
    } else {
      setCurrentAttempt(prev => prev + 1);
    }
  };

  const markAsTypo = () => {
    // Treat as correct answer
    if (session.currentIndex < vocabularies.length - 1) {
      setSession(prev => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
      setUserInput('');
      setShowHint(false);
      setCurrentAttempt(0);
    } else {
      const vocabIds = vocabularies.map(v => v.id);
      moveVocabulariesToBox(vocabIds, 1);
      updateDailyStats(vocabularies.length, 0);
      setSession(prev => ({ ...prev, currentPhase: 'completed' }));
    }
  };

  const showHintHandler = () => {
    setShowHint(true);
  };

  if (session.currentPhase === 'completed') {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center space-y-6">
          <div className="space-y-4">
            <CheckCircle className="h-16 w-16 text-success mx-auto" />
            <h2 className="text-2xl font-bold text-success">Glückwunsch!</h2>
            <p className="text-muted-foreground">
              Du hast {vocabularies.length} neue Vokabeln erfolgreich gelernt!
            </p>
          </div>
          
          <div className="space-y-3">
            <Button onClick={onComplete} className="w-full">
              Weiterlernen
            </Button>
            <Button onClick={onBack} variant="outline" className="w-full">
              Zur Startseite
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentVocab = vocabularies[session.currentIndex];

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
    const unmatchedGerman = shuffledGerman.filter(german => 
      !vocabularies.find(v => v.german === german && session.matchedPairs.has(v.id))
    );

    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <Button onClick={onBack} variant="outline" size="sm">
              ← Zurück
            </Button>
            <span className="text-sm text-muted-foreground">
              Matching ({session.matchedPairs.size} / {vocabularies.length})
            </span>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Verbinde die Paare
            </h3>
            
            {unmatchedVocabs.length > 0 && (
              <div className="space-y-4">
                <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                  <div className="text-lg font-semibold text-primary text-center">
                    {currentVocab.english}
                  </div>
                </div>
                
                <div className="grid gap-2">
                  {unmatchedGerman.map((german, index) => (
                    <Button
                      key={index}
                      onClick={() => handleMatch(german)}
                      variant="outline"
                      className="h-auto p-4 text-left justify-start"
                    >
                      {german}
                    </Button>
                  ))}
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
    const hasError = currentAttempt > 0 && !isCorrect && userInput.length > 0;

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
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Englische Übersetzung..."
                  className={`text-lg h-12 ${hasError ? 'border-destructive' : ''}`}
                  onKeyPress={(e) => e.key === 'Enter' && checkWriting()}
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
                <Button onClick={checkWriting} className="gap-2">
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
          </Card>
        </div>
      </div>
    );
  }

  return null;
}