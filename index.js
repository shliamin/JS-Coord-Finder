/**
 * 3D World Application using Three.js
 * Author: Efim Shliamin
 * Last updated: 2024-06-14
 */

// Importing required libraries
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

// Global arrays and counters
let spheresIds = []; // Stores IDs of spheres for easy removal
let spheresCoords = []; // Stores coordinates of spheres for drawing lines
let linesIds = []; // Stores IDs of lines for easy removal
let lengthsArray = []; // Stores lengths of all drawn lines for sum calculation
let trianglesIds = []; // Stores IDs of triangles for easy removal
let areasArray = []; // Stores areas of all drawn triangles for sum calculation

// Initializing scene, camera, renderer, and controls
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(40, 40, 40);
camera.lookAt(scene.position);

const renderer = new THREE.WebGLRenderer();
const controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener('change', render);

renderer.setClearColor(0x000000);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

// Adding basic objects to the scene (axis, grid, cubes, plane, spotlight)
const axis = new THREE.AxesHelper(30);
const grid = new THREE.GridHelper(50, 500);
const cubeGeometry = new THREE.BoxGeometry(6, 6, 6);
const cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xff3300 });

const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube.position.set(0, 3, 0);
cube.castShadow = true;

const cube2 = new THREE.Mesh(cubeGeometry, cubeMaterial);
cube2.position.set(13, 3, 13);
cube2.castShadow = true;

const planeGeometry = new THREE.PlaneGeometry(50, 50, 50);
const planeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -0.5 * Math.PI;
plane.receiveShadow = true;

const spotLight = new THREE.SpotLight(0xffffff);
spotLight.castShadow = true;
spotLight.position.set(15, 30, 50);

// Adding objects to the scene
scene.add(spotLight, grid, axis, cube, cube2, plane);

// Initial render
renderer.render(scene, camera);

// Adding stats for FPS monitoring
const stats = Stats();
document.body.appendChild(stats.dom);

// Animation function
function animate() {
  requestAnimationFrame(animate);
  render();
  stats.update();
}

// Render function
function render() {
  renderer.render(scene, camera);
}

// Append the WebGL renderer to the HTML document
document.body.appendChild(document.getElementById('webGL-container')).appendChild(renderer.domElement);

// Event listener for mouse movement to display plane coordinates
window.addEventListener('mousemove', function(event) {
  const vec = new THREE.Vector3();
  const pos = new THREE.Vector3();
  vec.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5);
  vec.unproject(camera);
  vec.sub(camera.position);
  const distance = camera.position.y / vec.y;
  pos.copy(camera.position).add(vec.multiplyScalar(distance));
  const objX = camera.position.x - vec.x;
  const objZ = camera.position.z - vec.z;
  document.getElementById('x-obj').innerHTML = `${objX.toFixed(1)}`;
  document.getElementById('z-obj').innerHTML = `${objZ.toFixed(1)}`;
});

// Event listener for drawing and removing spheres and lines
window.addEventListener('click', function(e) {
  if (e.altKey) {
    // Drawing spheres and lines
    const vec = new THREE.Vector3();
    const pos = new THREE.Vector3();
    vec.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1, 0);
    vec.unproject(camera);
    vec.sub(camera.position);
    const distance = camera.position.y / vec.y;
    pos.copy(camera.position).add(vec.multiplyScalar(distance));
    const objX = camera.position.x - vec.x;
    const objZ = camera.position.z - vec.z;
    
    const sphereGeometry = new THREE.SphereBufferGeometry(0.2, 12, 8);
    const sphere = new THREE.Mesh(sphereGeometry, cubeMaterial);
    sphere.position.set(objX, 0.01, objZ);
    scene.add(sphere);
    spheresIds.push(sphere.id);
    spheresCoords.push({ X: objX, Z: objZ });

    // Draw lines if more than one sphere exists
    if (spheresIds.length > 1) {
      const points = [
        new THREE.Vector3(objX, 0.01, objZ),
        new THREE.Vector3(spheresCoords[spheresCoords.length - 2].X, 0.01, spheresCoords[spheresCoords.length - 2].Z)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry);
      const length = lineLength(objX, spheresCoords[spheresCoords.length - 2].X, spheresCoords[spheresCoords.length - 2].Z, objZ);
      lengthsArray.push(parseFloat(length.toFixed(1)));
      document.getElementById('line').innerHTML = `${(arraySum(lengthsArray)).toFixed(1)}`;
      document.getElementById('lines_amount').innerHTML = `${lengthsArray.length}`;
      scene.add(line);
      linesIds.push(line.id);
    }

    // Draw triangles if more than two spheres exist
    if (spheresIds.length > 2) {
      const vertices = new Float32Array([
        objX, 0.01, objZ,
        spheresCoords[spheresCoords.length - 2].X, 0.01, spheresCoords[spheresCoords.length - 2].Z,
        spheresCoords[0].X, 0.01, spheresCoords[0].Z
      ]);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3 });
      const triangle = new THREE.Mesh(geometry, material);
      scene.add(triangle);
      const area = formulaOfHeron(
        lengthsArray[lengthsArray.length - 1],
        lengthsArray[lengthsArray.length - 2],
        lineLength(objX, spheresCoords[0].X, spheresCoords[0].Z, objZ)
      );
      areasArray.push(parseFloat(area.toFixed(1)));
      document.getElementById('area').innerHTML = `${(arraySum(areasArray)).toFixed(1)}`;
      document.getElementById('areas_amount').innerHTML = `${areasArray.length}`;
      trianglesIds.push(triangle.id);
    }
    animate();
  } else if (e.shiftKey) {
    // Removing the last sphere and associated lines/triangles
    scene.remove(scene.getObjectById(spheresIds.pop()));
    if (spheresIds.length > 1) {
      scene.remove(scene.getObjectById(linesIds.pop()));
      lengthsArray.pop();
      document.getElementById('line').innerHTML = `${(arraySum(lengthsArray)).toFixed(1)}`;
      document.getElementById('lines_amount').innerHTML = `${lengthsArray.length}`;
    }
    if (spheresIds.length > 2) {
      scene.remove(scene.getObjectById(trianglesIds.pop()));
      areasArray.pop();
      document.getElementById('area').innerHTML = `${(arraySum(areasArray)).toFixed(1)}`;
      document.getElementById('areas_amount').innerHTML = `${areasArray.length}`;
    }
    animate();
  }
});

/**
 * Calculate the length of a line segment given coordinates
 * @param {number} x1 - x-coordinate of the first point
 * @param {number} x2 - x-coordinate of the second point
 * @param {number} y1 - y-coordinate of the first point
 * @param {number} y2 - y-coordinate of the second point
 * @returns {number} - Length of the line segment
 */
function lineLength(x1, x2, y1, y2) {
  return parseFloat(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)).toFixed(1));
}

/**
 * Calculate the area of a triangle using Heron's formula
 * @param {number} a - Length of the first side
 * @param {number} b - Length of the second side
 * @param {number} c - Length of the third side
 * @returns {number} - Area of the triangle
 */
function formulaOfHeron(a, b, c) {
  const semiPerimeter = (a + b + c) / 2;
  return Math.sqrt(semiPerimeter * (semiPerimeter - a) * (semiPerimeter - b) * (semiPerimeter - c));
}

/**
 * Calculate the sum of all elements in an array
 * @param {number[]} array - Array of numbers
 * @returns {number} - Sum of all elements
 */
function arraySum(array) {
  return array.reduce((sum, value) => sum + value, 0);
}
