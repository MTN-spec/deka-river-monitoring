# Deka River Environmental Monitoring Platform
## Point Analysis & GEE Integration

This document outlines the architecture for the interactive Point Analysis feature, enabling real-time extraction of Earth Engine spectral data via a full-stack architecture.

### The Objective
To allow users to click any coordinate within the Deka River watershed and instantly retrieve localized water quality analytics, shifting the platform from a macro (catchment-wide) view to a micro (point-specific) capability.

### Full-Stack Architecture

Because Google Earth Engine (GEE) requires secure server-to-server OAuth2 authentication to execute `ee.Image.reduceRegion` algorithms on-the-fly, a purely static frontend is insufficient. We engineered a full-stack solution:

#### 1. Python FastAPI Backend (`backend/main.py`)
A high-performance Python server acts as the secure intermediary between the dashboard and Google's servers.
- **Authentication**: Utilizes a Google Cloud Service Account JSON key to securely authenticate with the `earthengine-api`.
- **The Engine**: When a user queries a coordinate, the backend mounts the `COPERNICUS/S2_SR_HARMONIZED` (Sentinel-2 Surface Reflectance) image collection for the past 30-90 days.
- **Spectral Math**: It performs cloud-filtering and calculates custom band math directly on Google's infrastructure:
  - **NDVI**: `(B8 - B4) / (B8 + B4)`
  - **NDWI**: `(B3 - B8) / (B3 + B8)`
  - **AMDI (Acid Mine Drainage Index)**: `(B4 - B2) / (B4 + B2)`
  - **Heavy Metals Proxy**: `(B11 / B8) * (B4 / B3)`
- **Response**: The backend returns a JSON payload containing exactly 18 extracted indices to the frontend.

*Note: For demonstration and offline testing environments, a fallback simulator is implemented. If GEE credentials are not provided, the backend calculates distance-decay matrices based on the coordinate's physical proximity to known Deka mining discharge zones to simulate spatial variance.*

#### 2. Frontend Map Interface (`app.js`)
- **Leaflet Event Listener**: Binds a click listener to the interactive map.
- **Visual Marker**: Drops a Leaflet pin at the queried `[Lat, Lng]` coordinate.
- **Asynchronous Fetch**: Sends an HTTP `GET` request to the Python backend endpoint (`/api/analyze-point?lat={lat}&lng={lng}`).
- **Model Execution Pipeline**: Upon receiving the 18 spectral indices from the backend, the frontend injects this localized feature vector directly into the `HybridModel.run(localizedData)`. The 8-layer engine processes the data, entirely replacing the global dashboard state with the localized state, updating the WQI gauge and EMA traffic lights in under 1 second.
