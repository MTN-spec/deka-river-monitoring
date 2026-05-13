import xml.etree.ElementTree as ET
import json

def parse_kml(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()
    
    # KML namespace
    ns = {'kml': 'http://www.opengis.net/kml/2.2'}
    
    features = []
    
    for placemark in root.findall('.//kml:Placemark', ns):
        name_el = placemark.find('kml:name', ns)
        name = name_el.text if name_el is not None else "Unnamed"
        
        # Check for LineString
        ls = placemark.find('kml:LineString', ns)
        if ls is not None:
            coords_el = ls.find('kml:coordinates', ns)
            if coords_el is not None:
                coords_text = coords_el.text.strip()
                coords = []
                for point in coords_text.split():
                    parts = point.split(',')
                    if len(parts) >= 2:
                        # KML is lng,lat,alt
                        lng = float(parts[0])
                        lat = float(parts[1])
                        coords.append([lng, lat])
                
                features.append({
                    "type": "Feature",
                    "properties": { "name": name },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": coords
                    }
                })
        
        # Check for Point
        p = placemark.find('kml:Point', ns)
        if p is not None:
            coords_el = p.find('kml:coordinates', ns)
            if coords_el is not None:
                parts = coords_el.text.strip().split(',')
                if len(parts) >= 2:
                    lng = float(parts[0])
                    lat = float(parts[1])
                    features.append({
                        "type": "Feature",
                        "properties": { "name": name },
                        "geometry": {
                            "type": "Point",
                            "coordinates": [lng, lat]
                        }
                    })

    return {
        "type": "FeatureCollection",
        "features": features
    }

if __name__ == "__main__":
    kml_path = r"f:\MTN - Main Desktop\Tadiwanashe - DEKA River\Deka_river.kml"
    geojson = parse_kml(kml_path)
    
    output_path = r"f:\MTN - Main Desktop\Tadiwanashe - DEKA River\river_data.js"
    with open(output_path, "w") as f:
        f.write("const riverGeoJSON = ")
        json.dump(geojson, f, indent=4)
        f.write(";")
    print(f"Successfully converted KML to {output_path}")
