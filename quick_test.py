import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

def test_recipe_api():
    # Use the frontend environment variable for backend URL
    backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
    
    print(f"🔗 Testing backend at: {backend_url}")
    
    # Test data as specified in the review request
    test_cases = [
        {
            "name": "Italian Cuisine Test",
            "data": {
                "ingredients": "chicken, rice, tomatoes, onion",
                "cuisine": "italian",
                "number": 10
            }
        },
        {
            "name": "Chinese Cuisine Test", 
            "data": {
                "ingredients": "tofu, broccoli, soy sauce",
                "cuisine": "chinese",
                "number": 10
            }
        },
        {
            "name": "Single Ingredient Error Test",
            "data": {
                "ingredients": "chicken",
                "cuisine": "any",
                "number": 10
            }
        }
    ]
    
    for test_case in test_cases:
        print(f"\n🧪 {test_case['name']}:")
        print(f"   Ingredients: {test_case['data']['ingredients']}")
        print(f"   Cuisine: {test_case['data']['cuisine']}")
        
        try:
            response = requests.post(
                f"{backend_url}/api/recipes/search",
                json=test_case['data'],
                headers={'Content-Type': 'application/json'},
                timeout=90
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Count total recipes
                total_recipes = 0
                for category in ['low', 'medium', 'high']:
                    if category in data:
                        for subcategory in ['with_onion_garlic', 'without_onion_garlic']:
                            if subcategory in data[category]:
                                total_recipes += len(data[category][subcategory])
                
                print(f"   ✅ Success! Generated {total_recipes} recipes")
                
                # Show sample recipe if available
                for category in ['low', 'medium', 'high']:
                    if category in data:
                        for subcategory in ['with_onion_garlic', 'without_onion_garlic']:
                            if subcategory in data[category] and data[category][subcategory]:
                                sample = data[category][subcategory][0]
                                print(f"   📋 Sample Recipe: {sample.get('title', 'N/A')}")
                                print(f"      - Ready in: {sample.get('readyInMinutes', 'N/A')} minutes")
                                print(f"      - Instructions: {len(sample.get('instructions', []))} steps")
                                print(f"      - Ingredients: {len(sample.get('ingredients', []))} items")
                                print(f"      - Has Onion/Garlic: {sample.get('hasOnionGarlic', 'N/A')}")
                                
                                # Show first instruction
                                instructions = sample.get('instructions', [])
                                if instructions:
                                    print(f"      - First step: {instructions[0][:80]}...")
                                break
                        if total_recipes > 0:
                            break
                
            else:
                print(f"   ❌ Failed with status {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                
        except requests.exceptions.Timeout:
            print(f"   ❌ Request timeout (90s)")
        except Exception as e:
            print(f"   ❌ Error: {str(e)}")

if __name__ == "__main__":
    print("🚀 Quick Recipe API Test")
    print("=" * 40)
    test_recipe_api()