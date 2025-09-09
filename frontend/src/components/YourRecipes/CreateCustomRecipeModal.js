import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { X, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CreateCustomRecipeModal = ({ isOpen, onClose, onRecipeCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    ingredients: [],
    instructions: [],
    servings: 4
  });
  const [ingredientInput, setIngredientInput] = useState('');
  const [instructionInput, setInstructionInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { getAuthHeaders } = useAuth();

  const addIngredient = () => {
    if (ingredientInput.trim()) {
      setFormData({
        ...formData,
        ingredients: [...formData.ingredients, ingredientInput.trim()]
      });
      setIngredientInput('');
    }
  };

  const removeIngredient = (index) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index)
    });
  };

  const addInstruction = () => {
    if (instructionInput.trim()) {
      setFormData({
        ...formData,
        instructions: [...formData.instructions, instructionInput.trim()]
      });
      setInstructionInput('');
    }
  };

  const removeInstruction = (index) => {
    setFormData({
      ...formData,
      instructions: formData.instructions.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.ingredients.length < 2) {
      setError('Please add at least 2 ingredients');
      return;
    }
    
    if (formData.instructions.length < 1) {
      setError('Please add at least 1 instruction');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await axios.post(`${BACKEND_URL}/api/recipes/custom`, formData, {
        headers: getAuthHeaders()
      });
      
      onRecipeCreated();
      onClose();
      
      // Reset form
      setFormData({
        title: '',
        ingredients: [],
        instructions: [],
        servings: 4
      });
    } catch (error) {
      console.error('Error creating recipe:', error);
      setError(error.response?.data?.detail || 'Failed to create recipe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="create-recipe-modal max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="create-recipe-title">Cook Your Own Recipe</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="create-recipe-form">
          <div className="form-group">
            <label className="form-label">Recipe Title</label>
            <Input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter recipe name..."
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Servings</label>
            <Input
              type="number"
              min="1"
              max="20"
              value={formData.servings}
              onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) })}
              className="form-input servings-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Ingredients</label>
            <div className="add-item-section">
              <div className="add-item-input">
                <Input
                  type="text"
                  value={ingredientInput}
                  onChange={(e) => setIngredientInput(e.target.value)}
                  placeholder="Enter an ingredient..."
                  className="form-input"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                />
                <Button
                  type="button"
                  onClick={addIngredient}
                  className="add-btn"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="items-list">
              {formData.ingredients.map((ingredient, index) => (
                <Badge key={index} variant="secondary" className="item-badge">
                  {ingredient}
                  <X 
                    className="remove-item" 
                    onClick={() => removeIngredient(index)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Cooking Instructions</label>
            <div className="add-item-section">
              <div className="add-item-input">
                <textarea
                  value={instructionInput}
                  onChange={(e) => setInstructionInput(e.target.value)}
                  placeholder="Enter a cooking step..."
                  className="form-textarea"
                  rows="3"
                />
                <Button
                  type="button"
                  onClick={addInstruction}
                  className="add-btn"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="instructions-list">
              {formData.instructions.map((instruction, index) => (
                <div key={index} className="instruction-preview">
                  <span className="instruction-number">{index + 1}</span>
                  <span className="instruction-text">{instruction}</span>
                  <X 
                    className="remove-instruction" 
                    onClick={() => removeInstruction(index)}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="create-btn"
            >
              {loading ? (
                <>
                  <div className="loading-spinner-small"></div>
                  Creating Recipe...
                </>
              ) : (
                'Create Recipe'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCustomRecipeModal;