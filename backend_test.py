import requests
import json
import sys
from datetime import datetime

class AIImageGenerationTester:
    def __init__(self, base_url="https://c42da218-54b2-49bf-b4ae-ad3df2c29e0d.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.generated_image_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.text}")
                    return False, response.json()
                except:
                    return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health(self):
        """Test the health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "/api/health",
            200
        )
        if success:
            print(f"Health Status: {response}")
            print(f"AI Service Mode: {response.get('ai_service', 'unknown')}")
            print(f"Model: {response.get('model', 'unknown')}")
        return success

    def test_generate_image(self):
        """Test generating an image"""
        image_data = {
            "prompt": f"A beautiful mountain landscape at sunset {datetime.now().strftime('%H%M%S')}",
            "style": "realistic",
            "size": "512x512"
        }
        
        success, response = self.run_test(
            "Generate Image",
            "POST",
            "/api/generate-image",
            200,
            data=image_data
        )
        
        if success and 'id' in response:
            self.generated_image_id = response['id']
            print(f"Generated image with ID: {self.generated_image_id}")
            print(f"Image data length: {len(response['image_data']) if 'image_data' in response else 'N/A'} characters")
        
        return success

    def test_get_images(self):
        """Test getting image history"""
        success, response = self.run_test(
            "Get Image History",
            "GET",
            "/api/images",
            200
        )
        
        if success:
            images = response.get('images', [])
            total = response.get('total', 0)
            print(f"Retrieved {len(images)} images out of {total} total")
            if len(images) > 0:
                print(f"First image prompt: {images[0].get('prompt', 'N/A')}")
        
        return success

    def test_get_image_by_id(self):
        """Test getting a specific image by ID"""
        if not self.generated_image_id:
            print("❌ Cannot test get_image_by_id - No image ID available")
            return False
            
        success, response = self.run_test(
            "Get Image by ID",
            "GET",
            f"/api/images/{self.generated_image_id}",
            200
        )
        
        if success:
            print(f"Retrieved image with prompt: {response.get('prompt', 'N/A')}")
        
        return success

    def test_delete_image(self):
        """Test deleting an image"""
        if not self.generated_image_id:
            print("❌ Cannot test delete_image - No image ID available")
            return False
            
        success, response = self.run_test(
            "Delete Image",
            "DELETE",
            f"/api/images/{self.generated_image_id}",
            200
        )
        
        if success:
            print(f"Successfully deleted image: {response.get('message', '')}")
        
        return success

    def test_clear_history(self):
        """Test clearing all image history"""
        success, response = self.run_test(
            "Clear Image History",
            "DELETE",
            "/api/images",
            200
        )
        
        if success:
            print(f"Successfully cleared image history: {response.get('message', '')}")
        
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting AI Image Generation API Tests")
        print("========================================")
        
        # Basic health check
        self.test_health()
        
        # Image generation and retrieval tests
        self.test_generate_image()
        self.test_get_images()
        self.test_get_image_by_id()
        
        # Cleanup tests
        self.test_delete_image()
        self.test_clear_history()
        
        # Print results
        print("\n📊 Test Results")
        print("==============")
        print(f"Tests passed: {self.tests_passed}/{self.tests_run} ({self.tests_passed/self.tests_run*100:.1f}% success rate)")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = AIImageGenerationTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)