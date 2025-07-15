import { useAtom, useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';

import { loadClipping, uploadJson } from '../scripts/atomUtils';

import { downloadJsonFile } from 'src/scripts/utils';
import { THREE } from 'VTHREE';
import {
  getAtomValue,
  globalGlAtom,
  IsoViewInfoAtom,
  setAtomValue,
  threeExportsAtom,
} from '../scripts/atoms';

const IsoViewPanel = () => {
  const [glSetting, setGlSetting] = useAtom(globalGlAtom);
  const threeExports = useAtomValue(threeExportsAtom);

  const [clippingY, setClippingY] = useState(3);
  //true면 줄어들 clipping으로 false면 isoView끝날때 다시 이전 올라갈 값으로
  const [isClipping, setClipping] = useState(false);

  const [clippingObject, setClippingObject] = useState<string>('');

  const globalPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 5);
  if (!threeExports) {
    return null;
  }
  const { scene, camera } = threeExports;

  const saveInPc = async () => {
    const isoViewInfo = getAtomValue(IsoViewInfoAtom);

    if (isoViewInfo) {
      downloadJsonFile(isoViewInfo, 'isoViewInfo.json');
    } else {
      console.error('no isoViewInfo');
    }
  };
  console.log('camera', camera);

  const uploadClipping = async () => {
    const parsed = JSON.parse(clippingObject);

    uploadJson('clipping.json', parsed)
      .then(res => res.json())
      .then(res => {
        if (res?.success === true) {
          alert('업로드 완료');
        } else {
          throw res;
        }
      })
      .catch(err => {
        console.error(err);
        alert('업로드 실패');
      });
  };

  const saveCameraInfo = () => {
    const matrixArray: number[] = [...camera.matrix.elements];
    setAtomValue(IsoViewInfoAtom, pre => {
      return {
        cameraMatrix: matrixArray,
        clippingValue: pre.clippingValue,
        beforeClippingValue: pre.beforeClippingValue,
        boundingBox: pre.boundingBox,
      };
    });
  };

  const saveClipping = () => {
    setAtomValue(IsoViewInfoAtom, pre => {
      return {
        cameraMatrix: pre.cameraMatrix,
        beforeClippingValue: pre.beforeClippingValue,
        boundingBox: pre.boundingBox,
        clippingValue: clippingY,
      };
    });
  };

  const saveLastClipping = () => {
    setAtomValue(IsoViewInfoAtom, pre => {
      return {
        cameraMatrix: pre.cameraMatrix,
        clippingValue: pre.clippingValue,
        boundingBox: pre.boundingBox,
        beforeClippingValue: clippingY,
      };
    });
  };
  function calculateSceneSize() {
    // 모델의 bounding box를 이용해 모델 크기와 중심 계산
    const cloneScene = scene.clone();
    // const newSceneChildren = cloneScene.children.filter(child => {
    //   return child.name === '모델';
    // });
    // const newScene = new THREE.Scene();
    // newScene.children = newSceneChildren;
    const boundingBox = new THREE.Box3().setFromObject(cloneScene);
    if (boundingBox) {
      const size = boundingBox.getSize(new THREE.Vector3());
      const center = boundingBox.getCenter(new THREE.Vector3());
      const centerPosition = new THREE.Vector3(
        -(center.x + size.x),
        (center.y + size.y) * 8,
        (center.z + size.z) * 2,
      );

      setAtomValue(IsoViewInfoAtom, pre => {
        return {
          cameraMatrix: pre.cameraMatrix,
          clippingValue: pre.clippingValue,
          beforeClippingValue: pre.beforeClippingValue,
          boundingBox: {
            center: [center.x, center.y, center.z],
            size: [size.x, size.y, size.z],
          },
        };
      });
    } else {
      console.log('no box3');
    }
  }

  const loadClippingFun = async () => {
    loadClipping()
      .then(res => {
        setClippingObject(JSON.stringify(res));
        alert('클리핑핑 로드완료');
      })
      .catch(err => {
        console.error(err);
        alert('클리     핑 로드실패');
      });
  };

  const { gl } = threeExports;
  useEffect(() => {
    if (gl) {
      if (!glSetting.localClippingEnabled) {
        gl.clippingPlanes = [];
      } else {
        globalPlane.constant = clippingY;
        gl.clippingPlanes = [globalPlane];
      }
    }
  }, [clippingY, glSetting.localClippingEnabled]);
  return (
    <div>
      <div>
        <strong>Clipping</strong>
        <input
          type="checkbox"
          checked={glSetting.localClippingEnabled}
          onChange={e => {
            setGlSetting(pre => ({
              ...pre,
              localClippingEnabled: !pre.localClippingEnabled,
            }));
          }}
        />
      </div>
      {glSetting.localClippingEnabled && (
        <div>
          <input
            className="flex-1 min-w-0"
            type="range"
            value={clippingY}
            onChange={e => {
              setClippingY(Number(e.target.value));
            }}
            min={-1}
            max={10}
            step={0.1}
          />
          <input
            type="number"
            value={clippingY}
            onChange={e => {
              setClippingY(Number(e.target.value));
            }}
            min={-1}
            max={10}
            step={0.1}
          />
        </div>
      )}
      <div>
        <strong> 줄어들 클리핑 값</strong>
        <input
          type="checkbox"
          checked={isClipping}
          onChange={e => {
            setClipping(e.target.checked);
          }}
        />
      </div>
      <div>
        <button
          onClick={() => {
            saveCameraInfo();
          }}
        >
          현재 카메라 정보 저장
        </button>
      </div>
      <div>
        <button
          onClick={() => {
            if (isClipping) {
              saveClipping();
            }
          }}
        >
          줄어들 클리핑 값 저장
        </button>
      </div>
      <div>
        <button
          onClick={() => {
            if (!isClipping) {
              saveLastClipping();
            }
          }}
        >
          줄어들기 전 클리핑 값 저장
        </button>
      </div>
      <div>
        <button
          onClick={() => {
            calculateSceneSize();
          }}
        >
          바운딩박스 정보 저장
        </button>
      </div>
      <div>
        <button
          onClick={() => {
            saveInPc();
          }}
        >
          pc에 저장
        </button>
      </div>
      <div>
        <p>clipping Mesh</p>
        <button
          onClick={() => {
            uploadClipping();
          }}
        >
          업로드
        </button>
        <button
          onClick={() => {
            loadClippingFun();
          }}
        >
          불러오기
        </button>
        <div>
          <textarea
            value={clippingObject}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              setClippingObject(e.target.value);
            }}
          ></textarea>
        </div>
      </div>
    </div>
  );
};

export default IsoViewPanel;
