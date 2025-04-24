from flask import Flask, render_template, jsonify, request
import time

app = Flask(__name__)

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
    data = request.get_json()
    shapes = data.get('shapes', [])
    
    # Log shape info and handle thumbnails
    for i, shape in enumerate(shapes):
        print(f"Shape {i}: type={shape.get('type')}, name={shape.get('name')}")
        thumbnail = shape.get('thumbnail')
        if thumbnail:
            # For demonstration, just log that we received a thumbnail
            print(f"  Received thumbnail for shape {i} (length: {len(thumbnail)} chars)")
            # Optionally, save to disk:
            # import base64, re
            # img_data = re.sub('^data:image/.+;base64,', '', thumbnail)
            # with open(f'thumbnail_{i}.png', 'wb') as f:
            #     f.write(base64.b64decode(img_data))
    
    return jsonify({'status': 'success', 'count': len(shapes)})

if __name__ == '__main__':
    app.run(debug=True)
