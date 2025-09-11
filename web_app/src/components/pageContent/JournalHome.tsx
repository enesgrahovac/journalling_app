"use client";
import React, { useState, useEffect } from 'react';
import CameraCapture from '@/components/CameraCapture';
import JournalList from '@/components/JournalList';
import ChatInterface from '@/components/ChatInterface';
import { JournalEntryData } from '@/components/JournalEntry';
import { Camera, BookOpen, MessageCircle } from 'lucide-react';

type View = 'camera' | 'journal' | 'chat';

const JournalHome: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('camera');
  const [entries, setEntries] = useState<JournalEntryData[]>([]);


  // Load entries from localStorage on component mount
  useEffect(() => {
    const savedEntries = localStorage.getItem('journalEntries');
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }
  }, []);

  // Save entries to localStorage whenever entries change
  useEffect(() => {
    localStorage.setItem('journalEntries', JSON.stringify(entries));
  }, [entries]);

  const handleCapture = (imageData: string, extractedText: string) => {
    const newEntry: JournalEntryData = {
      id: Date.now().toString(),
      text: extractedText,
      timestamp: Date.now(),
      wordCount: extractedText.split(/\s+/).filter(word => word.length > 0).length
    };

    setEntries(prev => [newEntry, ...prev]);
    
    // Automatically switch to journal view after capture
    setCurrentView('journal');
    
    // Show success message
    setTimeout(() => {
      alert('Journal entry captured and text extracted successfully!');
    }, 100);
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  const getViewTitle = () => {
    switch (currentView) {
      case 'camera': return 'Capture Journal';
      case 'journal': return 'My Journal';
      case 'chat': return 'Ask Journal AI';
      default: return 'Journal App';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Main desktop layout */}
      <div className="hidden md:flex h-screen">
        {/* Sidebar */}
        <div className="w-64 border-r-2 border-black bg-muted p-4">
          {/* App title */}
          <div className="border-2 border-black bg-white p-4 mb-6">
            <h1 className="font-mono font-medium text-center">Journal.app</h1>
            <p className="font-mono text-xs text-center text-muted-foreground mt-1">
              System 1.0
            </p>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            <button
              onClick={() => setCurrentView('camera')}
              className={`w-full text-left p-3 border-2 border-black flex items-center space-x-3 transition-all ${
                currentView === 'camera'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white hover:bg-accent'
              }`}
              style={{ boxShadow: '2px 2px 0px #000000' }}
            >
              <Camera className="w-5 h-5" />
              <span className="font-mono text-sm">Capture</span>
            </button>

            <button
              onClick={() => setCurrentView('journal')}
              className={`w-full text-left p-3 border-2 border-black flex items-center space-x-3 transition-all ${
                currentView === 'journal'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white hover:bg-accent'
              }`}
              style={{ boxShadow: '2px 2px 0px #000000' }}
            >
              <BookOpen className="w-5 h-5" />
              <div>
                <div className="font-mono text-sm">Journal</div>
                {entries.length > 0 && (
                  <div className="font-mono text-xs opacity-70">
                    {entries.length} entries
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={() => setCurrentView('chat')}
              className={`w-full text-left p-3 border-2 border-black flex items-center space-x-3 transition-all ${
                currentView === 'chat'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white hover:bg-accent'
              }`}
              style={{ boxShadow: '2px 2px 0px #000000' }}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-mono text-sm">Ask AI</span>
            </button>
          </nav>

          {/* Stats */}
          <div className="mt-6 p-3 border border-black bg-accent">
            <div className="font-mono text-xs space-y-1">
              <div>Total entries: {entries.length}</div>
              <div>
                Total words: {entries.reduce((sum, entry) => sum + entry.wordCount, 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col">
          {/* Title bar */}
          <div className="border-b-2 border-black bg-muted p-4">
            <h2 className="font-mono font-medium">{getViewTitle()}</h2>
          </div>

          {/* Content */}
          <div className="flex-1 p-4">
            {currentView === 'camera' && <CameraCapture onCapture={handleCapture} />}
            {currentView === 'journal' && <JournalList entries={entries} />}
            {currentView === 'chat' && <ChatInterface entries={entries} />}
          </div>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden min-h-screen flex flex-col">
        {/* Mobile header */}
        <header className="border-b-2 border-black bg-muted p-4">
          <div className="text-center">
            <h1 className="font-mono font-medium">Journal.app</h1>
            <p className="font-mono text-xs text-muted-foreground">System 1.0</p>
          </div>
        </header>

        {/* Mobile navigation */}
        <nav className="border-b-2 border-black bg-white p-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleViewChange('camera')}
              className={`p-3 border-2 border-black flex flex-col items-center space-y-1 transition-all ${
                currentView === 'camera'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white hover:bg-accent'
              }`}
              style={{ boxShadow: '2px 2px 0px #000000' }}
            >
              <Camera className="w-5 h-5" />
              <span className="font-mono text-xs">Capture</span>
            </button>

            <button
              onClick={() => handleViewChange('journal')}
              className={`p-3 border-2 border-black flex flex-col items-center space-y-1 transition-all ${
                currentView === 'journal'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white hover:bg-accent'
              }`}
              style={{ boxShadow: '2px 2px 0px #000000' }}
            >
              <BookOpen className="w-5 h-5" />
              <div className="text-center">
                <div className="font-mono text-xs">Journal</div>
                {entries.length > 0 && (
                  <div className="font-mono text-xs opacity-70">
                    {entries.length}
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={() => handleViewChange('chat')}
              className={`p-3 border-2 border-black flex flex-col items-center space-y-1 transition-all ${
                currentView === 'chat'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white hover:bg-accent'
              }`}
              style={{ boxShadow: '2px 2px 0px #000000' }}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-mono text-xs">Ask AI</span>
            </button>
          </div>
        </nav>

        {/* Mobile content */}
        <div className="flex-1">
          {currentView === 'camera' && (
            <div className="p-4">
              <CameraCapture onCapture={handleCapture} />
            </div>
          )}
          {currentView === 'journal' && (
            <div className="h-full">
              <JournalList entries={entries} />
            </div>
          )}
          {currentView === 'chat' && (
            <div className="h-full">
              <ChatInterface entries={entries} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JournalHome;