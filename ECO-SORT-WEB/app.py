from flask import Flask, render_template, jsonify, request
import time
import mysql.connector
import base64
import re
import json

app = Flask(__name__)

# MySQL connection config
DB_CONFIG = {
    'host': '127.0.0.1',
    'user': 'Jazwanth',
    'password': 'VRJaz@1104#SQL',
    'database': 'Mapping'
}

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/update_location', methods=['POST'])
def update_location():
    data = request.get_json()
    lat = data.get('lat')
    lng = data.get('lng')
    
    # Log the location (real or simulated)
    print(f"Location updated: {lat}, {lng}")
    
    return jsonify({'status': 'success', 'timestamp': time.time()})

@app.route('/save_shapes', methods=['POST'])
def save_shapes():
    try:
        data = request.get_json()
        print('Received data:', data)
        shapes = data.get('shapes', [])
        print(f'Received {len(shapes)} shapes')
        conn = get_db_connection()
        cursor = conn.cursor()
        inserted = 0
        for i, shape in enumerate(shapes):
            print(f'Processing shape {i}:', shape)
            shape_type = shape.get('type')
            name = shape.get('name')
            color = shape.get('color', None)
            thumbnail = shape.get('thumbnail')
            full_image = shape.get('fullImage') if 'fullImage' in shape else None
            # Coordinates: for marker, single lat/lng; for polygon, list
            latlngs = shape.get('latlng') if shape_type == 'marker' else shape.get('latlngs')
            latlngs_json = json.dumps(latlngs)
            # Convert base64 image to binary
            def b64_to_bin(b64str):
                if not b64str:
                    return None
                img_data = re.sub('^data:image/.+;base64,', '', b64str)
                return base64.b64decode(img_data)
            thumb_bin = b64_to_bin(thumbnail)
            full_bin = b64_to_bin(full_image)
            # Insert into DB
            try:
                cursor.execute(
                    """
                    INSERT INTO shapes (type, name, latlngs, color, thumbnail, full_image)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (shape_type, name, latlngs_json, color, thumb_bin, full_bin)
                )
                inserted += 1
            except Exception as e:
                print(f'Error inserting shape {i}:', e)
        conn.commit()
        cursor.close()
        conn.close()
        print(f'Inserted {inserted} shapes into DB')
        return jsonify({'status': 'success', 'count': inserted})
    except Exception as e:
        print('Error in /save_shapes:', e)
        return jsonify({'status': 'error', 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
