import requests
import json
import time
import sys
from datetime import datetime

class AIAdGenerationTester:
    def __init__(self, base_url="https://c42da218-54b2-49bf-b4ae-ad3df2c29e0d.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.company_id = None
        self.ad_id = None

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
        return success

    def test_create_company(self):
        """Test creating a company"""
        company_data = {
            "name": f"Test Company {datetime.now().strftime('%H%M%S')}",
            "industry": "Technology",
            "product_service": "AI Testing Services",
            "target_audience": "Developers and QA Engineers",
            "brand_description": "We provide comprehensive testing for AI applications",
            "website": "https://example.com"
        }
        
        success, response = self.run_test(
            "Create Company",
            "POST",
            "/api/companies",
            200,
            data=company_data
        )
        
        if success and 'id' in response:
            self.company_id = response['id']
            print(f"Created company with ID: {self.company_id}")
        
        return success

    def test_get_companies(self):
        """Test getting all companies"""
        success, response = self.run_test(
            "Get Companies",
            "GET",
            "/api/companies",
            200
        )
        
        if success:
            print(f"Retrieved {len(response)} companies")
            if len(response) > 0:
                print(f"First company: {response[0]['name']}")
        
        return success

    def test_get_company(self):
        """Test getting a specific company"""
        if not self.company_id:
            print("❌ Cannot test get_company - No company ID available")
            return False
            
        success, response = self.run_test(
            "Get Company by ID",
            "GET",
            f"/api/companies/{self.company_id}",
            200
        )
        
        if success:
            print(f"Retrieved company: {response['name']}")
        
        return success

    def test_generate_ad(self):
        """Test generating an ad"""
        if not self.company_id:
            print("❌ Cannot test generate_ad - No company ID available")
            return False
            
        ad_data = {
            "company_id": self.company_id,
            "ad_type": "banner",
            "style": "modern",
            "custom_prompt": "Show our product in action with happy customers"
        }
        
        success, response = self.run_test(
            "Generate Ad",
            "POST",
            "/api/generate-ad",
            200,
            data=ad_data
        )
        
        if success and 'id' in response:
            self.ad_id = response['id']
            print(f"Generated ad with ID: {self.ad_id}")
            print(f"Image data length: {len(response['image_data']) if 'image_data' in response else 'N/A'} characters")
        
        return success

    def test_get_company_ads(self):
        """Test getting ads for a company"""
        if not self.company_id:
            print("❌ Cannot test get_company_ads - No company ID available")
            return False
            
        success, response = self.run_test(
            "Get Company Ads",
            "GET",
            f"/api/ads/{self.company_id}",
            200
        )
        
        if success:
            print(f"Retrieved {len(response)} ads for company")
        
        return success

    def test_get_all_ads(self):
        """Test getting all ads"""
        success, response = self.run_test(
            "Get All Ads",
            "GET",
            "/api/ads",
            200
        )
        
        if success:
            print(f"Retrieved {len(response)} total ads")
        
        return success

    def test_delete_ad(self):
        """Test deleting an ad"""
        if not self.ad_id:
            print("❌ Cannot test delete_ad - No ad ID available")
            return False
            
        success, response = self.run_test(
            "Delete Ad",
            "DELETE",
            f"/api/ads/{self.ad_id}",
            200
        )
        
        if success:
            print(f"Successfully deleted ad: {response.get('message', '')}")
        
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting AI Ad Generation API Tests")
        print("======================================")
        
        # Basic health check
        self.test_health()
        
        # Company tests
        self.test_create_company()
        self.test_get_companies()
        self.test_get_company()
        
        # Ad tests
        self.test_generate_ad()
        self.test_get_company_ads()
        self.test_get_all_ads()
        self.test_delete_ad()
        
        # Print results
        print("\n📊 Test Results")
        print("==============")
        print(f"Tests passed: {self.tests_passed}/{self.tests_run} ({self.tests_passed/self.tests_run*100:.1f}%)")
        
        return self.tests_passed == self.tests_run

if __name__ == "__main__":
    tester = AIAdGenerationTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)