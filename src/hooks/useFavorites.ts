import { useState, useCallback, useEffect } from 'react';
import { FavoriteMessage } from '../types';

const FAVORITES_STORAGE_KEY = 'astra-favorite-messages';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteMessage[]>([]);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavorites(parsed.map((fav: any) => ({
          ...fav,
          createdAt: new Date(fav.createdAt)
        })));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, []);

  // Save favorites to localStorage whenever they change
  const saveFavorites = useCallback((newFavorites: FavoriteMessage[]) => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }, []);

  // Add a message to favorites
  const addToFavorites = useCallback((messageId: string, text: string) => {
    const newFavorite: FavoriteMessage = {
      id: messageId,
      text,
      createdAt: new Date()
    };

    const newFavorites = [newFavorite, ...favorites];
    saveFavorites(newFavorites);
  }, [favorites, saveFavorites]);

  // Remove a message from favorites
  const removeFromFavorites = useCallback((messageId: string) => {
    const newFavorites = favorites.filter(fav => fav.id !== messageId);
    saveFavorites(newFavorites);
  }, [favorites, saveFavorites]);

  // Check if a message is favorited
  const isFavorited = useCallback((messageId: string) => {
    return favorites.some(fav => fav.id === messageId);
  }, [favorites]);

  // Toggle favorite status
  const toggleFavorite = useCallback((messageId: string, text: string) => {
    if (isFavorited(messageId)) {
      removeFromFavorites(messageId);
    } else {
      addToFavorites(messageId, text);
    }
  }, [isFavorited, addToFavorites, removeFromFavorites]);

  return {
    favorites,
    addToFavorites,
    removeFromFavorites,
    isFavorited,
    toggleFavorite
  };
};