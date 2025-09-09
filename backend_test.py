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

    def test_recipe_search_with_cuisine_italian(self):
        """Test recipe search with Italian cuisine"""
        test_data = {
            "ingredients": "chicken, rice, tomatoes, onion",
            "cuisine": "italian",
            "number": 20
        }
        success, response = self.run_test(
            "Italian Cuisine Recipe Search", 
            "POST", 
            "api/recipes/search", 
            200, 
            data=test_data
        )
        
        if success and response:
            print("\n🍝 Analyzing Italian Recipe Response:")
            total_recipes = self._analyze_recipe_response(response)
            if total_recipes > 0:
                print("✅ Italian recipes generated successfully")
                return True
            else:
                print("❌ No Italian recipes generated")
                return False
        return success

    def test_recipe_search_with_cuisine_chinese(self):
        """Test recipe search with Chinese cuisine"""
        test_data = {
            "ingredients": "tofu, broccoli, soy sauce",
            "cuisine": "chinese",
            "number": 20
        }
        success, response = self.run_test(
            "Chinese Cuisine Recipe Search", 
            "POST", 
            "api/recipes/search", 
            200, 
            data=test_data
        )
        
        if success and response:
            print("\n🥢 Analyzing Chinese Recipe Response:")
            total_recipes = self._analyze_recipe_response(response)
            if total_recipes > 0:
                print("✅ Chinese recipes generated successfully")
                return True
            else:
                print("❌ No Chinese recipes generated")
                return False
        return success

    def test_recipe_search_with_cuisine_indian(self):
        """Test recipe search with Indian cuisine"""
        test_data = {
            "ingredients": "chicken, rice, onion, garlic, ginger",
            "cuisine": "indian",
            "number": 20
        }
        success, response = self.run_test(
            "Indian Cuisine Recipe Search", 
            "POST", 
            "api/recipes/search", 
            200, 
            data=test_data
        )
        
        if success and response:
            print("\n🍛 Analyzing Indian Recipe Response:")
            total_recipes = self._analyze_recipe_response(response)
            if total_recipes > 0:
                print("✅ Indian recipes generated successfully")
                return True
            else:
                print("❌ No Indian recipes generated")
                return False
        return success

    def _analyze_recipe_response(self, response):
        """Helper method to analyze recipe response structure"""
        total_recipes = 0
        
        # Check main structure
        expected_keys = ['low', 'medium', 'high']
        for key in expected_keys:
            if key in response:
                print(f"✅ Found '{key}' category")
                category = response[key]
                
                # Check subcategories
                if 'with_onion_garlic' in category:
                    with_count = len(category['with_onion_garlic'])
                    total_recipes += with_count
                    print(f"   - With Onion-Garlic: {with_count} recipes")
                else:
                    print(f"   ❌ Missing 'with_onion_garlic' in {key}")
                    
                if 'without_onion_garlic' in category:
                    without_count = len(category['without_onion_garlic'])
                    total_recipes += without_count
                    print(f"   - Without Onion-Garlic: {without_count} recipes")
                else:
                    print(f"   ❌ Missing 'without_onion_garlic' in {key}")
            else:
                print(f"❌ Missing '{key}' category")
        
        # Analyze individual recipes if any exist
        for category in ['low', 'medium', 'high']:
            if category in response:
                for subcategory in ['with_onion_garlic', 'without_onion_garlic']:
                    if subcategory in response[category]:
                        recipes = response[category][subcategory]
                        
                        if recipes:  # If there are recipes, analyze the first one
                            sample_recipe = recipes[0]
                            print(f"\n📋 Sample Recipe from {category}.{subcategory}:")
                            print(f"   - ID: {sample_recipe.get('id', 'N/A')}")
                            print(f"   - Title: {sample_recipe.get('title', 'N/A')}")
                            print(f"   - Ready in: {sample_recipe.get('readyInMinutes', 'N/A')} minutes")
                            print(f"   - Has Onion/Garlic: {sample_recipe.get('hasOnionGarlic', 'N/A')}")
                            
                            # Check instructions
                            instructions = sample_recipe.get('instructions', [])
                            print(f"   - Instructions: {len(instructions)} steps")
                            if instructions:
                                print(f"   - First step: {instructions[0][:100]}...")
                            
                            # Check ingredients
                            ingredients = sample_recipe.get('ingredients', [])
                            print(f"   - Ingredients: {len(ingredients)} items")
                            if ingredients:
                                print(f"   - Sample ingredients: {', '.join(ingredients[:3])}...")
                            
                            nutrition = sample_recipe.get('nutrition', {})
                            if nutrition:
                                print(f"   - Calories: {nutrition.get('calories', 'N/A')}")
                                print(f"   - Protein: {nutrition.get('protein', 'N/A')}g")
                                print(f"   - Carbs: {nutrition.get('carbs', 'N/A')}g")
                                print(f"   - Fat: {nutrition.get('fat', 'N/A')}g")
                                print(f"   - Fiber: {nutrition.get('fiber', 'N/A')}g")
                            break
        
        print(f"\n📈 Total Recipes Found: {total_recipes}")
        return total_recipes

    def test_recipe_search_edge_cases(self):
        """Test edge cases for recipe search"""
        print("\n🧪 Testing Edge Cases:")
        
        # Test with empty ingredients (should fail)
        success1, response1 = self.run_test(
            "Empty Ingredients (Should Fail)", 
            "POST", 
            "api/recipes/search", 
            422,  # Expecting validation error
            data={"ingredients": "", "number": 10}
        )
        
        # Test with single ingredient (should work but may have limited results)
        success2, response2 = self.run_test(
            "Single Ingredient", 
            "POST", 
            "api/recipes/search", 
            200, 
            data={"ingredients": "chicken", "number": 10}
        )
        
        # Test with many ingredients
        success3, response3 = self.run_test(
            "Many Ingredients", 
            "POST", 
            "api/recipes/search", 
            200, 
            data={"ingredients": "chicken, beef, pork, fish, rice, pasta, tomatoes, onions, garlic, spinach", "number": 10}
        )
        
        # Test with unusual ingredients
        success4, response4 = self.run_test(
            "Unusual Ingredients", 
            "POST", 
            "api/recipes/search", 
            200, 
            data={"ingredients": "dragon fruit, quinoa, kale", "number": 10}
        )
        
        # Test with invalid cuisine
        success5, response5 = self.run_test(
            "Invalid Cuisine", 
            "POST", 
            "api/recipes/search", 
            200,  # Should still work, just ignore invalid cuisine
            data={"ingredients": "chicken, rice", "cuisine": "martian", "number": 10}
        )
        
        return success2 and success3 and success4 and success5

    def test_llm_integration_status(self):
        """Test if LLM integration is working by checking environment and making a test call"""
        print("\n🤖 Testing LLM Integration Status:")
        
        # Check if EMERGENT_LLM_KEY is configured
        try:
            with open('/app/backend/.env', 'r') as f:
                env_content = f.read()
                if 'EMERGENT_LLM_KEY=' in env_content:
                    print("✅ EMERGENT_LLM_KEY found in backend .env file")
                    
                    # Extract the key to check if it's not empty
                    for line in env_content.split('\n'):
                        if line.startswith('EMERGENT_LLM_KEY='):
                            key_value = line.split('=', 1)[1]
                            if key_value and key_value.strip():
                                print(f"✅ LLM Key is configured (starts with: {key_value[:10]}...)")
                            else:
                                print("❌ LLM Key is empty")
                                return False
                else:
                    print("❌ EMERGENT_LLM_KEY not found in backend .env file")
                    return False
        except Exception as e:
            print(f"❌ Error reading backend .env file: {e}")
            return False
        
        # Test LLM integration with a simple recipe request
        test_data = {
            "ingredients": "eggs, bread, butter",
            "cuisine": "any",
            "number": 5
        }
        
        success, response = self.run_test(
            "LLM Integration Test", 
            "POST", 
            "api/recipes/search", 
            200, 
            data=test_data
        )
        
        if success and response:
            total_recipes = self._analyze_recipe_response(response)
            if total_recipes > 0:
                print("✅ LLM integration is working - recipes generated successfully")
                return True
            else:
                print("❌ LLM integration issue - no recipes generated")
                return False
        else:
            print("❌ LLM integration test failed")
            return False

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