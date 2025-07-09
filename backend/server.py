from fastapi import FastAPI, HTTPException
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

app = FastAPI(title="AI Image Generation API", version="1.0.0")

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
db = client.ai_image_generation_db

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
    
    async def generate_image(self, prompt: str) -> str:
        """Generate image from prompt and return as base64 string"""
        if not self.client:
            # Mock mode - return a placeholder
            return self._generate_mock_image(prompt)
        
        try:
            # Generate image using Stable Diffusion
            image = self.client.text_to_image(
                prompt,
                model="stabilityai/stable-diffusion-3.5-large",
            )
            
            # Convert PIL Image to base64
            buffer = BytesIO()
            image.save(buffer, format="PNG")
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return img_str
            
        except Exception as e:
            logger.error(f"Error generating image: {str(e)}")
            return self._generate_mock_image(prompt)
    
    def _generate_mock_image(self, prompt: str) -> str:
        """Generate a mock base64 image for testing"""
        from PIL import Image, ImageDraw, ImageFont
        
        # Create a colorful mockup
        img = Image.new('RGB', (512, 512), color='#4f46e5')
        draw = ImageDraw.Draw(img)
        
        # Add gradient-like effect
        for i in range(0, 512, 10):
            color = (75 + i//10, 70 + i//15, 229 - i//20)
            draw.rectangle([i, 0, i+10, 512], fill=color)
        
        # Add prompt text
        try:
            font = ImageFont.load_default()
            # Word wrap the prompt
            words = prompt.split()
            lines = []
            current_line = ""
            for word in words:
                if len(current_line + word) < 40:
                    current_line += word + " "
                else:
                    lines.append(current_line.strip())
                    current_line = word + " "
            if current_line:
                lines.append(current_line.strip())
            
            # Draw text
            y_offset = 200
            for line in lines[:3]:  # Max 3 lines
                draw.text((20, y_offset), line, fill='white', font=font)
                y_offset += 30
                
            draw.text((20, y_offset + 20), "Generated with AI", fill='lightgray', font=font)
        except:
            draw.text((20, 200), "AI Generated Image", fill='white')
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return img_str

# Initialize AI service
ai_service = AIService()

# Pydantic models
class ImageGenerationRequest(BaseModel):
    prompt: str
    style: Optional[str] = "realistic"
    size: Optional[str] = "512x512"

class GeneratedImage(BaseModel):
    id: str
    prompt: str
    style: str
    size: str
    image_data: str  # base64 encoded image
    created_at: datetime

class ImageHistoryResponse(BaseModel):
    images: List[GeneratedImage]
    total: int

# API Routes

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy", 
        "ai_service": "ready" if ai_service.client else "mock_mode",
        "model": "stabilityai/stable-diffusion-3.5-large"
    }

@app.post("/api/generate-image", response_model=GeneratedImage)
async def generate_image(request: ImageGenerationRequest):
    """Generate an AI image from a prompt"""
    
    # Enhanced prompt based on style
    enhanced_prompt = request.prompt
    
    if request.style == "realistic":
        enhanced_prompt = f"Photorealistic, high quality, detailed: {request.prompt}"
    elif request.style == "artistic":
        enhanced_prompt = f"Artistic, creative, stylized: {request.prompt}"
    elif request.style == "cartoon":
        enhanced_prompt = f"Cartoon style, colorful, fun: {request.prompt}"
    elif request.style == "professional":
        enhanced_prompt = f"Professional, clean, modern: {request.prompt}"
    
    try:
        # Generate image
        image_data = await ai_service.generate_image(enhanced_prompt)
        
        # Save generated image
        image_dict = {
            "id": str(uuid.uuid4()),
            "prompt": request.prompt,
            "style": request.style,
            "size": request.size,
            "image_data": image_data,
            "created_at": datetime.utcnow()
        }
        
        await db.images.insert_one(image_dict)
        
        return GeneratedImage(**image_dict)
        
    except Exception as e:
        logger.error(f"Error generating image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate image: {str(e)}")

@app.get("/api/images", response_model=ImageHistoryResponse)
async def get_image_history(limit: int = 50):
    """Get image generation history"""
    images = []
    cursor = db.images.find().sort("created_at", -1).limit(limit)
    async for image in cursor:
        images.append(GeneratedImage(**image))
    
    total = await db.images.count_documents({})
    
    return ImageHistoryResponse(images=images, total=total)

@app.get("/api/images/{image_id}", response_model=GeneratedImage)
async def get_image(image_id: str):
    """Get specific image by ID"""
    image = await db.images.find_one({"id": image_id})
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return GeneratedImage(**image)

@app.delete("/api/images/{image_id}")
async def delete_image(image_id: str):
    """Delete an image"""
    result = await db.images.delete_one({"id": image_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"message": "Image deleted successfully"}

@app.delete("/api/images")
async def clear_history():
    """Clear all image history"""
    result = await db.images.delete_many({})
    return {"message": f"Deleted {result.deleted_count} images"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)