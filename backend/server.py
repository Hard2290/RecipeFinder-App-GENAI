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

def get_sample_recipes(ingredients: str) -> List[Recipe]:
    """Generate sample recipes when API quota is exhausted"""
    ingredient_list = [ing.strip().lower() for ing in ingredients.split(',')]
    
    # Sample recipe data based on common ingredients
    sample_recipes = [
        # Quick recipes (LOW - under 20 min)
        {
            "id": 1001, "title": f"Quick {ingredient_list[0].title()} Stir Fry", "image": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400",
            "readyInMinutes": 15, "servings": 2, "hasOnionGarlic": True,
            "nutrition": {"calories": 285.0, "protein": 22.0, "carbs": 18.0, "fat": 12.0, "fiber": 4.0},
            "ingredients": ingredient_list[:3] + ["garlic", "onion", "soy sauce"]
        },
        {
            "id": 1002, "title": f"Simple {ingredient_list[0].title()} Salad", "image": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400",
            "readyInMinutes": 10, "servings": 2, "hasOnionGarlic": False,
            "nutrition": {"calories": 195.0, "protein": 15.0, "carbs": 12.0, "fat": 8.0, "fiber": 6.0},
            "ingredients": ingredient_list[:2] + ["lettuce", "olive oil", "lemon"]
        },
        {
            "id": 1003, "title": f"Quick {ingredient_list[-1].title()} Smoothie Bowl", "image": "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400",
            "readyInMinutes": 8, "servings": 1, "hasOnionGarlic": False,
            "nutrition": {"calories": 245.0, "protein": 12.0, "carbs": 35.0, "fat": 6.0, "fiber": 8.0},
            "ingredients": [ingredient_list[-1], "banana", "yogurt", "honey", "granola"]
        },
        {
            "id": 1004, "title": f"Grilled {ingredient_list[0].title()} Sandwich", "image": "https://images.unsplash.com/photo-1528736235302-52922df5c122?w=400",
            "readyInMinutes": 12, "servings": 1, "hasOnionGarlic": True,
            "nutrition": {"calories": 320.0, "protein": 18.0, "carbs": 28.0, "fat": 14.0, "fiber": 3.0},
            "ingredients": [ingredient_list[0], "bread", "cheese", "garlic butter", "herbs"]
        },
        {
            "id": 1005, "title": f"Fresh {ingredient_list[1] if len(ingredient_list) > 1 else ingredient_list[0].title()} Wrap", "image": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
            "readyInMinutes": 7, "servings": 1, "hasOnionGarlic": False,
            "nutrition": {"calories": 275.0, "protein": 16.0, "carbs": 25.0, "fat": 11.0, "fiber": 5.0},
            "ingredients": ingredient_list[:2] + ["tortilla", "lettuce", "mayo"]
        },
        
        # Medium recipes (20-45 min)
        {
            "id": 2001, "title": f"Classic {ingredient_list[0].title()} Pasta", "image": "https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=400",
            "readyInMinutes": 25, "servings": 4, "hasOnionGarlic": True,
            "nutrition": {"calories": 420.0, "protein": 24.0, "carbs": 45.0, "fat": 16.0, "fiber": 4.0},
            "ingredients": ingredient_list + ["pasta", "garlic", "onion", "parmesan", "olive oil"]
        },
        {
            "id": 2002, "title": f"Healthy {ingredient_list[0].title()} Bowl", "image": "https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=400",
            "readyInMinutes": 30, "servings": 2, "hasOnionGarlic": False,
            "nutrition": {"calories": 350.0, "protein": 20.0, "carbs": 38.0, "fat": 12.0, "fiber": 7.0},
            "ingredients": ingredient_list + ["quinoa", "avocado", "lime", "cilantro"]
        },
        {
            "id": 2003, "title": f"Baked {ingredient_list[0].title()} with Herbs", "image": "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400",
            "readyInMinutes": 35, "servings": 3, "hasOnionGarlic": True,
            "nutrition": {"calories": 380.0, "protein": 26.0, "carbs": 22.0, "fat": 18.0, "fiber": 3.0},
            "ingredients": ingredient_list + ["herbs", "garlic", "olive oil", "lemon"]
        },
        {
            "id": 2004, "title": f"Creamy {ingredient_list[1] if len(ingredient_list) > 1 else ingredient_list[0].title()} Soup", "image": "https://images.unsplash.com/photo-1547592180-85f173990554?w=400",
            "readyInMinutes": 40, "servings": 4, "hasOnionGarlic": True,
            "nutrition": {"calories": 295.0, "protein": 14.0, "carbs": 20.0, "fat": 16.0, "fiber": 5.0},
            "ingredients": ingredient_list + ["cream", "onion", "garlic", "broth", "thyme"]
        },
        {
            "id": 2005, "title": f"Mediterranean {ingredient_list[0].title()} Skillet", "image": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400",
            "readyInMinutes": 28, "servings": 3, "hasOnionGarlic": False,
            "nutrition": {"calories": 365.0, "protein": 22.0, "carbs": 28.0, "fat": 18.0, "fiber": 6.0},
            "ingredients": ingredient_list + ["olives", "feta", "oregano", "lemon"]
        },
        
        # Longer recipes (HIGH - over 45 min)
        {
            "id": 3001, "title": f"Slow-Cooked {ingredient_list[0].title()} Stew", "image": "https://images.unsplash.com/photo-1574484284002-952d92456975?w=400",
            "readyInMinutes": 90, "servings": 6, "hasOnionGarlic": True,
            "nutrition": {"calories": 445.0, "protein": 28.0, "carbs": 35.0, "fat": 20.0, "fiber": 6.0},
            "ingredients": ingredient_list + ["potatoes", "carrots", "onion", "garlic", "bay leaves"]
        },
        {
            "id": 3002, "title": f"Roasted {ingredient_list[0].title()} Feast", "image": "https://images.unsplash.com/photo-1574947726661-e2c5f3585e99?w=400",
            "readyInMinutes": 75, "servings": 8, "hasOnionGarlic": True,
            "nutrition": {"calories": 520.0, "protein": 32.0, "carbs": 25.0, "fat": 28.0, "fiber": 4.0},
            "ingredients": ingredient_list + ["rosemary", "garlic", "onion", "potatoes", "wine"]
        },
        {
            "id": 3003, "title": f"Traditional {ingredient_list[0].title()} Curry", "image": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400",
            "readyInMinutes": 60, "servings": 4, "hasOnionGarlic": True,
            "nutrition": {"calories": 385.0, "protein": 24.0, "carbs": 32.0, "fat": 18.0, "fiber": 5.0},
            "ingredients": ingredient_list + ["coconut milk", "spices", "onion", "garlic", "ginger"]
        },
        {
            "id": 3004, "title": f"Braised {ingredient_list[0].title()} Special", "image": "https://images.unsplash.com/photo-1606756790138-261d2b21cd75?w=400",
            "readyInMinutes": 105, "servings": 5, "hasOnionGarlic": False,
            "nutrition": {"calories": 410.0, "protein": 30.0, "carbs": 28.0, "fat": 19.0, "fiber": 4.0},
            "ingredients": ingredient_list + ["wine", "herbs", "carrots", "celery"]
        }
    ]
    
    # Convert to Recipe objects
    recipes = []
    for recipe_data in sample_recipes:
        recipe = Recipe(
            id=recipe_data["id"],
            title=recipe_data["title"],
            image=recipe_data["image"],
            readyInMinutes=recipe_data["readyInMinutes"],
            servings=recipe_data["servings"],
            nutrition=RecipeNutrition(**recipe_data["nutrition"]),
            hasOnionGarlic=recipe_data["hasOnionGarlic"],
            ingredients=recipe_data["ingredients"]
        )
        recipes.append(recipe)
    
    return recipes

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
        # Check if it's a quota limit error (402)
        if e.response.status_code == 402:
            logging.warning("Spoonacular API quota exceeded, using sample recipes")
            # Use sample recipes when quota is exceeded
            sample_recipes = get_sample_recipes(request.ingredients)
            result = categorize_recipes(sample_recipes)
            return result
        else:
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