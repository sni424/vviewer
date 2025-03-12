import { useAtomValue } from 'jotai';
import { useState } from 'react';
import { selectedAtom, threeExportsAtom, useModal } from '../scripts/atoms';
import VTextureLoader from '../scripts/loaders/VTextureLoader.ts';
import VMaterial from '../scripts/material/VMaterial.ts';
import { THREE } from '../scripts/VTHREE';

const ApplyLightMapComponent = () => {
  const { closeModal } = useModal();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const selectedObjects = useAtomValue(selectedAtom);
  const threeExports = useAtomValue(threeExportsAtom);
  if (!threeExports) {
    return null;
  }
  const [lightmapChannel, setLightmapChannel] = useState(1);
  const Dsts = {
    lightmap: '라이트맵',
    ao: 'AO',
    diffuse: 'Diffuse',
    emissive: 'Emissive',
    normal: 'Normal',
  } as const;
  const [dst, setDst] = useState<keyof typeof Dsts>('lightmap');

  const { scene } = threeExports;
  const childrenMeshes: THREE.Mesh[] = [];
  const addMeshIfNotExists = (mesh: THREE.Object3D) => {
    if (mesh.type === 'Mesh') {
      if (childrenMeshes.some(exist => exist.uuid === mesh.uuid)) {
        return;
      }
      childrenMeshes.push(mesh as THREE.Mesh);
    }
  };

  selectedObjects.forEach(uuid => {
    const obj = scene.getObjectByProperty('uuid', uuid);
    if (!obj) {
      return;
    }
    if (obj.type === 'Mesh') {
      addMeshIfNotExists(obj);
    } else {
      const recursivelyAdd = (object: THREE.Object3D) => {
        object.children.forEach(addMeshIfNotExists);
        object.children.forEach(recursivelyAdd);
      };
      recursivelyAdd(obj);
    }
  });

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    console.log('HERE');
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };
  return (
    <div
      style={{
        width: '50%',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        cursor: isDragging ? 'copy' : undefined,
        border: isDragging ? '2px dashed #000' : undefined,
        boxSizing: 'border-box',
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={event => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);

        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
          const acceptedExtensions = ['.png', '.jpg', '.exr', '.hdr'];
          const files = Array.from(event.dataTransfer.files);

          // Filter files by .gltf and .glb extensions
          const filteredFiles = files.filter(file =>
            acceptedExtensions.some(ext =>
              file.name.toLowerCase().endsWith(ext),
            ),
          );

          if (filteredFiles.length === 0) {
            alert('다음 확장자만 적용 가능 : ' + acceptedExtensions.join(', '));
            return;
          }

          if (filteredFiles.length > 0) {
            setImageFile(filteredFiles[0]);
          }

          event.dataTransfer.clearData();
        }
      }}
      onMouseDown={e => {
        e.stopPropagation();
      }}
      onMouseUp={e => {
        e.stopPropagation();
        console.log('onMoucseUp');
      }}
      onClick={e => {
        e.stopPropagation();
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 'bold' }}>맵 일괄적용</div>
      <div style={{ fontSize: 12 }}>
        선택된 오브젝트 {selectedObjects.length}개의 하위 메쉬{' '}
        {childrenMeshes.length}개에 라이트맵을 일괄적용합니다.
      </div>

      <div
        style={{
          fontSize: 20,
          margin: 40,
          width: '100%',
          textAlign: 'center',
          fontWeight: 'bold',
        }}
      >
        이미지 드래그 & 드랍
      </div>
      <div>
        <select
          onChange={e => {
            setDst(e.target.value as keyof typeof Dsts);
          }}
          value={dst}
        >
          {Object.entries(Dsts).map(([key, value]) => {
            return (
              <option key={key} value={key}>
                {value}
              </option>
            );
          })}
        </select>
      </div>
      {imageFile && (
        <img
          src={URL.createObjectURL(imageFile)}
          style={{ width: '100%', height: 100, objectFit: 'contain' }}
        ></img>
      )}
      {imageFile && (
        <div style={{ width: '100%', textAlign: 'center' }}>
          UV채널일괄적용 : {lightmapChannel}{' '}
          <button
            onClick={() => {
              setLightmapChannel(prev => Math.max(prev - 1, 0));
            }}
          >
            -1
          </button>
          <button
            onClick={() => {
              setLightmapChannel(prev => prev + 1);
            }}
          >
            +1
          </button>
        </div>
      )}
      <div
        style={{
          width: '100%',
          display: 'flex',
          gap: 8,
          marginTop: 8,
          justifyContent: 'flex-end',
        }}
      >
        <button
          onClick={() => {
            closeModal();
          }}
        >
          취소
        </button>
        <button
          onClick={() => {
            VTextureLoader.load(imageFile!, threeExports).then(texture => {
              childrenMeshes.forEach(mesh => {
                const mat = mesh.material as VMaterial;
                if (dst === 'lightmap') {
                  mat.lightMap = texture;
                } else if (dst === 'ao') {
                  mat.aoMap = texture;
                } else if (dst === 'diffuse') {
                  mat.map = texture;
                } else if (dst === 'emissive') {
                  mat.emissiveMap = texture;
                } else if (dst === 'normal') {
                  mat.normalMap = texture;
                } else {
                  throw new Error('Invalid dst');
                }
                mat.needsUpdate = true;
              });
              closeModal();
            });
          }}
          disabled={!imageFile}
        >
          적용
        </button>
      </div>
    </div>
  );
};

export default ApplyLightMapComponent;
