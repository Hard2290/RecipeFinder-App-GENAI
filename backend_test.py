import requests
import sys
import json
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

class RecipeFinderAPITester:
    def __init__(self):
        # Use the frontend environment variable for backend URL
        frontend_backend_url = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
        self.base_url = frontend_backend_url
        self.tests_run = 0
        self.tests_passed = 0
        print(f"🔗 Testing backend at: {self.base_url}")

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)

            print(f"Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Try to parse JSON response
                try:
                    response_data = response.json()
                    print(f"Response preview: {json.dumps(response_data, indent=2)[:500]}...")
                    return True, response_data
                except:
                    print("Response is not JSON or empty")
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:500]}...")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout (30s)")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "api/", 200)

    def test_recipe_search_basic(self):
        """Test basic recipe search with common ingredients"""
        test_data = {
            "ingredients": "chicken, rice, tomatoes",
            "number": 20
        }
        return self.run_test(
            "Basic Recipe Search", 
            "POST", 
            "api/recipes/search", 
            200, 
            data=test_data
        )

    def test_recipe_search_detailed(self):
        """Test detailed recipe search and analyze response structure"""
        test_data = {
            "ingredients": "chicken, rice, tomatoes, spinach",
            "number": 50
        }
        success, response = self.run_test(
            "Detailed Recipe Search", 
            "POST", 
            "api/recipes/search", 
            200, 
            data=test_data
        )
        
        if success and response:
            print("\n📊 Analyzing Recipe Response Structure:")
            
            # Check main structure
            expected_keys = ['low', 'medium', 'high']
            for key in expected_keys:
                if key in response:
                    print(f"✅ Found '{key}' category")
                    category = response[key]
                    
                    # Check subcategories
                    if 'with_onion_garlic' in category:
                        with_count = len(category['with_onion_garlic'])
                        print(f"   - With Onion-Garlic: {with_count} recipes")
                    else:
                        print(f"   ❌ Missing 'with_onion_garlic' in {key}")
                        
                    if 'without_onion_garlic' in category:
                        without_count = len(category['without_onion_garlic'])
                        print(f"   - Without Onion-Garlic: {without_count} recipes")
                    else:
                        print(f"   ❌ Missing 'without_onion_garlic' in {key}")
                else:
                    print(f"❌ Missing '{key}' category")
            
            # Analyze individual recipes if any exist
            total_recipes = 0
            for category in ['low', 'medium', 'high']:
                if category in response:
                    for subcategory in ['with_onion_garlic', 'without_onion_garlic']:
                        if subcategory in response[category]:
                            recipes = response[category][subcategory]
                            total_recipes += len(recipes)
                            
                            if recipes:  # If there are recipes, analyze the first one
                                sample_recipe = recipes[0]
                                print(f"\n📋 Sample Recipe from {category}.{subcategory}:")
                                print(f"   - ID: {sample_recipe.get('id', 'N/A')}")
                                print(f"   - Title: {sample_recipe.get('title', 'N/A')}")
                                print(f"   - Ready in: {sample_recipe.get('readyInMinutes', 'N/A')} minutes")
                                print(f"   - Has Onion/Garlic: {sample_recipe.get('hasOnionGarlic', 'N/A')}")
                                
                                nutrition = sample_recipe.get('nutrition', {})
                                if nutrition:
                                    print(f"   - Calories: {nutrition.get('calories', 'N/A')}")
                                    print(f"   - Protein: {nutrition.get('protein', 'N/A')}g")
                                    print(f"   - Carbs: {nutrition.get('carbs', 'N/A')}g")
                                    print(f"   - Fat: {nutrition.get('fat', 'N/A')}g")
                                    print(f"   - Fiber: {nutrition.get('fiber', 'N/A')}g")
                                break
            
            print(f"\n📈 Total Recipes Found: {total_recipes}")
            
            if total_recipes == 0:
                print("⚠️  WARNING: No recipes found in any category!")
                print("This explains why frontend shows 'No recipes found for this category'")
                return False
                
        return success

    def test_recipe_search_edge_cases(self):
        """Test edge cases for recipe search"""
        print("\n🧪 Testing Edge Cases:")
        
        # Test with single ingredient
        success1, _ = self.run_test(
            "Single Ingredient", 
            "POST", 
            "api/recipes/search", 
            200, 
            data={"ingredients": "chicken", "number": 10}
        )
        
        # Test with many ingredients
        success2, _ = self.run_test(
            "Many Ingredients", 
            "POST", 
            "api/recipes/search", 
            200, 
            data={"ingredients": "chicken, beef, pork, fish, rice, pasta, tomatoes, onions, garlic, spinach", "number": 10}
        )
        
        # Test with unusual ingredients
        success3, _ = self.run_test(
            "Unusual Ingredients", 
            "POST", 
            "api/recipes/search", 
            200, 
            data={"ingredients": "dragon fruit, quinoa, kale", "number": 10}
        )
        
        return success1 and success2 and success3

    def test_spoonacular_api_directly(self):
        """Test Spoonacular API directly to check if the issue is with external API"""
        print("\n🌐 Testing Spoonacular API Directly:")
        
        spoonacular_url = "https://api.spoonacular.com/recipes/complexSearch"
        params = {
            'apiKey': '2d95307d33454c42bcdf5d4c7507a20c',
            'includeIngredients': 'chicken,rice,tomatoes',
            'number': 10,
            'addRecipeInformation': 'true',
            'addRecipeNutrition': 'true',
            'fillIngredients': 'true',
            'sort': 'max-used-ingredients',
            'ranking': 2
        }
        
        try:
            response = requests.get(spoonacular_url, params=params, timeout=30)
            print(f"Spoonacular API Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                results = data.get('results', [])
                print(f"Spoonacular returned {len(results)} recipes")
                
                if results:
                    sample = results[0]
                    print(f"Sample recipe: {sample.get('title', 'N/A')}")
                    print(f"Ready in: {sample.get('readyInMinutes', 'N/A')} minutes")
                    print(f"Extended ingredients count: {len(sample.get('extendedIngredients', []))}")
                    
                    # Check if nutrition data exists
                    nutrition = sample.get('nutrition', {})
                    if nutrition:
                        nutrients = nutrition.get('nutrients', [])
                        print(f"Nutrition data available: {len(nutrients)} nutrients")
                    else:
                        print("⚠️  No nutrition data in Spoonacular response")
                        
                    return True
                else:
                    print("⚠️  Spoonacular returned empty results")
                    return False
            else:
                print(f"❌ Spoonacular API failed: {response.status_code}")
                print(f"Response: {response.text[:200]}...")
                return False
                
        except Exception as e:
            print(f"❌ Error calling Spoonacular API: {str(e)}")
            return False

def main():
    print("🧪 Recipe Finder API Testing Suite")
    print("=" * 50)
    
    tester = RecipeFinderAPITester()
    
    # Run all tests
    print("\n1️⃣ Testing Basic Connectivity...")
    tester.test_root_endpoint()
    
    print("\n2️⃣ Testing Spoonacular API Integration...")
    spoonacular_works = tester.test_spoonacular_api_directly()
    
    print("\n3️⃣ Testing Recipe Search Functionality...")
    tester.test_recipe_search_basic()
    
    print("\n4️⃣ Testing Detailed Recipe Analysis...")
    detailed_success = tester.test_recipe_search_detailed()
    
    print("\n5️⃣ Testing Edge Cases...")
    tester.test_recipe_search_edge_cases()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if not spoonacular_works:
        print("🚨 CRITICAL: Spoonacular API is not working - this is likely the root cause")
    elif not detailed_success:
        print("🚨 ISSUE: Recipe categorization or data processing has problems")
    elif tester.tests_passed == tester.tests_run:
        print("✅ All tests passed - backend appears to be working correctly")
    else:
        print("⚠️  Some tests failed - check individual test results above")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())