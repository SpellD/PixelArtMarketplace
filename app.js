const firebaseConfig = {
    apiKey: "AIzaSyABCDEFGHIJKLMNOPQRSTUVWXYZ12345678",
    authDomain: "pixelartmarketplace.firebaseapp.com",
    databaseURL: "https://pixelartmarketplace-default-rtdb.firebaseio.com",
    projectId: "pixelartmarketplace",
    storageBucket: "pixelartmarketplace.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdefghijklmnopqrstuv"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Canvas setup
const canvas = document.getElementById('pixel-canvas');
const ctx = canvas.getContext('2d');
const canvasContainer = document.getElementById('canvas-container');

// App state
const state = {
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    selectedPixels: new Set(),
    userPixels: new Set(),
    allPixels: {},
    currentColor: '#FF0000',
    user: null,
    pixelSize: 20, // base size before zoom
    canvasWidth: 100, // in pixels
    canvasHeight: 100 // in pixels
};

// Initialize canvas
function initCanvas() {
    canvas.width = canvasContainer.clientWidth;
    canvas.height = canvasContainer.clientHeight;
    renderCanvas();
}

// Render the canvas
function renderCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate visible area
    const startX = Math.max(0, Math.floor(-state.offsetX / (state.pixelSize * state.zoom)));
    const startY = Math.max(0, Math.floor(-state.offsetY / (state.pixelSize * state.zoom)));
    const endX = Math.min(state.canvasWidth, startX + Math.ceil(canvas.width / (state.pixelSize * state.zoom)) + 1);
    const endY = Math.min(state.canvasHeight, startY + Math.ceil(canvas.height / (state.pixelSize * state.zoom)) + 1);
    
    // Draw grid and pixels
    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            const pixelKey = `${x},${y}`;
            const screenX = x * state.pixelSize * state.zoom + state.offsetX;
            const screenY = y * state.pixelSize * state.zoom + state.offsetY;
            const size = state.pixelSize * state.zoom;
            
            // Draw pixel color
            if (state.allPixels[pixelKey]) {
                ctx.fillStyle = state.allPixels[pixelKey].color || '#FFFFFF';
                ctx.fillRect(screenX, screenY, size, size);
            }
            
            // Draw selection
            if (state.selectedPixels.has(pixelKey)) {
                ctx.strokeStyle = 'yellow';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX, screenY, size, size);
            }
            
            // Draw owned pixels (blinking effect)
            if (state.userPixels.has(pixelKey) && Math.floor(Date.now() / 500) % 2 === 0) {
                ctx.strokeStyle = '#00FF00';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX, screenY, size, size);
            }
            
            // Draw occupied pixels (blinking effect)
            if (state.allPixels[pixelKey] && !state.userPixels.has(pixelKey) && Math.floor(Date.now() / 500) % 2 === 1) {
                ctx.strokeStyle = '#FF0000';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX, screenY, size, size);
            }
        }
    }
    
    // Draw grid lines
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 0.5;
    for (let x = startX; x <= endX; x++) {
        const screenX = x * state.pixelSize * state.zoom + state.offsetX;
        ctx.beginPath();
        ctx.moveTo(screenX, startY * state.pixelSize * state.zoom + state.offsetY);
        ctx.lineTo(screenX, endY * state.pixelSize * state.zoom + state.offsetY);
        ctx.stroke();
    }
    for (let y = startY; y <= endY; y++) {
        const screenY = y * state.pixelSize * state.zoom + state.offsetY;
        ctx.beginPath();
        ctx.moveTo(startX * state.pixelSize * state.zoom + state.offsetX, screenY);
        ctx.lineTo(endX * state.pixelSize * state.zoom + state.offsetX, screenY);
        ctx.stroke();
    }
    
    requestAnimationFrame(renderCanvas);
}

// Get pixel coordinates from screen position
function getPixelAtScreenPos(screenX, screenY) {
    const x = Math.floor((screenX - state.offsetX) / (state.pixelSize * state.zoom));
    const y = Math.floor((screenY - state.offsetY) / (state.pixelSize * state.zoom));
    return { x, y, key: `${x},${y}` };
}

// Event listeners
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const pixel = getPixelAtScreenPos(mouseX, mouseY);
    if (pixel.x >= 0 && pixel.x < state.canvasWidth && pixel.y >= 0 && pixel.y < state.canvasHeight) {
        state.isDragging = false;
        state.dragStartX = pixel.x;
        state.dragStartY = pixel.y;
        state.selectedPixels.add(pixel.key);
        updateSelectionInfo();
    } else {
        state.isDragging = true;
        state.dragStartX = mouseX;
        state.dragStartY = mouseY;
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Update pixel info display
    const pixel = getPixelAtScreenPos(mouseX, mouseY);
    if (pixel.x >= 0 && pixel.x < state.canvasWidth && pixel.y >= 0 && pixel.y < state.canvasHeight) {
        const pixelData = state.allPixels[pixel.key];
        document.getElementById('pixel-info').textContent = 
            `Pixel: ${pixel.x},${pixel.y} ${pixelData ? `(Owner: ${pixelData.owner})` : ''}`;
    } else {
        document.getElementById('pixel-info').textContent = 'Hover over a pixel';
    }
    
    if (state.isDragging) {
        state.offsetX += mouseX - state.dragStartX;
        state.offsetY += mouseY - state.dragStartY;
        state.dragStartX = mouseX;
        state.dragStartY = mouseY;
        updatePositionInfo();
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (!state.isDragging) return;
    state.isDragging = false;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(state.zoom * zoomFactor, 0.1), 5);
    
    // Zoom toward mouse position
    state.offsetX = mouseX - (mouseX - state.offsetX) * (newZoom / state.zoom);
    state.offsetY = mouseY - (mouseY - state.offsetY) * (newZoom / state.zoom);
    
    state.zoom = newZoom;
    updateZoomInfo();
});

// UI updates
function updateZoomInfo() {
    document.getElementById('zoom-level').textContent = `${Math.round(state.zoom * 100)}%`;
}

function updatePositionInfo() {
    document.getElementById('position-info').textContent = `${Math.round(-state.offsetX)},${Math.round(-state.offsetY)}`;
}

function updateSelectionInfo() {
    document.getElementById('total-cost').textContent = state.selectedPixels.size;
}

// Center the map
document.getElementById('center-btn').addEventListener('click', () => {
    state.zoom = 1;
    state.offsetX = (canvas.width - state.canvasWidth * state.pixelSize) / 2;
    state.offsetY = (canvas.height - state.canvasHeight * state.pixelSize) / 2;
    updateZoomInfo();
    updatePositionInfo();
});

// Color picker
document.getElementById('color-picker').addEventListener('input', (e) => {
    state.currentColor = e.target.value;
});

// Buy selected pixels
document.getElementById('buy-btn').addEventListener('click', async () => {
    if (!state.user) {
        alert('Please login first');
        return;
    }
    
    if (state.selectedPixels.size === 0) {
        alert('Please select pixels to buy');
        return;
    }
    
    // Check if any selected pixels are already owned
    for (const pixelKey of state.selectedPixels) {
        if (state.allPixels[pixelKey] && state.allPixels[pixelKey].owner !== state.user.uid) {
            alert('Some selected pixels are already owned by others');
            return;
        }
    }
    
    // Calculate total cost
    const totalCost = state.selectedPixels.size * 1; // $1 per pixel
    
    // In a real app, you would integrate with a payment processor here
    if (!confirm(`Buy ${state.selectedPixels.size} pixels for $${totalCost}?`)) {
        return;
    }
    
    // Save to Firebase
    const updates = {};
    const timestamp = Date.now();
    
    for (const pixelKey of state.selectedPixels) {
        updates[`pixels/${pixelKey}`] = {
            color: '#FFFFFF',
            owner: state.user.uid,
            ownerName: state.user.displayName || 'Anonymous',
            lastUpdated: timestamp
        };
        
        updates[`users/${state.user.uid}/pixels/${pixelKey}`] = true;
    }
    
    try {
        await database.ref().update(updates);
        state.selectedPixels.clear();
        updateSelectionInfo();
        alert('Purchase successful!');
    } catch (error) {
        console.error('Error saving pixels:', error);
        alert('Error saving pixels. Please try again.');
    }
});

// Auth functions
function toggleAuthModal(show) {
    document.getElementById('auth-modal').classList.toggle('hidden', !show);
}

document.getElementById('login-btn').addEventListener('click', () => toggleAuthModal(true));
document.getElementById('close-auth').addEventListener('click', () => toggleAuthModal(false));

// Google auth
document.getElementById('google-auth').addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(error => {
        console.error('Google auth error:', error);
        alert('Google authentication failed');
    });
});

// Email/password auth
document.getElementById('email-login').addEventListener('click', () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    auth.signInWithEmailAndPassword(email, password).catch(error => {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    });
});

document.getElementById('email-register').addEventListener('click', () => {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    auth.createUserWithEmailAndPassword(email, password).catch(error => {
        console.error('Registration error:', error);
        alert('Registration failed: ' + error.message);
    });
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    auth.signOut();
});

// Auth state listener
auth.onAuthStateChanged(user => {
    state.user = user;
    
    if (user) {
        document.getElementById('login-btn').classList.add('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
        document.getElementById('user-info').textContent = `Logged in as ${user.displayName || user.email}`;
        
        // Load user's pixels
        database.ref(`users/${user.uid}/pixels`).on('value', snapshot => {
            state.userPixels.clear();
            if (snapshot.exists()) {
                Object.keys(snapshot.val()).forEach(key => state.userPixels.add(key));
            }
        });
    } else {
        document.getElementById('login-btn').classList.remove('hidden');
        document.getElementById('logout-btn').classList.add('hidden');
        document.getElementById('user-info').textContent = '';
        state.userPixels.clear();
    }
    
    toggleAuthModal(false);
});

// Inventory modal
function toggleInventoryModal(show) {
    document.getElementById('inventory-modal').classList.toggle('hidden', !show);
    
    if (show && state.user) {
        const pixelList = document.getElementById('pixel-list');
        pixelList.innerHTML = '';
        
        if (state.userPixels.size === 0) {
            pixelList.innerHTML = '<li>No pixels owned</li>';
        } else {
            Array.from(state.userPixels).forEach(pixelKey => {
                const li = document.createElement('li');
                li.textContent = pixelKey;
                li.style.cursor = 'pointer';
                li.addEventListener('click', () => {
                    const [x, y] = pixelKey.split(',').map(Number);
                    centerOnPixel(x, y);
                    toggleInventoryModal(false);
                });
                pixelList.appendChild(li);
            });
        }
    }
}

function centerOnPixel(x, y) {
    state.zoom = 2; // Zoom in a bit
    state.offsetX = canvas.width / 2 - x * state.pixelSize * state.zoom - state.pixelSize * state.zoom / 2;
    state.offsetY = canvas.height / 2 - y * state.pixelSize * state.zoom - state.pixelSize * state.zoom / 2;
    updateZoomInfo();
    updatePositionInfo();
}

document.getElementById('inventory-btn').addEventListener('click', () => {
    if (!state.user) {
        alert('Please login first');
        return;
    }
    toggleInventoryModal(true);
});

document.getElementById('close-inventory').addEventListener('click', () => toggleInventoryModal(false));

// Load all pixels from Firebase
database.ref('pixels').on('value', snapshot => {
    state.allPixels = snapshot.val() || {};
});

// Initialize
window.addEventListener('resize', initCanvas);
initCanvas();
updateZoomInfo();
updatePositionInfo();
updateSelectionInfo();

// Start rendering
requestAnimationFrame(renderCanvas);