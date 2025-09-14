import React from 'react';
import { BarChart3, RefreshCw, Check } from 'lucide-react';

interface VisualizationButtonProps {
  messageId: string;
  messageText: string;
  onCreateVisualization: (messageId: string, messageText: string) => void;
  onViewVisualization: (messageId: string) => void;
  visualizationState: any;
}

export const VisualizationButton: React.FC<VisualizationButtonProps> = ({
  messageId,
  messageText,
  onCreateVisualization,
  onViewVisualization,
  visualizationState
}) => {
  const handleClick = () => {
    if (visualizationState?.content) {
      onViewVisualization(messageId);
    } else {
      onCreateVisualization(messageId, messageText);
    }
  };

  const handleTryAgain = () => {
    onCreateVisualization(messageId, messageText);
  };

  const isGenerating = visualizationState?.isGenerating;
  const hasVisualization = visualizationState?.content;
  
  const buttonText = isGenerating
    ? 'Generating...'
    : hasVisualization
    ? 'View Visualization'
    : 'Create Visualization';

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={handleClick}
        disabled={isGenerating}
        className={`flex items-center space-x-2 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform disabled:scale-100 disabled:cursor-not-allowed min-h-[44px] touch-manipulation ${
          isGenerating
            ? 'bg-gradient-to-r from-purple-500 to-purple-600 animate-pulse cursor-not-allowed'
            : hasVisualization
            ? 'bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 bg-[length:200%_100%] animate-[gradient_3s_ease-in-out_infinite] hover:scale-105 shadow-lg'
            : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:scale-105'
        }`}
      >
        {hasVisualization && !isGenerating ? (
          <Check className="w-4 h-4" />
        ) : (
          <BarChart3 className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
        )}
        <span>{buttonText}</span>
        {isGenerating && (
          <div className="flex space-x-1 ml-1">
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        )}
      </button>
      
      {/* Retry button - only show when visualization exists */}
      {hasVisualization && !isGenerating && (
        <button
          onClick={handleTryAgain}
          className="flex items-center space-x-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 min-h-[44px] touch-manipulation"
          title="Generate a new visualization"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Retry</span>
        </button>
      )}
    </div>
  );
};
