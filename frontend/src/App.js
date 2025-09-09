import React, { useState } from 'react';
import './App.css';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardHeader, CardContent } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Clock, ChefHat, Zap, Timer, X, Users, Eye } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const App = () => {
  const [ingredients, setIngredients] = useState('');
  const [ingredientTags, setIngredientTags] = useState([]);
  const [recipes, setRecipes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

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
        number: 100
      });

      setRecipes(response.data);
    } catch (err) {
      console.error('Error searching recipes:', err);
      if (err.response?.status === 504) {
        setError('Connection timeout. Please try again.');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('No recipes found. Try different ingredients.');
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

  const RecipeModal = ({ recipe, onClose }) => {
    if (!recipe) return null;

    return (
      <DialogContent className="recipe-modal max-w-4xl">
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
      </DialogContent>
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
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="view-recipe-btn" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                View Recipe
              </Button>
            </DialogTrigger>
            <RecipeModal recipe={recipe} />
          </Dialog>
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
      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="header-content">
            <div className="logo-section">
              <ChefHat className="logo-icon" />
              <h1 className="app-title">My Kitchen Recipe Finder</h1>
            </div>
            <p className="app-subtitle">Find delicious recipes with the ingredients you have</p>
          </div>
        </header>

        {/* Search Section */}
        <section className="search-section">
          <div className="search-container">
            <div className="input-container">
              <Input
                type="text"
                placeholder="Enter ingredients (e.g., chicken, rice, tomatoes, spinach)"
                value={ingredients}
                onChange={handleIngredientInput}
                onKeyPress={handleKeyPress}
                className="ingredient-input"
              />
              <Button 
                onClick={searchRecipes}
                disabled={loading}
                className="search-button"
              >
                {loading ? 'Searching...' : 'Find Recipes'}
              </Button>
            </div>
            
            {/* Ingredient Tags */}
            {ingredientTags.length > 0 && (
              <div className="ingredient-tags">
                <span className="tags-label">Ingredients:</span>
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
      </div>
    </div>
  );
};

export default App;