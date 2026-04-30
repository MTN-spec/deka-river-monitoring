import zipfile
import re
import json

kmz_path = r'f:\MTN - Main Desktop\Tadiwanashe - DEKA River\Deka Catchment area.kmz'
output_file = r'f:\MTN - Main Desktop\Tadiwanashe - DEKA River\catchment_data.js'

try:
    with zipfile.ZipFile(kmz_path, 'r') as z:
        kml_name = [name for name in z.namelist() if name.endswith('.kml')][0]
        kml_content = z.read(kml_name).decode('utf-8', errors='ignore')

    # Find all coordinate blocks
    coord_blocks = re.findall(r'<coordinates>(.*?)</coordinates>', kml_content, re.DOTALL)
    
    features = []
    for i, block in enumerate(coord_blocks):
        points = []
        for p in block.strip().split():
            parts = p.split(',')
            if len(parts) >= 2:
                # Leaflet needs [lat, lng], KML is [lng, lat]
                points.append([float(parts[1]), float(parts[0])])
        
        if points:
            features.append({
                "type": "Feature",
                "properties": {"id": i},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [points]
                }
            })

    geojson = {
        "type": "FeatureCollection",
        "features": features
    }

    with open(output_file, 'w') as f:
        f.write(f"const catchmentGeoJSON = {json.dumps(geojson)};")
    print(f"Successfully processed {len(features)} features.")

except Exception as e:
    print(f"Error: {e}")
