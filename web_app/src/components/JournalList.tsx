import React, { useState } from 'react';
import JournalEntry, { JournalEntryData } from './JournalEntry';
import { BookOpen, X, FileText } from 'lucide-react';

interface JournalListProps {
  entries: JournalEntryData[];
}

const JournalList: React.FC<JournalListProps> = ({ entries }) => {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntryData | null>(null);

  const handleSelectEntry = (entry: JournalEntryData) => {
    setSelectedEntry(entry);
  };

  const handleCloseEntry = () => {
    setSelectedEntry(null);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (selectedEntry) {
    return (
      <div className="h-full border-2 border-black bg-white">
        {/* Entry detail window title bar */}
        <div className="border-b-2 border-black p-4 bg-muted">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-black bg-white"></div>
              <span className="font-mono text-sm">Entry Detail</span>
            </div>
            <button
              onClick={handleCloseEntry}
              className="w-6 h-6 border-2 border-black bg-white hover:bg-accent flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Entry content */}
        <div className="p-6 space-y-4">
          <div className="border-b-2 border-black pb-4">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-5 h-5" />
              <span className="font-mono font-medium">Entry #{selectedEntry.id.slice(0, 8)}</span>
            </div>
            <p className="font-mono text-sm text-muted-foreground">
              Created: {formatDate(selectedEntry.timestamp)}
            </p>
            <p className="font-mono text-sm text-muted-foreground">
              Word count: {selectedEntry.wordCount}
            </p>
          </div>

          <div className="bg-muted border-2 border-black p-4">
            <p className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
              {selectedEntry.text}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full border-2 border-black bg-white">
      {/* Journal list window title bar */}
      <div className="border-b-2 border-black p-4 bg-muted">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-black bg-white"></div>
          <span className="font-mono text-sm">Journal Entries</span>
        </div>
      </div>

      {/* Entries list */}
      <div className="p-4">
        {entries.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="font-mono font-medium">No entries yet</h3>
              <p className="font-mono text-sm text-muted-foreground">
                Capture your first journal photo to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-b border-black pb-2 mb-4">
              <p className="font-mono text-sm text-muted-foreground">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              </p>
            </div>
            
            {entries.map((entry) => (
              <JournalEntry
                key={entry.id}
                entry={entry}
                onSelect={handleSelectEntry}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalList;