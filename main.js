import './style.css'

import * as THREE from 'three'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { mergeBufferGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils'
import SimplexNoise from 'simplex-noise'
import { TextureLoader } from 'three'
import { MeshPhysicalMaterial } from 'three'
import { Mesh } from 'three'
import { PCFSoftShadowMap } from 'three'
import { PointLight } from 'three'
import { Color } from 'three'
import { CylinderBufferGeometry } from 'three'
import { MeshStandardMaterial } from 'three'

import dirtImage from './src/images/dirt.png'
import dirt2Image from './src/images/dirt2.jpg'
import stoneImage from './src/images/stone.png'
import sandImage from './src/images/sand.jpg'
import grassImage from './src/images/grass.jpg'
import envmapImage from './src/images/envmap.hdr?url'
import waterImage from './src/images/water.jpg'

const scene = new THREE.Scene()
scene.background = new THREE.Color('#FFEECC')

const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, .1, 1000)
camera.position.set(-0,31,60)

// const ambientLight = new THREE.AmbientLight('#ffffff',1)
// scene.add(ambientLight)
const light = new PointLight( new THREE.Color('#FFCB8E').convertSRGBToLinear().convertSRGBToLinear(), 80,400)
light.position.set(10,20,10)

light.castShadow = true
light.shadow.mapSize.width = 1024
light.shadow.mapSize.height = 1024
light.shadow.camera.near = 0.5
light.shadow.camera.far = 500
scene.add(light)

const renderer = new THREE.WebGLRenderer({ antialias: devicePixelRatio <= 1 })
renderer.setSize(innerWidth,innerHeight)
renderer.setPixelRatio(devicePixelRatio)
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.outputEncoding = THREE.sRGBEncoding
renderer.physicallyCorrectLights = true
renderer.shadowMap.enabled = true
renderer.shadowMap.type = PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera,renderer.domElement)
controls.target.set(0,0,0)
controls.dampingFactor = 0.05
controls.enableDamping = true

const simplex = new SimplexNoise()
const MAX_HEIGHT = 10
const STONE_HEIGHT = MAX_HEIGHT * 0.8
const DIRT_HEIGHT = MAX_HEIGHT * 0.7
const GRASS_HEIGHT = MAX_HEIGHT * 0.5
const SAND_HEIGHT = MAX_HEIGHT * 0.3
const DIRT2_HEIGHT = MAX_HEIGHT * 0

let envmap

(async function() {

  let pmrem = new THREE.PMREMGenerator(renderer)
  let envmapTexture = await new RGBELoader().setDataType(THREE.FloatType).loadAsync(envmapImage)
  envmap = pmrem.fromEquirectangular(envmapTexture).texture


  let textures = {
    dirt: await new TextureLoader().loadAsync(dirtImage),
    dirt2: await new TextureLoader().loadAsync(dirt2Image),
    grass: await new TextureLoader().loadAsync(grassImage),
    sand: await new TextureLoader().loadAsync(sandImage),
    water: await new TextureLoader().loadAsync(waterImage),
    stone: await new TextureLoader().loadAsync(stoneImage),
  }


  for(let i = -100; i < 100; i++) {
    for(let j = -100; j < 100; j++) {
      const position = tileToPosition(i,j)
      if(position.length() > 45)
        continue
      
        let noise = (simplex.noise2D(i*0.1, j*0.1) + 1) * 0.5
      // makeHex(1 , position )
      makeHex(noise * MAX_HEIGHT, position )
    }
  }
  

  // makeHex(3,new THREE.Vector2(0,0))

  // let hexagonMesh = new THREE.Mesh(
  //   hexagonGeometries,
  //   new THREE.MeshStandardMaterial({
  //     envMap: envmap,
  //     flatShading: true,
  //     // color: new Color('red')
      
  //   })
  // )
  let stoneMesh = hexMesh(stoneGeo,textures.stone) 
  let grassMesh = hexMesh(grassGeo,textures.grass) 
  let dirt2Mesh = hexMesh(dirt2Geo,textures.dirt2) 
  let dirtMesh = hexMesh(dirtGeo,textures.dirt) 
  let sandMesh = hexMesh(sandGeo,textures.sand) 

  scene.add( 
    stoneMesh,
    grassMesh,
    dirt2Mesh,
    dirtMesh,
    sandMesh,
  )

  
  let seaMesh = new Mesh(
    new CylinderBufferGeometry(50,50, MAX_HEIGHT * 0.2, 50),
    new MeshPhysicalMaterial({
      envMap: envmap,
      color: new Color('#55aaff').convertSRGBToLinear().multiplyScalar(3),
      ior: 1.4,
      transmission: 1,
      transparent: true,
      thickness: 1.5,
      envMapIntensity: 0.2,
      roughness: 1,
      metalness: 0.025,
      roughnessMap: textures.water,
      metalnessMap: textures.water,
    })
  )

  seaMesh.receiveShadow = true
  seaMesh.position.set(0, MAX_HEIGHT * 0.1, 0)
  scene.add(seaMesh)

  let mapContainer = new Mesh(
    new CylinderBufferGeometry(17.1,17.1,MAX_HEIGHT * 0.25,50,1, true),
    new MeshPhysicalMaterial({
      envMap: envmap,
      map: textures.dirt,
      envMapIntensity: 0.2,
      side: THREE.DoubleSide
    })
  )

  mapContainer.receiveShadow = true
  mapContainer.position.set(0, MAX_HEIGHT * 0.125, 0)
  scene.add(mapContainer)

  let mapFloor = new Mesh(
    new CylinderBufferGeometry(18.5,18.5,MAX_HEIGHT * 0.1,50,1),
    new MeshPhysicalMaterial({
      envMap: envmap,
      map: textures.dirt2,
      envMapIntensity: 0.1
    })
  )

  mapFloor.receiveShadow = true
  mapFloor.position.set(0, MAX_HEIGHT * 0.05, 0)
  scene.add(mapFloor)

  clouds()
  

  renderer.setAnimationLoop(() => {
    controls.update()
    renderer.render(scene,camera)
  })

})()



addEventListener('resize',() => {
  renderer.setSize(innerWidth,innerHeight)
  camera.aspect = innerWidth/innerHeight
  camera.updateProjectionMatrix()
})

let stoneGeo = new THREE.BoxBufferGeometry(0,0,0)
let dirtGeo = new THREE.BoxBufferGeometry(0,0,0)
let dirt2Geo = new THREE.BoxBufferGeometry(0,0,0)
let sandGeo = new THREE.BoxBufferGeometry(0,0,0)
let grassGeo = new THREE.BoxBufferGeometry(0,0,0)

function hexGeometry(height,position) {
  let geo = new THREE.CylinderBufferGeometry(1,1,height,6,1,false)
  geo.translate(position.x,height*0.5,position.y)

  return geo
}

function makeHex(height,position) {
  let geo = hexGeometry(height,position)

  if(height > STONE_HEIGHT) {
    stoneGeo = mergeBufferGeometries([stoneGeo,geo])

    if(Math.random() > 0.8) {
      stoneGeo = mergeBufferGeometries([stoneGeo,stone(height,position)])
    }
  } else if(height > DIRT_HEIGHT) {
    dirtGeo = mergeBufferGeometries([dirtGeo,geo])
    if(Math.random() > 0.8) {
      grassGeo = mergeBufferGeometries([grassGeo,tree(height,position)])
    }
  } else if(height > GRASS_HEIGHT) {
    grassGeo = mergeBufferGeometries([grassGeo,geo])

    
  } else if(height > SAND_HEIGHT) {
    sandGeo = mergeBufferGeometries([sandGeo,geo])
    if(Math.random() > 0.8) {
      stoneGeo = mergeBufferGeometries([stoneGeo,stone(height,position)])
    }
  } else {
    dirt2Geo = mergeBufferGeometries([dirt2Geo,geo])
  }
}

function tileToPosition(x,y) {
  return new THREE.Vector2((x + (y%2)*0.5)*1.77,y*1.535)
}

function hexMesh(geo,map) {
  let mat = new MeshPhysicalMaterial({
    envMap: envmap,
    envMapIntensity: 0.135,
    flatShading: true,
    map
  })

  let mesh = new Mesh(geo,mat)
  mesh.castShadow = true
  mesh.receiveShadow = true

  return mesh
}

function stone(height, position) {
  const px = Math.random() * 0.4
  const pz = Math.random() * 0.4

  const geo = new THREE.SphereBufferGeometry(Math.random() * 0.3 + 0.1,7,7)
  geo.translate(position.x+px,height,position.y +pz)

  return geo
}

function tree(height,position) {
  const treeHeight = Math.random() * 1 + 1.25

  const geo = new CylinderBufferGeometry(0,1.5,treeHeight,3)
  geo.translate(position.x, height + treeHeight * 0 + 1, position.y)

  const geo2 = new CylinderBufferGeometry(0,1.15,treeHeight,3)
  geo2.translate(position.x, height + treeHeight * 0.6 + 1, position.y)

  const geo3 = new CylinderBufferGeometry(0,0.8,treeHeight,3)
  geo3.translate(position.x, height + treeHeight * 1.25 + 1, position.y)

  return mergeBufferGeometries([geo, geo2,geo3])
}

function clouds() {
  let geo = new THREE.SphereBufferGeometry(0,0,0)
  let count = Math.floor( Math.pow(Math.random(),0.45)*10 + 10)


  for(let i = 0; i < count; i++) {
    const puff1 = new THREE.SphereBufferGeometry(1.2,7,7)
    const puff2 = new THREE.SphereBufferGeometry(1.5,7,7)
    const puff3 = new THREE.SphereBufferGeometry(0.9,7,7)

    puff1.translate(-1.85,Math.random()*0.3,0)
    puff2.translate(0,Math.random()*0.3,0)
    puff3.translate(1.85,Math.random()*0.3,0)

    const cloudGeo = mergeBufferGeometries([puff1,puff2,puff3])
    cloudGeo.translate(
      Math.random() * 70 - 35,
      Math.random() * 8 + 8,
      Math.random() * 70 - 35,
    )

    cloudGeo.rotateY(Math.random() * Math.PI * 2)

    geo = mergeBufferGeometries([geo,cloudGeo])
  }

  const mesh = new Mesh(
    geo,
    new MeshStandardMaterial({
      envMap: envmap,
      envMapIntensity: 0.75,
      flatShading: true
    })
  )

  mesh.castShadow = true

  scene.add(mesh)
}
