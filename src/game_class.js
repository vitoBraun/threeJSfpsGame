import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

const NORMAL_MOVE_SPEED = 400.0;
const STRAIF_MOVE_SPEED = NORMAL_MOVE_SPEED * 2;
const MASS = 70.0;

class PlayerMove {}

class Game {
  velocity = new THREE.Vector3();
  direction = new THREE.Vector3();
  vertex = new THREE.Vector3();
  color = new THREE.Color();
  camera;
  scene;
  renderer;
  controls;
  player;
  playerBB;

  objects = [];

  raycaster;

  moveForward = false;
  moveBackward = false;
  moveLeft = false;
  moveRight = false;
  canJump = false;
  straif = false;

  prevTime = performance.now();

  constructor() {
    this.init();
    this.animate();
  }

  init() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    this.camera.position.y = 10;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);
    this.scene.fog = new THREE.Fog(0xffffff, 0, 750);

    const light = new THREE.HemisphereLight(0xeeeeff, 0x777788, 2.5);
    light.position.set(0.5, 1, 0.75);
    this.scene.add(light);

    const blocker = document.getElementById("blocker");
    const instructions = document.getElementById("instructions");
    const body = document.querySelector("body");

    this.controls = new PointerLockControls(this.camera, body);

    body.addEventListener("click", () => {
      this.controls.lock();
    });

    body.addEventListener("dblclick", () => {
      body.requestFullscreen();
    });

    this.controls.addEventListener("lock", () => {
      instructions.style.display = "none";
      blocker.style.display = "none";
    });

    this.controls.addEventListener("unlock", () => {
      blocker.style.display = "block";
      instructions.style.display = "";
    });

    this.scene.add(this.controls.getObject());

    const onKeyDown = (event) => {
      switch (event.code) {
        case "KeyW":
          this.moveForward = true;
          break;

        case "KeyA":
          this.moveLeft = true;
          break;

        case "KeyS":
          this.moveBackward = true;
          break;

        case "KeyD":
          this.moveRight = true;
          break;

        case "Space":
          if (this.canJump === true) this.velocity.y += 350;
          this.canJump = false;
          break;
        case "ShiftLeft":
          this.straif = true;
          break;
      }
    };

    const onKeyUp = (event) => {
      switch (event.code) {
        case "KeyW":
          this.moveForward = false;
          break;

        case "KeyA":
          this.moveLeft = false;
          break;

        case "KeyS":
          this.moveBackward = false;
          break;

        case "KeyD":
          this.moveRight = false;
          break;
        case "ShiftLeft":
          this.straif = false;
          break;
      }
    };

    body.addEventListener("keydown", onKeyDown);
    body.addEventListener("keyup", onKeyUp);

    this.raycaster = new THREE.Raycaster(
      new THREE.Vector3(),
      new THREE.Vector3(0, -1, 0),
      0,
      10
    );

    // floor

    let floorGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
    floorGeometry.rotateX(-Math.PI / 2);

    // vertex displacement

    let position = floorGeometry.attributes.position;

    for (let i = 0, l = position.count; i < l; i++) {
      this.vertex.fromBufferAttribute(position, i);

      this.vertex.x += Math.random() * 20 - 10;
      this.vertex.y += Math.random() * 2;
      this.vertex.z += Math.random() * 20 - 10;

      position.setXYZ(i, this.vertex.x, this.vertex.y, this.vertex.z);
    }

    floorGeometry = floorGeometry.toNonIndexed(); // ensure each face has unique vertices

    position = floorGeometry.attributes.position;
    const colorsFloor = [];

    for (let i = 0, l = position.count; i < l; i++) {
      this.color.setHSL(
        Math.random() * 0.3 + 0.5,
        0.75,
        Math.random() * 0.25 + 0.75,
        THREE.SRGBColorSpace
      );
      colorsFloor.push(this.color.r, this.color.g, this.color.b);
    }

    floorGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colorsFloor, 3)
    );

    const floorMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    this.scene.add(floor);

    // objects

    const boxGeometry = new THREE.BoxGeometry(20, 20, 20).toNonIndexed();

    position = boxGeometry.attributes.position;
    const colorsBox = [];

    for (let i = 0, l = position.count; i < l; i++) {
      this.color.setHSL(
        Math.random() * 0.3 + 0.5,
        0.75,
        Math.random() * 0.25 + 0.75,
        THREE.SRGBColorSpace
      );
      colorsBox.push(this.color.r, this.color.g, this.color.b);
    }

    boxGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colorsBox, 3)
    );

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

      this.scene.add(box);
      this.objects.push(box);
    }

    this.player = new THREE.Mesh(
      new THREE.BoxGeometry(5, 10, 5, 10, 10, 10),
      new THREE.MeshBasicMaterial({ color: "green", wireframe: true })
    );

    this.player.position.x = this.camera.position.x;
    this.player.position.y = 7;
    this.player.position.z = this.camera.position.z;

    this.playerBB = new THREE.Box3().setFromObject(this.player);

    this.scene.add(this.player);
    this.objects.push(this.player);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    body.appendChild(this.renderer.domElement);

    window.addEventListener("resize", this.onWindowResize);
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

      const intersections = this.raycaster.intersectObjects(
        this.objects,
        false
      );

      const onObject = intersections.length > 0;

      const delta = (time - this.prevTime) / 1000;

      this.velocity.x -= this.velocity.x * 9.0 * delta;
      this.velocity.z -= this.velocity.z * 9.0 * delta;

      this.velocity.y -= 9.8 * MASS * delta;

      this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
      this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
      this.direction.normalize(); // this ensures consistent movements in all directions

      let speed = this.straif ? STRAIF_MOVE_SPEED : NORMAL_MOVE_SPEED;

      if (this.moveForward || this.moveBackward)
        this.velocity.z -= this.direction.z * speed * delta;
      if (this.moveLeft || this.moveRight)
        this.velocity.x -= this.direction.x * speed * delta;

      if (onObject === true) {
        this.velocity.y = Math.max(0, this.velocity.y);
        this.canJump = true;
      }

      this.controls.moveRight(-this.velocity.x * delta);
      this.controls.moveForward(-this.velocity.z * delta);

      this.controls.getObject().position.y += this.velocity.y * delta; // new behavior

      if (this.controls.getObject().position.y < 10) {
        this.velocity.y = 0;
        this.controls.getObject().position.y = 10;

        this.canJump = true;
      }
    }

    this.prevTime = time;

    this.renderer.render(this.scene, this.camera);
  }
}

const game = new Game();