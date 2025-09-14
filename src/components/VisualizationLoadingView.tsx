import React from 'react';
import { BarChart3 } from 'lucide-react';

export const VisualizationLoadingView: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center px-6">
      {/* Chart Icon with Animation */}
      <div className="mb-8">
        <div className="relative">
          <BarChart3 className="w-16 h-16 text-blue-500 animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 rounded-lg animate-ping"></div>
        </div>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
        Generating Your Visualization
      </h1>

      {/* Subtitle */}
      <p className="text-gray-300 text-center text-lg mb-8 max-w-md">
        Astra is analyzing your data and creating an interactive visualization. This may take a few moments.
      </p>

      {/* Loading Dots */}
      <div className="flex space-x-2 mb-12">
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>

      {/* Creating Section */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold text-white mb-4">Creating:</h2>
        <ul className="space-y-3 text-gray-300">
          <li className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Interactive charts and graphs</span>
          </li>
          <li className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Data analysis and insights</span>
          </li>
          <li className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>Visual dashboard layout</span>
          </li>
          <li className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span>Responsive design elements</span>
          </li>
        </ul>
      </div>
    </div>
  );
};