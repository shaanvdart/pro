from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
import base64
from io import BytesIO
from datetime import datetime
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from huggingface_hub import InferenceClient
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Ad Generation API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.ad_generation_db

# AI Service Abstraction Layer
class AIService:
    def __init__(self):
        self.hf_token = os.environ.get("HF_TOKEN")
        if self.hf_token:
            self.client = InferenceClient(
                provider="hf-inference",
                api_key=self.hf_token,
            )
        else:
            self.client = None
            logger.warning("HF_TOKEN not found. AI service will use mock mode.")
    
    async def generate_ad_image(self, prompt: str, company_name: str) -> str:
        """Generate ad image and return as base64 string"""
        if not self.client:
            # Mock mode - return a placeholder
            return self._generate_mock_image(company_name)
        
        try:
            # Enhanced prompt for advertisement
            ad_prompt = f"Professional advertisement for {company_name}. {prompt}. High quality, commercial style, modern design, clean layout, professional lighting"
            
            # Generate image using Stable Diffusion
            image = self.client.text_to_image(
                ad_prompt,
                model="stabilityai/stable-diffusion-3.5-large",
            )
            
            # Convert PIL Image to base64
            buffer = BytesIO()
            image.save(buffer, format="PNG")
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return img_str
            
        except Exception as e:
            logger.error(f"Error generating image: {str(e)}")
            return self._generate_mock_image(company_name)
    
    def _generate_mock_image(self, company_name: str) -> str:
        """Generate a mock base64 image for testing"""
        # This creates a simple colored rectangle as placeholder
        from PIL import Image, ImageDraw, ImageFont
        
        # Create a simple ad mockup
        img = Image.new('RGB', (512, 512), color='#f0f0f0')
        draw = ImageDraw.Draw(img)
        
        # Add company name
        try:
            font = ImageFont.load_default()
            draw.text((50, 200), f"Mock Ad for\n{company_name}", fill='black', font=font)
            draw.text((50, 300), "Generated with AI", fill='gray', font=font)
        except:
            draw.text((50, 200), f"Mock Ad for {company_name}", fill='black')
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return img_str

# Initialize AI service
ai_service = AIService()

# Pydantic models
class CompanyProfile(BaseModel):
    name: str
    industry: str
    product_service: str
    target_audience: str
    brand_description: Optional[str] = ""
    website: Optional[str] = ""

class CompanyProfileResponse(BaseModel):
    id: str
    name: str
    industry: str
    product_service: str
    target_audience: str
    brand_description: str
    website: str
    created_at: datetime

class AdGenerationRequest(BaseModel):
    company_id: str
    ad_type: str = "banner"  # banner, square, story
    custom_prompt: Optional[str] = ""
    style: Optional[str] = "modern"

class GeneratedAd(BaseModel):
    id: str
    company_id: str
    image_data: str  # base64 encoded image
    prompt_used: str
    ad_type: str
    style: str
    created_at: datetime

# API Routes

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "ai_service": "ready" if ai_service.client else "mock_mode"}

@app.post("/api/companies", response_model=CompanyProfileResponse)
async def create_company(company: CompanyProfile):
    """Create a new company profile"""
    company_dict = company.dict()
    company_dict["id"] = str(uuid.uuid4())
    company_dict["created_at"] = datetime.utcnow()
    
    await db.companies.insert_one(company_dict)
    
    return CompanyProfileResponse(**company_dict)

@app.get("/api/companies", response_model=List[CompanyProfileResponse])
async def get_companies():
    """Get all companies"""
    companies = []
    async for company in db.companies.find():
        companies.append(CompanyProfileResponse(**company))
    return companies

@app.get("/api/companies/{company_id}", response_model=CompanyProfileResponse)
async def get_company(company_id: str):
    """Get company by ID"""
    company = await db.companies.find_one({"id": company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return CompanyProfileResponse(**company)

@app.post("/api/generate-ad", response_model=GeneratedAd)
async def generate_ad(request: AdGenerationRequest):
    """Generate an AI ad for a company"""
    # Get company details
    company = await db.companies.find_one({"id": request.company_id})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Build prompt based on company info
    base_prompt = f"""
    Create a professional advertisement for {company['name']}.
    Industry: {company['industry']}
    Product/Service: {company['product_service']}
    Target Audience: {company['target_audience']}
    Brand Description: {company['brand_description']}
    Style: {request.style}
    Format: {request.ad_type}
    """
    
    if request.custom_prompt:
        base_prompt += f"\nAdditional Requirements: {request.custom_prompt}"
    
    # Generate image
    try:
        image_data = await ai_service.generate_ad_image(base_prompt, company['name'])
        
        # Save generated ad
        ad_dict = {
            "id": str(uuid.uuid4()),
            "company_id": request.company_id,
            "image_data": image_data,
            "prompt_used": base_prompt,
            "ad_type": request.ad_type,
            "style": request.style,
            "created_at": datetime.utcnow()
        }
        
        await db.ads.insert_one(ad_dict)
        
        return GeneratedAd(**ad_dict)
        
    except Exception as e:
        logger.error(f"Error generating ad: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate ad: {str(e)}")

@app.get("/api/ads/{company_id}", response_model=List[GeneratedAd])
async def get_company_ads(company_id: str):
    """Get all ads for a company"""
    ads = []
    async for ad in db.ads.find({"company_id": company_id}):
        ads.append(GeneratedAd(**ad))
    return ads

@app.get("/api/ads", response_model=List[GeneratedAd])
async def get_all_ads():
    """Get all generated ads"""
    ads = []
    async for ad in db.ads.find():
        ads.append(GeneratedAd(**ad))
    return ads

@app.delete("/api/ads/{ad_id}")
async def delete_ad(ad_id: str):
    """Delete an ad"""
    result = await db.ads.delete_one({"id": ad_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ad not found")
    return {"message": "Ad deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)