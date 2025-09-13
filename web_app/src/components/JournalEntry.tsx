import React from 'react';
import { FileText, Calendar, Images } from 'lucide-react';

export interface JournalEntryData {
  id: string;
  text: string;
  timestamp: number;
  wordCount: number;
  mediaUrls?: string[];
}

interface JournalEntryProps {
  entry: JournalEntryData;
  onSelect?: (entry: JournalEntryData) => void;
}

const JournalEntry: React.FC<JournalEntryProps> = ({ entry, onSelect }) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div 
      className="border-2 border-black bg-white p-4 cursor-pointer hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 transition-all"
      style={{ boxShadow: '2px 2px 0px #000000' }}
      onClick={() => onSelect?.(entry)}
    >
      {/* Entry header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-black">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4" />
          <span className="font-mono text-sm">Entry #{entry.id.slice(0, 8)}</span>
        </div>
        <div className="flex items-center space-x-3 text-muted-foreground">
          {entry.mediaUrls && entry.mediaUrls.length > 0 && (
            <div className="flex items-center space-x-1">
              <Images className="w-4 h-4" />
              <span className="font-mono text-xs">{entry.mediaUrls.length}</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span className="font-mono text-xs">{formatDate(entry.timestamp)}</span>
          </div>
        </div>
      </div>

      {/* Entry content */}
      <div className="space-y-2">
        <p className="font-mono text-sm leading-relaxed">
          {truncateText(entry.text)}
        </p>
        {/* Optional tiny preview row */}
        {entry.mediaUrls && entry.mediaUrls.length > 0 && (
          <div className="flex space-x-1 pt-1">
            {entry.mediaUrls.slice(0, 3).map((url, idx) => (
              <img
                key={url + idx}
                src={url}
                alt=""
                className="w-8 h-8 object-cover border border-black"
              />
            ))}
            {entry.mediaUrls.length > 3 && (
              <div className="w-8 h-8 border border-black bg-muted flex items-center justify-center font-mono text-[10px]">+{entry.mediaUrls.length - 3}</div>
            )}
          </div>
        )}
        {/* Entry stats */}
        <div className="flex justify-between items-center pt-2 border-t border-muted text-xs text-muted-foreground font-mono">
          <span>{entry.wordCount} words</span>
          <span>Click to expand</span>
        </div>
      </div>
    </div>
  );
};

export default JournalEntry;