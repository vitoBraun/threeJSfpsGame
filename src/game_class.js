import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import * as CANNON from "cannon-es";
import CannonDebugger from "cannon-es-debugger";
const NORMAL_MOVE_SPEED = 400.0;
const STRAIF_MOVE_SPEED = NORMAL_MOVE_SPEED * 2;
const MASS = 70.0;

const blocker = document.getElementById("blocker");
const instructions = document.getElementById("instructions");
const body = document.querySelector("body");

const color = new THREE.Color();

class Camera extends THREE.PerspectiveCamera {
  constructor() {
    super(75, window.innerWidth / window.innerHeight, 1, 1000);
    this.position.y = 10;
    this.position.z = 20;
    this.position.x = 20;
  }
}

class Floor {
  position;
  mesh;
  constructor() {
    let floorGeometry = new THREE.CircleGeometry(500, 20);

    floorGeometry = floorGeometry.toNonIndexed();

    this.position = floorGeometry.attributes.position;
    const colorsFloor = [];

    for (let i = 0, l = this.position.count; i < l; i++) {
      color.setHSL(
        Math.random() * 0.3 + 0.5,
        0.75,
        Math.random() * 0.25 + 0.75,
        THREE.SRGBColorSpace
      );
      colorsFloor.push(color.r, color.g, color.b);
    }

    floorGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colorsFloor, 3)
    );

    const floorMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });

    this.mesh = new THREE.Mesh(floorGeometry, floorMaterial);
  }

  setPosition(value) {
    this.position = value;
  }
}

class Objects {
  objects = [];
  constructor() {
    const boxGeometry = new THREE.BoxGeometry(20, 20, 20).toNonIndexed();
    let position = boxGeometry.attributes.position;
    const colorsBox = [];

    for (let i = 0, l = position.count; i < l; i++) {
      color.setHSL(
        Math.random() * 0.3 + 0.5,
        0.75,
        Math.random() * 0.25 + 0.75,
        THREE.SRGBColorSpace
      );
      colorsBox.push(color.r, color.g, color.b);
    }

    boxGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colorsBox, 3)
    );

    // let boxes = [];

    for (let i = 0; i < 500; i++) {
      const boxMaterial = new THREE.MeshPhongMaterial({
        specular: 0xffffff,
        flatShading: true,
        vertexColors: true,
      });
      boxMaterial.color.setHSL(
        Math.random() * 0.2 + 0.5,
        0.75,
        Math.random() * 0.25 + 0.75,
        THREE.SRGBColorSpace
      );

      const box = new THREE.Mesh(boxGeometry, boxMaterial);
      box.position.x = Math.floor(Math.random() * 20 - 10) * 20;
      box.position.y = Math.floor(Math.random() * 20) * 20 + 10;
      box.position.z = Math.floor(Math.random() * 20 - 10) * 20;

      this.objects.push(box);
    }
  }
}

class PlayerControls extends PointerLockControls {
  moveForwardPress = false;
  moveBackwardPress = false;
  moveLeftPress = false;
  moveRightPress = false;
  canJump = false;
  straif = false;
  velocity = new THREE.Vector3();
  direction = new THREE.Vector3();

  constructor(camera, node) {
    super(camera, node);
    this.init();
  }

  init() {
    document.addEventListener("click", async () => {
      await this.lock();
    });

    document.addEventListener("dblclick", () => {
      body.requestFullscreen();
    });

    this.addEventListener("lock", () => {
      instructions.style.display = "none";
      blocker.style.display = "none";
    });

    this.addEventListener("unlock", () => {
      blocker.style.display = "block";
      instructions.style.display = "";
    });
    document.addEventListener("keydown", this.onKeyDown.bind(this));
    document.addEventListener("keyup", this.onKeyUp.bind(this));
  }

  onKeyDown(event) {
    switch (event.code) {
      case "KeyW":
        this.moveForwardPress = true;
        break;

      case "KeyA":
        this.moveLeftPress = true;
        break;

      case "KeyS":
        this.moveBackwardPress = true;
        break;

      case "KeyD":
        this.moveRightPress = true;
        break;

      case "Space":
        if (this.canJump === true) this.velocity.y += 350;
        this.canJump = false;
        break;
      case "ShiftLeft":
        this.straif = true;
        break;
    }
  }

  onKeyUp(event) {
    switch (event.code) {
      case "KeyW":
        this.moveForwardPress = false;
        break;

      case "KeyA":
        this.moveLeftPress = false;
        break;

      case "KeyS":
        this.moveBackwardPress = false;
        break;

      case "KeyD":
        this.moveRightPress = false;
        break;
      case "ShiftLeft":
        this.straif = false;
        break;
    }
  }

  calculateMove(delta) {
    this.velocity.x -= this.velocity.x * 9.0 * delta;
    this.velocity.z -= this.velocity.z * 9.0 * delta;

    this.velocity.y -= 9.8 * MASS * delta;

    this.direction.z =
      Number(this.moveForwardPress) - Number(this.moveBackwardPress);
    this.direction.x = Number(this.moveRightPress) - Number(this.moveLeftPress);
    this.direction.normalize(); // this ensures consistent movements in all directions

    let speed = this.straif ? STRAIF_MOVE_SPEED : NORMAL_MOVE_SPEED;

    if (this.moveForwardPress || this.moveBackwardPress)
      this.velocity.z -= this.direction.z * speed * delta;
    if (this.moveLeftPress || this.moveRightPress)
      this.velocity.x -= this.direction.x * speed * delta;

    // if (onObject === true) {
    //   this.velocity.y = Math.max(0, this.velocity.y);
    //   this.canJump = true;
    // }

    this.moveRight(-this.velocity.x * delta);
    this.moveForward(-this.velocity.z * delta);

    // this.getObject().position.y += this.velocity.y * delta;

    // if (this.getObject().position.y < 10) {
    //   this.velocity.y = 0;
    //   this.getObject().position.y = 10;

    //   this.canJump = true;
    // }
  }
}

class Scene extends THREE.Scene {
  constructor() {
    super();
    this.background = new THREE.Color(0xffffff);
    // this.fog = new THREE.Fog(0xffffff, 0, 750);

    const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 2.5);
    light.position.set(0.5, 1, 0.75);
    this.add(light);
  }
}

class Game {
  camera = new Camera();
  objects = new Objects();

  physicsWorld = new CANNON.World({
    gravity: new CANNON.Vec3(0, -19.8, 0),
  });

  groundBody = new CANNON.Body({
    shape: new CANNON.Plane(),
  });

  boxBody = new CANNON.Body({
    mass: 200,
    shape: new CANNON.Box(new CANNON.Vec3(5, 5, 5)),
  });

  // radius = 10;
  // shpere = new CANNON.Body({
  //   mass: 1000,
  //   shape: new CANNON.Sphere(this.radius),
  // });

  player = new CANNON.Body({
    // mass: 10,
    shape: new CANNON.Sphere(8),
  });

  raycaster = new THREE.Raycaster(
    new THREE.Vector3(),
    new THREE.Vector3(0, -1, 0),
    0,
    10
  );
  floor;
  boxMesh;
  scene;
  renderer;
  controls;
  cannonDebugger;

  prevTime = performance.now();

  constructor() {
    this.init();
    this.animate();
  }

  init() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    body.appendChild(this.renderer.domElement);
    window.addEventListener("resize", this.onWindowResize.bind(this));

    this.controls = new PlayerControls(this.camera, body);

    this.scene = new Scene();

    this.floor = new Floor();

    // const objects = new Objects();
    // this.scene.add(...objects.objects);

    const boxGeo = new THREE.BoxGeometry(10, 10, 10);
    const boxMat = new THREE.MeshBasicMaterial({
      color: "red",
      opacity: 0.5,
      transparent: true,
    });
    this.boxMesh = new THREE.Mesh(boxGeo, boxMat);

    this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

    this.physicsWorld.addBody(this.groundBody);
    this.physicsWorld.addBody(this.boxBody);
    this.physicsWorld.addBody(this.player);

    this.boxBody.position.set(0, 20, 0);
    this.player.position.set(10, 40, 5);

    this.scene.add(this.floor.mesh);
    this.scene.add(this.boxMesh);

    this.cannonDebugger = new CannonDebugger(this.scene, this.physicsWorld, {
      color: "red",
    });
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    const time = performance.now();

    if (this.controls.isLocked === true) {
      this.raycaster.ray.origin.copy(this.controls.getObject().position);
      this.raycaster.ray.origin.y -= 10;

      const delta = (time - this.prevTime) / 1000;
      // this.cannonDebugger.update();
      this.physicsWorld.fixedStep();

      this.floor.mesh.position.copy(this.groundBody.position);
      this.floor.mesh.quaternion.copy(this.groundBody.quaternion);

      this.boxMesh.position.copy(this.boxBody.position);
      this.boxMesh.quaternion.copy(this.boxBody.quaternion);

      this.player.position.copy(this.camera.position);

      this.controls.calculateMove(delta);
    }

    this.prevTime = time;

    this.renderer.render(this.scene, this.camera);
  }
}

const game = new Game();
