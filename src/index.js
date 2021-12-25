// THIS IS AN JS-APP THAT USES THREE.JS LYBRARY TO CREATE A 3D-WORLD

// Importing lybs THREE and OrbitControls previosly installed:
const THREE = require('three')
import {
  OrbitControls
} from 'three/examples/jsm/controls/OrbitControls.js'

// Global arrays and counters:
var spheresIds = [] // for drawing and deleting spheres by their ids
var spheresCoords = [] // for drawing and deleting lines between spheres
var linesIds = [] // for drawing and deleting lines by their ids
var lengthsArray = [] // to calculate the summ of all the lengths of all the lines drawn
var trianglesIds = [] // for drawing and deleting triangles by their ids
var areasArray = [] // to calculate the summ of all the areas of all the triangles drawn

// Defining scene, camera, renderer, and controls:
var scene = new THREE.Scene()
var camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, .1, 500)
camera.position.x = 40, camera.position.y = 40, camera.position.z = 40
camera.lookAt(scene.position)
var renderer = new THREE.WebGLRenderer()
var controls = new OrbitControls(camera, renderer.domElement)
controls.addEventListener('change', render)
renderer.setClearColor(0x000000)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMapSoft = true
renderer.render(scene, camera)

// Defining objects, which we then add to the scene (axis, grid, colors, cubes, plane, spotlight):
var axis = new THREE.AxesHelper(30)
var grid = new THREE.GridHelper(50, 50)
var color = new THREE.Color("rgb(255,0,0)")
var cubeGeometry = new THREE.BoxGeometry(6, 6, 6)
var cubeMaterial = new THREE.MeshLambertMaterial({
  color: 0xff3300
})
var cube = new THREE.Mesh(cubeGeometry, cubeMaterial)
cube.position.x = 0, cube.position.y = 3, cube.position.z = 0
cube.castShadow = true
var cube2 = new THREE.Mesh(cubeGeometry, cubeMaterial)
cube2.position.x = 13, cube2.position.y = 3, cube2.position.z = 13
cube2.castShadow = true
var planeGeometry = new THREE.PlaneGeometry(50, 50, 50);
var planeMaterial = new THREE.MeshLambertMaterial({
  color: 0xffffff
})
var plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -.5 * Math.PI
plane.receiveShadow = true
var spotLight = new THREE.SpotLight(0xffffff)
spotLight.castShadow = true
spotLight.position.set(15, 30, 50)

// Adding the objects to the scene and then rendering it:
scene.add(spotLight, grid, axis, cube, cube2, plane)
renderer.render(scene, camera)

// Appending the 3D-world (JS, three.js) to the HTML-document in the pre-prepared div "webGl-container":
document.body.appendChild(document.getElementById('webGL-container')).appendChild(renderer.domElement) 

// A function to render the scene and the camera:
function render() {
  renderer.render(scene, camera)
}

// By moving a cursor we want to measure and display on the document the coordinates of the plane in our 3D-World:
window.addEventListener('mousemove', function(event) {
  var vec = new THREE.Vector3()
  var pos = new THREE.Vector3()
  vec.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0.5)
  vec.unproject(camera)
  vec.sub(camera.position)
  var distance = camera.position.y / vec.y
  pos.copy(camera.position).add(vec.multiplyScalar(distance))
  var objX = camera.position.x - vec.x
  var objZ = camera.position.z - vec.z
  document.getElementById('x-obj').innerHTML = `${objX.toFixed(1)}`
  document.getElementById('z-obj').innerHTML = `${objZ.toFixed(1)}`
})

// Here we want to draw spheres (and lines) on a plane by clicking the left mouse key while holding down the "alt"/"option" key.
// By clicking the left mouse key while holding down the "Q" key the last sphere (and the last line) added must/can be removed.
window.addEventListener('click', function(e) {
  if (e.altKey) { // drawing spheres (and lines)
    var vec = new THREE.Vector3()
    var pos = new THREE.Vector3()
    vec.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1, 0)
    vec.unproject(camera)
    vec.sub(camera.position)
    var distance = camera.position.y / vec.y
    pos.copy(camera.position).add(vec.multiplyScalar(distance))
    var objX = camera.position.x - vec.x
    var objZ = camera.position.z - vec.z
    var sphereGeometry = new THREE.SphereBufferGeometry(0.2, 12, 8)
    var sphere = new THREE.Mesh(sphereGeometry, cubeMaterial)
    sphere.position.x = objX, sphere.position.y = 0.01, sphere.position.z = objZ
    scene.add(sphere)
    spheresIds.push(sphere.id) // we memorize the id in a separate array to be able to find and remove it later
    spheresCoords.push({
      X: objX,
      Z: objZ
    }) // we memorize the coords of a sphere in a separate array to draw lines between it
    // Lines are drawn only if we have more then one spheres on the scene:
    if (spheresIds.length > 1) {
      const points = []
      points.push(new THREE.Vector3(objX, 0.01, objZ))
      points.push(new THREE.Vector3(spheresCoords[spheresCoords.length - 2].X, 0.01, spheresCoords[spheresCoords.length - 2].Z))
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const line = new THREE.Line(geometry)
      // We can calculate the length of the line:
      let length = lineLength(objX, spheresCoords[spheresCoords.length - 2].X, spheresCoords[spheresCoords.length - 2].Z, objZ)
      // ... and push the result to a separate array to later calculate the summ of all the lengths drown:
      lengthsArray.push(parseFloat(length.toFixed(1)))
      document.getElementById('line').innerHTML = `${(arraySum(lengthsArray)).toFixed(1)}` // let's display the length on the screen
      scene.add(line)
      linesIds.push(line.id) // we memorize the id in a separate array to be able to find and remove it later
    }
    // Triangles are drawn only if we have more then two spheres on the scene:
    if (spheresIds.length > 2) {
      let geometry = new THREE.BufferGeometry()
      var vertices = new Float32Array([
        objX, 0.01, objZ,
        spheresCoords[spheresCoords.length - 2].X, 0.01, spheresCoords[spheresCoords.length - 2].Z,
        spheresCoords[0].X, 0.01, spheresCoords[0].Z,
      ])
      var material = new THREE.MeshLambertMaterial({
        color: 0xff3300
      })
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      var triangle = new THREE.Mesh(geometry, material)
      scene.add(triangle)
      // We can calculate the area of the triangle:
      let area = formulaOfHeron(lengthsArray[lengthsArray.length - 1], lengthsArray[lengthsArray.length - 2], lineLength(objX, spheresCoords[0].X, spheresCoords[0].Z, objZ))
      // ... and push the result to a separate array to later calculate the summ of all the areas calculated:
      areasArray.push(parseFloat(area.toFixed(1)))
      trianglesIds.push(triangle.id) // we memorize the id in a separate array to be able to find and remove it later
    }
    renderer.render(scene, camera) // render the scene and the camera after adding a sphere (and a line)
  } else if (e.shiftKey) { // deleting spheres (and lines)
    scene.remove(scene.getObjectById(spheresIds[spheresIds.length - 1])) // find by id and remove it from the scene
    // Lines are removed only if we have more then one spheres on the scene:
    if (spheresIds.length > 1) {
      scene.remove(scene.getObjectById(linesIds[linesIds.length - 1])) // find by id and remove it from the scene
      linesIds.pop() // remove the last id from the array with all ids for the lines
      lengthsArray.pop() // remove the last length of the last line removed from the array of the lengths
      document.getElementById('line').innerHTML = `${(arraySum(lengthsArray)).toFixed(1)}` // let's display the length on the screen
    }
    // Triangles are removed only if we have more then two spheres on the scene:
    if (spheresIds.length > 2) {
      scene.remove(scene.getObjectById(trianglesIds[trianglesIds.length - 1])) // find by id and remove it from the scene
      trianglesIds.pop() // remove the last id from the array with all ids for the triangles
      areasArray.pop() // remove the last area of the last triangle removed from the array of the areas
    }
    spheresIds.pop() // remove the last id from the array with all ids for the spheres [should be removed the last]
    renderer.render(scene, camera) // render the scene and the camera after removing the sphere (and the line)
  }
})

// This is a function to calculate the length of a line:
function lineLength(x1, x2, y1, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

// This is a function to calculate the area of any triangle:
function formulaOfHeron(a, b, c) {
  let semiPerimeter = (a + b + c) / 2
  return Math.sqrt(semiPerimeter * (semiPerimeter - a) * (semiPerimeter - b) * (semiPerimeter - c))
}

// This is a function to calculate the sum of all the elements in an array:
function arraySum(array) {
  let sum = 0;
  for (let i = 0; i < array.length; i++) {
    sum += array[i]
  }
  return sum
}