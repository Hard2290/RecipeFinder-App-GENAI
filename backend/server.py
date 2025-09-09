from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timedelta
from emergentintegrations.llm.chat import LlmChat, UserMessage
import hashlib
import secrets
import jwt


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Recipe Finder API", description="Find recipes based on ingredients with AI-powered generation")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# LLM configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DELTA = timedelta(days=30)

# Security
security = HTTPBearer()

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# User Authentication Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Custom Recipe Models
class CustomRecipeCreate(BaseModel):
    title: str
    ingredients: List[str]
    instructions: List[str]
    servings: int = 4

class CustomRecipe(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    ingredients: List[str]
    instructions: List[str]
    servings: int
    nutrition: 'RecipeNutrition'
    readyInMinutes: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    share_token: str = Field(default_factory=lambda: secrets.token_urlsafe(16))

# Saved Recipe Models
class SavedRecipe(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    recipe_data: Dict[str, Any]  # Store the full recipe JSON
    saved_at: datetime = Field(default_factory=datetime.utcnow)
    share_token: str = Field(default_factory=lambda: secrets.token_urlsafe(16))

class SaveRecipeRequest(BaseModel):
    recipe_data: Dict[str, Any]

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class RecipeSearchRequest(BaseModel):
    ingredients: str
    cuisine: Optional[str] = 'any'
    number: Optional[int] = 100

class NutrientInfo(BaseModel):
    name: str
    amount: float
    unit: str

class RecipeNutrition(BaseModel):
    calories: float
    protein: float
    carbs: float
    fat: float
    fiber: float

class Recipe(BaseModel):
    id: int
    title: str
    image: str
    readyInMinutes: int
    servings: int
    nutrition: RecipeNutrition
    hasOnionGarlic: bool
    ingredients: List[str]
    instructions: List[str]  # Added cooking instructions

class RecipeSearchResponse(BaseModel):
    low: Dict[str, List[Recipe]]
    medium: Dict[str, List[Recipe]]
    high: Dict[str, List[Recipe]]

# Helper functions
def has_onion_garlic(ingredients: List[str]) -> bool:
    """Check if recipe contains onion/garlic ingredients"""
    onion_garlic_keywords = [
        'onion', 'onions', 'garlic', 'garlics', 'shallot', 'shallots',
        'leek', 'leeks', 'scallion', 'scallions', 'chive', 'chives',
        'spring onion', 'green onion', 'pearl onion', 'red onion',
        'white onion', 'yellow onion', 'garlic powder', 'onion powder',
        'garlic paste', 'garlic clove', 'minced garlic'
    ]
    
    for ingredient in ingredients:
        ingredient_lower = ingredient.lower()
        for keyword in onion_garlic_keywords:
            if keyword in ingredient_lower:
                return True
    return False

def categorize_recipes(recipes: List[Recipe]) -> RecipeSearchResponse:
    """Categorize recipes by cooking time and dietary restrictions"""
    low_with = []
    low_without = []
    medium_with = []
    medium_without = []
    high_with = []
    high_without = []
    
    for recipe in recipes:
        # Categorize by time
        if recipe.readyInMinutes < 20:
            if recipe.hasOnionGarlic:
                low_with.append(recipe)
            else:
                low_without.append(recipe)
        elif 20 <= recipe.readyInMinutes <= 45:
            if recipe.hasOnionGarlic:
                medium_with.append(recipe)
            else:
                medium_without.append(recipe)
        else:  # > 45 minutes
            if recipe.hasOnionGarlic:
                high_with.append(recipe)
            else:
                high_without.append(recipe)
    
    return RecipeSearchResponse(
        low={
            "with_onion_garlic": low_with[:5],
            "without_onion_garlic": low_without[:5]
        },
        medium={
            "with_onion_garlic": medium_with[:5],
            "without_onion_garlic": medium_without[:5]
        },
        high={
            "with_onion_garlic": high_with[:5],
            "without_onion_garlic": high_without[:5]
        }
    )

async def generate_recipes_with_llm(ingredients: str, cuisine: str = 'any') -> List[Recipe]:
    """Generate diverse recipes using LLM based on user ingredients"""
    try:
        # Initialize LLM chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"recipe_gen_{uuid.uuid4()}",
            system_message="""You are a professional chef and nutritionist. Generate diverse, realistic recipes with COMPLETE cooking instructions based on the provided ingredients. 

Return recipes in this exact JSON format:
{
  "recipes": [
    {
      "id": 1001,
      "title": "Recipe Name",
      "readyInMinutes": 25,
      "servings": 4,
      "calories": 350.0,
      "protein": 20.0,
      "carbs": 35.0,
      "fat": 15.0,
      "fiber": 6.0,
      "ingredients": ["ingredient1", "ingredient2", "ingredient3", "salt", "pepper"],
      "instructions": [
        "Heat oil in a large pan over medium heat.",
        "Add ingredients and cook for 5 minutes until softened.",
        "Season with salt and pepper to taste.",
        "Cook for another 10 minutes, stirring occasionally.",
        "Serve hot and enjoy!"
      ],
      "image": "placeholder"
    }
  ]
}

Requirements:
1. Generate 15-20 diverse recipes with different cooking times (mix of <20min, 20-45min, >45min)
2. Use realistic cooking times, servings, and nutritional values
3. Include the user's ingredients prominently in recipes
4. Add common cooking ingredients (salt, pepper, oil, etc.)
5. Some recipes should include onion/garlic, others should not
6. Make recipe titles creative and appetizing
7. Ensure nutritional values are realistic for the ingredients and portions
8. Each recipe should have 4-8 ingredients total
9. MOST IMPORTANT: Include detailed step-by-step cooking instructions (5-8 steps)
10. Instructions should be clear, specific, and actionable
11. Include cooking methods, temperatures, and timing details"""
        ).with_model("openai", "gpt-4o-mini")
        
        # Create the prompt
        user_message = UserMessage(
            text=f"""Generate diverse recipes using these ingredients: {ingredients}

{f"Focus on {cuisine.title()} cuisine style and flavoring." if cuisine != 'any' else "Include recipes from various international cuisines."}

Please create a variety of recipes including:
- Quick recipes (under 20 minutes): appetizers, salads, simple stir-fries
- Medium recipes (20-45 minutes): main dishes, baked items, soups
- Longer recipes (over 45 minutes): slow-cooked dishes, roasts, complex preparations

Make sure to:
1. Use the provided ingredients creatively
2. Include both recipes with onion/garlic and without
3. Provide realistic nutritional information
4. Use appealing recipe names
5. Include appropriate cooking times for each recipe type
6. PROVIDE DETAILED COOKING INSTRUCTIONS with step-by-step directions
7. Include specific cooking methods, temperatures, and timing
8. Make instructions clear and easy to follow
{f"9. Incorporate {cuisine.title()} cooking techniques, spices, and flavor profiles" if cuisine != 'any' else "9. Use diverse international cooking techniques and spices"}

Return only the JSON response, no other text."""
        )
        
        # Get response from LLM with timeout handling
        try:
            response = await asyncio.wait_for(chat.send_message(user_message), timeout=45.0)
        except asyncio.TimeoutError:
            logging.error("LLM request timed out after 45 seconds")
            return []
        
        # Parse the JSON response
        try:
            recipe_data = json.loads(response)
            recipes = []
            
            for i, recipe_json in enumerate(recipe_data.get('recipes', [])):
                # Ensure unique IDs
                recipe_id = recipe_json.get('id', 1000 + i)
                
                # Extract recipe data with defaults
                title = recipe_json.get('title', f'Recipe {i+1}')
                ready_in_minutes = recipe_json.get('readyInMinutes', 30)
                servings = recipe_json.get('servings', 2)
                ingredients_list = recipe_json.get('ingredients', [])
                instructions = recipe_json.get('instructions', ['No instructions available'])
                
                # Extract nutritional information
                calories = recipe_json.get('calories', 300.0)
                protein = recipe_json.get('protein', 15.0)
                carbs = recipe_json.get('carbs', 30.0)
                fat = recipe_json.get('fat', 10.0)
                fiber = recipe_json.get('fiber', 5.0)
                
                nutrition = RecipeNutrition(
                    calories=calories,
                    protein=protein,
                    carbs=carbs,
                    fat=fat,
                    fiber=fiber
                )
                
                # Check for onion/garlic
                has_onion_garlic_flag = has_onion_garlic(ingredients_list)
                
                # Get image URL or use placeholder
                image_url = recipe_json.get('image', 'placeholder')
                
                # Create recipe object
                recipe = Recipe(
                    id=recipe_id,
                    title=title,
                    image=image_url,
                    readyInMinutes=ready_in_minutes,
                    servings=servings,
                    nutrition=nutrition,
                    hasOnionGarlic=has_onion_garlic_flag,
                    ingredients=ingredients_list,
                    instructions=instructions
                )
                
                recipes.append(recipe)
            
            return recipes
            
        except json.JSONDecodeError as e:
            logging.error(f"Failed to parse LLM response as JSON: {e}")
            logging.error(f"LLM Response: {response}")
            # Return empty list if JSON parsing fails
            return []
            
    except Exception as e:
        logging.error(f"Error generating recipes with LLM: {str(e)}")
        return []

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Recipe Finder API is running"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

@api_router.post("/recipes/search", response_model=RecipeSearchResponse)
async def search_recipes(request: RecipeSearchRequest):
    """Search for recipes based on ingredients using AI generation"""
    try:
        # Validate ingredients
        if not request.ingredients or not request.ingredients.strip():
            raise HTTPException(status_code=422, detail="Please provide at least one ingredient")
        
        # Check if we have at least 2 ingredients
        ingredient_list = [ing.strip() for ing in request.ingredients.split(',') if ing.strip()]
        if len(ingredient_list) < 2:
            raise HTTPException(status_code=422, detail="Please provide at least 2 ingredients separated by commas")
        
        # Generate recipes using LLM
        logging.info(f"Generating recipes for ingredients: {request.ingredients}")
        recipes = await generate_recipes_with_llm(request.ingredients, request.cuisine)
        
        if not recipes:
            logging.warning("LLM failed to generate recipes, returning empty result")
            # Return empty categorized response but don't raise error
            return RecipeSearchResponse(
                low={"with_onion_garlic": [], "without_onion_garlic": []},
                medium={"with_onion_garlic": [], "without_onion_garlic": []},
                high={"with_onion_garlic": [], "without_onion_garlic": []}
            )
        
        logging.info(f"Generated {len(recipes)} recipes successfully")
        
        # Categorize and return recipes
        result = categorize_recipes(recipes)
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logging.error(f"Unexpected error in recipe search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate recipes: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()