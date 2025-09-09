import requests
import json

def test_error_cases():
    url = "http://localhost:8001/api/recipes/search"
    
    print("🧪 Testing Error Handling")
    print("=" * 30)
    
    # Test empty ingredients
    print("\n1. Empty ingredients test:")
    try:
        response = requests.post(url, json={"ingredients": "", "number": 5}, timeout=30)
        print(f"   Status: {response.status_code}")
        if response.status_code == 422:
            print("   ✅ Correctly rejected empty ingredients")
        else:
            print(f"   ⚠️  Unexpected status for empty ingredients: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test missing ingredients field
    print("\n2. Missing ingredients field test:")
    try:
        response = requests.post(url, json={"number": 5}, timeout=30)
        print(f"   Status: {response.status_code}")
        if response.status_code == 422:
            print("   ✅ Correctly rejected missing ingredients field")
        else:
            print(f"   ⚠️  Unexpected status for missing ingredients: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test invalid JSON
    print("\n3. Invalid request format test:")
    try:
        response = requests.post(url, data="invalid json", headers={'Content-Type': 'application/json'}, timeout=30)
        print(f"   Status: {response.status_code}")
        if response.status_code in [400, 422]:
            print("   ✅ Correctly rejected invalid JSON")
        else:
            print(f"   ⚠️  Unexpected status for invalid JSON: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    test_error_cases()