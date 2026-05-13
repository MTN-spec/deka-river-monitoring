import ee
import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any

from google.oauth2 import service_account

app = FastAPI(title="Deka River Earth Engine API")

# Allow CORS so the frontend can call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:8000",
        "https://deka-river-monitoring.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------------
# EARTH ENGINE INITIALIZATION
# -------------------------------------------------------------------------
def init_ee():
    """
    Initialize Earth Engine.
    Supports standard GOOGLE_APPLICATION_CREDENTIALS file path, or
    direct parsing of a JSON string via EE_SERVICE_ACCOUNT_JSON (best for Render.com).
    """
    try:
        if "EE_SERVICE_ACCOUNT_JSON" in os.environ:
            print("⏳ Attempting to initialize EE with JSON environment variable...")
            creds_dict = json.loads(os.environ["EE_SERVICE_ACCOUNT_JSON"])
            scopes = [
                'https://www.googleapis.com/auth/earthengine',
                'https://www.googleapis.com/auth/cloud-platform'
            ]
            creds = service_account.Credentials.from_service_account_info(creds_dict, scopes=scopes)
            project = os.environ.get("EE_PROJECT_ID", "deka-river-monitoring")
            ee.Initialize(creds, project=project)
            print(f"✅ Earth Engine initialized successfully using EE_SERVICE_ACCOUNT_JSON (Project: {project}).")
            
        elif "GOOGLE_APPLICATION_CREDENTIALS" in os.environ:
            project = os.environ.get("EE_PROJECT_ID", "deka-river-monitoring")
            ee.Initialize(project=project)
            print(f"✅ Earth Engine initialized using GOOGLE_APPLICATION_CREDENTIALS file (Project: {project}).")
            
        else:
            print("⚠️ No cloud credentials found. Attempting default local auth...")
            # Fallback for local development if authenticated via `earthengine authenticate`
            project = os.environ.get("EE_PROJECT_ID", "deka-river-monitoring")
            ee.Initialize(project=project)
            print(f"✅ Earth Engine initialized using local credentials (Project: {project}).")
    except Exception as e:
        print(f"❌ Failed to initialize Earth Engine: {str(e)}")

# Initialize on startup
init_ee()

# -------------------------------------------------------------------------
# HELPER FUNCTIONS (EARTH ENGINE ALGORITHMS)
# -------------------------------------------------------------------------
def get_pixel_indices(lat: float, lng: float) -> Dict[str, float]:
    """
    Runs Earth Engine computations to extract 18 spectral indices 
    for the given lat/lng coordinate using Sentinel-2 imagery.
    """
    # Create point geometry
    point = ee.Geometry.Point([lng, lat])
    
    # Define time window (last 30 days)
    end_date = ee.Date(ee.Date.now())
    start_date = end_date.advance(-30, 'day')
    
    # Load Sentinel-2 Surface Reflectance
    s2 = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
          .filterBounds(point)
          .filterDate(start_date, end_date)
          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)))
    
    # If no recent images, widen the search to 90 days
    if s2.size().getInfo() == 0:
        start_date = end_date.advance(-90, 'day')
        s2 = (ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
              .filterBounds(point)
              .filterDate(start_date, end_date)
              .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30)))
    
    # Get the median image to reduce cloud noise
    image = s2.median()
    
    # Check if we got an image
    if not image.bandNames().getInfo():
        raise ValueError("No valid Sentinel-2 imagery found for this location.")
    
    # --- INDICES CALCULATION ---
    # 1. NDVI (Normalized Difference Vegetation Index)
    ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
    
    # 2. NDWI (Normalized Difference Water Index)
    ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI')
    
    # 3. AMDI (Acid Mine Drainage Index - custom simplified formulation)
    # Using band ratios common for detecting iron oxides/hydroxides
    amdi = image.expression(
        '(B4 - B2) / (B4 + B2)', 
        {'B4': image.select('B4'), 'B2': image.select('B2')}
    ).rename('AMDI')
    
    # 4. Iron Oxide (Ferric Oxide)
    iron_oxide = image.expression(
        'B4 / B2', 
        {'B4': image.select('B4'), 'B2': image.select('B2')}
    ).rename('IronOxide')
    
    # 5. Heavy Metals Proxy (Vegetation stress + mineral alterations)
    heavy_metals = image.expression(
        '(B11 / B8) * (B4 / B3)',
        {'B11': image.select('B11'), 'B8': image.select('B8'), 'B4': image.select('B4'), 'B3': image.select('B3')}
    ).rename('HeavyMetals')
    
    # 6. Aluminium Proxy (Clay/Alunite alteration)
    aluminium = image.expression(
        'B11 / B12',
        {'B11': image.select('B11'), 'B12': image.select('B12')}
    ).rename('Aluminium')

    # Add all calculated indices as bands to the image
    combined = image.addBands([ndvi, ndwi, amdi, iron_oxide, heavy_metals, aluminium])
    
    # Extract values at the point
    reduced = combined.reduceRegion(
        reducer=ee.Reducer.first(),
        geometry=point,
        scale=10,
        maxPixels=1e9
    ).getInfo()
    
    # Build the 18-index payload (filling missing advanced indices with proxies/defaults)
    # In a full production script, you would calculate all 18 explicitly.
    results = {
        "ndvi": reduced.get("NDVI", 0.5),
        "ndwi": reduced.get("NDWI", 0.4),
        "amdi": reduced.get("AMDI", 0.1),
        "salinity": 2.5, # Placeholder (needs specific Sentinel-1/2 complex math)
        "heavyMetals": reduced.get("HeavyMetals", 0.25),
        "aluminium": reduced.get("Aluminium", 0.06),
        "ironOxide": reduced.get("IronOxide", 0.3),
        "ferricRatio": reduced.get("IronOxide", 0.3) * 1.2, # Derived proxy
        "ironSulfate": reduced.get("AMDI", 0.1) * 1.5,     # Derived proxy
        "manganeseStress": 0.15,
        "ndsi": 0.1,
        "mndwi": reduced.get("NDWI", 0.4) * 0.9,
        "ndti": 0.2,
        "saturationIndex": 0.5,
        "redEdgeStress": 0.2,
        "ndStressSensitivity": 0.3,
        "lst": 28.0, # Needs Landsat 8/9 Thermal band (placeholder for Sentinel-2 only script)
        "amdDetection": reduced.get("AMDI", 0.1) * 0.8 + reduced.get("IronOxide", 0.3) * 0.2
    }
    
    return results

# -------------------------------------------------------------------------
# API ENDPOINTS
# -------------------------------------------------------------------------
@app.get("/")
def read_root():
    return {"status": "online", "message": "Deka River Earth Engine Backend"}

@app.get("/api/analyze-point")
def analyze_point(lat: float, lng: float):
    """
    Extracts water quality spectral indices for a specific coordinate.
    """
    try:
        # Check bounds (roughly within Zimbabwe/Matabeleland North)
        if not (-23.0 <= lat <= -15.0 and 25.0 <= lng <= 34.0):
            return {"error": "Coordinates outside supported region (Zimbabwe)."}
            
        print(f"🌍 Running Earth Engine analysis for [{lat}, {lng}]...")
        indices = get_pixel_indices(lat, lng)
        
        return {
            "success": True,
            "coordinates": {"lat": lat, "lng": lng},
            "source": "Google Earth Engine (Sentinel-2 SR)",
            "indices": indices
        }
    except Exception as e:
        print(f"❌ Analysis failed: {str(e)}")
        # If GEE is not authenticated yet, return a mock response that simulates
        # proximity to mining so the frontend can still be tested!
        print("⚠️ Returning simulated localized data (fallback mode)...")
        
        # Simulate based on distance to Deka mine region (-18.36, 26.47)
        dist = ((lat - -18.36)**2 + (lng - 26.47)**2)**0.5
        severity = max(0, 1 - (dist / 0.1)) # Higher severity closer to mine
        
        mock_indices = {
            "ndvi": 0.6 - (severity * 0.3),
            "ndwi": 0.4 - (severity * 0.2),
            "amdi": 0.1 + (severity * 0.6),
            "salinity": 2.5 + (severity * 5.0),
            "heavyMetals": 0.2 + (severity * 0.7),
            "aluminium": 0.05 + (severity * 0.3),
            "ironOxide": 0.2 + (severity * 0.6),
            "ferricRatio": 0.3 + (severity * 0.5),
            "ironSulfate": 0.1 + (severity * 0.4),
            "manganeseStress": 0.1 + (severity * 0.3),
            "ndsi": 0.1,
            "mndwi": 0.35,
            "ndti": 0.2,
            "saturationIndex": 0.5,
            "redEdgeStress": 0.2,
            "ndStressSensitivity": 0.3,
            "lst": 25.0 + (severity * 5.0),
            "amdDetection": 0.1 + (severity * 0.8)
        }
        
        return {
            "success": True,
            "fallback": True,
            "error_msg": str(e),
            "coordinates": {"lat": lat, "lng": lng},
            "source": "Simulation (GEE Auth Pending)",
            "indices": mock_indices
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
