/**
 * 3D CAD Designer - Professional Drawing & Measurement Tool
 * A comprehensive CAD application built with Three.js
 * Author: Enhanced by AI Assistant
 * Version: 2.0.0
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module';

// ============================================================================
// APPLICATION STATE AND CONFIGURATION
// ============================================================================

class CADApplication {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.stats = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Application state
        this.currentTool = 'point';
        this.selectedObjects = [];
        this.layers = [{ name: 'Layer 1', visible: true, objects: [] }];
        this.currentLayer = 0;
        this.gridEnabled = true;
        this.snapEnabled = true;
        this.gridSize = 1;
        this.snapTolerance = 0.5;
        
        // Drawing state
        this.isDrawing = false;
        this.drawingPoints = [];
        this.previewObject = null;
        
        // Undo/Redo system
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySteps = 50;
        
        // Object storage
        this.objects = [];
        this.objectIdCounter = 0;
        
        // UI elements
        this.loadingOverlay = document.getElementById('loading-overlay');
        
        // Measurements
        this.totalLength = 0;
        this.totalArea = 0;
        
        this.init();
    }

    async init() {
        try {
            this.setupScene();
            this.setupEventListeners();
            this.setupUI();
            await this.hideLoadingScreen();
            this.animate();
        } catch (error) {
            console.error('Failed to initialize CAD application:', error);
        }
    }

    setupScene() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x121212);
        this.scene.fog = new THREE.Fog(0x121212, 100, 1000);

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(30, 30, 30);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: true // For screenshot export
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.enablePan = true;
        this.controls.maxPolarAngle = Math.PI / 2;

        // Lighting setup
        this.setupLighting();

        // Scene objects
        this.setupSceneObjects();

        // Stats
        this.stats = Stats();
        this.stats.dom.style.position = 'absolute';
        this.stats.dom.style.top = '80px';
        this.stats.dom.style.left = '10px';
        this.stats.dom.style.zIndex = '999';
        document.body.appendChild(this.stats.dom);

        // Add renderer to container
        const container = document.getElementById('webgl-container');
        container.appendChild(this.renderer.domElement);
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);

        // Directional light (main light)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);

        // Hemisphere light for softer lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x362D1D, 0.3);
        this.scene.add(hemisphereLight);
    }

    setupSceneObjects() {
        // Grid
        this.grid = new THREE.GridHelper(100, 100, 0x3C3C3C, 0x2D2D30);
        this.grid.material.transparent = true;
        this.grid.material.opacity = 0.8;
        this.scene.add(this.grid);

        // Axes helper
        this.axes = new THREE.AxesHelper(25);
        this.scene.add(this.axes);

        // Ground plane (invisible, for raycasting)
        const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
        const planeMaterial = new THREE.MeshBasicMaterial({ 
            visible: false,
            side: THREE.DoubleSide 
        });
        this.groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.name = 'groundPlane';
        this.scene.add(this.groundPlane);
    }

    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', this.handleResize.bind(this));

        // Mouse events
        this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.renderer.domElement.addEventListener('click', this.handleClick.bind(this));
        this.renderer.domElement.addEventListener('contextmenu', this.handleRightClick.bind(this));

        // Keyboard events
        window.addEventListener('keydown', this.handleKeyDown.bind(this));

        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTool(e.target.closest('.tool-btn').dataset.tool);
            });
        });

        // Action buttons
        document.getElementById('undo')?.addEventListener('click', () => this.undo());
        document.getElementById('redo')?.addEventListener('click', () => this.redo());
        document.getElementById('clear-all')?.addEventListener('click', () => this.clearAll());
        document.getElementById('delete-selected')?.addEventListener('click', () => this.deleteSelected());

        // View buttons
        document.getElementById('view-top')?.addEventListener('click', () => this.setViewTop());
        document.getElementById('view-reset')?.addEventListener('click', () => this.resetView());
        document.getElementById('toggle-grid')?.addEventListener('click', () => this.toggleGrid());
        document.getElementById('toggle-snap')?.addEventListener('click', () => this.toggleSnap());

        // Project buttons
        document.getElementById('save-project')?.addEventListener('click', () => this.saveProject());
        document.getElementById('load-project')?.addEventListener('click', () => this.loadProject());
        document.getElementById('export-project')?.addEventListener('click', () => this.showExportModal());

        // Export modal
        document.getElementById('confirm-export')?.addEventListener('click', () => this.exportProject());
        document.getElementById('cancel-export')?.addEventListener('click', () => this.hideExportModal());
        document.querySelector('#export-modal .close')?.addEventListener('click', () => this.hideExportModal());

        // Layer management
        document.getElementById('add-layer')?.addEventListener('click', () => this.addLayer());

        // Precision controls
        document.getElementById('grid-size')?.addEventListener('change', (e) => {
            this.gridSize = parseFloat(e.target.value);
            this.updateGrid();
        });
        document.getElementById('snap-tolerance')?.addEventListener('change', (e) => {
            this.snapTolerance = parseFloat(e.target.value);
        });
        document.getElementById('enable-snap')?.addEventListener('change', (e) => {
            this.snapEnabled = e.target.checked;
        });
    }

    setupUI() {
        this.updateToolStatus();
        this.updateMeasurements();
        this.updateLayers();
    }

    async hideLoadingScreen() {
        return new Promise(resolve => {
            setTimeout(() => {
                this.loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    this.loadingOverlay.style.display = 'none';
                    resolve();
                }, 500);
            }, 1000);
        });
    }

    // ============================================================================
    // CORE FUNCTIONALITY
    // ============================================================================

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.stats.update();
        this.renderer.render(this.scene, this.camera);
        
        // Update FPS counter
        const fps = Math.round(1000 / this.stats.stats[0].time);
        const fpsElement = document.getElementById('fps-counter');
        if (fpsElement) fpsElement.textContent = fps;
    }

    handleResize() {
        const container = document.getElementById('webgl-container');
        const rect = container.getBoundingClientRect();
        
        this.camera.aspect = rect.width / rect.height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(rect.width, rect.height);
    }

    handleMouseMove(event) {
        const container = document.getElementById('webgl-container');
        const rect = container.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Update raycaster
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.groundPlane);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            const snappedPoint = this.snapEnabled ? this.snapToGrid(point) : point;
            
            // Update cursor coordinates
            this.updateCursorCoordinates(snappedPoint.x, snappedPoint.z);
            
            // Handle drawing preview
            this.handleDrawingPreview(snappedPoint);
        }
    }

    handleClick(event) {
        if (event.button !== 0) return; // Only handle left click

        const container = document.getElementById('webgl-container');
        const rect = container.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.groundPlane);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            const snappedPoint = this.snapEnabled ? this.snapToGrid(point) : point;
            
            this.handleToolAction(snappedPoint);
        }
    }

    handleRightClick(event) {
        event.preventDefault();
        
        // Right click cancels current drawing operation
        if (this.isDrawing) {
            this.cancelDrawing();
        }
    }

    handleKeyDown(event) {
        // Handle keyboard shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key.toLowerCase()) {
                case 'z':
                    event.preventDefault();
                    if (event.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    break;
                case 'y':
                    event.preventDefault();
                    this.redo();
                    break;
                case 's':
                    event.preventDefault();
                    this.saveProject();
                    break;
                case 'o':
                    event.preventDefault();
                    this.loadProject();
                    break;
                case 'e':
                    event.preventDefault();
                    this.showExportModal();
                    break;
            }
        } else {
            // Tool shortcuts
            switch (event.key.toLowerCase()) {
                case 'p':
                    this.setTool('point');
                    break;
                case 'l':
                    this.setTool('line');
                    break;
                case 'g':
                    this.setTool('polygon');
                    break;
                case 'c':
                    this.setTool('circle');
                    break;
                case 'r':
                    this.setTool('rectangle');
                    break;
                case 'delete':
                case 'backspace':
                    this.deleteSelected();
                    break;
                case 'escape':
                    this.cancelDrawing();
                    break;
            }
        }
    }

    // ============================================================================
    // DRAWING TOOLS
    // ============================================================================

    setTool(tool) {
        // Cancel any current drawing
        this.cancelDrawing();
        
        this.currentTool = tool;
        this.updateToolStatus();
        
        // Update UI
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`tool-${tool}`)?.classList.add('active');
    }

    handleToolAction(point) {
        switch (this.currentTool) {
            case 'point':
                this.drawPoint(point);
                break;
            case 'line':
                this.handleLineDrawing(point);
                break;
            case 'polygon':
                this.handlePolygonDrawing(point);
                break;
            case 'circle':
                this.handleCircleDrawing(point);
                break;
            case 'rectangle':
                this.handleRectangleDrawing(point);
                break;
        }
    }

    drawPoint(position) {
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x007ACC,
            emissive: 0x002244
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(position);
        sphere.position.y = 0.3;
        sphere.castShadow = true;
        
        const cadObject = this.createCADObject('point', sphere, { position: position.clone() });
        this.addObjectToScene(cadObject);
        this.saveState();
    }

    handleLineDrawing(point) {
        if (!this.isDrawing) {
            // Start line
            this.isDrawing = true;
            this.drawingPoints = [point.clone()];
        } else {
            // End line
            this.drawingPoints.push(point.clone());
            this.drawLine(this.drawingPoints[0], this.drawingPoints[1]);
            this.isDrawing = false;
            this.drawingPoints = [];
            this.clearPreview();
        }
    }

    drawLine(start, end) {
        const points = [start, end];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x00FF00,
            linewidth: 2
        });
        const line = new THREE.Line(geometry, material);
        
        const length = start.distanceTo(end);
        const cadObject = this.createCADObject('line', line, { 
            start: start.clone(), 
            end: end.clone(),
            length: length
        });
        
        this.addObjectToScene(cadObject);
        this.totalLength += length;
        this.updateMeasurements();
        this.saveState();
    }

    handlePolygonDrawing(point) {
        if (!this.isDrawing) {
            // Start polygon
            this.isDrawing = true;
            this.drawingPoints = [point.clone()];
        } else {
            this.drawingPoints.push(point.clone());
            
            // Check if we should close the polygon (click near start point)
            const startPoint = this.drawingPoints[0];
            if (this.drawingPoints.length > 2 && point.distanceTo(startPoint) < this.snapTolerance) {
                this.drawPolygon(this.drawingPoints.slice(0, -1)); // Remove last point (duplicate)
                this.isDrawing = false;
                this.drawingPoints = [];
                this.clearPreview();
            }
        }
    }

    drawPolygon(points) {
        if (points.length < 3) return;

        // Create line loop for polygon outline
        const geometry = new THREE.BufferGeometry().setFromPoints([...points, points[0]]);
        const material = new THREE.LineBasicMaterial({ 
            color: 0xFFFF00,
            linewidth: 2
        });
        const outline = new THREE.LineLoop(geometry, material);

        // Calculate area and perimeter
        const area = this.calculatePolygonArea(points);
        const perimeter = this.calculatePolygonPerimeter(points);
        
        const cadObject = this.createCADObject('polygon', outline, { 
            points: points.map(p => p.clone()),
            area: area,
            perimeter: perimeter
        });
        
        this.addObjectToScene(cadObject);
        this.totalArea += area;
        this.totalLength += perimeter;
        this.updateMeasurements();
        this.saveState();
    }

    handleCircleDrawing(point) {
        if (!this.isDrawing) {
            // Start circle (center point)
            this.isDrawing = true;
            this.drawingPoints = [point.clone()];
        } else {
            // End circle (radius point)
            const center = this.drawingPoints[0];
            const radius = center.distanceTo(point);
            this.drawCircle(center, radius);
            this.isDrawing = false;
            this.drawingPoints = [];
            this.clearPreview();
        }
    }

    drawCircle(center, radius) {
        const geometry = new THREE.RingGeometry(radius * 0.98, radius * 1.02, 64);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xFF00FF,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        const circle = new THREE.Mesh(geometry, material);
        circle.position.copy(center);
        circle.position.y = 0.01;
        circle.rotation.x = -Math.PI / 2;
        
        const circumference = 2 * Math.PI * radius;
        const area = Math.PI * radius * radius;
        
        const cadObject = this.createCADObject('circle', circle, { 
            center: center.clone(),
            radius: radius,
            circumference: circumference,
            area: area
        });
        
        this.addObjectToScene(cadObject);
        this.totalArea += area;
        this.totalLength += circumference;
        this.updateMeasurements();
        this.saveState();
    }

    handleRectangleDrawing(point) {
        if (!this.isDrawing) {
            // Start rectangle (first corner)
            this.isDrawing = true;
            this.drawingPoints = [point.clone()];
        } else {
            // End rectangle (opposite corner)
            const corner1 = this.drawingPoints[0];
            const corner2 = point;
            this.drawRectangle(corner1, corner2);
            this.isDrawing = false;
            this.drawingPoints = [];
            this.clearPreview();
        }
    }

    drawRectangle(corner1, corner2) {
        const width = Math.abs(corner2.x - corner1.x);
        const height = Math.abs(corner2.z - corner1.z);
        const centerX = (corner1.x + corner2.x) / 2;
        const centerZ = (corner1.z + corner2.z) / 2;
        
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00FFFF,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const rectangle = new THREE.Mesh(geometry, material);
        rectangle.position.set(centerX, 0.01, centerZ);
        rectangle.rotation.x = -Math.PI / 2;
        
        // Add outline
        const outlineGeometry = new THREE.EdgesGeometry(geometry);
        const outlineMaterial = new THREE.LineBasicMaterial({ color: 0x00FFFF });
        const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
        outline.position.copy(rectangle.position);
        outline.rotation.copy(rectangle.rotation);
        
        const group = new THREE.Group();
        group.add(rectangle);
        group.add(outline);
        
        const area = width * height;
        const perimeter = 2 * (width + height);
        
        const cadObject = this.createCADObject('rectangle', group, { 
            corner1: corner1.clone(),
            corner2: corner2.clone(),
            width: width,
            height: height,
            area: area,
            perimeter: perimeter
        });
        
        this.addObjectToScene(cadObject);
        this.totalArea += area;
        this.totalLength += perimeter;
        this.updateMeasurements();
        this.saveState();
    }

    handleDrawingPreview(point) {
        if (!this.isDrawing) return;

        this.clearPreview();

        switch (this.currentTool) {
            case 'line':
                this.showLinePreview(this.drawingPoints[0], point);
                break;
            case 'polygon':
                this.showPolygonPreview(this.drawingPoints, point);
                break;
            case 'circle':
                this.showCirclePreview(this.drawingPoints[0], point);
                break;
            case 'rectangle':
                this.showRectanglePreview(this.drawingPoints[0], point);
                break;
        }
    }

    showLinePreview(start, end) {
        const points = [start, end];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x888888,
            transparent: true,
            opacity: 0.5
        });
        this.previewObject = new THREE.Line(geometry, material);
        this.scene.add(this.previewObject);
    }

    showPolygonPreview(points, currentPoint) {
        if (points.length < 1) return;
        
        const previewPoints = [...points, currentPoint];
        const geometry = new THREE.BufferGeometry().setFromPoints(previewPoints);
        const material = new THREE.LineBasicMaterial({ 
            color: 0x888888,
            transparent: true,
            opacity: 0.5
        });
        this.previewObject = new THREE.Line(geometry, material);
        this.scene.add(this.previewObject);
    }

    showCirclePreview(center, edgePoint) {
        const radius = center.distanceTo(edgePoint);
        const geometry = new THREE.RingGeometry(radius * 0.98, radius * 1.02, 32);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x888888,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.previewObject = new THREE.Mesh(geometry, material);
        this.previewObject.position.copy(center);
        this.previewObject.position.y = 0.01;
        this.previewObject.rotation.x = -Math.PI / 2;
        this.scene.add(this.previewObject);
    }

    showRectanglePreview(corner1, corner2) {
        const width = Math.abs(corner2.x - corner1.x);
        const height = Math.abs(corner2.z - corner1.z);
        const centerX = (corner1.x + corner2.x) / 2;
        const centerZ = (corner1.z + corner2.z) / 2;
        
        const geometry = new THREE.PlaneGeometry(width, height);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x888888,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        this.previewObject = new THREE.Mesh(geometry, material);
        this.previewObject.position.set(centerX, 0.01, centerZ);
        this.previewObject.rotation.x = -Math.PI / 2;
        this.scene.add(this.previewObject);
    }

    clearPreview() {
        if (this.previewObject) {
            this.scene.remove(this.previewObject);
            this.previewObject.geometry?.dispose();
            this.previewObject.material?.dispose();
            this.previewObject = null;
        }
    }

    cancelDrawing() {
        this.isDrawing = false;
        this.drawingPoints = [];
        this.clearPreview();
        this.updateToolStatus();
    }

    // ============================================================================
    // OBJECT MANAGEMENT
    // ============================================================================

    createCADObject(type, mesh, properties) {
        const cadObject = {
            id: this.objectIdCounter++,
            type: type,
            mesh: mesh,
            properties: properties,
            layer: this.currentLayer,
            selected: false,
            visible: true
        };
        
        mesh.userData = { cadObject: cadObject };
        return cadObject;
    }

    addObjectToScene(cadObject) {
        this.scene.add(cadObject.mesh);
        this.objects.push(cadObject);
        this.layers[this.currentLayer].objects.push(cadObject.id);
        this.updateMeasurements();
        this.updateLayers();
    }

    deleteSelected() {
        this.selectedObjects.forEach(obj => {
            this.removeObject(obj);
        });
        this.selectedObjects = [];
        this.updateProperties();
        this.saveState();
    }

    removeObject(cadObject) {
        // Remove from scene
        this.scene.remove(cadObject.mesh);
        
        // Dispose geometry and material
        cadObject.mesh.geometry?.dispose();
        if (cadObject.mesh.material) {
            if (Array.isArray(cadObject.mesh.material)) {
                cadObject.mesh.material.forEach(material => material.dispose());
            } else {
                cadObject.mesh.material.dispose();
            }
        }
        
        // Remove from objects array
        const index = this.objects.findIndex(obj => obj.id === cadObject.id);
        if (index !== -1) {
            this.objects.splice(index, 1);
        }
        
        // Remove from layer
        const layer = this.layers[cadObject.layer];
        if (layer) {
            const layerIndex = layer.objects.indexOf(cadObject.id);
            if (layerIndex !== -1) {
                layer.objects.splice(layerIndex, 1);
            }
        }
        
        // Update measurements
        this.recalculateMeasurements();
        this.updateMeasurements();
        this.updateLayers();
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all objects?')) {
            this.objects.forEach(obj => {
                this.scene.remove(obj.mesh);
                obj.mesh.geometry?.dispose();
                if (obj.mesh.material) {
                    if (Array.isArray(obj.mesh.material)) {
                        obj.mesh.material.forEach(material => material.dispose());
                    } else {
                        obj.mesh.material.dispose();
                    }
                }
            });
            
            this.objects = [];
            this.selectedObjects = [];
            this.layers.forEach(layer => layer.objects = []);
            this.totalLength = 0;
            this.totalArea = 0;
            this.updateMeasurements();
            this.updateLayers();
            this.updateProperties();
            this.saveState();
        }
    }

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================

    snapToGrid(point) {
        const snapped = point.clone();
        snapped.x = Math.round(snapped.x / this.gridSize) * this.gridSize;
        snapped.z = Math.round(snapped.z / this.gridSize) * this.gridSize;
        return snapped;
    }

    calculatePolygonArea(points) {
        if (points.length < 3) return 0;
        
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].z;
            area -= points[j].x * points[i].z;
        }
        return Math.abs(area) / 2;
    }

    calculatePolygonPerimeter(points) {
        if (points.length < 2) return 0;
        
        let perimeter = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            perimeter += points[i].distanceTo(points[j]);
        }
        return perimeter;
    }

    recalculateMeasurements() {
        this.totalLength = 0;
        this.totalArea = 0;
        
        this.objects.forEach(obj => {
            switch (obj.type) {
                case 'line':
                    this.totalLength += obj.properties.length || 0;
                    break;
                case 'polygon':
                    this.totalLength += obj.properties.perimeter || 0;
                    this.totalArea += obj.properties.area || 0;
                    break;
                case 'circle':
                    this.totalLength += obj.properties.circumference || 0;
                    this.totalArea += obj.properties.area || 0;
                    break;
                case 'rectangle':
                    this.totalLength += obj.properties.perimeter || 0;
                    this.totalArea += obj.properties.area || 0;
                    break;
            }
        });
    }

    // ============================================================================
    // UI UPDATES
    // ============================================================================

    updateCursorCoordinates(x, z) {
        const xElement = document.getElementById('cursor-x');
        const yElement = document.getElementById('cursor-y');
        
        if (xElement) xElement.textContent = x.toFixed(2);
        if (yElement) yElement.textContent = z.toFixed(2);
    }

    updateToolStatus() {
        const statusElement = document.getElementById('current-tool');
        if (statusElement) {
            let toolName = this.currentTool.charAt(0).toUpperCase() + this.currentTool.slice(1);
            if (this.isDrawing) {
                toolName += ' (Drawing...)';
            }
            statusElement.textContent = `${toolName} Tool Active`;
        }
    }

    updateMeasurements() {
        const totalObjectsElement = document.getElementById('total-objects');
        const totalLengthElement = document.getElementById('total-length');
        const totalAreaElement = document.getElementById('total-area');
        const objectCountElement = document.getElementById('object-count');
        
        if (totalObjectsElement) totalObjectsElement.textContent = this.objects.length;
        if (totalLengthElement) totalLengthElement.textContent = this.totalLength.toFixed(2);
        if (totalAreaElement) totalAreaElement.textContent = this.totalArea.toFixed(2);
        if (objectCountElement) objectCountElement.textContent = this.objects.length;
    }

    updateLayers() {
        const container = document.getElementById('layers-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.layers.forEach((layer, index) => {
            const layerElement = document.createElement('div');
            layerElement.className = `layer-item ${index === this.currentLayer ? 'active' : ''}`;
            layerElement.dataset.layer = index;
            
            layerElement.innerHTML = `
                <span class="layer-visibility" title="Toggle Visibility">
                    <i class="fas ${layer.visible ? 'fa-eye' : 'fa-eye-slash'}"></i>
                </span>
                <span class="layer-name">${layer.name}</span>
                <span class="layer-count">${layer.objects.length}</span>
            `;
            
            // Add event listeners
            layerElement.addEventListener('click', (e) => {
                if (!e.target.closest('.layer-visibility')) {
                    this.setCurrentLayer(index);
                }
            });
            
            layerElement.querySelector('.layer-visibility').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLayerVisibility(index);
            });
            
            container.appendChild(layerElement);
        });
    }

    updateProperties() {
        const container = document.getElementById('properties-container');
        if (!container) return;
        
        if (this.selectedObjects.length === 0) {
            container.innerHTML = '<p class="no-selection">No object selected</p>';
            return;
        }
        
        const obj = this.selectedObjects[0];
        container.innerHTML = `
            <div class="property-item">
                <label>Type:</label>
                <span>${obj.type}</span>
            </div>
            <div class="property-item">
                <label>ID:</label>
                <span>${obj.id}</span>
            </div>
            <div class="property-item">
                <label>Layer:</label>
                <span>${this.layers[obj.layer].name}</span>
            </div>
        `;
        
        // Add type-specific properties
        const props = obj.properties;
        switch (obj.type) {
            case 'line':
                container.innerHTML += `
                    <div class="property-item">
                        <label>Length:</label>
                        <span>${props.length.toFixed(2)}</span>
                    </div>
                `;
                break;
            case 'circle':
                container.innerHTML += `
                    <div class="property-item">
                        <label>Radius:</label>
                        <span>${props.radius.toFixed(2)}</span>
                    </div>
                    <div class="property-item">
                        <label>Area:</label>
                        <span>${props.area.toFixed(2)}</span>
                    </div>
                `;
                break;
            case 'rectangle':
                container.innerHTML += `
                    <div class="property-item">
                        <label>Width:</label>
                        <span>${props.width.toFixed(2)}</span>
                    </div>
                    <div class="property-item">
                        <label>Height:</label>
                        <span>${props.height.toFixed(2)}</span>
                    </div>
                    <div class="property-item">
                        <label>Area:</label>
                        <span>${props.area.toFixed(2)}</span>
                    </div>
                `;
                break;
        }
    }

    // ============================================================================
    // VIEW CONTROLS
    // ============================================================================

    setViewTop() {
        this.camera.position.set(0, 50, 0);
        this.camera.lookAt(0, 0, 0);
        this.controls.update();
    }

    resetView() {
        this.camera.position.set(30, 30, 30);
        this.camera.lookAt(0, 0, 0);
        this.controls.update();
    }

    toggleGrid() {
        this.gridEnabled = !this.gridEnabled;
        this.grid.visible = this.gridEnabled;
    }

    toggleSnap() {
        this.snapEnabled = !this.snapEnabled;
        document.getElementById('enable-snap').checked = this.snapEnabled;
    }

    updateGrid() {
        this.scene.remove(this.grid);
        this.grid = new THREE.GridHelper(100, 100 / this.gridSize, 0x3C3C3C, 0x2D2D30);
        this.grid.material.transparent = true;
        this.grid.material.opacity = 0.8;
        this.grid.visible = this.gridEnabled;
        this.scene.add(this.grid);
    }

    // ============================================================================
    // LAYER MANAGEMENT
    // ============================================================================

    addLayer() {
        const layerName = prompt('Enter layer name:', `Layer ${this.layers.length + 1}`);
        if (layerName) {
            this.layers.push({
                name: layerName,
                visible: true,
                objects: []
            });
            this.updateLayers();
        }
    }

    setCurrentLayer(index) {
        this.currentLayer = index;
        this.updateLayers();
    }

    toggleLayerVisibility(index) {
        const layer = this.layers[index];
        layer.visible = !layer.visible;
        
        // Update object visibility
        layer.objects.forEach(objId => {
            const obj = this.objects.find(o => o.id === objId);
            if (obj) {
                obj.mesh.visible = layer.visible;
            }
        });
        
        this.updateLayers();
    }

    // ============================================================================
    // HISTORY MANAGEMENT (UNDO/REDO)
    // ============================================================================

    saveState() {
        // Remove any states after current index (when undoing then doing new action)
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Create state snapshot
        const state = {
            objects: this.objects.map(obj => ({
                id: obj.id,
                type: obj.type,
                properties: { ...obj.properties },
                layer: obj.layer,
                visible: obj.visible
            })),
            layers: this.layers.map(layer => ({ ...layer, objects: [...layer.objects] })),
            currentLayer: this.currentLayer,
            totalLength: this.totalLength,
            totalArea: this.totalArea
        };
        
        this.history.push(state);
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > this.maxHistorySteps) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
        }
    }

    restoreState(state) {
        // Clear current objects
        this.objects.forEach(obj => {
            this.scene.remove(obj.mesh);
            obj.mesh.geometry?.dispose();
            if (obj.mesh.material) {
                if (Array.isArray(obj.mesh.material)) {
                    obj.mesh.material.forEach(material => material.dispose());
                } else {
                    obj.mesh.material.dispose();
                }
            }
        });
        
        this.objects = [];
        this.selectedObjects = [];
        
        // Restore objects
        state.objects.forEach(objData => {
            const cadObject = this.recreateObject(objData);
            if (cadObject) {
                this.scene.add(cadObject.mesh);
                this.objects.push(cadObject);
            }
        });
        
        // Restore other state
        this.layers = state.layers.map(layer => ({ ...layer, objects: [...layer.objects] }));
        this.currentLayer = state.currentLayer;
        this.totalLength = state.totalLength;
        this.totalArea = state.totalArea;
        
        // Update UI
        this.updateMeasurements();
        this.updateLayers();
        this.updateProperties();
    }

    recreateObject(objData) {
        let mesh;
        const props = objData.properties;
        
        switch (objData.type) {
            case 'point':
                const sphereGeometry = new THREE.SphereGeometry(0.3, 16, 16);
                const sphereMaterial = new THREE.MeshLambertMaterial({ 
                    color: 0x007ACC,
                    emissive: 0x002244
                });
                mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
                mesh.position.copy(props.position);
                mesh.position.y = 0.3;
                mesh.castShadow = true;
                break;
                
            case 'line':
                const points = [props.start, props.end];
                const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
                const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00FF00 });
                mesh = new THREE.Line(lineGeometry, lineMaterial);
                break;
                
            // Add other object types as needed...
            default:
                console.warn(`Cannot recreate object of type: ${objData.type}`);
                return null;
        }
        
        const cadObject = {
            id: objData.id,
            type: objData.type,
            mesh: mesh,
            properties: { ...props },
            layer: objData.layer,
            selected: false,
            visible: objData.visible
        };
        
        mesh.userData = { cadObject: cadObject };
        return cadObject;
    }

    // ============================================================================
    // PROJECT MANAGEMENT
    // ============================================================================

    saveProject() {
        const projectData = {
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            objects: this.objects.map(obj => ({
                id: obj.id,
                type: obj.type,
                properties: obj.properties,
                layer: obj.layer,
                visible: obj.visible
            })),
            layers: this.layers,
            currentLayer: this.currentLayer,
            settings: {
                gridSize: this.gridSize,
                snapTolerance: this.snapTolerance,
                snapEnabled: this.snapEnabled,
                gridEnabled: this.gridEnabled
            }
        };
        
        const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cad-project.json';
        a.click();
        URL.revokeObjectURL(url);
        
        // Update project status
        document.getElementById('project-status').textContent = 'Saved';
        setTimeout(() => {
            document.getElementById('project-status').textContent = 'Unsaved';
        }, 2000);
    }

    loadProject() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const projectData = JSON.parse(e.target.result);
                        this.loadProjectData(projectData);
                    } catch (error) {
                        alert('Error loading project file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    loadProjectData(projectData) {
        // Clear current project
        this.clearAll();
        
        // Load settings
        if (projectData.settings) {
            this.gridSize = projectData.settings.gridSize || 1;
            this.snapTolerance = projectData.settings.snapTolerance || 0.5;
            this.snapEnabled = projectData.settings.snapEnabled ?? true;
            this.gridEnabled = projectData.settings.gridEnabled ?? true;
            
            // Update UI
            document.getElementById('grid-size').value = this.gridSize;
            document.getElementById('snap-tolerance').value = this.snapTolerance;
            document.getElementById('enable-snap').checked = this.snapEnabled;
            
            this.updateGrid();
        }
        
        // Load layers
        if (projectData.layers) {
            this.layers = projectData.layers;
            this.currentLayer = projectData.currentLayer || 0;
        }
        
        // Load objects
        if (projectData.objects) {
            projectData.objects.forEach(objData => {
                const cadObject = this.recreateObject(objData);
                if (cadObject) {
                    this.scene.add(cadObject.mesh);
                    this.objects.push(cadObject);
                }
            });
        }
        
        // Recalculate measurements
        this.recalculateMeasurements();
        
        // Update UI
        this.updateMeasurements();
        this.updateLayers();
        this.updateProperties();
        
        // Update project status
        document.getElementById('project-name').textContent = 'Loaded Project';
        document.getElementById('project-status').textContent = 'Loaded';
    }

    // ============================================================================
    // EXPORT FUNCTIONALITY
    // ============================================================================

    showExportModal() {
        document.getElementById('export-modal').classList.add('show');
    }

    hideExportModal() {
        document.getElementById('export-modal').classList.remove('show');
    }

    exportProject() {
        const exportType = document.querySelector('input[name="export-type"]:checked').value;
        
        switch (exportType) {
            case 'json':
                this.saveProject(); // Reuse save functionality
                break;
            case 'csv':
                this.exportCSV();
                break;
            case 'image':
                this.exportImage();
                break;
        }
        
        this.hideExportModal();
    }

    exportCSV() {
        let csv = 'Type,ID,Layer,X,Y,Z,Properties\n';
        
        this.objects.forEach(obj => {
            const props = obj.properties;
            let x = '', y = '', z = '';
            let extraProps = '';
            
            switch (obj.type) {
                case 'point':
                    x = props.position.x.toFixed(3);
                    y = props.position.y.toFixed(3);
                    z = props.position.z.toFixed(3);
                    break;
                case 'line':
                    x = props.start.x.toFixed(3);
                    y = props.start.y.toFixed(3);
                    z = props.start.z.toFixed(3);
                    extraProps = `Length: ${props.length.toFixed(3)}`;
                    break;
                case 'circle':
                    x = props.center.x.toFixed(3);
                    y = props.center.y.toFixed(3);
                    z = props.center.z.toFixed(3);
                    extraProps = `Radius: ${props.radius.toFixed(3)}, Area: ${props.area.toFixed(3)}`;
                    break;
            }
            
            csv += `${obj.type},${obj.id},${this.layers[obj.layer].name},${x},${y},${z},"${extraProps}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cad-export.csv';
        a.click();
        URL.revokeObjectURL(url);
    }

    exportImage() {
        // Render the scene to a larger canvas for high quality export
        const originalSize = this.renderer.getSize(new THREE.Vector2());
        const exportWidth = 1920;
        const exportHeight = 1080;
        
        this.renderer.setSize(exportWidth, exportHeight);
        this.camera.aspect = exportWidth / exportHeight;
        this.camera.updateProjectionMatrix();
        
        this.renderer.render(this.scene, this.camera);
        
        // Convert canvas to image
        const canvas = this.renderer.domElement;
        const link = document.createElement('a');
        link.download = 'cad-export.png';
        link.href = canvas.toDataURL();
        link.click();
        
        // Restore original size
        this.renderer.setSize(originalSize.x, originalSize.y);
        this.camera.aspect = originalSize.x / originalSize.y;
        this.camera.updateProjectionMatrix();
    }
}

// ============================================================================
// APPLICATION INITIALIZATION
// ============================================================================

// Initialize the application when the page loads
window.addEventListener('DOMContentLoaded', () => {
    const app = new CADApplication();
    
    // Make the app globally accessible for debugging
    window.cadApp = app;
});

// Handle unload to clean up resources
window.addEventListener('beforeunload', () => {
    if (window.cadApp) {
        // Clean up Three.js resources
        window.cadApp.objects.forEach(obj => {
            obj.mesh.geometry?.dispose();
            if (obj.mesh.material) {
                if (Array.isArray(obj.mesh.material)) {
                    obj.mesh.material.forEach(material => material.dispose());
                } else {
                    obj.mesh.material.dispose();
                }
            }
        });
    }
});
