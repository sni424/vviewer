import { THREE } from 'VTHREE';

type Shader = THREE.WebGLProgramParametersWithUniforms;

/////////////////////////////////////////////////////
/**
 * 공통으로 쓰이는 변수
 * 1. progress
 *      - uUseLightMapTransition || uUseMeshTransition
 * 
 * 2. vWorldPos
 *      - V_ENV_MAP || uUseMeshTransition
 */





const definesTarget = /* glsl */ `void main()`;
const defines = /* glsl */ `
#ifndef V_FRAG_DEFINES_GUARD
#define V_FRAG_DEFINES_GUARD

// MAX_PROBE_COUNT_REPLACE

uniform bool uUseLightMapTransition;
uniform bool uUseMeshTransition;

uniform float uProgress;

// uniform sampler2D lightMapFrom;
#ifdef USE_LIGHTMAP
uniform sampler2D uLightMapTo;
#endif

uniform vec3 uDissolveOrigin;
uniform float uDissolveMaxDist;
uniform bool uDissolveDirection;

float progressiveAlpha(float progress, float x, float xMin, float xMax) {
  float mid = mix(xMin, xMax, 0.5); // Midpoint of xMin and xMax
  float factor = abs(x - mid) / max(xMax - mid, 0.0001); // 0으로 나누는 문제 방지
  return clamp(1.0 - 4.0 * progress * factor, 0.0, 1.0);
}

// 라이트맵대비는 라이트맵을 사용할 때만 정의됨
#ifdef USE_LIGHTMAP
  uniform float uLightMapContrast;
  uniform float uGlobalLightMapContrast;
#endif //!USE_LIGHTMAP

varying vec3 vWorldPos;

#ifdef PROBE_COUNT
  struct Probe {
      vec3 center;
      vec3 size;
      // samplerCube cubeTexture;
      // sampler2D envTexture;
  };
  uniform Probe uProbe[PROBE_COUNT];
  #ifdef USE_PROBE_PMREM
  uniform sampler2D uProbeTextures[PROBE_COUNT];
  #else
  uniform samplerCube uProbeTextures[PROBE_COUNT];
  #endif
  uniform float uProbeIntensity;
  uniform float uProbeContrast;

  #ifdef WALL_COUNT
    struct Wall {
      vec3 start;
      vec3 end;
      int index; // 프로브 인덱스, 0부터 PROBE_COUNT-1까지
    };
    uniform Wall uWall[WALL_COUNT];
    uniform float uProbeBlendDist;
  #endif //!V_ENV_MAP_FLOOR

  #define lengthSquared(v) (dot((v), (v)))

  /////////////////////////////////////////////////////////////////////
// pmrem texture as a cube map

#ifndef USE_PROBE_PMREM
#define probeTextureUV texture // PMREM텍스쳐 아니면 기존의 textureCube 사용
#endif //!USE_PROBE_PMREM

#ifdef USE_PROBE_EQUIRECT
  vec2 directionToEquirectUV(vec3 dir) {
    // normalize just in case
    vec3 n = normalize(dir);

    float u = atan(n.z, n.x) / (2.0 * PI) + 0.5;
    float v = asin(n.y) / PI + 0.5;

    return vec2(u, v);
  }

  vec4 probeTextureUV(sampler2D tex, vec3 ray, float roughness) {
    vec2 uv = directionToEquirectUV(ray);
    return texture2D(tex, uv, roughness);
  }
#endif //!USE_PROBE_EQUIRECT

#ifdef USE_PROBE_PMREM

	#define v_cubeUV_minMipLevel 4.0
	#define v_cubeUV_minTileSize 16.0
  uniform float uCubeUVMaxMip;  
  uniform float uCubeUVTexelWidth;
  uniform float uCubeUVTexelHeight;  

	// These shader functions convert between the UV coordinates of a single face of
	// a cubemap, the 0-5 integer index of a cube face, and the direction vector for
	// sampling a textureCube (not generally normalized ).

	float v_getFace( vec3 direction ) {

		vec3 absDirection = abs( direction );

		float face = - 1.0;

		if ( absDirection.x > absDirection.z ) {

			if ( absDirection.x > absDirection.y )

				face = direction.x > 0.0 ? 0.0 : 3.0;

			else

				face = direction.y > 0.0 ? 1.0 : 4.0;

		} else {

			if ( absDirection.z > absDirection.y )

				face = direction.z > 0.0 ? 2.0 : 5.0;

			else

				face = direction.y > 0.0 ? 1.0 : 4.0;

		}

		return face;

	}

	// RH coordinate system; PMREM face-indexing convention
	vec2 v_getUV( vec3 direction, float face ) {

		vec2 uv;

		if ( face == 0.0 ) {

			uv = vec2( direction.z, direction.y ) / abs( direction.x ); // pos x

		} else if ( face == 1.0 ) {

			uv = vec2( - direction.x, - direction.z ) / abs( direction.y ); // pos y

		} else if ( face == 2.0 ) {

			uv = vec2( - direction.x, direction.y ) / abs( direction.z ); // pos z

		} else if ( face == 3.0 ) {

			uv = vec2( - direction.z, direction.y ) / abs( direction.x ); // neg x

		} else if ( face == 4.0 ) {

			uv = vec2( - direction.x, direction.z ) / abs( direction.y ); // neg y

		} else {

			uv = vec2( direction.x, direction.y ) / abs( direction.z ); // neg z

		}

		return 0.5 * ( uv + 1.0 );

	}

	vec3 v_bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {

		float face = v_getFace( direction );

		float filterInt = max( v_cubeUV_minMipLevel - mipInt, 0.0 );

		mipInt = max( mipInt, v_cubeUV_minMipLevel );

		float faceSize = exp2( mipInt );

		highp vec2 uv = v_getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0; // #25071

		if ( face > 2.0 ) {

			uv.y += faceSize;

			face -= 3.0;

		}

		uv.x += face * faceSize;

		uv.x += filterInt * 3.0 * v_cubeUV_minTileSize;

		uv.y += 4.0 * ( exp2( uCubeUVMaxMip ) - faceSize );

		uv.x *= uCubeUVTexelWidth;
		uv.y *= uCubeUVTexelHeight;

		#ifdef texture2DGradEXT

			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb; // disable anisotropic filtering

		#else

			return texture2D( envMap, uv ).rgb;

		#endif

	}

	// These defines must match with PMREMGenerator
	#define v_cubeUV_r0 1.0
	#define v_cubeUV_m0 - 2.0
	#define v_cubeUV_r1 0.8
	#define v_cubeUV_m1 - 1.0
	#define v_cubeUV_r4 0.4
	#define v_cubeUV_m4 2.0
	#define v_cubeUV_r5 0.305
	#define v_cubeUV_m5 3.0
	#define v_cubeUV_r6 0.21
	#define v_cubeUV_m6 4.0

	float v_roughnessToMip( float roughness ) {

		float mip = 0.0;

		if ( roughness >= v_cubeUV_r1 ) {

			mip = ( v_cubeUV_r0 - roughness ) * ( v_cubeUV_m1 - v_cubeUV_m0 ) / ( v_cubeUV_r0 - v_cubeUV_r1 ) + v_cubeUV_m0;

		} else if ( roughness >= v_cubeUV_r4 ) {

			mip = ( v_cubeUV_r1 - roughness ) * ( v_cubeUV_m4 - v_cubeUV_m1 ) / ( v_cubeUV_r1 - v_cubeUV_r4 ) + v_cubeUV_m1;

		} else if ( roughness >= v_cubeUV_r5 ) {

			mip = ( v_cubeUV_r4 - roughness ) * ( v_cubeUV_m5 - v_cubeUV_m4 ) / ( v_cubeUV_r4 - v_cubeUV_r5 ) + v_cubeUV_m4;

		} else if ( roughness >= v_cubeUV_r6 ) {

			mip = ( v_cubeUV_r5 - roughness ) * ( v_cubeUV_m6 - v_cubeUV_m5 ) / ( v_cubeUV_r5 - v_cubeUV_r6 ) + v_cubeUV_m5;

		} else {

			mip = - 2.0 * log2( 1.16 * roughness ); // 1.16 = 1.79^0.25
		}

		return mip;

	}

	vec4 probeTextureUV( sampler2D envMap, vec3 sampleDir, float roughness ) {

		float mip = clamp( v_roughnessToMip( roughness ), v_cubeUV_m0, uCubeUVMaxMip );

		float mipF = fract( mip );

		float mipInt = floor( mip );

		vec3 color0 = v_bilinearCubeUV( envMap, sampleDir, mipInt );

		if ( mipF == 0.0 ) {

			return vec4( color0, 1.0 );

		} else {

			vec3 color1 = v_bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );

			return vec4( mix( color0, color1, mipF ), 1.0 );

		}

	}

#endif //! USE_PROBE_PMREM

/////////////////////////////////////////////////////////////////////
// multiprobe

  vec3 parallaxCorrectNormal( vec3 v, vec3 cubeSize, vec3 cubePos ) {
      vec3 nDir = normalize( v );

      vec3 rbmax = ( .5 * cubeSize + cubePos - vWorldPos ) / nDir;
      vec3 rbmin = ( -.5 * cubeSize + cubePos - vWorldPos ) / nDir;

      vec3 rbminmax;

      rbminmax.x = ( nDir.x > 0. ) ? rbmax.x : rbmin.x;
      rbminmax.y = ( nDir.y > 0. ) ? rbmax.y : rbmin.y;
      rbminmax.z = ( nDir.z > 0. ) ? rbmax.z : rbmin.z;

      // 월드좌표의 반사벡터가 박스에서 얼마만한 강도로 반사될 지 정해주는 계수
      float correction = min( min( rbminmax.x, rbminmax.y ), rbminmax.z );
      vec3 boxIntersection = vWorldPos + nDir * correction;
      // vec3 boxIntersection = vWorldPos + nDir;
      
      vec3 retval = boxIntersection - cubePos;
      // retval.x = -retval.x;

      return retval;
  }

  float distanceToAABB(vec3 point, vec3 boxCenter, vec3 boxSize) {
      vec3 boxMin = boxCenter - boxSize * 0.5;
      vec3 boxMax = boxCenter + boxSize * 0.5;
      
      vec3 closestPoint = clamp(point, boxMin, boxMax);
      return lengthSquared(point - closestPoint);
  }

  vec4 probeColor(vec3 worldReflectVec, int i, float roughness) {
      
      vec3 probeCenter = uProbe[i].center;
      vec3 probeSize = uProbe[i].size;

      mat3 _envMapRotation = mat3(1.0);
      vec3 localReflectVec = _envMapRotation * parallaxCorrectNormal( worldReflectVec, probeSize, probeCenter );


      vec4 envMapColor = vec4(0.0);

      #if PROBE_COUNT > 0
      if(i == 0){

          envMapColor += probeTextureUV( uProbeTextures[0], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 1
      else if( i == 1){

          envMapColor += probeTextureUV( uProbeTextures[1], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 2
      else if( i == 2){

          envMapColor += probeTextureUV( uProbeTextures[2], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 3
      else if( i == 3){

          envMapColor += probeTextureUV( uProbeTextures[3], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 4
      else if( i == 4){

          envMapColor += probeTextureUV( uProbeTextures[4], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 5
      else if( i == 5){

          envMapColor += probeTextureUV( uProbeTextures[5], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 6
      else if( i == 6){

          envMapColor += probeTextureUV( uProbeTextures[6], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 7
      else if( i == 7){

          envMapColor += probeTextureUV( uProbeTextures[7], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 8
      else if( i == 8){

          envMapColor += probeTextureUV( uProbeTextures[8], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 9
      else if( i == 9){

          envMapColor += probeTextureUV( uProbeTextures[9], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 10
      else if( i == 10){

          envMapColor += probeTextureUV( uProbeTextures[10], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 11
      else if( i == 11){

          envMapColor += probeTextureUV( uProbeTextures[11], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 12
      else if( i == 12){

          envMapColor += probeTextureUV( uProbeTextures[12], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 13
      else if( i == 13){

          envMapColor += probeTextureUV( uProbeTextures[13], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 14
      else if( i == 14){

          envMapColor += probeTextureUV( uProbeTextures[14], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 15
      else if( i == 15){

          envMapColor += probeTextureUV( uProbeTextures[15], localReflectVec, roughness );

      }
      #endif
      #if PROBE_COUNT > 16
      else if( i == 16){

          envMapColor += probeTextureUV( uProbeTextures[16], localReflectVec, roughness );

      }
      #endif
      // WebGL GLSL스펙 상 최대 텍스쳐 갯수는 16이므로 여기서 끝
      else {

          envMapColor = vec4(0.0);
      }
      return envMapColor;
  }

  #ifdef WALL_COUNT
    bool intersectRaySegment(vec2 p1, vec2 p2, vec2 ro, vec2 rd, out vec2 intersection) {
      vec2 v1 = ro - p1;
      vec2 v2 = p2 - p1;
      vec2 v3 = vec2(-rd.y, rd.x); // 광선의 법선 벡터

      float dotProduct = dot(v2, v3);
      if(abs(dotProduct) < 1e-6f) {
          return false; // 광선과 선이 평행함
      }

      float t1 = (v2.x * v1.y - v2.y * v1.x) / dotProduct;
      float t2 = dot(v1, v3) / dotProduct;

      if(t1 >= 0.0f && t2 >= 0.0f && t2 <= 1.0f) {
          intersection = ro + t1 * rd;
          return true;
      }
      return false;
    }

  #endif //!WALL_COUNT


#endif //!V_ENV_MAP

void main()

#endif //!V_FRAG_DEFINES_GUARD
`;

/////////////////////////////////////////////////


const multiProbeTarget = /*glsl */ `#include <lights_fragment_end>`;
const multiProbe = /* glsl */ `
#ifndef V_FRAG_MULTIPROBE_GUARD
#define V_FRAG_MULTIPROBE_GUARD

#ifdef PROBE_COUNT

float roughness = material.roughness;

// 표면에서 반사되는 벡터를 월드좌표계에서 본 것
vec3 worldReflectVec = reflect( - geometryViewDir, geometryNormal );
worldReflectVec = normalize(worldReflectVec);
worldReflectVec = inverseTransformDirection( worldReflectVec, viewMatrix );

float reflectWeight = 1.0;
float distWeight = 1.0;

float dists[PROBE_COUNT];
float distTotal = 0.0;

////////////////////////////////////////////////
// 각 프로브까지의 거리를 계산
#pragma unroll_loop_start
for (int i = 0; i < PROBE_COUNT; i++) {
  vec3 probeCenter = uProbe[i].center;
  vec3 probeSize = uProbe[i].size;

  float distFromCenter = lengthSquared(vWorldPos-probeCenter);
  float distFromBox = distanceToAABB(vWorldPos, probeCenter, probeSize);
  
  dists[i] = distFromBox;
  
  distTotal += dists[i];
}
#pragma unroll_loop_end

////////////////////////////////////////////////
// 가장 가까운 프로브 고르기
int minIndex = -1;
float minDist = 100000.0;
#pragma unroll_loop_start
for (int i = 0; i < PROBE_COUNT; i++) {
  if (dists[i] < minDist) {
    minDist = dists[i];
    minIndex = i;
  }
}
#pragma unroll_loop_end

////////////////////////////////////////////////
// 프로브로부터 얻은 색상 반영
vec4 envMapColor = vec4(0.0);

////////////////////////////////////////////////
// case 1. 바닥
#ifdef WALL_COUNT

  int closestWallIndex = -1;
  int closestProbeIndex = minIndex;
  float maxDist = uProbeBlendDist * uProbeBlendDist;

  float closestWallDist = maxDist;

  #pragma unroll_loop_start
  for (int i = 0; i < WALL_COUNT; ++i) {
      vec2 start = uWall[i].start.xz;
      vec2 end = uWall[i].end.xz;
      int probeIndex = uWall[i].index;

      vec2 origin = vWorldPos.xz;
      vec2 ray = worldReflectVec.xz;
      vec2 intersection = vec2(0.0);
      float tRay;

      if(intersectRaySegment(start, end, origin, ray, intersection)){
          
        float dist = lengthSquared(intersection - origin);

        if(dist < closestWallDist){
            closestWallDist = dist;
            closestWallIndex = i;
            closestProbeIndex = probeIndex;
        }
      }
  }    
  #pragma unroll_loop_end

  envMapColor = probeColor(worldReflectVec, closestProbeIndex, roughness * roughness);

#else // ifndef V_ENV_MAP_FLOOR

  ////////////////////////////////////////////////
  // case2. 바닥이 아닌 여러 개의 프로브가 적용되는 경우
  // 그냥 제일 가까운 프로브 반사
  envMapColor = probeColor(worldReflectVec, minIndex, roughness * roughness);
  // envMapColor = vec4(1.0, 0.0, 0.0, 1.0);
      
#endif //!V_ENV_MAP_FLOOR

radiance += clamp(pow(envMapColor.rgb, vec3(uProbeContrast)), 0.0, 1.0) * uProbeIntensity;

#endif //!V_ENV_MAP

#include <lights_fragment_end>

#endif //!V_FRAG_MULTIPROBE_GUARD
`
const progAlphaTarget = /*glsl */`#include <dithering_fragment>`;
const progAlpha = /* glsl */ `
#include <dithering_fragment>
#ifndef V_FRAG_PROG_ALPHA_GUARD
#define V_FRAG_PROG_ALPHA_GUARD

  if(uUseMeshTransition){
    float distance = distance(vWorldPos.xyz, uDissolveOrigin );
    float falloffRange = uDissolveMaxDist * 0.01;
    float distToBorder = (uDissolveMaxDist + falloffRange) * abs(uProgress);
    float falloff = step( distToBorder-falloffRange, distance );
    float glowFalloff;
    if ( uDissolveDirection ) {
      falloff = 1.0 - falloff;
      glowFalloff = 1.0 - smoothstep(distToBorder-falloffRange*5.0, distToBorder+falloffRange*4.0, distance);
    }
    else {
      glowFalloff = max(smoothstep(distToBorder-falloffRange, distToBorder, distance), 0.0001);
    }
    gl_FragColor.a *= falloff;
    vec3 glowColor = vec3(1.0);
    gl_FragColor.rgb = mix(glowColor, gl_FragColor.rgb, glowFalloff);
  }

  //END_OF_FRAG

#endif //!V_FRAG_PROG_ALPHA_GUARD
`;

const lightmapTarget = /*glsl */`#include <lights_fragment_maps>`;
const lightmapContent = /* glsl */ `
// <lights_fragment_maps>을 복사해와서 중간 부분을 수정
#ifndef V_FRAG_LIGHTMAP_CONTRAST_GUARD
#define V_FRAG_LIGHTMAP_CONTRAST_GUARD

#if defined( RE_IndirectDiffuse )

  #ifdef USE_LIGHTMAP

    vec4 lightMapTexel = vec4( 0.0 );
    if(uUseLightMapTransition) {
      lightMapTexel = mix(
        texture2D(lightMap, vLightMapUv),
        texture2D(uLightMapTo, vLightMapUv),
        uProgress
      );
    } else {
      lightMapTexel = texture2D(lightMap, vLightMapUv);
    }

		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;

    // <lights_fragment_maps>에서 추가된 부분
    lightMapIrradiance = pow(lightMapIrradiance, vec3(uLightMapContrast*uGlobalLightMapContrast));

    irradiance += lightMapIrradiance;
  #endif

  #if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )

    iblIrradiance += getIBLIrradiance( geometryNormal );

  #endif

#endif

#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )

  #ifdef USE_ANISOTROPY

    radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );

  #else

    radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );

  #endif

  #ifdef USE_CLEARCOAT

    clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );

  #endif

#endif

#endif //!V_FRAG_LIGHTMAP_CONTRAST_GUARD
`;

const debugging = /* glsl */ `
// if(uUseLightMapTransition){
//   gl_FragColor = texture2D(lightMapTo, vLightMapUv);
// }
//END_OF_FRAG
`;

export const patchFragment = (shader: Shader) => {

  // 1. defines
  shader.fragmentShader = shader.fragmentShader.replace(definesTarget, defines);

  // 2. multiprobe
  shader.fragmentShader = shader.fragmentShader.replace(multiProbeTarget, multiProbe);

  // 3. visibility transition
  shader.fragmentShader = shader.fragmentShader.replace(progAlphaTarget, progAlpha);

  // 4. lightmap transition & contrast
  shader.fragmentShader = shader.fragmentShader.replace(lightmapTarget, lightmapContent);

  // 5. 디버깅용으로 셰이더 가장 마지막 부분에 추가
  shader.fragmentShader = shader.fragmentShader.replace("//END_OF_FRAG", debugging)

  return shader;
};

export const v_env_frag_shaders = {
  defines,
  definesTarget,
  multiProbe,
  multiProbeTarget,
  progAlpha,
  progAlphaTarget,
  lightmapContent,
  lightmapTarget,
}