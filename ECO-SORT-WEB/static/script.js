// Initialize map
const map = L.map('map', {
    attributionControl: false
}).setView([0, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '',
    maxZoom: 19
}).addTo(map);

// Create marker
const marker = L.marker([0, 0]).addTo(map);

// Track location elements
const trackBtn = document.getElementById('trackLocation');
const trackText = document.getElementById('trackText');
const loadingIndicator = document.getElementById('loading');
let watchId = null;

// Check geolocation support
if (!navigator.geolocation) {
    trackText.textContent = 'Unsupported';
    trackBtn.disabled = true;
}

// Toggle tracking
trackBtn.addEventListener('click', () => {
    if (watchId) {
        stopTracking();
    } else {
        startTracking();
    }
});

function startTracking() {
    loadingIndicator.style.display = 'block';
    trackText.textContent = 'Locating...';
    
    // First verify we can get position
    navigator.geolocation.getCurrentPosition(
        (position) => {
            updatePosition(position);
            loadingIndicator.style.display = 'none';
            trackText.textContent = 'Tracking';
            trackBtn.classList.add('active');
            
            // Start watching position
            watchId = navigator.geolocation.watchPosition(
                updatePosition,
                handleError,
                { 
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 10000
                }
            );
        },
        handleError,
        { 
            enableHighAccuracy: true,
            timeout: 10000
        }
    );
}

function stopTracking() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    trackText.textContent = 'Live Track';
    trackBtn.classList.remove('active');
    loadingIndicator.style.display = 'none';
}

function updatePosition(position) {
    const { latitude, longitude } = position.coords;
    marker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], 17);
    
    // Create wave effect
    const wave = L.circle([latitude, longitude], {
        radius: position.coords.accuracy || 50,
        color: '#3388ff',
        fillColor: '#3388ff',
        fillOpacity: 0.2
    }).addTo(map);
    
    setTimeout(() => {
        map.removeLayer(wave);
    }, 3000);
}

function handleError(error) {
    console.error('Geolocation error:', error);
    loadingIndicator.style.display = 'none';
    trackText.textContent = 'Error';
    
    switch(error.code) {
        case error.PERMISSION_DENIED:
            alert('Please enable location permissions');
            break;
        case error.POSITION_UNAVAILABLE:
            alert('Location unavailable');
            break;
        case error.TIMEOUT:
            alert('Location request timed out');
            break;
        default:
            alert('Error getting location');
    }
    
    stopTracking();
}

// Auto-locate with high accuracy
map.locate({
    setView: true,
    maxZoom: 17,
    enableHighAccuracy: true
});

map.on('locationfound', function(e) {
    marker.setLatLng(e.latlng);
    updatePosition(e);
});

// Drawing functionality
const drawControls = document.getElementById('drawControls');
const areaProperties = document.getElementById('areaProperties');
const drawPolygonBtn = document.getElementById('drawPolygon');
const saveAreaBtn = document.getElementById('saveArea');

// Camera and thumbnail elements
const openCameraBtn = document.getElementById('openCameraBtn');
const cameraContainer = document.getElementById('cameraContainer');
const cameraPreview = document.getElementById('cameraPreview');
const captureBtn = document.getElementById('captureBtn');
const thumbnailImg = document.getElementById('thumbnailImg');
const changePictureBtn = document.getElementById('changePictureBtn');
const removePictureBtn = document.getElementById('removePictureBtn');
let cameraStream = null;

function openCameraForThumbnail() {
    cameraContainer.style.display = 'flex';
    navigator.mediaDevices.getUserMedia({ video: { width: 120, height: 90 } })
        .then(function(stream) {
            cameraStream = stream;
            cameraPreview.srcObject = stream;
        })
        .catch(function(err) {
            alert('Camera access denied or unavailable.');
        });
}

// Open camera
openCameraBtn.addEventListener('click', openCameraForThumbnail);

// Change picture
changePictureBtn.addEventListener('click', openCameraForThumbnail);


// Capture thumbnail and full image
captureBtn.addEventListener('click', function() {
    if (!cameraStream) return;
    // Full-size image (from video) at native resolution
    const fullCanvas = document.createElement('canvas');
    const vw = cameraPreview.videoWidth;
    const vh = cameraPreview.videoHeight;
    fullCanvas.width = vw > 0 ? vw : 1280;
    fullCanvas.height = vh > 0 ? vh : 720;
    const fullCtx = fullCanvas.getContext('2d');
    fullCtx.imageSmoothingEnabled = true;
    fullCtx.imageSmoothingQuality = 'high';
    fullCtx.drawImage(cameraPreview, 0, 0, fullCanvas.width, fullCanvas.height);
    currentFullImage = fullCanvas.toDataURL('image/png');
    // Thumbnail (64x64)
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cameraPreview, 0, 0, 64, 64);
    const dataUrl = canvas.toDataURL('image/png');
    thumbnailImg.src = dataUrl;
    thumbnailImg.style.display = 'block';
    changePictureBtn.style.display = 'inline-block';
    removePictureBtn.style.display = 'inline-block';
    currentThumbnail = dataUrl;
    // Stop camera
    cameraPreview.pause && cameraPreview.pause();
    cameraPreview.srcObject = null;
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    cameraContainer.style.display = 'none';
});

// Remove picture
removePictureBtn.addEventListener('click', function() {
    thumbnailImg.style.display = 'none';
    thumbnailImg.src = '';
    changePictureBtn.style.display = 'none';
    removePictureBtn.style.display = 'none';
    currentThumbnail = null;
});

let drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

let currentPolygon = null;
let currentThumbnail = null; // Store base64 thumbnail for current area
let currentFullImage = null; // Store full-size base64 image for current area

// Initialize draw control
const drawControl = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems
    },
    draw: {
        polygon: {
            shapeOptions: {
                color: '#3388ff',
                fillOpacity: 0.5
            },
            allowIntersection: false,
            showArea: true
        },
        marker: false,
        circle: false,
        rectangle: false,
        polyline: false
    }
});
map.addControl(drawControl);

// Handle drawing events
map.on(L.Draw.Event.CREATED, function(e) {
    if (e.layerType === 'polygon') {
        currentPolygon = e.layer;
        drawnItems.addLayer(currentPolygon);
        
        // Show properties form
        areaProperties.style.display = 'block';
        document.getElementById('areaName').focus();
    }
});

// Save area with name, color, thumbnail, and full image
saveAreaBtn.addEventListener('click', function() {
    if (!currentPolygon) return;
    const name = document.getElementById('areaName').value || 'Unnamed Area';
    const color = document.getElementById('areaColor').value;
    // Style the polygon
    currentPolygon.setStyle({
        color: color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 3,
        dashArray: '6, 4',
        className: 'custom-area-polygon'
    });
    // Store thumbnail and full image in polygon instance for later saving
    currentPolygon.thumbnail = currentThumbnail;
    currentPolygon.fullImage = currentFullImage;
    // Add popup with name, thumbnail, and edit/delete controls
    let thumbHtml = currentThumbnail ? `<img src='${currentThumbnail}' class='popup-thumbnail' style='width:48px;height:48px;border-radius:6px;object-fit:cover;margin-bottom:6px;cursor:pointer;'><br>` : '';
    currentPolygon.bindPopup(`
        <b>${name}</b><br>
        ${thumbHtml}
        <button class='edit-shape-btn' style='margin:6px 4px 0 0;padding:5px 14px;border:none;border-radius:6px;background:#4a6cf7;color:#fff;font-weight:600;cursor:pointer;'>Edit</button>
        <button class='delete-shape-btn' style='margin:6px 0 0 0;padding:5px 14px;border:none;border-radius:6px;background:#ff4757;color:#fff;font-weight:600;cursor:pointer;'>Delete</button>
    `);
    // Visual feedback
    currentPolygon.openPopup();
    // Reset UI
    areaProperties.style.display = 'none';
    document.getElementById('areaName').value = '';
    thumbnailImg.style.display = 'none';
    thumbnailImg.src = '';
    changePictureBtn.style.display = 'none';
    removePictureBtn.style.display = 'none';
    currentThumbnail = null;
    currentFullImage = null;
    currentPolygon = null;
});

// Delegated event handler for edit/delete buttons in popups
map.on('popupopen', function(e) {
    const layer = e.popup._source;
    const popupContent = e.popup.getContent();
    // Thumbnail click handler (full image modal)
    const thumbImg = e.popup._contentNode.querySelector('.popup-thumbnail');
    if (thumbImg) {
        thumbImg.onclick = function() {
            const modal = document.getElementById('imageModal');
            const modalImg = document.getElementById('modalImg');
            // Try to get the full image from the polygon's data
            let fullImgSrc = null;
            if (layer && layer.fullImage) {
                fullImgSrc = layer.fullImage;
            } else {
                fullImgSrc = thumbImg.src;
            }
            modalImg.src = fullImgSrc;
            modal.style.display = 'flex';
        };
    }
    // Edit shape
    const editBtn = e.popup._contentNode.querySelector('.edit-shape-btn');
    if (editBtn) {
        editBtn.onclick = function() {
            layer.editing.enable();
            editBtn.style.display = 'none';
            // Add a finish button
            let finishBtn = document.createElement('button');
            finishBtn.textContent = 'Finish';
            finishBtn.style.cssText = 'margin:6px 4px 0 0;padding:5px 14px;border:none;border-radius:6px;background:#4a6cf7;color:#fff;font-weight:600;cursor:pointer;';
            e.popup._contentNode.appendChild(finishBtn);
            finishBtn.onclick = function() {
                layer.editing.disable();
                map.closePopup();
                // Reopen popup with controls
                setTimeout(() => {
                    layer.openPopup();
                }, 200);
            };
        };
    }
    // Delete shape
    const deleteBtn = e.popup._contentNode.querySelector('.delete-shape-btn');
    if (deleteBtn) {
        deleteBtn.onclick = function() {
            map.removeLayer(layer);
        };
    }
});

// Delete area logic
const deleteAreaBtn = document.getElementById('deleteArea');
deleteAreaBtn.addEventListener('click', function() {
    if (currentPolygon) {
        map.removeLayer(currentPolygon);
        currentPolygon = null;
    }
    areaProperties.style.display = 'none';
    document.getElementById('areaName').value = '';
});

// Cancel area logic
const cancelAreaBtn = document.getElementById('cancelArea');
cancelAreaBtn.addEventListener('click', function() {
    if (currentPolygon) {
        map.removeLayer(currentPolygon);
        currentPolygon = null;
    }
    areaProperties.style.display = 'none';
    document.getElementById('areaName').value = '';
    thumbnailImg.style.display = 'none';
    thumbnailImg.src = '';
    changePictureBtn.style.display = 'none';
    removePictureBtn.style.display = 'none';
    currentThumbnail = null;
});

// Toggle drawing mode
let drawingPolygon = false;
let drawPolygonInstance = null;
drawPolygonBtn.addEventListener('click', function() {
    if (!drawingPolygon) {
        drawPolygonInstance = new L.Draw.Polygon(map, drawControl.options.draw.polygon);
        drawPolygonInstance.enable();
        drawingPolygon = true;
    } else {
        if (drawPolygonInstance) {
            drawPolygonInstance.disable();
        }
        drawingPolygon = false;
    }
});
// Reset drawingPolygon flag when drawing is finished
map.on(L.Draw.Event.CREATED, function(e) {
    drawingPolygon = false;
});

// Drawing tools
let drawnItems2 = new L.FeatureGroup();
map.addLayer(drawnItems2);

// Modal logic for full-size image
const imageModal = document.getElementById('imageModal');
const modalImg = document.getElementById('modalImg');
if (imageModal && modalImg) {
    imageModal.addEventListener('click', function(e) {
        if (e.target === imageModal) {
            imageModal.style.display = 'none';
            modalImg.src = '';
        }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            imageModal.style.display = 'none';
            modalImg.src = '';
        }
    });
}


// Initialize drawing control
const drawControl2 = new L.Control.Draw({
    edit: {
        featureGroup: drawnItems2
    },
    draw: {
        polygon: true,
        marker: true,
        circle: false,
        rectangle: false,
        polyline: false
    }
});
map.addControl(drawControl2);

// Handle drawing events
map.on(L.Draw.Event.CREATED, function (e) {
    const layer = e.layer;
    
    // Add popup for naming
    if (e.layerType === 'marker') {
        layer.bindPopup('<input type="text" class="shape-name" placeholder="Marker name">');
    } else {
        layer.bindPopup('<input type="text" class="shape-name" placeholder="Area name">');
    }
    
    drawnItems2.addLayer(layer);
});

// Save shapes to server
const saveShapesBtn = document.getElementById('saveShapes');
saveShapesBtn.addEventListener('click', function() {
    const shapes = [];
    
    drawnItems2.eachLayer(function(layer) {
        const name = layer.getPopup()?.getContent()?.querySelector('.shape-name')?.value || 'Unnamed';
        let thumbnail = layer.thumbnail || null;
        if (layer instanceof L.Marker) {
            shapes.push({
                type: 'marker',
                name: name,
                latlng: layer.getLatLng(),
                thumbnail: thumbnail
            });
        } else if (layer instanceof L.Polygon) {
            shapes.push({
                type: 'polygon',
                name: name,
                latlngs: layer.getLatLngs(),
                thumbnail: thumbnail
            });
        }
    });
    
    fetch('/save_shapes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shapes })
    }).then(response => alert('Shapes saved successfully!'));
});
