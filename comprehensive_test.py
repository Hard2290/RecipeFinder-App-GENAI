import requests
import json

def test_api_endpoint(name, data, expected_status=200):
    url = "http://localhost:8001/api/recipes/search"
    
    print(f"\n🧪 {name}")
    print(f"   Ingredients: {data.get('ingredients')}")
    print(f"   Cuisine: {data.get('cuisine', 'any')}")
    
    try:
        response = requests.post(url, json=data, timeout=120)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == expected_status:
            if response.status_code == 200:
                result = response.json()
                
                # Count recipes
                total = 0
                for category in ['low', 'medium', 'high']:
                    if category in result:
                        for sub in ['with_onion_garlic', 'without_onion_garlic']:
                            if sub in result[category]:
                                total += len(result[category][sub])
                
                print(f"   ✅ SUCCESS! Generated {total} recipes")
                
                # Validate structure
                structure_valid = True
                for category in ['low', 'medium', 'high']:
                    if category not in result:
                        structure_valid = False
                        break
                    for sub in ['with_onion_garlic', 'without_onion_garlic']:
                        if sub not in result[category]:
                            structure_valid = False
                            break
                
                if structure_valid:
                    print("   ✅ Response structure is valid")
                else:
                    print("   ❌ Response structure is invalid")
                
                # Check for detailed recipe data
                sample_found = False
                for category in ['low', 'medium', 'high']:
                    if category in result:
                        for sub in ['with_onion_garlic', 'without_onion_garlic']:
                            if sub in result[category] and result[category][sub]:
                                recipe = result[category][sub][0]
                                
                                # Validate recipe fields
                                required_fields = ['id', 'title', 'readyInMinutes', 'servings', 'nutrition', 'hasOnionGarlic', 'ingredients', 'instructions']
                                missing_fields = [field for field in required_fields if field not in recipe]
                                
                                if not missing_fields:
                                    print("   ✅ Recipe contains all required fields")
                                    
                                    # Check instructions
                                    instructions = recipe.get('instructions', [])
                                    if len(instructions) >= 3:
                                        print(f"   ✅ Recipe has detailed instructions ({len(instructions)} steps)")
                                    else:
                                        print(f"   ⚠️  Recipe has limited instructions ({len(instructions)} steps)")
                                    
                                    # Check ingredients
                                    ingredients = recipe.get('ingredients', [])
                                    if len(ingredients) >= 3:
                                        print(f"   ✅ Recipe has good ingredient list ({len(ingredients)} items)")
                                    else:
                                        print(f"   ⚠️  Recipe has limited ingredients ({len(ingredients)} items)")
                                    
                                    # Check nutrition
                                    nutrition = recipe.get('nutrition', {})
                                    if nutrition and 'calories' in nutrition:
                                        print(f"   ✅ Nutrition data available (calories: {nutrition['calories']})")
                                    else:
                                        print("   ❌ Missing nutrition data")
                                        
                                else:
                                    print(f"   ❌ Recipe missing fields: {missing_fields}")
                                
                                sample_found = True
                                break
                        if sample_found:
                            break
                
                return total > 0
            else:
                print(f"   ✅ Expected error response received")
                return True
        else:
            print(f"   ❌ Expected {expected_status}, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ ERROR: {e}")
        return False

def main():
    print("🚀 Comprehensive Recipe API Testing")
    print("=" * 50)
    
    tests = [
        {
            "name": "Italian Cuisine Test",
            "data": {"ingredients": "chicken, rice, tomatoes, onion", "cuisine": "italian", "number": 10}
        },
        {
            "name": "Chinese Cuisine Test", 
            "data": {"ingredients": "tofu, broccoli, soy sauce", "cuisine": "chinese", "number": 10}
        },
        {
            "name": "Indian Cuisine Test",
            "data": {"ingredients": "chicken, rice, onion, garlic, ginger", "cuisine": "indian", "number": 10}
        },
        {
            "name": "Basic Ingredients Test",
            "data": {"ingredients": "eggs, bread, butter", "cuisine": "any", "number": 10}
        },
        {
            "name": "Single Ingredient Test",
            "data": {"ingredients": "chicken", "cuisine": "any", "number": 5}
        }
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test_api_endpoint(test["name"], test["data"]):
            passed += 1
    
    print(f"\n" + "=" * 50)
    print(f"📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! LLM integration is working perfectly!")
    elif passed >= total * 0.8:
        print("✅ Most tests passed - LLM integration is working well")
    else:
        print("⚠️  Some issues detected - check individual test results")

if __name__ == "__main__":
    main()