import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Card, CardHeader, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Heart, Utensils, Plus, Share2, Trash2, Clock, Users, Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import CreateCustomRecipeModal from './CreateCustomRecipeModal';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const YourRecipesPage = ({ isOpen, onClose }) => {
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [customRecipes, setCustomRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { getAuthHeaders } = useAuth();

  useEffect(() => {
    if (isOpen) {
      fetchRecipes();
    }
  }, [isOpen]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const [favoritesResponse, customResponse] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/recipes/favorites`, {
          headers: getAuthHeaders()
        }),
        axios.get(`${BACKEND_URL}/api/recipes/custom`, {
          headers: getAuthHeaders()
        })
      ]);

      setFavoriteRecipes(favoritesResponse.data.recipes || []);
      setCustomRecipes(customResponse.data.recipes || []);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomRecipe = async (recipeId) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/recipes/custom/${recipeId}`, {
        headers: getAuthHeaders()
      });
      setCustomRecipes(customRecipes.filter(recipe => recipe.id !== recipeId));
    } catch (error) {
      console.error('Error deleting recipe:', error);
    }
  };

  const handleRemoveFavorite = async (recipeId) => {
    try {
      await axios.delete(`${BACKEND_URL}/api/recipes/remove-favorite/${recipeId}`, {
        headers: getAuthHeaders()
      });
      setFavoriteRecipes(favoriteRecipes.filter(recipe => recipe.id !== recipeId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  const handleShare = (recipe, isCustom = false) => {
    const shareUrl = isCustom
      ? `${window.location.origin}/recipe/custom/${recipe.share_token}`
      : `${window.location.origin}/recipe/favorite/${recipe.share_token}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Recipe link copied to clipboard!');
    });
  };

  const openRecipeModal = (recipe) => {
    setSelectedRecipe(recipe);
    setIsRecipeModalOpen(true);
  };

  const RecipeCard = ({ recipe, isCustom = false, onDelete, onRemove }) => {
    const nutrition = recipe.nutrition;

    return (
      <Card className="recipe-card h-full">
        <div className="recipe-type-badge">
          {isCustom ? (
            <Utensils className="w-4 h-4 text-orange-600" />
          ) : (
            <Heart className="w-4 h-4 text-red-500" />
          )}
        </div>
        
        <CardHeader className="pb-2">
          <h3 className="recipe-title">{recipe.title}</h3>
          <div className="recipe-meta">
            <Badge variant="outline" className="time-badge">
              <Clock className="w-3 h-3 mr-1" />
              {recipe.readyInMinutes} min
            </Badge>
            <Badge variant="outline" className="servings-badge">
              <Users className="w-3 h-3 mr-1" />
              {recipe.servings} servings
            </Badge>
          </div>
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
                value={(nutrition.protein / 50) * 100} 
                className="nutrition-bar nutrition-protein"
              />
            </div>
            
            <div className="nutrition-item">
              <div className="nutrition-label">
                <span>Carbs</span>
                <span>{Math.round(nutrition.carbs)}g</span>
              </div>
              <Progress 
                value={(nutrition.carbs / 80) * 100} 
                className="nutrition-bar nutrition-carbs"
              />
            </div>
            
            <div className="nutrition-item">
              <div className="nutrition-label">
                <span>Fats</span>
                <span>{Math.round(nutrition.fat)}g</span>
              </div>
              <Progress 
                value={(nutrition.fat / 30) * 100} 
                className="nutrition-bar nutrition-fats"
              />
            </div>
          </div>
          
          <div className="recipe-actions">
            <Button 
              className="view-recipe-btn" 
              size="sm"
              onClick={() => openRecipeModal(recipe)}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Recipe
            </Button>
            
            <div className="recipe-action-buttons">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleShare(recipe, isCustom)}
                className="share-btn"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => isCustom ? onDelete(recipe.id) : onRemove(recipe.id)}
                className="delete-btn"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="your-recipes-modal max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="your-recipes-title">Your Recipe Collection</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="favorites" className="your-recipes-tabs">
            <TabsList className="tabs-list">
              <TabsTrigger value="favorites" className="tab-trigger">
                <Heart className="tab-icon" />
                <span>Favorite Recipes</span>
                <Badge variant="secondary" className="count-badge">
                  {favoriteRecipes.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="custom" className="tab-trigger">
                <Utensils className="tab-icon" />
                <span>My Custom Recipes</span>
                <Badge variant="secondary" className="count-badge">
                  {customRecipes.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="favorites" className="tab-content">
              <div className="recipes-section">
                <div className="section-header">
                  <h3>Your Favorite Recipes</h3>
                  <p>Recipes you've saved from search results</p>
                </div>
                
                {loading ? (
                  <div className="loading-section">
                    <div className="loading-spinner"></div>
                    <p>Loading your favorite recipes...</p>
                  </div>
                ) : favoriteRecipes.length > 0 ? (
                  <div className="recipe-grid">
                    {favoriteRecipes.map((recipe) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        isCustom={false}
                        onRemove={handleRemoveFavorite}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Heart className="empty-icon" />
                    <h4>No favorite recipes yet</h4>
                    <p>Start exploring recipes and save your favorites!</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="custom" className="tab-content">
              <div className="recipes-section">
                <div className="section-header">
                  <h3>Your Custom Recipes</h3>
                  <p>Recipes you've created and personalized</p>
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="create-recipe-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Cook Your Own
                  </Button>
                </div>
                
                {loading ? (
                  <div className="loading-section">
                    <div className="loading-spinner"></div>
                    <p>Loading your custom recipes...</p>
                  </div>
                ) : customRecipes.length > 0 ? (
                  <div className="recipe-grid">
                    {customRecipes.map((recipe) => (
                      <RecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        isCustom={true}
                        onDelete={handleDeleteCustomRecipe}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Utensils className="empty-icon" />
                    <h4>No custom recipes yet</h4>
                    <p>Create your first custom recipe!</p>
                    <Button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="create-first-recipe-btn"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Cook Your Own Recipe
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <CreateCustomRecipeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRecipeCreated={fetchRecipes}
      />

      {/* Recipe Detail Modal */}
      <Dialog open={isRecipeModalOpen} onOpenChange={setIsRecipeModalOpen}>
        <DialogContent className="recipe-modal max-w-4xl">
          {selectedRecipe && (
            <>
              <DialogHeader>
                <DialogTitle className="recipe-modal-title">{selectedRecipe.title}</DialogTitle>
              </DialogHeader>
              
              <div className="recipe-modal-content">
                {/* Recipe modal content similar to the existing RecipeModal */}
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
                      {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 ? (
                        selectedRecipe.instructions.map((instruction, index) => (
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
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default YourRecipesPage;