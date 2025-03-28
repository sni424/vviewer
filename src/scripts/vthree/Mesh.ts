import * as THREE from 'three';

declare module 'three' {

  interface Mesh {

    // mesh의 바운딩박스와 dissolve 관련 유니폼 준비
    // fadeOut = fale
    // fadeIn = true
    prepareVisibilityTransition(params: {
      direction: "fadeIn" | "fadeOut",
      progress?: number, // default : 0
      useVisibilityTransition?: boolean, // default : true, 유니폼의 VISIBILITY_TRANSITION을 설정할것인가
    }): void;

    get mat(): THREE.Material;
    get matStandard(): THREE.MeshStandardMaterial;
    get matBasic(): THREE.MeshBasicMaterial;
    get matLambert(): THREE.MeshLambertMaterial;
    get matPhong(): THREE.MeshPhongMaterial;
    get matPhysical(): THREE.MeshPhysicalMaterial;
  }

}

THREE.Mesh.prototype.prepareVisibilityTransition = function (params: {
  direction: "fadeIn" | "fadeOut",
  progress?: number, // default : 0
  useVisibilityTransition?: boolean, // default : true
}) {
  const { direction, progress, useVisibilityTransition } = params;

  if (
    typeof this.vUserData.dissolveOrigin === "undefined" ||
    typeof this.vUserData.dissolveMaxDist === "undefined"
  ) {
    const box = new THREE.Box3().setFromObject(this);

    // dissolveOrigin 설정: x는 minX, y는 중앙, z는 minZ
    const minX = box.min.x; // 왼쪽 X 좌표
    const centerY = (box.min.y + box.max.y) / 2; // Y 중앙
    const minZ = box.min.z; // 가장 앞쪽 (액자의 왼쪽 테두리)

    // dissolveOrigin을 Three.js Vector3로 설정
    const dissolveOrigin = new THREE.Vector3(minX, centerY, minZ);

    const dissolveMaxDist = box.max.distanceTo(box.min);

    this.vUserData.dissolveOrigin = dissolveOrigin;
    this.vUserData.dissolveMaxDist = dissolveMaxDist;
  }

  // uniform 세팅
  const mat = this.mat;
  if (mat && mat.uniform) {
    if (!mat.uniform.dissolveOrigin) {
      mat.uniform.dissolveOrigin = { value: this.vUserData.dissolveOrigin };
    } else {
      mat.uniform.dissolveOrigin.value.copy(this.vUserData.dissolveOrigin);
    }

    if (!mat.uniform.dissolveMaxDist) {
      mat.uniform.dissolveMaxDist = { value: this.vUserData.dissolveMaxDist };
    } else {
      mat.uniform.dissolveMaxDist.value = this.vUserData.dissolveMaxDist;
    }

    const directionValue = direction === "fadeIn" ? true : false;
    if (!mat.uniform.dissolveDirection) {
      mat.uniform.dissolveDirection = { value: directionValue };
    } else {
      if (typeof direction !== 'undefined') {
        mat.uniform.dissolveDirection.value = directionValue;
      }
    }

    mat.uniform.progress.value = progress ?? 0;
    mat.uniform.VISIBILITY_TRANSITION.value = useVisibilityTransition ?? true;
  }

}

if (!Object.getOwnPropertyDescriptor(THREE.Mesh.prototype, 'mat')) {
  Object.defineProperty(THREE.Mesh.prototype, 'mat', {
    get: function () {
      return this.material as THREE.Material;
    }
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Mesh.prototype, 'matStandard')) {
  Object.defineProperty(THREE.Mesh.prototype, 'matStandard', {
    get: function () {
      return this.material as THREE.MeshStandardMaterial;
    }
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Mesh.prototype, 'matBasic')) {
  Object.defineProperty(THREE.Mesh.prototype, 'matBasic', {
    get: function () {
      return this.material as THREE.MeshBasicMaterial;
    }
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Mesh.prototype, 'matLambert')) {
  Object.defineProperty(THREE.Mesh.prototype, 'matLambert', {
    get: function () {
      return this.material as THREE.MeshLambertMaterial;
    }
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Mesh.prototype, 'matPhong')) {
  Object.defineProperty(THREE.Mesh.prototype, 'matPhong', {
    get: function () {
      return this.material as THREE.MeshPhongMaterial;
    }
  });
}

if (!Object.getOwnPropertyDescriptor(THREE.Mesh.prototype, 'matPhysical')) {
  Object.defineProperty(THREE.Mesh.prototype, 'matPhysical', {
    get: function () {
      return this.material as THREE.MeshPhysicalMaterial;
    }
  });
}