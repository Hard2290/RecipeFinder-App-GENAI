import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardHeader, CardContent } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Clock, ChefHat, Zap, Timer, X, Users, Eye, Mic, MicOff, Filter, Trash2, Heart, BookOpen, User, LogOut } from 'lucide-react';
import axios from 'axios';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginModal from './components/Auth/LoginModal';
import YourRecipesPage from './components/YourRecipes/YourRecipesPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const RecipeFinderApp = () => {
  const [ingredients, setIngredients] = useState('');
  const [ingredientTags, setIngredientTags] = useState([]);
  const [recipes, setRecipes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Authentication and recipe management states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isYourRecipesOpen, setIsYourRecipesOpen] = useState(false);
  const [savedRecipeIds, setSavedRecipeIds] = useState(new Set());
  
  const { user, logout, getAuthHeaders, isAuthenticated } = useAuth();
  
  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  
  // Ref to get current ingredients value in voice callback
  const ingredientsRef = useRef('');
  
  // Cuisine filter state
  const [selectedCuisine, setSelectedCuisine] = useState('any');
  
  // Cuisine options
  const cuisineOptions = [
    { value: 'any', label: 'Any Cuisine' },
    { value: 'italian', label: '🇮🇹 Italian' },
    { value: 'chinese', label: '🇨🇳 Chinese' },
    { value: 'indian', label: '🇮🇳 Indian' },
    { value: 'mexican', label: '🇲🇽 Mexican' },
    { value: 'japanese', label: '🇯🇵 Japanese' },
    { value: 'thai', label: '🇹🇭 Thai' },
    { value: 'mediterranean', label: '🌊 Mediterranean' },
    { value: 'french', label: '🇫🇷 French' },
    { value: 'american', label: '🇺🇸 American' },
    { value: 'korean', label: '🇰🇷 Korean' },
    { value: 'spanish', label: '🇪🇸 Spanish' },
    { value: 'greek', label: '🇬🇷 Greek' },
    { value: 'turkish', label: '🇹🇷 Turkish' },
    { value: 'lebanese', label: '🇱🇧 Lebanese' }
  ];
  
  // Recipe saving functions
  const saveRecipe = async (recipe) => {
    if (!isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      console.log('Saving recipe:', recipe);
      const response = await axios.post(`${BACKEND_URL}/api/recipes/save-favorite`, {
        recipe_data: recipe
      }, {
        headers: getAuthHeaders()
      });
      
      console.log('Recipe saved successfully:', response.data);
      setSavedRecipeIds(prev => new Set([...prev, recipe.id]));
    } catch (error) {
      console.error('Error saving recipe:', error);
      console.error('Error details:', error.response?.data);
      if (error.response?.status === 400) {
        // Recipe already saved - just update UI
        setSavedRecipeIds(prev => new Set([...prev, recipe.id]));
      } else {
        setError('Failed to save recipe. Please try again.');
      }
    }
  };

  const unsaveRecipe = async (recipe) => {
    try {
      console.log('Removing recipe:', recipe.id);
      await axios.delete(`${BACKEND_URL}/api/recipes/remove-favorite/${recipe.id}`, {
        headers: getAuthHeaders()
      });
      
      console.log('Recipe removed successfully');
      setSavedRecipeIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(recipe.id);
        return newSet;
      });
    } catch (error) {
      console.error('Error removing recipe:', error);
      setError('Failed to remove recipe. Please try again.');
    }
  };

  // Load saved recipe IDs when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const loadSavedRecipes = async () => {
        try {
          console.log('Loading saved recipes...');
          const response = await axios.get(`${BACKEND_URL}/api/recipes/favorites`, {
            headers: getAuthHeaders()
          });
          console.log('Saved recipes response:', response.data);
          const savedIds = new Set(response.data.recipes.map(recipe => recipe.id));
          console.log('Saved recipe IDs:', savedIds);
          setSavedRecipeIds(savedIds);
        } catch (error) {
          console.error('Error loading saved recipes:', error);
        }
      };
      loadSavedRecipes();
    } else {
      setSavedRecipeIds(new Set());
    }
  }, [isAuthenticated, getAuthHeaders]);

  const openRecipeModal = (recipe) => {
    setSelectedRecipe(recipe);
    setIsModalOpen(true);
  };
  
  const closeRecipeModal = () => {
    setIsModalOpen(false);
    setSelectedRecipe(null);
  };

  // Voice recognition functions
  const startListening = () => {
    if (recognition && !isListening) {
      console.log('Starting voice recognition...');
      console.log('Current ingredients before voice:', ingredients);
      setError('');
      setIsListening(true);
      
      try {
        recognition.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
        setError('Could not start voice recognition. Please try again.');
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      console.log('Stopping voice recognition...');
      recognition.stop();
      setIsListening(false);
    }
  };

  // Clear all ingredients function
  const clearAllIngredients = () => {
    setIngredients('');
    ingredientsRef.current = ''; // Clear ref too
    setIngredientTags([]);
    setRecipes(null);
    setError('');
  };
  
  // Floating food icons
  const foodIcons = ['🍅', '🥕', '🧄', '🧅', '🥬', '🌶️', '🍄', '🥒', '🥖'];
  const [floatingIcons, setFloatingIcons] = useState([]);
  
  // Cooking tips
  const cookingTips = [
    "Fresh ingredients make the biggest difference!",
    "Don't be afraid to experiment with spices!",
    "Taste as you cook and adjust seasoning!",
    "Mise en place - prep everything before cooking!",
    "Cook with love and your food will taste amazing!"
  ];
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    // Keep ref in sync with ingredients state
    ingredientsRef.current = ingredients;
  }, [ingredients]);

  useEffect(() => {
    // Initialize floating icons
    const icons = foodIcons.map((icon, index) => ({
      id: index,
      icon,
      style: {
        left: `${Math.random() * 90}%`,
        animationDelay: `${Math.random() * 20}s`,
        fontSize: `${1.5 + Math.random() * 1}rem`
      }
    }));
    setFloatingIcons(icons);

    // Rotate cooking tips
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % cookingTips.length);
    }, 4000);

    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        
        if (!transcript) {
          setIsListening(false);
          return;
        }
        
        // Process the transcript to separate ingredients
        // Split by common separators and add commas between recognized ingredients
        const processedTranscript = transcript
          .toLowerCase()
          .replace(/\s+and\s+/g, ', ')  // Replace "and" with commas
          .replace(/\s+with\s+/g, ', ') // Replace "with" with commas  
          .replace(/\s*,\s*/g, ', ')    // Normalize existing commas
          .split(/\s+/)                 // Split by spaces to get individual words
          .filter(word => word.length > 2) // Filter out very short words
          .join(', ');                  // Join with commas
        
        // Always add to existing ingredients (cumulative) - use ref for current value
        const currentValue = ingredientsRef.current.trim();
        const newValue = currentValue ? `${currentValue}, ${processedTranscript}` : processedTranscript;
        
        console.log('Voice Input - Current from ref:', currentValue);
        console.log('Voice Input - New transcript:', processedTranscript);
        console.log('Voice Input - Final value:', newValue);
        
        setIngredients(newValue);
        ingredientsRef.current = newValue; // Update ref
        handleIngredientInput({ target: { value: newValue } });
        setIsListening(false);
        
        // Clear any existing error
        setError('');
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError(`Voice recognition error: ${event.error}. Please try again or use text input.`);
        setIsListening(false);
      };
      
      recognitionInstance.onstart = () => {
        console.log('Voice recognition started');
        setError(''); // Clear any existing errors when starting
      };
      
      recognitionInstance.onend = () => {
        console.log('Voice recognition ended');
        setIsListening(false);
      };
      
      setRecognition(recognitionInstance);
      setVoiceSupported(true);
    } else {
      setVoiceSupported(false);
    }

    // Fix ResizeObserver error by catching and ignoring it
    const resizeObserverErrorHandler = (e) => {
      if (e.message === 'ResizeObserver loop completed with undelivered notifications.') {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener('error', resizeObserverErrorHandler);

    return () => {
      clearInterval(tipInterval);
      window.removeEventListener('error', resizeObserverErrorHandler);
    };
  }, []);

  const FloatingFoodIcons = () => (
    <div className="floating-icons">
      {floatingIcons.map((item) => (
        <div
          key={item.id}
          className="floating-icon"
          style={item.style}
        >
          {item.icon}
        </div>
      ))}
    </div>
  );

  const handleIngredientInput = (e) => {
    const value = e.target.value;
    setIngredients(value);
    ingredientsRef.current = value; // Keep ref updated
    
    // Create tags from comma-separated ingredients
    if (value.trim()) {
      const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag);
      setIngredientTags(tags);
    } else {
      setIngredientTags([]);
    }
  };

  const removeIngredientTag = (indexToRemove) => {
    const newTags = ingredientTags.filter((_, index) => index !== indexToRemove);
    setIngredientTags(newTags);
    setIngredients(newTags.join(', '));
  };

  const searchRecipes = async () => {
    if (!ingredients.trim()) {
      setError('Please enter at least 2 ingredients');
      return;
    }

    const ingredientCount = ingredients.split(',').filter(ing => ing.trim()).length;
    if (ingredientCount < 2) {
      setError('Please enter at least 2 ingredients');
      return;
    }

    setLoading(true);
    setError('');
    setRecipes(null); // Clear previous results immediately

    try {
      const response = await axios.post(`${BACKEND_URL}/api/recipes/search`, {
        ingredients: ingredients.trim(),
        cuisine: selectedCuisine,
        number: 100
      }, {
        timeout: 120000 // 2 minute timeout
      });

      setRecipes(response.data);
    } catch (err) {
      console.error('Error searching recipes:', err);
      
      // Enhanced error handling with specific messages
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        setError('AI service is taking longer than usual to generate recipes. This can happen during peak usage. Please try again in a moment.');
      } else if (err.response?.status === 504) {
        setError('Gateway timeout. The AI service is temporarily overloaded. Please try again in a few minutes.');
      } else if (err.response?.status === 502) {
        setError('AI service temporarily unavailable. Please try again in a moment.');
      } else if (err.response?.status === 422) {
        setError('Invalid ingredients format. Please check your input and try again.');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else if (err.response?.data?.detail) {
        setError(`Error: ${err.response.data.detail}`);
      } else if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setError('Unable to connect to recipe service. Please check your internet connection and try again.');
      } else if (err.response?.status === 0 || !err.response) {
        setError('Cannot reach the recipe service. Please check your internet connection and try again.');
      } else {
        setError('Unable to generate recipes at the moment. Please try again in a few minutes.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchRecipes();
    }
  };

  const RecipeModal = ({ recipe }) => {
    if (!recipe) return null;

    return (
      <>
        <DialogHeader>
          <DialogTitle className="recipe-modal-title">{recipe.title}</DialogTitle>
        </DialogHeader>
        
        <div className="recipe-modal-content">
          <div className="recipe-modal-info">
            <div className="recipe-modal-stats">
              <div className="stat-item">
                <Clock className="stat-icon" />
                <span>{recipe.readyInMinutes} min</span>
              </div>
              <div className="stat-item">
                <Users className="stat-icon" />
                <span>{recipe.servings} servings</span>
              </div>
              <div className="stat-item">
                <div className="calories-large">
                  <span className="calories-number-large">{Math.round(recipe.nutrition.calories)}</span>
                  <span className="calories-text-large">cal</span>
                </div>
              </div>
            </div>
            
            <div className="ingredients-section">
              <h3>Ingredients</h3>
              <div className="ingredients-list-detailed">
                {recipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="ingredient-item">
                    <span className="ingredient-bullet">•</span>
                    <span className="ingredient-name">{ingredient}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="instructions-section">
              <h3>Cooking Instructions</h3>
              <div className="instructions-list">
                {recipe.instructions && recipe.instructions.length > 0 ? (
                  recipe.instructions.map((instruction, index) => (
                    <div key={index} className="instruction-item">
                      <span className="instruction-number">{index + 1}</span>
                      <span className="instruction-text">{instruction}</span>
                    </div>
                  ))
                ) : (
                  <p className="no-instructions">Cooking instructions not available for this recipe.</p>
                )}
              </div>
            </div>
            
            <div className="nutrition-detailed">
              <h3>Nutritional Information</h3>
              <div className="nutrition-grid">
                <div className="nutrition-detail-item">
                  <span className="nutrition-label">Protein</span>
                  <span className="nutrition-value">{Math.round(recipe.nutrition.protein)}g</span>
                  <Progress value={(recipe.nutrition.protein / 50) * 100} className="nutrition-bar nutrition-protein" />
                </div>
                <div className="nutrition-detail-item">
                  <span className="nutrition-label">Carbohydrates</span>
                  <span className="nutrition-value">{Math.round(recipe.nutrition.carbs)}g</span>
                  <Progress value={(recipe.nutrition.carbs / 80) * 100} className="nutrition-bar nutrition-carbs" />
                </div>
                <div className="nutrition-detail-item">
                  <span className="nutrition-label">Fats</span>
                  <span className="nutrition-value">{Math.round(recipe.nutrition.fat)}g</span>
                  <Progress value={(recipe.nutrition.fat / 30) * 100} className="nutrition-bar nutrition-fats" />
                </div>
                <div className="nutrition-detail-item">
                  <span className="nutrition-label">Fiber</span>
                  <span className="nutrition-value">{Math.round(recipe.nutrition.fiber)}g</span>
                  <Progress value={(recipe.nutrition.fiber / 25) * 100} className="nutrition-bar nutrition-fiber" />
                </div>
              </div>
            </div>
            
            <div className="recipe-notes">
              <h3>Recipe Notes</h3>
              <p>This {recipe.hasOnionGarlic ? 'traditional' : 'onion-garlic free'} recipe serves {recipe.servings} people and can be prepared in approximately {recipe.readyInMinutes} minutes.</p>
              <p>Perfect for a {recipe.readyInMinutes < 20 ? 'quick meal' : recipe.readyInMinutes < 45 ? 'medium-prep dish' : 'leisurely cooking session'} when you have {recipe.ingredients.slice(0, 3).join(', ')} available.</p>
            </div>
          </div>
        </div>
      </>
    );
  };

  const RecipeCard = ({ recipe }) => {
    const nutrition = recipe.nutrition;
    const maxNutrient = Math.max(nutrition.protein, nutrition.carbs, nutrition.fat, nutrition.fiber);
    const isSaved = savedRecipeIds.has(recipe.id);

    const handleSaveToggle = (e) => {
      e.stopPropagation();
      if (isSaved) {
        unsaveRecipe(recipe);
      } else {
        saveRecipe(recipe);
      }
    };

    return (
      <Card className="recipe-card h-full">
        <div className="recipe-header-actions">
          <div className="recipe-time-badge-header">
            <Clock className="w-3 h-3" />
            <span>{recipe.readyInMinutes} min</span>
          </div>
          
          <button 
            className={`heart-btn ${isSaved ? 'saved' : ''}`}
            onClick={handleSaveToggle}
            title={isSaved ? 'Remove from favorites' : 'Save to favorites'}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'filled' : ''}`} />
          </button>
        </div>
        
        <CardHeader className="pb-2">
          <h3 className="recipe-title">{recipe.title}</h3>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="recipe-calories">
            <span className="calories-number">{Math.round(nutrition.calories)}</span>
            <span className="calories-text">cal</span>
          </div>
          
          <div className="nutrition-bars">
            <div className="nutrition-item">
              <div className="nutrition-label">
                <span>Protein</span>
                <span>{Math.round(nutrition.protein)}g</span>
              </div>
              <Progress 
                value={(nutrition.protein / maxNutrient) * 100} 
                className="nutrition-bar nutrition-protein"
              />
            </div>
            
            <div className="nutrition-item">
              <div className="nutrition-label">
                <span>Carbs</span>
                <span>{Math.round(nutrition.carbs)}g</span>
              </div>
              <Progress 
                value={(nutrition.carbs / maxNutrient) * 100} 
                className="nutrition-bar nutrition-carbs"
              />
            </div>
            
            <div className="nutrition-item">
              <div className="nutrition-label">
                <span>Fats</span>
                <span>{Math.round(nutrition.fat)}g</span>
              </div>
              <Progress 
                value={(nutrition.fat / maxNutrient) * 100} 
                className="nutrition-bar nutrition-fats"
              />
            </div>
            
            <div className="nutrition-item">
              <div className="nutrition-label">
                <span>Fiber</span>
                <span>{Math.round(nutrition.fiber)}g</span>
              </div>
              <Progress 
                value={(nutrition.fiber / maxNutrient) * 100} 
                className="nutrition-bar nutrition-fiber"
              />
            </div>
          </div>
          
          <Button 
            className="view-recipe-btn" 
            size="sm"
            onClick={() => openRecipeModal(recipe)}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Recipe
          </Button>
        </CardContent>
      </Card>
    );
  };

  const RecipeSection = ({ title, recipeList }) => {
    if (!recipeList || recipeList.length === 0) {
      return (
        <div className="recipe-section">
          <h3 className="section-title">{title}</h3>
          <p className="no-recipes">No recipes found for this category. Try different ingredients!</p>
        </div>
      );
    }

    return (
      <div className="recipe-section">
        <h3 className="section-title">{title} ({recipeList.length} recipes)</h3>
        <div className="recipe-grid">
          {recipeList.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <FloatingFoodIcons />
      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="header-content">
            <div className="header-top">
              <div className="logo-section">
                <ChefHat className="logo-icon" />
                <h1 className="app-title">My Kitchen Recipe Finder</h1>
              </div>
              
              <div className="auth-section">
                {isAuthenticated ? (
                  <div className="user-menu">
                    <Button
                      onClick={() => setIsYourRecipesOpen(true)}
                      className="your-recipes-btn"
                      variant="outline"
                    >
                      <BookOpen className="w-4 h-4 mr-2" />
                      Your Recipes
                    </Button>
                    
                    <div className="user-info">
                      <User className="w-4 h-4" />
                      <span>{user?.name}</span>
                    </div>
                    
                    <Button
                      onClick={logout}
                      className="logout-btn"
                      variant="outline"
                      size="sm"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsLoginModalOpen(true)}
                    className="login-btn"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                )}
              </div>
            </div>
            
            <p className="app-subtitle">Transform your kitchen ingredients into culinary masterpieces</p>
            <div className="motivation-text">
              <span>Start your cooking adventure today!</span>
            </div>
          </div>
        </header>

        {/* Search Section */}
        <section className="search-section">
          <div className="search-container">
            {/* Cuisine Filter */}
            <div className="filter-container">
              <div className="cuisine-filter">
                <Filter className="filter-icon" />
                <div className="cuisine-select-wrapper">
                  <select 
                    value={selectedCuisine} 
                    onChange={(e) => setSelectedCuisine(e.target.value)}
                    className="cuisine-select-native"
                  >
                    {cuisineOptions.map((cuisine) => (
                      <option key={cuisine.value} value={cuisine.value}>
                        {cuisine.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="input-container">
              <div className="input-with-voice">
                <Input
                  type="text"
                  placeholder="What's in your kitchen? Try saying it aloud! (e.g., chicken, rice, tomatoes)"
                  value={ingredients}
                  onChange={handleIngredientInput}
                  onKeyPress={handleKeyPress}
                  className="ingredient-input"
                />
                <div className="voice-controls">
                  {voiceSupported && (
                    <Button
                      type="button"
                      onClick={isListening ? stopListening : startListening}
                      className={`voice-button ${isListening ? 'listening' : ''}`}
                      disabled={loading}
                      title={ingredientTags.length > 0 ? 'Add more ingredients with voice' : 'Add ingredients with voice'}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-5 h-5" />
                          <span className="voice-indicator">Listening...</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-5 h-5" />
                          <span className="voice-text">
                            {ingredientTags.length > 0 ? 'Add More' : 'Voice'}
                          </span>
                        </>
                      )}
                    </Button>
                  )}
                  {ingredientTags.length > 0 && (
                    <Button
                      type="button"
                      onClick={clearAllIngredients}
                      className="clear-button"
                      variant="outline"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="clear-text">Clear</span>
                    </Button>
                  )}
                </div>
              </div>
              <Button 
                onClick={searchRecipes}
                disabled={loading}
                className="search-button"
              >
                {loading ? (
                  <>
                    <div className="search-loading-spinner"></div>
                    Cooking Up Magic...
                  </>
                ) : (
                  <>
                    <ChefHat className="w-5 h-5 mr-2" />
                    Find Recipes
                  </>
                )}
              </Button>
            </div>
            
            {/* Ingredient Tags */}
            {ingredientTags.length > 0 && (
              <div className="ingredient-tags">
                <span className="tags-label">Your Ingredients:</span>
                {ingredientTags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="ingredient-tag">
                    {tag}
                    <X 
                      className="tag-remove" 
                      onClick={() => removeIngredientTag(index)}
                    />
                  </Badge>
                ))}
              </div>
            )}

            {/* Cooking Tips */}
            {!loading && !recipes && !error && ingredientTags.length === 0 && (
              <div className="cooking-tips">
                <div className="cooking-tip-text-enhanced">
                  💡 {cookingTips[currentTip]}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>
        </section>

        {/* Results Section */}
        {recipes && (
          <section className="results-section">
            <Tabs defaultValue="low" className="recipe-tabs">
              <TabsList className="tabs-list">
                <TabsTrigger value="low" className="tab-trigger tab-low">
                  <Zap className="tab-icon" />
                  <span>LOW</span>
                  <span className="tab-time">Under 20 min</span>
                </TabsTrigger>
                <TabsTrigger value="medium" className="tab-trigger tab-medium">
                  <Timer className="tab-icon" />
                  <span>MEDIUM</span>
                  <span className="tab-time">20-45 min</span>
                </TabsTrigger>
                <TabsTrigger value="high" className="tab-trigger tab-high">
                  <Clock className="tab-icon" />
                  <span>HIGH</span>
                  <span className="tab-time">Over 45 min</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="low" className="tab-content">
                <RecipeSection 
                  title="✅ With Onion-Garlic" 
                  recipeList={recipes.low.with_onion_garlic} 
                />
                <RecipeSection 
                  title="🚫 Without Onion-Garlic" 
                  recipeList={recipes.low.without_onion_garlic} 
                />
              </TabsContent>

              <TabsContent value="medium" className="tab-content">
                <RecipeSection 
                  title="✅ With Onion-Garlic" 
                  recipeList={recipes.medium.with_onion_garlic} 
                />
                <RecipeSection 
                  title="🚫 Without Onion-Garlic" 
                  recipeList={recipes.medium.without_onion_garlic} 
                />
              </TabsContent>

              <TabsContent value="high" className="tab-content">
                <RecipeSection 
                  title="✅ With Onion-Garlic" 
                  recipeList={recipes.high.with_onion_garlic} 
                />
                <RecipeSection 
                  title="🚫 Without Onion-Garlic" 
                  recipeList={recipes.high.without_onion_garlic} 
                />
              </TabsContent>
            </Tabs>
          </section>
        )}

        {loading && (
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <p>Searching for delicious recipes...</p>
          </div>
        )}
        
        {/* Recipe Modal - Outside of recipe cards to prevent re-rendering */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent 
            className="recipe-modal max-w-4xl" 
            onInteractOutside={(e) => e.preventDefault()}
          >
            {selectedRecipe && (
              <>
                <DialogHeader>
                  <DialogTitle className="recipe-modal-title">{selectedRecipe.title}</DialogTitle>
                </DialogHeader>
                
                <div className="recipe-modal-content">
                  <div className="recipe-modal-info">
                    <div className="recipe-modal-stats">
                      <div className="stat-item">
                        <Clock className="stat-icon" />
                        <span>{selectedRecipe.readyInMinutes} min</span>
                      </div>
                      <div className="stat-item">
                        <Users className="stat-icon" />
                        <span>{selectedRecipe.servings} servings</span>
                      </div>
                      <div className="stat-item">
                        <div className="calories-large">
                          <span className="calories-number-large">{Math.round(selectedRecipe.nutrition.calories)}</span>
                          <span className="calories-text-large">cal</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ingredients-section">
                      <h3>Ingredients</h3>
                      <div className="ingredients-list-detailed">
                        {selectedRecipe.ingredients.map((ingredient, index) => (
                          <div key={`ingredient-${index}`} className="ingredient-item">
                            <span className="ingredient-bullet">•</span>
                            <span className="ingredient-name">{ingredient}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="instructions-section">
                      <h3>Cooking Instructions</h3>
                      <div className="instructions-list">
                        {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 ? (
                          selectedRecipe.instructions.map((instruction, index) => (
                            <div key={`instruction-${index}`} className="instruction-item">
                              <span className="instruction-number">{index + 1}</span>
                              <span className="instruction-text">{instruction}</span>
                            </div>
                          ))
                        ) : (
                          <p className="no-instructions">Cooking instructions not available for this recipe.</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="nutrition-detailed">
                      <h3>Nutritional Information</h3>
                      <div className="nutrition-grid">
                        <div className="nutrition-detail-item">
                          <span className="nutrition-label">Protein</span>
                          <span className="nutrition-value">{Math.round(selectedRecipe.nutrition.protein)}g</span>
                          <Progress value={(selectedRecipe.nutrition.protein / 50) * 100} className="nutrition-bar nutrition-protein" />
                        </div>
                        <div className="nutrition-detail-item">
                          <span className="nutrition-label">Carbohydrates</span>
                          <span className="nutrition-value">{Math.round(selectedRecipe.nutrition.carbs)}g</span>
                          <Progress value={(selectedRecipe.nutrition.carbs / 80) * 100} className="nutrition-bar nutrition-carbs" />
                        </div>
                        <div className="nutrition-detail-item">
                          <span className="nutrition-label">Fats</span>
                          <span className="nutrition-value">{Math.round(selectedRecipe.nutrition.fat)}g</span>
                          <Progress value={(selectedRecipe.nutrition.fat / 30) * 100} className="nutrition-bar nutrition-fats" />
                        </div>
                        <div className="nutrition-detail-item">
                          <span className="nutrition-label">Fiber</span>
                          <span className="nutrition-value">{Math.round(selectedRecipe.nutrition.fiber)}g</span>
                          <Progress value={(selectedRecipe.nutrition.fiber / 25) * 100} className="nutrition-bar nutrition-fiber" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="recipe-notes">
                      <h3>Recipe Notes</h3>
                      <p>This {selectedRecipe.hasOnionGarlic ? 'traditional' : 'onion-garlic free'} recipe serves {selectedRecipe.servings} people and can be prepared in approximately {selectedRecipe.readyInMinutes} minutes.</p>
                      <p>Perfect for a {selectedRecipe.readyInMinutes < 20 ? 'quick meal' : selectedRecipe.readyInMinutes < 45 ? 'medium-prep dish' : 'leisurely cooking session'} when you have {selectedRecipe.ingredients.slice(0, 3).join(', ')} available.</p>
                    </div>
                    
                    <div className="modal-close-section">
                      <Button 
                        onClick={closeRecipeModal}
                        className="close-modal-btn"
                        variant="outline"
                        size="lg"
                      >
                        Close Recipe
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Authentication Modal */}
        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />

        {/* Your Recipes Page */}
        <YourRecipesPage
          isOpen={isYourRecipesOpen}
          onClose={() => setIsYourRecipesOpen(false)}
        />
      </div>
    </div>
  );
};

// Main App wrapper with AuthProvider
const App = () => {
  return (
    <AuthProvider>
      <RecipeFinderApp />
    </AuthProvider>
  );
};

export default App;