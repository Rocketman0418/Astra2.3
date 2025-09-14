import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface VisualizationViewProps {
  content: string;
  onBack: () => void;
}

export const VisualizationView: React.FC<VisualizationViewProps> = ({
  content,
  onBack
}) => {
  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
      <header className="bg-gradient-to-r from-blue-600 to-purple-700 shadow-lg">
        <div className="flex items-center py-4 px-6">
          <button
            onClick={onBack}
            className="mr-4 p-2 hover:bg-blue-700 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">
            Go Back to Chat
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 bg-gray-800">
        <div 
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </div>
  );
};