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

    def test_recipe_categorization_accuracy(self):
        """Test if recipes are properly categorized by cooking time and dietary preferences"""
        print("\n⏱️ Testing Recipe Categorization Accuracy:")
        
        test_data = {
            "ingredients": "chicken, onion, garlic, rice, tomatoes, spinach",
            "cuisine": "any",
            "number": 20
        }
        
        success, response = self.run_test(
            "Recipe Categorization Test", 
            "POST", 
            "api/recipes/search", 
            200, 
            data=test_data
        )
        
        if success and response:
            categorization_correct = True
            
            for category_name, time_range in [('low', '<20'), ('medium', '20-45'), ('high', '>45')]:
                if category_name in response:
                    category = response[category_name]
                    
                    # Check both subcategories
                    for subcategory in ['with_onion_garlic', 'without_onion_garlic']:
                        if subcategory in category:
                            recipes = category[subcategory]
                            
                            for recipe in recipes:
                                ready_time = recipe.get('readyInMinutes', 0)
                                has_onion_garlic = recipe.get('hasOnionGarlic', False)
                                
                                # Verify time categorization
                                if category_name == 'low' and ready_time >= 20:
                                    print(f"❌ Time categorization error: Recipe '{recipe.get('title')}' in 'low' but takes {ready_time} minutes")
                                    categorization_correct = False
                                elif category_name == 'medium' and (ready_time < 20 or ready_time > 45):
                                    print(f"❌ Time categorization error: Recipe '{recipe.get('title')}' in 'medium' but takes {ready_time} minutes")
                                    categorization_correct = False
                                elif category_name == 'high' and ready_time <= 45:
                                    print(f"❌ Time categorization error: Recipe '{recipe.get('title')}' in 'high' but takes {ready_time} minutes")
                                    categorization_correct = False
                                
                                # Verify dietary categorization
                                if subcategory == 'with_onion_garlic' and not has_onion_garlic:
                                    print(f"❌ Dietary categorization error: Recipe '{recipe.get('title')}' in 'with_onion_garlic' but hasOnionGarlic is False")
                                    categorization_correct = False
                                elif subcategory == 'without_onion_garlic' and has_onion_garlic:
                                    print(f"❌ Dietary categorization error: Recipe '{recipe.get('title')}' in 'without_onion_garlic' but hasOnionGarlic is True")
                                    categorization_correct = False
            
            if categorization_correct:
                print("✅ Recipe categorization is accurate")
                return True
            else:
                print("❌ Recipe categorization has errors")
                return False
        
        return False

def main():
    print("🧪 Recipe Finder API Testing Suite - LLM Integration")
    print("=" * 60)
    
    tester = RecipeFinderAPITester()
    
    # Run all tests
    print("\n1️⃣ Testing Basic Connectivity...")
    basic_connectivity = tester.test_root_endpoint()
    
    print("\n2️⃣ Testing LLM Integration Status...")
    llm_integration = tester.test_llm_integration_status()
    
    print("\n3️⃣ Testing Basic Recipe Search...")
    basic_search = tester.test_recipe_search_basic()
    
    print("\n4️⃣ Testing Italian Cuisine Filtering...")
    italian_cuisine = tester.test_recipe_search_with_cuisine_italian()
    
    print("\n5️⃣ Testing Chinese Cuisine Filtering...")
    chinese_cuisine = tester.test_recipe_search_with_cuisine_chinese()
    
    print("\n6️⃣ Testing Indian Cuisine Filtering...")
    indian_cuisine = tester.test_recipe_search_with_cuisine_indian()
    
    print("\n7️⃣ Testing Recipe Categorization Accuracy...")
    categorization = tester.test_recipe_categorization_accuracy()
    
    print("\n8️⃣ Testing Edge Cases...")
    edge_cases = tester.test_recipe_search_edge_cases()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    # Detailed analysis
    critical_tests = [basic_connectivity, llm_integration, basic_search]
    cuisine_tests = [italian_cuisine, chinese_cuisine, indian_cuisine]
    quality_tests = [categorization, edge_cases]
    
    if not all(critical_tests):
        print("🚨 CRITICAL: Basic functionality is not working")
        if not llm_integration:
            print("   - LLM integration is failing - check EMERGENT_LLM_KEY")
        if not basic_connectivity:
            print("   - API connectivity issues")
        if not basic_search:
            print("   - Recipe search endpoint is not working")
    elif not any(cuisine_tests):
        print("🚨 ISSUE: Cuisine filtering is not working for any cuisine")
    elif not all(quality_tests):
        print("⚠️  WARNING: Some quality issues detected")
        if not categorization:
            print("   - Recipe categorization has problems")
        if not edge_cases:
            print("   - Edge case handling needs improvement")
    elif tester.tests_passed == tester.tests_run:
        print("✅ All tests passed - LLM-powered recipe generation is working correctly!")
        print("🎉 The Recipe Finder App backend is fully functional with AI integration")
    else:
        print("⚠️  Some tests failed - check individual test results above")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())