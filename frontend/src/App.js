import React, { useState } from 'react';
import './App.css';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardHeader, CardContent } from './components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Clock, ChefHat, Zap, Timer, X } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const App = () => {
  const [ingredients, setIngredients] = useState('');
  const [ingredientTags, setIngredientTags] = useState([]);
  const [recipes, setRecipes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const RecipeCard = ({ recipe }) => {
    const nutrition = recipe.nutrition;
    const maxNutrient = Math.max(nutrition.protein, nutrition.carbs, nutrition.fat, nutrition.fiber);

    return (
      <Card className="recipe-card h-full">
        <div className="recipe-image-container">
          <img 
            src={recipe.image || '/api/placeholder/300/200'} 
            alt={recipe.title}
            className="recipe-image"
            onError={(e) => {
              e.target.src = '/api/placeholder/300/200';
            }}
          />
          <div className="recipe-time-badge">
            <Clock className="w-3 h-3" />
            <span>{recipe.readyInMinutes} min</span>
          </div>
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
          
          <Button className="view-recipe-btn" size="sm">
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