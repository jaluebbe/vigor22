"""
GeoJSON LineString to Polygon Converter

Converts GPS tracking LineStrings into clean Polygons with handling for:
- GPS errors and small loops
- Self-intersections near endpoints
- Automatic closure of near endpoints

Requires Python 3.12+ and GeoPandas
"""

import json
from pathlib import Path

import geopandas as gpd
from shapely.geometry import LineString, Point, Polygon
import pyproj


def get_utm_crs(lon: float, lat: float) -> pyproj.CRS:
    """Calculate appropriate UTM zone for coordinates."""
    utm_zone = int((lon + 180) / 6) + 1
    hemisphere = 'north' if lat >= 0 else 'south'
    return pyproj.CRS(f"EPSG:326{utm_zone:02d}" if hemisphere == 'north' else f"EPSG:327{utm_zone:02d}")


def transform_to_utm(geom, source_crs="EPSG:4326"):
    """Transform geometry to UTM based on its centroid. Returns (geom_utm, utm_crs)."""
    centroid = geom.centroid
    utm_crs = get_utm_crs(centroid.x, centroid.y)
    
    gdf = gpd.GeoDataFrame({'geometry': [geom]}, crs=source_crs)
    gdf_utm = gdf.to_crs(utm_crs)
    
    return gdf_utm.geometry.iloc[0], utm_crs


def transform_from_utm(geom, utm_crs, target_crs="EPSG:4326"):
    """Transform geometry from UTM back to WGS84."""
    gdf = gpd.GeoDataFrame({'geometry': [geom]}, crs=utm_crs)
    gdf_target = gdf.to_crs(target_crs)
    
    return gdf_target.geometry.iloc[0]


def simplify_polygon(
    geojson_input: dict | gpd.GeoDataFrame,
    tolerance_meters: float = 1.0
) -> dict | gpd.GeoDataFrame:
    """
    Simplify polygon(s) using Douglas-Peucker algorithm.
    
    Uses UTM projection for precise meter-based tolerance.
    
    Args:
        geojson_input: GeoJSON dict (Feature/FeatureCollection) or GeoDataFrame
        tolerance_meters: Maximum deviation in meters (default: 1.0m)
                         Smaller values = more detail, larger values = stronger simplification
    
    Returns:
        GeoJSON dict or GeoDataFrame with simplified polygons
    """
    if isinstance(geojson_input, dict):
        if geojson_input.get('type') == 'FeatureCollection':
            gdf = gpd.GeoDataFrame.from_features(
                geojson_input['features'],
                crs="EPSG:4326"
            )
        elif geojson_input.get('type') == 'Feature':
            gdf = gpd.GeoDataFrame.from_features(
                [geojson_input],
                crs="EPSG:4326"
            )
        else:
            raise ValueError("Input must be a Feature or FeatureCollection")
        
        return_as_dict = True
        was_single_feature = geojson_input.get('type') == 'Feature'
    else:
        gdf = geojson_input.copy()
        if gdf.crs is None:
            gdf.set_crs("EPSG:4326", inplace=True)
        return_as_dict = False
        was_single_feature = False
    
    simplified_geometries = []
    
    for idx, row in gdf.iterrows():
        geom = row.geometry
        
        if geom is None or geom.is_empty:
            print(f"Warning: Geometry {idx} is empty, skipping")
            simplified_geometries.append(geom)
            continue
        
        geom_utm, utm_crs = transform_to_utm(geom)
        
        if hasattr(geom_utm, 'exterior'):
            points_before = len(geom_utm.exterior.coords)
        else:
            points_before = len(list(geom_utm.coords))
        
        simplified_geom_utm = geom_utm.simplify(tolerance_meters, preserve_topology=True)
        
        if hasattr(simplified_geom_utm, 'exterior'):
            points_after = len(simplified_geom_utm.exterior.coords)
        else:
            points_after = len(list(simplified_geom_utm.coords))
        
        simplified_geom_wgs84 = transform_from_utm(simplified_geom_utm, utm_crs)
        
        print(f"Feature {idx}: Simplified {tolerance_meters}m → {points_before} → {points_after} pts ({100*(points_before-points_after)/points_before:.1f}% removed)")
        
        simplified_geometries.append(simplified_geom_wgs84)
    
    gdf.geometry = simplified_geometries
    
    if return_as_dict:
        if was_single_feature:
            return json.loads(gdf.to_json())['features'][0]
        else:
            return json.loads(gdf.to_json())
    else:
        return gdf


def add_buffer_to_polygon(
    geojson_input: dict | gpd.GeoDataFrame,
    buffer_meters: float = 6.0
) -> dict | gpd.GeoDataFrame:
    """
    Add buffer around polygon(s).
    
    Uses UTM projection for precise meter-based buffer.
    
    Args:
        geojson_input: GeoJSON dict (Feature/FeatureCollection) or GeoDataFrame
        buffer_meters: Buffer distance in meters (default: 6m)
    
    Returns:
        GeoJSON dict or GeoDataFrame with buffered polygons
    """
    if isinstance(geojson_input, dict):
        if geojson_input.get('type') == 'FeatureCollection':
            gdf = gpd.GeoDataFrame.from_features(
                geojson_input['features'],
                crs="EPSG:4326"
            )
        elif geojson_input.get('type') == 'Feature':
            gdf = gpd.GeoDataFrame.from_features(
                [geojson_input],
                crs="EPSG:4326"
            )
        else:
            raise ValueError("Input must be a Feature or FeatureCollection")
        
        return_as_dict = True
        was_single_feature = geojson_input.get('type') == 'Feature'
    else:
        gdf = geojson_input.copy()
        if gdf.crs is None:
            gdf.set_crs("EPSG:4326", inplace=True)
        return_as_dict = False
        was_single_feature = False
    
    buffered_geometries = []
    
    for idx, row in gdf.iterrows():
        geom = row.geometry
        
        if geom is None or geom.is_empty:
            print(f"Warning: Geometry {idx} is empty, skipping")
            buffered_geometries.append(geom)
            continue
        
        geom_utm, utm_crs = transform_to_utm(geom)
        
        # Calculate areas in UTM (exact in m²)
        original_area = geom_utm.area
        
        buffered_geom_utm = geom_utm.buffer(buffer_meters)
        buffered_area = buffered_geom_utm.area
        
        buffered_geom_wgs84 = transform_from_utm(buffered_geom_utm, utm_crs)
        
        print(f"Feature {idx}: +{buffer_meters}m buffer → {buffered_area:.1f} m² (+{buffered_area - original_area:.1f} m²)")
        
        buffered_geometries.append(buffered_geom_wgs84)
    
    gdf.geometry = buffered_geometries
    
    if return_as_dict:
        if was_single_feature:
            return json.loads(gdf.to_json())['features'][0]
        else:
            return json.loads(gdf.to_json())
    else:
        return gdf


def find_all_self_intersections(
    linestring: LineString,
    tolerance_meters: float = 5.0,
    max_loop_length_meters: float = 75.0,
    min_points_in_loop: int = 2
) -> list[tuple[int, int]]:
    """
    Find all self-intersections in the LineString.
    Works in UTM for precise meter calculations.
    
    Args:
        linestring: Shapely LineString object (in UTM!)
        tolerance_meters: Tolerance in meters for intersection detection (default: 5m)
        max_loop_length_meters: Maximum length of loop to remove in meters (default: 75m)
        min_points_in_loop: Minimum number of points between i and j (default: 2)
    
    Returns:
        List of tuples (idx1, idx2) where the LineString touches itself
        idx1 < idx2, sorted by idx1
    """
    coords = list(linestring.coords)
    if len(coords) < 4:
        return []
    
    intersections = []
    
    # Check all point pairs for proximity (optimized: avoid creating Point objects)
    for i in range(len(coords) - 1):
        x1, y1 = coords[i]
        for j in range(i + min_points_in_loop, len(coords)):
            x2, y2 = coords[j]
            
            dist_meters = ((x2 - x1)**2 + (y2 - y1)**2)**0.5
            
            if dist_meters < tolerance_meters:
                loop_coords = coords[i:j+1]
                loop_line = LineString(loop_coords)
                loop_length_meters = loop_line.length
                
                if loop_length_meters <= max_loop_length_meters:
                    intersections.append((i, j))
    
    return intersections


def find_self_intersection_near_ends(
    linestring: LineString,
    tolerance_meters: float = 5.0
) -> tuple[int, int] | None:
    """
    Find self-intersections near the start/end of the LineString (first/last 20%).
    Works in UTM for precise meter-based calculations.
    """
    coords = list(linestring.coords)
    if len(coords) < 3:
        return None
    
    # Check first 20% and last 20% of points
    start_range = max(1, int(len(coords) * 0.2))
    end_range = max(1, int(len(coords) * 0.2))
    
    min_distance = float('inf')
    best_pair = None
    
    for i in range(start_range):
        for j in range(len(coords) - end_range, len(coords)):
            if i >= j:  # Skip if indices overlap
                continue
            
            p1 = Point(coords[i])
            p2 = Point(coords[j])
            
            # Distance in meters (direct in UTM!)
            dist_meters = p1.distance(p2)
            
            if dist_meters < tolerance_meters and dist_meters < min_distance:
                min_distance = dist_meters
                best_pair = (i, j)
    
    if best_pair and min_distance < tolerance_meters:
        return best_pair
    
    return None


def remove_small_loops(
    linestring: LineString,
    tolerance_meters: float = 5.0,
    max_loop_length_meters: float = 75.0,
    min_points_in_loop: int = 2
) -> tuple[LineString, bool]:
    """
    Remove small loops from a LineString caused by GPS errors.
    Returns (cleaned_linestring, something_was_removed).
    """
    coords = list(linestring.coords)
    
    intersections = find_all_self_intersections(
        linestring, 
        tolerance_meters, 
        max_loop_length_meters,
        min_points_in_loop
    )    
    something_removed = False
    
    if intersections:
        something_removed = True
        
        # Filter 1: Keep only the longest loop for each endpoint
        # Prevents removing Index 1→5, 2→5, 3→5 (keep only 1→5)
        filtered_intersections = {}
        for i, j in intersections:
            if j not in filtered_intersections or i < filtered_intersections[j][0]:
                filtered_intersections[j] = (i, j)
        
        filtered_intersections = list(filtered_intersections.values())
        
        # Filter 2: Remove overlapping ranges to avoid processing same indices twice
        final_intersections = []
        used_indices = set()
        filtered_intersections.sort(key=lambda x: x[0])
        
        for i, j in filtered_intersections:
            if not any(idx in used_indices for idx in range(i, j + 1)):
                final_intersections.append((i, j))
                used_indices.update(range(i, j + 1))
        
        # Remove loops from back to front to preserve indices
        coords_to_remove = set()
        
        for i, j in reversed(final_intersections):
            # IMPORTANT: Keep points i and j, remove only the loop in between
            removed_count = 0
            for k in range(i + 1, j):
                coords_to_remove.add(k)
                removed_count += 1
            
            if removed_count > 0:
                print(f"  Remove loop (touch) between index {i} and {j} ({removed_count} points)")
        
        coords = [coords[i] for i in range(len(coords)) if i not in coords_to_remove]
        
        if len(coords) < 2:
            print("  Warning: Too few points after removal - keeping original")
            return linestring, False
        
        linestring = LineString(coords)
    
    return linestring, something_removed


def linestring_to_polygon(
    geojson_input: dict | gpd.GeoDataFrame,
    tolerance_meters: float = 5.0,
    close_threshold_meters: float = 50.0,
    max_loop_length_meters: float = 75.0
) -> dict | gpd.GeoDataFrame:
    """
    Convert a GeoJSON LineString to a Polygon.
    
    Handles multiple special cases:
    1. Ends close together (< close_threshold_meters): Close directly
    2. Self-intersection near ends: Remove protruding ends
    3. Small loops in LineString: Remove if length < max_loop_length_meters
    
    Args:
        geojson_input: GeoJSON dict (Feature/FeatureCollection) or GeoDataFrame
        tolerance_meters: Tolerance for self-intersection detection (default: 5m)
        close_threshold_meters: Threshold for "close together" (default: 50m)
        max_loop_length_meters: Max length of loops to remove (default: 75m)
    
    Returns:
        GeoJSON dict or GeoDataFrame with polygon(s)
    """
    if isinstance(geojson_input, dict):
        if geojson_input.get('type') == 'FeatureCollection':
            gdf = gpd.GeoDataFrame.from_features(geojson_input['features'])
        elif geojson_input.get('type') == 'Feature':
            gdf = gpd.GeoDataFrame.from_features([geojson_input])
        else:
            raise ValueError("Input must be a Feature or FeatureCollection")
        
        return_as_dict = True
        was_single_feature = geojson_input.get('type') == 'Feature'
    else:
        gdf = geojson_input.copy()
        return_as_dict = False
        was_single_feature = False
    
    new_geometries = []
    
    for idx, row in gdf.iterrows():
        geom = row.geometry
        
        if not isinstance(geom, LineString):
            print(f"Warning: Geometry {idx} is not a LineString, skipping")
            new_geometries.append(geom)
            continue
        
        coords = list(geom.coords)
        
        if len(coords) < 3:
            print(f"Warning: LineString {idx} has fewer than 3 points, skipping")
            new_geometries.append(geom)
            continue
        
        geom_utm, utm_crs = transform_to_utm(geom)
        
        # Step 1: Remove small loops in LineString (iterative) in UTM
        max_iterations = 10
        iteration = 0
        cleaned_geom_utm = geom_utm
        
        while iteration < max_iterations:
            cleaned_geom_utm, changed = remove_small_loops(
                cleaned_geom_utm, 
                tolerance_meters, 
                max_loop_length_meters,
                min_points_in_loop=2  # Balance between corner preservation and loop removal
            )
            if not changed:
                break
            iteration += 1
        
        if iteration > 0:
            print(f"  Cleanup iterations: {iteration}")
        
        coords_utm = list(cleaned_geom_utm.coords)
        
        # Step 2: Check for self-intersection near ends (in UTM)
        intersection = find_self_intersection_near_ends(cleaned_geom_utm, tolerance_meters)
        
        if intersection:
            start_idx, end_idx = intersection
            
            polygon_coords_utm = coords_utm[start_idx:end_idx + 1]
            
            if polygon_coords_utm[0] != polygon_coords_utm[-1]:
                polygon_coords_utm.append(polygon_coords_utm[0])
            
            print(f"Feature {idx}: Self-intersection at indices {start_idx}/{end_idx}, removing {start_idx} pts at start and {len(coords_utm) - end_idx - 1} at end")
            
            polygon_utm = Polygon(polygon_coords_utm)
        
        else:
            start_point = Point(coords_utm[0])
            end_point = Point(coords_utm[-1])
            distance_meters = start_point.distance(end_point)
            
            polygon_coords_utm = coords_utm.copy()
            
            if distance_meters <= close_threshold_meters:
                print(f"Feature {idx}: Ends are {distance_meters:.2f}m apart - closing directly")
            else:
                print(f"Feature {idx}: Warning - ends are {distance_meters:.2f}m apart (>{close_threshold_meters}m), closing anyway")
            
            if polygon_coords_utm[0] != polygon_coords_utm[-1]:
                polygon_coords_utm.append(polygon_coords_utm[0])
            
            polygon_utm = Polygon(polygon_coords_utm)
        
        polygon_wgs84 = transform_from_utm(polygon_utm, utm_crs)
        
        new_geometries.append(polygon_wgs84)
    
    gdf.geometry = new_geometries
    
    if return_as_dict:
        if was_single_feature:
            return json.loads(gdf.to_json())['features'][0]
        else:
            return json.loads(gdf.to_json())
    else:
        return gdf


def tracking_points_to_geojson(points: list[dict]) -> dict:
    """
    Convert a list of GPS tracking dicts to a GeoJSON Feature with a LineString.

    Each dict must contain 'lat' and 'lon' keys. All other fields are ignored.

    Args:
        points: List of dicts with at least 'lat' and 'lon' keys

    Returns:
        GeoJSON Feature dict with a LineString geometry
    """
    if len(points) < 2:
        raise ValueError("At least 2 points are required to build a LineString")

    for i, p in enumerate(points):
        if 'lat' not in p or 'lon' not in p:
            raise ValueError(f"Point {i} is missing 'lat' or 'lon'")

    coordinates = [[p['lon'], p['lat']] for p in points]

    return {
        "type": "Feature",
        "properties": {},
        "geometry": {
            "type": "LineString",
            "coordinates": coordinates
        }
    }


def load_geojson(filepath: str | Path) -> dict:
    """Load a GeoJSON from file."""
    filepath = Path(filepath)
    with filepath.open('r', encoding='utf-8') as f:
        return json.load(f)


def save_geojson(geojson: dict, filepath: str | Path):
    """Save a GeoJSON to file."""
    filepath = Path(filepath)
    with filepath.open('w', encoding='utf-8') as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python linestring_to_polygon.py <input.geojson> [output.geojson] [OPTIONS]")
        print("\nParameters:")
        print("  input.geojson  - GeoJSON file with LineString (Feature or FeatureCollection)")
        print("  output.geojson - Output file (optional, default: output_polygon.geojson)")
        print("\nOptions:")
        print("  --simplify METERS - Simplify polygon with Douglas-Peucker (e.g. --simplify 1.0)")
        print("                      Smaller values = more detail, larger values = stronger simplification")
        print("  --buffer METERS   - Add buffer in meters around polygon (e.g. --buffer 12)")
        print("\nSupported formats:")
        print("  - Single Feature with LineString")
        print("  - FeatureCollection with LineStrings")
        print("\nExamples:")
        print("  python linestring_to_polygon.py input.geojson")
        print("  python linestring_to_polygon.py input.geojson output.geojson")
        print("  python linestring_to_polygon.py input.geojson output.geojson --simplify 2.0")
        print("  python linestring_to_polygon.py input.geojson output.geojson --simplify 1.5 --buffer 12")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    output_file = 'output_polygon.geojson'
    buffer_meters = None
    simplify_tolerance = None
    
    i = 2
    while i < len(sys.argv):
        if sys.argv[i] == '--buffer' and i + 1 < len(sys.argv):
            buffer_meters = float(sys.argv[i + 1])
            i += 2
        elif sys.argv[i] == '--simplify' and i + 1 < len(sys.argv):
            simplify_tolerance = float(sys.argv[i + 1])
            i += 2
        else:
            output_file = sys.argv[i]
            i += 1
    
    try:
        print(f"Loading {input_file}...")
        geojson_input = load_geojson(input_file)
        
        print("Converting LineString(s) to Polygon(s)...\n")
        polygon = linestring_to_polygon(geojson_input)
        
        # Optional: Simplify polygon
        if simplify_tolerance is not None:
            print(f"\nSimplifying polygon with {simplify_tolerance}m tolerance...\n")
            polygon = simplify_polygon(polygon, simplify_tolerance)
        
        # Optional: Add buffer
        if buffer_meters is not None:
            print(f"\nAdding {buffer_meters}m buffer...\n")
            polygon = add_buffer_to_polygon(polygon, buffer_meters)
        
        print(f"\nSaving result to {output_file}...")
        save_geojson(polygon, output_file)
        
        print(f"\n✓ Success! Polygon saved to: {output_file}")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
