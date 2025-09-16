import { useState, useCallback } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VisualizationState } from '../types';
import { supabase } from '../lib/supabase';

export const useVisualization = (
  updateVisualizationStatus?: (messageId: string, hasVisualization: boolean) => void,
  persistentVisualizationStates?: Record<string, any>,
  updatePersistentVisualizationState?: (messageId: string, state: any) => void
) => {
  const [visualizations, setVisualizations] = useState<Record<string, VisualizationState>>({});
  const [currentVisualization, setCurrentVisualization] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedScrollPosition, setSavedScrollPosition] = useState<number>(0);
  const [messageToHighlight, setMessageToHighlight] = useState<string | null>(null);

  const generateVisualization = useCallback(async (messageId: string, messageText: string) => {
    setIsGenerating(true);

    // Mark visualization as generating in persistent state
    if (updatePersistentVisualizationState) {
      updatePersistentVisualizationState(messageId, {
        isGenerating: true,
        content: null,
        hasVisualization: false
      });
    }

    // Also mark in database
    try {
      await supabase
        .from('astra_chats')
        .update({ 
          visualization: true,
          metadata: { visualization_generating: true }
        })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking visualization as generating:', error);
    }

    console.log('📊 Full message text being sent to Gemini:', messageText);
    console.log('📊 Message text length:', messageText.length);

    setVisualizations(prev => ({
      ...prev,
      [messageId]: {
        messageId,
        isGenerating: true,
        content: null,
        isVisible: false
      }
    }));

    try {
        // Get API key from environment
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        
        if (!apiKey) {
          throw new Error('Gemini API key not found');
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-2.5-flash',
          generationConfig: {
            temperature: 1.0,
            topK: 64,
            topP: 0.95,
            maxOutputTokens: 100000,
          }
        });

        const prompt = `Create a comprehensive visual dashboard to help understand the information in the message below.

DESIGN REQUIREMENTS:
- Use a dark theme with gray-900 (#111827) background
- Use gray-800 (#1f2937) and gray-700 (#374151) for card backgrounds
- Use white (#ffffff) and gray-300 (#d1d5db) for text
- Use blue (#3b82f6), purple (#8b5cf6), and cyan (#06b6d4) for accents and highlights
- Match the visual style of a modern dark dashboard
- Include proper spacing, rounded corners, and subtle shadows
- Use graphics, emojis, and charts as needed to enhance the visualization
- Include visual elements like progress bars, icons, charts, and infographics where appropriate
- Make the dashboard visually engaging with relevant emojis and graphical elements

MESSAGE TEXT:
${messageText}

Return only the HTML code - no other text or formatting.`;

      console.log('🤖 Generating visualization with Gemini...');
      console.log('🔧 Using settings: temperature=1.0, topK=64, maxTokens=100000');
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let cleanedContent = response.text();

      console.log('🔍 Raw Gemini response:', cleanedContent.substring(0, 500) + '...');

      // Clean up the response - remove markdown code blocks if present
      cleanedContent = cleanedContent.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();
      
      console.log('🧹 Cleaned content preview:', cleanedContent.substring(0, 500) + '...');

      // Ensure it starts with DOCTYPE if it's a complete HTML document
      if (!cleanedContent.toLowerCase().includes('<!doctype') && !cleanedContent.toLowerCase().includes('<html')) {
        cleanedContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Visualization</title>
    <style>
        body { 
            background: #111827; 
            color: white; 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
        }
    </style>
</head>
<body>
    ${cleanedContent}
</body>
</html>`;
      }

      console.log('✅ Visualization generated successfully');

      // Save visualization to database
      try {
        const { error: updateError } = await supabase
          .from('astra_chats')
          .update({ 
            visualization_data: cleanedContent,
            visualization: true,
            metadata: { visualization_generating: false }
          })
          .eq('id', messageId);

        if (updateError) {
          console.error('❌ Error saving visualization to database:', updateError);
        } else {
          console.log('✅ Visualization saved to database for message:', messageId);
        }
      } catch (dbError) {
        console.error('❌ Database error while saving visualization:', dbError);
      }
      
      // Update persistent state
      if (updatePersistentVisualizationState) {
        updatePersistentVisualizationState(messageId, {
          isGenerating: false,
          content: cleanedContent,
          hasVisualization: true
        });
      }

      setVisualizations(prev => ({
        ...prev,
        [messageId]: {
          messageId,
          isGenerating: false,
          content: cleanedContent,
          isVisible: false
        }
      }));

      // Note: Database update will be handled by the calling component
    } catch (error) {
      console.error('❌ Error generating visualization:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update persistent state with error
      if (updatePersistentVisualizationState) {
        updatePersistentVisualizationState(messageId, {
          isGenerating: false,
          content: null,
          hasVisualization: false,
          error: errorMessage
        });
      }

      setVisualizations(prev => ({
        ...prev,
        [messageId]: {
          messageId,
          isGenerating: false,
          content: `<div style="padding: 20px; text-align: center; color: #ef4444; background: #1f2937; border-radius: 8px;">
            <h3>Failed to generate visualization</h3>
            <p>Error: ${errorMessage}</p>
            <p>Please try again.</p>
          </div>`,
          isVisible: false
        }
      }));
      
      // Also update database to mark as failed
      try {
        await supabase
          .from('astra_chats')
          .update({ 
            metadata: { visualization_generating: false, visualization_error: errorMessage }
          })
          .eq('id', messageId);
      } catch (dbError) {
        console.error('Error updating database with visualization error:', dbError);
      }
    } finally {
      setIsGenerating(false);
    }
  }, [updateVisualizationStatus, updatePersistentVisualizationState]);

  const showVisualization = useCallback((messageId: string) => {
    // Save current scroll position before showing visualization
    const scrollContainer = document.querySelector('.chat-messages-container');
    if (scrollContainer) {
      setSavedScrollPosition(scrollContainer.scrollTop);
    }
    setMessageToHighlight(messageId);
    setCurrentVisualization(messageId);
    
    console.log('🎯 useVisualization: showVisualization called for messageId:', messageId);
    console.log('🎯 useVisualization: Current visualizations state:', Object.keys(visualizations));
    console.log('🎯 useVisualization: Visualization exists for messageId:', !!visualizations[messageId]);
    
    setVisualizations(prev => ({
      ...prev,
      [messageId]: {
        ...(prev[messageId] || { messageId, isGenerating: false, content: null }),
        isVisible: true
      }
    }));
  }, []);
  
  // Add a method to manually set visualization content
  const setVisualizationContent = useCallback((messageId: string, content: string) => {
    console.log('🔧 useVisualization: Setting visualization content for messageId:', messageId);
    setVisualizations(prev => ({
      ...prev,
      [messageId]: {
        messageId,
        isGenerating: false,
        content,
        isVisible: false
      }
    }));
  }, []);

  const hideVisualization = useCallback(() => {
    setCurrentVisualization(null);
    
    // Restore scroll position after a short delay
    setTimeout(() => {
      const scrollContainer = document.querySelector('.chat-messages-container');
      if (scrollContainer && savedScrollPosition > 0) {
        scrollContainer.scrollTo({
          top: savedScrollPosition,
          behavior: 'smooth'
        });
      }
      
      // Highlight the message briefly
      if (messageToHighlight) {
        const messageElement = document.getElementById(`message-${messageToHighlight}`);
        if (messageElement) {
          messageElement.classList.add('message-highlight');
          setTimeout(() => {
            messageElement.classList.remove('message-highlight');
          }, 3000);
        }
      }
    }, 100);
  }, [messageToHighlight, savedScrollPosition]);

  const getVisualization = useCallback((messageId: string) => {
    // Check persistent state first, then local state
    if (persistentVisualizationStates && persistentVisualizationStates[messageId]) {
      return persistentVisualizationStates[messageId];
    }
    return visualizations[messageId] || null;
  }, [visualizations]);

  const clearHighlight = useCallback(() => {
    setMessageToHighlight(null);
    setSavedScrollPosition(0);
  }, []);
  
  return {
    generateVisualization,
    showVisualization,
    setVisualizationContent,
    hideVisualization,
    getVisualization,
    currentVisualization,
    isGenerating,
    messageToHighlight,
    clearHighlight
  };
};