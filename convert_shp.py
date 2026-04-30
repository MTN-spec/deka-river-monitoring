import geopandas as gpd
import json

shp_path = r'f:\MTN - Main Desktop\Tadiwanashe - DEKA River\Watershed-deka.shp'
output_js = r'f:\MTN - Main Desktop\Tadiwanashe - DEKA River\watershed_data.js'

try:
    # Read shapefile
    gdf = gpd.read_file(shp_path)
    
    # Ensure it's in WGS84 (lat/lng) for Leaflet
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)
    
    # Convert to GeoJSON
    geojson_str = gdf.to_json()
    geojson_data = json.loads(geojson_str)
    
    # Write as JS variable
    with open(output_js, 'w') as f:
        f.write(f"const watershedGeoJSON = {json.dumps(geojson_data)};")
    
    print(f"Successfully converted shapefile to {output_js}")
    print(f"Found {len(gdf)} features.")

except Exception as e:
    print(f"Error: {e}")
