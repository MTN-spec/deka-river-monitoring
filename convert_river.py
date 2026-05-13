import geopandas as gpd
import json
import os

shp_path = r'F:\MTN - Main Desktop\Tadiwanashe - DEKA River\Deka River _ Final Github reository\rivers.shp'
output_js = r'f:\MTN - Main Desktop\Tadiwanashe - DEKA River\river_data.js'

try:
    print(f"Reading shapefile from {shp_path}...")
    if not os.path.exists(shp_path):
        raise FileNotFoundError(f"Shapefile not found at {shp_path}")
        
    gdf = gpd.read_file(shp_path)
    
    # Ensure it's in WGS84 (lat/lng) for Leaflet
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        print("Reprojecting to EPSG:4326...")
        gdf = gdf.to_crs(epsg=4326)
    
    # Convert to GeoJSON
    geojson_str = gdf.to_json()
    geojson_data = json.loads(geojson_str)
    
    # Write as JS variable
    with open(output_js, 'w') as f:
        f.write(f"const riverGeoJSON = {json.dumps(geojson_data)};")
    
    print(f"Successfully converted shapefile to {output_js}")
    print(f"Found {len(gdf)} features.")

except Exception as e:
    print(f"Error: {e}")
