import { THREE } from 'VTHREE';
import { AssetMgr } from './AssetMgr';
import { getTypedArray } from './AssetUtils';
import {
  VBufferAttribute,
  VBufferGeometry,
  VInterleavedBuffer,
  VInterleavedBufferAttribute,
} from './VBufferGeometry';
import { VFile, VFileRemote } from './VFile';

export default async function BufferGeometryLoader(
  vfile: VFile | VFileRemote,
): Promise<THREE.BufferGeometry> {
  return AssetMgr.get<VFile<VBufferGeometry>>(vfile as any).then(
    async geometryFile => {
      const { id, type, data } = geometryFile;
      if (type !== 'VBufferGeometry') {
        throw new Error('VBufferGeometry가 아닙니다');
      }

      async function getInterleavedBuffer(data: VInterleavedBuffer) {
        const array = getTypedArray(data.type, await AssetMgr.get(data.buffer));
        const ib = new THREE.InterleavedBuffer(array, data.stride);
        ib.uuid = data.uuid;

        return ib;
      }

      const geometry = (data as any).isInstancedBufferGeometry
        ? new THREE.InstancedBufferGeometry()
        : new THREE.BufferGeometry();

      const index = data.data!.index;

      if (index !== undefined) {
        const typedArray = getTypedArray(
          index.type,
          await AssetMgr.get<ArrayBuffer>(index.array),
        );
        geometry.setIndex(new THREE.BufferAttribute(typedArray, 1));
      }

      const attributes = data.data.attributes;

      for (const key in attributes) {
        const attribute = attributes[key];
        let bufferAttribute;

        if (
          (attribute as VInterleavedBufferAttribute)
            .isInterleavedBufferAttribute
        ) {
          const attr = attribute as VInterleavedBufferAttribute;
          const interleavedBuffer = await getInterleavedBuffer(attr.data);
          bufferAttribute = new THREE.InterleavedBufferAttribute(
            interleavedBuffer,
            attr.itemSize,
            attr.offset,
            attr.normalized,
          );
        } else {
          const attr = attribute as VBufferAttribute;
          const typedArray = getTypedArray(
            attr.type,
            await AssetMgr.get(attr.array),
          );
          const bufferAttributeConstr = (attr as any).isInstancedBufferAttribute
            ? THREE.InstancedBufferAttribute
            : THREE.BufferAttribute;
          bufferAttribute = new bufferAttributeConstr(
            typedArray,
            attr.itemSize,
            attr.normalized,
          );
        }

        if ((attribute as any).name !== undefined)
          bufferAttribute.name = (attribute as any).name;
        if ((attribute as any).usage !== undefined)
          (bufferAttribute as any).setUsage?.((attribute as any).usage);

        geometry.setAttribute(key, bufferAttribute);
      }

      const morphAttributes = data.data.morphAttributes;

      if (morphAttributes) {
        for (const key in morphAttributes) {
          const attributeArray = morphAttributes[key];

          const array = [];

          for (let i = 0, il = attributeArray.length; i < il; i++) {
            const attribute = attributeArray[i];
            let bufferAttribute;

            const attrBuffer = attribute as VBufferAttribute;
            const attrInterleaved = attribute as VInterleavedBufferAttribute;
            if (attrInterleaved.isInterleavedBufferAttribute) {
              const interleavedBuffer = await getInterleavedBuffer(
                attrInterleaved.data,
              );
              bufferAttribute = new THREE.InterleavedBufferAttribute(
                interleavedBuffer,
                attrInterleaved.itemSize,
                attrInterleaved.offset,
                attrInterleaved.normalized,
              );
            } else {
              const typedArray = getTypedArray(
                attrBuffer.type,
                await AssetMgr.get(attrBuffer.array),
              );
              bufferAttribute = new THREE.BufferAttribute(
                typedArray,
                attrBuffer.itemSize,
                attrBuffer.normalized,
              );
            }

            if ((attribute as any).name !== undefined)
              bufferAttribute.name = (attribute as any).name;
            array.push(bufferAttribute);
          }

          geometry.morphAttributes[key] = array;
        }
      }

      const morphTargetsRelative = data.data.morphTargetsRelative;

      if (morphTargetsRelative) {
        geometry.morphTargetsRelative = true;
      }

      const groups =
        data.data.groups ||
        (data.data as any).drawcalls ||
        (data as any).data.offsets;

      if (groups !== undefined) {
        for (let i = 0, n = groups.length; i !== n; ++i) {
          const group = groups[i];

          geometry.addGroup(group.start, group.count, group.materialIndex);
        }
      }

      const boundingSphere = data.data.boundingSphere;

      if (boundingSphere !== undefined) {
        const center = new THREE.Vector3();

        if (boundingSphere.center !== undefined) {
          center.fromArray(boundingSphere.center);
        }

        geometry.boundingSphere = new THREE.Sphere(
          center,
          boundingSphere.radius,
        );
      }

      if (data.name) geometry.name = data.name;
      if (data.userData) geometry.userData = data.userData;

      return geometry;
    },
  );
}
