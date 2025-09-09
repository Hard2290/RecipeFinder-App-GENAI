from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Recipe Finder API", description="Find recipes based on ingredients with nutritional information")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Spoonacular API configuration
SPOONACULAR_API_KEY = "2d95307d33454c42bcdf5d4c7507a20c"
SPOONACULAR_BASE_URL = "https://api.spoonacular.com/recipes"

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class RecipeSearchRequest(BaseModel):
    ingredients: str
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

class RecipeSearchResponse(BaseModel):
    low: Dict[str, List[Recipe]]
    medium: Dict[str, List[Recipe]]
    high: Dict[str, List[Recipe]]

# Helper functions
def has_onion_garlic(ingredients: List[Dict]) -> bool:
    """Check if recipe contains onion/garlic ingredients"""
    onion_garlic_keywords = [
        'onion', 'onions', 'garlic', 'garlics', 'shallot', 'shallots',
        'leek', 'leeks', 'scallion', 'scallions', 'chive', 'chives',
        'spring onion', 'green onion', 'pearl onion', 'red onion',
        'white onion', 'yellow onion', 'garlic powder', 'onion powder',
        'garlic paste', 'garlic clove', 'minced garlic'
    ]
    
    for ingredient in ingredients:
        ingredient_name = ingredient.get('name', '').lower()
        ingredient_original = ingredient.get('original', '').lower()
        
        for keyword in onion_garlic_keywords:
            if keyword in ingredient_name or keyword in ingredient_original:
                return True
    return False

def extract_nutrition(nutrition_data: Dict) -> RecipeNutrition:
    """Extract key nutritional information from Spoonacular nutrition data"""
    nutrients = nutrition_data.get('nutrients', [])
    
    # Initialize default values
    calories = 0.0
    protein = 0.0
    carbs = 0.0
    fat = 0.0
    fiber = 0.0
    
    # Extract nutrients
    for nutrient in nutrients:
        name = nutrient.get('name', '').lower()
        amount = nutrient.get('amount', 0.0)
        
        if 'calorie' in name:
            calories = amount
        elif 'protein' in name:
            protein = amount
        elif 'carbohydrate' in name:
            carbs = amount
        elif 'fat' in name and 'saturated' not in name:
            fat = amount
        elif 'fiber' in name:
            fiber = amount
    
    return RecipeNutrition(
        calories=calories,
        protein=protein,
        carbs=carbs,
        fat=fat,
        fiber=fiber
    )

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
    """Search for recipes based on ingredients"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Prepare API request parameters
            params = {
                'apiKey': SPOONACULAR_API_KEY,
                'includeIngredients': request.ingredients,
                'number': request.number,
                'addRecipeInformation': 'true',
                'addRecipeNutrition': 'true',
                'fillIngredients': 'true',
                'sort': 'max-used-ingredients',
                'ranking': 2
            }
            
            # Make request to Spoonacular API
            response = await client.get(f"{SPOONACULAR_BASE_URL}/complexSearch", params=params)
            response.raise_for_status()
            
            data = response.json()
            recipes = []
            
            # Process each recipe
            for recipe_data in data.get('results', []):
                try:
                    # Extract basic info
                    recipe_id = recipe_data.get('id', 0)
                    title = recipe_data.get('title', 'Unknown Recipe')
                    image = recipe_data.get('image', '')
                    ready_in_minutes = recipe_data.get('readyInMinutes', 30)
                    servings = recipe_data.get('servings', 1)
                    
                    # Extract ingredients
                    extended_ingredients = recipe_data.get('extendedIngredients', [])
                    ingredients = [ing.get('name', '') for ing in extended_ingredients]
                    
                    # Check for onion/garlic
                    has_onion_garlic_flag = has_onion_garlic(extended_ingredients)
                    
                    # Extract nutrition data
                    nutrition_data = recipe_data.get('nutrition', {})
                    nutrition = extract_nutrition(nutrition_data)
                    
                    # Create recipe object
                    recipe = Recipe(
                        id=recipe_id,
                        title=title,
                        image=image,
                        readyInMinutes=ready_in_minutes,
                        servings=servings,
                        nutrition=nutrition,
                        hasOnionGarlic=has_onion_garlic_flag,
                        ingredients=ingredients
                    )
                    
                    recipes.append(recipe)
                    
                except Exception as e:
                    logging.warning(f"Error processing recipe {recipe_data.get('id', 'unknown')}: {str(e)}")
                    continue
            
            # Categorize and return recipes
            result = categorize_recipes(recipes)
            return result
            
    except httpx.HTTPStatusError as e:
        logging.error(f"Spoonacular API error: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=500, detail="Failed to fetch recipes from external API")
    except httpx.TimeoutException:
        logging.error("Timeout when calling Spoonacular API")
        raise HTTPException(status_code=504, detail="Request timeout when fetching recipes")
    except Exception as e:
        logging.error(f"Unexpected error in recipe search: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

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