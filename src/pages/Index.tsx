import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Dashboard } from '../components/Dashboard';
import { LearningSessionComponent } from '../components/LearningSession';
import { ReviewSession } from '../components/ReviewSession';
import { BoxView } from '../components/BoxView';
import { Statistics } from '../components/Statistics';
import { VocabularyLists } from '../components/VocabularyLists';
import { useVocabularyStore } from '../hooks/useVocabularyStore';
import { Vocabulary } from '../types/vocabulary';

type AppView = 'dashboard' | 'learning' | 'review' | 'boxes' | 'statistics' | 'lists' | 'continue-learning';

const Index = () => {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [sessionVocabularies, setSessionVocabularies] = useState<Vocabulary[]>([]);
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { 
    lists,
    getRandomVocabularies, 
    getVocabulariesForReview,
    uploadVocabularyList,
    toggleVocabularyList,
    deleteVocabularyList
  } = useVocabularyStore();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth');
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg">Lädt...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to auth
  }

  const handleStartLearning = () => {
    const vocabs = getRandomVocabularies(5);
    if (vocabs.length > 0) {
      setSessionVocabularies(vocabs);
      setCurrentView('learning');
    }
  };

  const handleStartReview = () => {
    const vocabs = getVocabulariesForReview();
    if (vocabs.length > 0) {
      setSessionVocabularies(vocabs);
      setCurrentView('review');
    }
  };

  const handleLearningComplete = () => {
    setCurrentView('continue-learning');
  };

  const handleContinueLearning = () => {
    const vocabs = getRandomVocabularies(5);
    if (vocabs.length > 0) {
      setSessionVocabularies(vocabs);
      setCurrentView('learning');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSessionVocabularies([]);
  };

  if (currentView === 'continue-learning') {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="max-w-md mx-auto space-y-6 text-center">
          <div className="space-y-4">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold">Großartig!</h2>
            <p className="text-muted-foreground">
              Du hast {sessionVocabularies.length} Vokabeln erfolgreich gelernt!
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleContinueLearning}
              className="w-full bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-medium py-4 px-6 rounded-lg text-lg transition-all hover:shadow-lg disabled:opacity-50"
              disabled={getRandomVocabularies(5).length === 0}
            >
              Weiterlernen
              {getRandomVocabularies(5).length === 0 && <span className="ml-2 text-sm">(Alle gelernt!)</span>}
            </button>
            <button
              onClick={handleBackToDashboard}
              className="w-full border border-border text-foreground font-medium py-4 px-6 rounded-lg text-lg transition-all hover:bg-muted"
            >
              Zur Startseite
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentView === 'dashboard' && (
        <Dashboard
          onStartLearning={handleStartLearning}
          onStartReview={handleStartReview}
          onViewBoxes={() => setCurrentView('boxes')}
          onViewStatistics={() => setCurrentView('statistics')}
          onViewLists={() => setCurrentView('lists')}
        />
      )}
      
      {currentView === 'learning' && (
        <LearningSessionComponent
          vocabularies={sessionVocabularies}
          onComplete={handleLearningComplete}
          onBack={handleBackToDashboard}
        />
      )}
      
      {currentView === 'review' && (
        <ReviewSession
          vocabularies={sessionVocabularies}
          onComplete={handleBackToDashboard}
          onBack={handleBackToDashboard}
        />
      )}
      
      {currentView === 'boxes' && (
        <BoxView onBack={handleBackToDashboard} />
      )}
      
      {currentView === 'statistics' && (
        <Statistics onBack={handleBackToDashboard} />
      )}
      
      {currentView === 'lists' && (
        <VocabularyLists
          lists={lists}
          onUploadList={uploadVocabularyList}
          onToggleList={toggleVocabularyList}
          onDeleteList={deleteVocabularyList}
          onBack={handleBackToDashboard}
        />
      )}
    </>
  );
};

export default Index;
