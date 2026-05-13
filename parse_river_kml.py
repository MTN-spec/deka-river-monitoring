import xml.etree.ElementTree as ET
import json
import os

kml_path = r'f:\MTN - Main Desktop\Tadiwanashe - DEKA River\Deka_river.kml'
output_js = r'f:\MTN - Main Desktop\Tadiwanashe - DEKA River\river_data.js'

def parse_kml(path):
    tree = ET.parse(path)
    root = tree.getroot()
    
    # KML namespaces
    ns = {'kml': 'http://www.opengis.net/kml/2.2'}
    
    features = []
    
    for placemark in root.findall('.//kml:Placemark', ns):
        name_elem = placemark.find('kml:name', ns)
        name = name_elem.text if name_elem is not None else "Unnamed"
        
        # We only want the Deka River
        if "Deka" not in name:
            continue
            
        line_string = placemark.find('.//kml:LineString', ns)
        if line_string is not None:
            coords_elem = line_string.find('kml:coordinates', ns)
            if coords_elem is not None:
                coords_str = coords_elem.text.strip()
                coords = []
                for point_str in coords_str.split():
                    parts = point_str.split(',')
                    if len(parts) >= 2:
                        # KML is lon,lat,alt -> GeoJSON is [lon, lat]
                        coords.append([float(parts[0]), float(parts[1])])
                
                features.append({
                    "type": "Feature",
                    "properties": {"name": name},
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coords
                    }
                })
    
    return {
        "type": "FeatureCollection",
        "features": features
    }

try:
    print(f"Parsing KML from {kml_path}...")
    geojson = parse_kml(kml_path)
    
    with open(output_js, 'w') as f:
        f.write(f"const riverGeoJSON = {json.dumps(geojson)};")
    
    print(f"Successfully created {output_js} with {len(geojson['features'])} features.")

except Exception as e:
    print(f"Error: {e}")
