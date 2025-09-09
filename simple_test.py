import requests
import json

def test_single_request():
    url = "http://localhost:8001/api/recipes/search"
    data = {
        "ingredients": "chicken, rice",
        "cuisine": "any",
        "number": 5
    }
    
    print("🧪 Testing single recipe request...")
    print(f"URL: {url}")
    print(f"Data: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(url, json=data, timeout=120)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ SUCCESS!")
            
            # Count recipes
            total = 0
            for category in ['low', 'medium', 'high']:
                if category in result:
                    for sub in ['with_onion_garlic', 'without_onion_garlic']:
                        if sub in result[category]:
                            count = len(result[category][sub])
                            total += count
                            print(f"  {category}.{sub}: {count} recipes")
            
            print(f"Total recipes: {total}")
            
            # Show a sample recipe
            for category in ['low', 'medium', 'high']:
                if category in result:
                    for sub in ['with_onion_garlic', 'without_onion_garlic']:
                        if sub in result[category] and result[category][sub]:
                            recipe = result[category][sub][0]
                            print(f"\nSample Recipe:")
                            print(f"  Title: {recipe.get('title')}")
                            print(f"  Time: {recipe.get('readyInMinutes')} minutes")
                            print(f"  Instructions: {len(recipe.get('instructions', []))} steps")
                            return True
            
        else:
            print(f"❌ FAILED: {response.status_code}")
            print(response.text[:200])
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
    
    return False

if __name__ == "__main__":
    test_single_request()