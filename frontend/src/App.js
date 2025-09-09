import React, { useState, useEffect } from 'react';
import './App.css';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardHeader, CardContent } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Clock, ChefHat, Zap, Timer, X, Users, Eye, Mic, MicOff, Filter } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const App = () => {
  const [ingredients, setIngredients] = useState('');
  const [ingredientTags, setIngredientTags] = useState([]);
  const [recipes, setRecipes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Voice recognition states
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  
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
      setError('');
      setIsListening(true);
      recognition.start();
    }
  };

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  };
  
  // Floating food icons
  const foodIcons = ['🍅', '🥕', '🧄', '🧅', '🥬', '🌶️', '🍄', '🥒', '🥖'];
  const [floatingIcons, setFloatingIcons] = useState([]);
  
  // Cooking tips
  const cookingTips = [
    "💡 Fresh ingredients make the biggest difference!",
    "💡 Don't be afraid to experiment with spices!",
    "💡 Taste as you cook and adjust seasoning!",
    "💡 Mise en place - prep everything before cooking!",
    "💡 Cook with love and your food will taste amazing!"
  ];
  const [currentTip, setCurrentTip] = useState(0);

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
        const transcript = event.results[0][0].transcript;
        
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
        
        const currentValue = ingredients.trim();
        const newValue = currentValue ? `${currentValue}, ${processedTranscript}` : processedTranscript;
        setIngredients(newValue);
        handleIngredientInput({ target: { value: newValue } });
        setIsListening(false);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setError('Voice recognition error. Please try again or use text input.');
        setIsListening(false);
      };
      
      recognitionInstance.onend = () => {
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
      });

      setRecipes(response.data);
    } catch (err) {
      console.error('Error searching recipes:', err);
      if (err.response?.status === 504) {
        setError('Connection timeout. Please try again.');
      } else if (err.response?.status === 502) {
        setError('AI service temporarily unavailable. Please try again in a moment.');
      } else if (err.response?.status === 422) {
        setError('Invalid ingredients format. Please check your input and try again.');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else if (err.response?.data?.detail) {
        setError(`Error: ${err.response.data.detail}`);
      } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        setError('Network connection issue. Please check your connection and try again.');
      } else {
        setError('Unable to generate recipes. Please try different ingredients or check your internet connection.');
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

    return (
      <Card className="recipe-card h-full">
        <div className="recipe-time-badge-header">
          <Clock className="w-3 h-3" />
          <span>{recipe.readyInMinutes} min</span>
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
            <div className="logo-section">
              <ChefHat className="logo-icon" />
              <h1 className="app-title">My Kitchen Recipe Finder</h1>
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
                {voiceSupported && (
                  <Button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`voice-button ${isListening ? 'listening' : ''}`}
                    disabled={loading}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-5 h-5" />
                        <span className="voice-indicator">Listening...</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5" />
                        <span className="voice-text">Voice</span>
                      </>
                    )}
                  </Button>
                )}
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
                <div className="cooking-tip-text">
                  {cookingTips[currentTip]}
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
      </div>
    </div>
  );
};

export default App;