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


//start 밝기,대비
uniform float uBrightnessValue;
uniform float uContrastValue;
uniform bool uUseBrightnessValue;

vec3 vLinearToneMapping( vec3 color ) {
    return uBrightnessValue * color;
}

void e1MainImage(const in vec4 inputColor,  out vec4 outputColor) {
vec3 color = pow( inputColor.rgb / vec3(0.18), vec3(uContrastValue) ) * vec3(0.18);
    outputColor = vec4( color.rgb, inputColor.a );
}

//finish 밝기,대비

//start highlight burn
uniform float highlightBurnFactor;
uniform bool uUseHighlightBurn;

vec3 e2Rh(vec3 color, float b) {
    return (color * (vec3(1.0) + color / (b * b))) / (vec3(1.0) + color);
}

void e2MainImage(const in vec4 inputColor, out vec4 outputColor) {
    outputColor = vec4( e2Rh(inputColor.rgb, 1.0/highlightBurnFactor), inputColor.a );
}

vec4 blend23(const in vec4 x, const in vec4 y, const in float opacity) {
    return mix(x, y, opacity);
}
//finish highlight burn


//start whiteBalance
uniform float uWhiteBalance;
uniform bool uUseWhiteBalance;

vec3 e3ColorTemperatureToRGB(const in float temperature) {
    // Values from: http://blenderartists.org/forum/showthread.php?270332-OSL-Goodness&p = 2268693&viewfull = 1#post2268693   
    mat3 m = (temperature <= 6500.0) ? mat3(vec3(0.0, -2902.1955373783176, -8257.7997278925690), vec3(0.0, 1669.5803561666639, 2575.2827530017594), vec3(1.0, 1.3302673723350029, 1.8993753891711275)) : 
    mat3(vec3(1745.0425298314172, 1216.6168361476490, -8257.7997278925690), vec3(-2666.3474220535695, -2173.1012343082230, 2575.2827530017594), vec3(0.55995389139931482, 0.70381203140554553, 1.8993753891711275));
    return mix(clamp(vec3(m[0] / (vec3(clamp(temperature, 1000.0, 40000.0)) + m[1]) + m[2]), vec3(0.0), vec3(1.0)), vec3(1.0), smoothstep(1000.0, 0.0, temperature));
}

//이미지의 전체적인 색감을 조절하여 흰색이 정말 흰색으로 보이도록 만드는 기능
//리 눈은 조명의 색(예: 노란 백열등, 푸른 하늘빛)에 자동으로 적응해서 흰 종이를 
//항상 흰색으로 인식하지만, 카메라는 이 조절을 수동 또는 자동으로 해주어야 합니다. 
//이 코드가 바로 그 역할을 디지털로 수행
//낮은 값 (예: 4000K): 노란색이나 붉은색 조명을 보정하기 위해 이미지를 전체적으로 파랗게 만듭니다.
//높은 값 (예: 8000K): 그늘이나 푸른 하늘빛을 보정하기 위해 이미지를 전체적으로 노랗거나 붉게 만듭니다.
void e3MainImage(const in vec4 inputColor,  out vec4 outputColor) {
    vec3 color = mix(inputColor.rgb, inputColor.rgb * (vec3(1.0) / e3ColorTemperatureToRGB(uWhiteBalance)), 1.0);
    color *= mix(1.0, dot(inputColor.rgb, vec3(0.2126, 0.7152, 0.0722)) / max(dot(color.rgb, vec3(0.2126, 0.7152, 0.0722)), 1e-5), 1.0);
    outputColor = vec4( color.rgb, inputColor.a );
}
//finish whiteBalance


//start saturation
uniform float uSaturation;
uniform bool uUseSaturation;
vec3 v4ApplySaturation(vec3 rgb, float adjustment) {
    // Algorithm from Chapter 16 of OpenGL Shading Language
    const vec3 W = vec3(0.2125, 0.7154, 0.0721);
    vec3 intensity = vec3(dot(rgb, W));
    return mix(intensity, rgb, adjustment);
}
//채도(Saturation)조절
//이미지의 색상이 얼마나 선명하고 진하게(또는 옅고 흐리게) 보일지를 결정
void v4MainImage(const in vec4 inputColor, out vec4 outputColor) {
    vec3 color = inputColor.rgb;
    color = v4ApplySaturation(color.rgb, uSaturation+1.0);
    outputColor = vec4( color, inputColor.a );
}
//finish saturation

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

//start transmission
float specularRoughness;


float linearToRelativeLuminance( const in vec3 color ) {
    vec3 weights = vec3( 0.2126, 0.7152, 0.0722 );
    return dot( weights, color.rgb );
}

vec3 F_Schlick_RoughnessDependent( const in vec3 F0, const in float F90, const in float dotNV, const in float roughness ) {
    float fresnel = exp2( ( -5.55473 * dotNV - 6.98316 ) * dotNV );
    vec3 Fr = max( vec3( F90 - roughness ), F0 ) - F0;
    return Fr * fresnel + F0;
}

//finish transmission


vec3 adjustHB(vec3 color) {
  float a = 1.0 / max(highlightBurnFactor, 0.001);
  return (color * (vec3(1.0) + color / (a * a))) / (vec3(1.0) + color);
}

vec4 adjustHighlightBurn(vec4 inputColor) {
  return vec4(adjustHB(inputColor.rgb), inputColor.a);
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
  uniform sampler2D uProbeTexture;
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

	#define v_cubeUV_minMipLevel 4.0
	#define v_cubeUV_minTileSize 16.0
  // #define V_CUBE_UV_MAX_MIP;   // 밖에서 넣어주는 것
  // #define V_CUBE_UV_TEXEL_WIDTH; // 밖에서 넣어주는 것
  // #define V_CUBE_UV_TEXEL_HEIGHT;   // 밖에서 넣어주는 것

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

	vec3 v_bilinearCubeUV( sampler2D envMap, vec3 _direction, float mipInt, int tileIndex ) {

    vec3 direction = _direction;
    direction.x = -direction.x; // RH coordinate system
		float face = v_getFace( direction );

		float filterInt = max( v_cubeUV_minMipLevel - mipInt, 0.0 );

		mipInt = max( mipInt, v_cubeUV_minMipLevel );

		float faceSize = exp2( mipInt );

		highp vec2 uv = v_getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0; // #25071

    // 타일링 된 UV 좌표 계산
    {
      float tilesCol = PROBE_COLS; 
      float tilesRow = PROBE_ROWS;
      float tileXSize = faceSize / tilesCol; // 현재 mip에서 한 타일의 픽셀 크기
      float tileYSize = faceSize / tilesRow;

      float tileX = float(tileIndex % int(tilesCol + 0.5));
      float tileY = float(tileIndex / int(tilesCol + 0.5));

      // 상단 기준 tileY → 하단 기준 변환
      float tileYoffset = (tilesRow - 1.0 - tileY) * tileYSize;

      // uv를 타일 내부 좌표로 축소
      uv.x = uv.x * (1.0 / tilesCol);
      uv.y = uv.y * (1.0 / tilesRow);

      // 타일의 픽셀 오프셋 적용
      uv.x += tileX * tileXSize;
      uv.y += tileYoffset;

      // // --- mipInt 기반 경계 픽셀 보정 ---
      // // 고해상도 mip에서는 0.5픽셀 보정, 저해상도 mip에서는 더 작게
      float baseBorder = 3.0;
      // float mipScale = clamp( exp2( -mipInt ), 0.25, 1.0 ); 
      // float borderFix = baseBorder * mipScale;
      float borderFix = baseBorder;

      float epsX = borderFix;
      float epsY = borderFix;

      if (uv.x < epsX) return vec3(1.0, 0.0, 0.0);
      if (uv.y < epsY) return vec3(0.0, 1.0, 0.0);
      if (uv.x > faceSize - epsX) return vec3(0.0, 0.0, 1.0);
      if (uv.y > faceSize - epsY) return vec3(0.0, 1.0, 1.0);

      // // 타일 내부 경계 보정
      // if (uv.x < epsX) uv.x = epsX;
      // if (uv.y < epsY) uv.y = epsY;
      // if (uv.x > faceSize - epsX) uv.x = faceSize - epsX;
      // if (uv.y > faceSize - epsY) uv.y = faceSize - epsY;
    }

    // 이제 PMREMGenerator 오프셋 적용
		if ( face > 2.0 ) {

			uv.y += faceSize;

			face -= 3.0;

		}

		uv.x += face * faceSize;

		uv.x += filterInt * 3.0 * v_cubeUV_minTileSize;

		uv.y += 4.0 * ( exp2( V_CUBE_UV_MAX_MIP ) - faceSize );

		uv.x *= V_CUBE_UV_TEXEL_WIDTH;
		uv.y *= V_CUBE_UV_TEXEL_HEIGHT;

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

	vec4 probeTextureUV( sampler2D envMap, vec3 sampleDir, float roughness, int tileIndex ) {

		float mip = clamp( v_roughnessToMip( roughness ), v_cubeUV_m0, V_CUBE_UV_MAX_MIP );

		float mipF = fract( mip );

		float mipInt = floor( mip );

		vec3 color0 = v_bilinearCubeUV( envMap, sampleDir, mipInt, tileIndex );
    return vec4(color0, 1.0);

		if ( mipF == 0.0 ) {

			return vec4( color0, 1.0 );

		} else {

			vec3 color1 = v_bilinearCubeUV( envMap, sampleDir, mipInt + 1.0, tileIndex );

			return vec4( mix( color0, color1, mipF ), 1.0 );
			// return vec4( color1, 1.0 );

		}

	}


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


      vec4 envMapColor = probeTextureUV( uProbeTexture, localReflectVec, roughness, i);

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

  // float distFromCenter = lengthSquared(vWorldPos-probeCenter);
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
`;
const progAlphaTarget = /*glsl */ `#include <dithering_fragment>`;
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

const lightmapTarget = /*glsl */ `#include <lights_fragment_maps>`;
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

const transmissionParsTarget = /*glsl */ `#include <transmission_pars_fragment>`;
const transmissionParsContent = /* glsl */ `
// <transmission_pars_fragment>을 복사해와서 중간 부분을 수정
#ifdef USE_TRANSMISSION
    // 이유: MeshPhysicalMaterial의 transmission 효과를 프레임 버퍼 기반으로 커스터마이징
    // 결과: reflectivity 기반 IOR 계산과 프레임 버퍼 샘플링으로 투과 효과 구현

    uniform float transmission;
    uniform float thickness;
    uniform float attenuationDistance;
    uniform vec3 attenuationColor;
    uniform float reflectivity; // 반사율 (IOR 계산에 사용)
    uniform mat4 modelMatrix;
    uniform mat4 projectionMatrix;

    #ifdef USE_TRANSMISSIONMAP
        uniform sampler2D transmissionMap;
    #endif
    #ifdef USE_THICKNESSMAP
        uniform sampler2D thicknessMap;
    #endif

    uniform vec2 transmissionSamplerSize;
    uniform sampler2D transmissionSamplerMap;

    varying vec3 vWorldPosition; // patchFragment와 호환

    vec3 getVolumeTransmissionRay(vec3 n, vec3 v, float thickness, float ior, mat4 modelMatrix) {
        vec3 refractionVector = refract(-v, normalize(n), 1.0 / ior);
        vec3 modelScale;
        modelScale.x = length(vec3(modelMatrix[0].xyz));
        modelScale.y = length(vec3(modelMatrix[1].xyz));
        modelScale.z = length(vec3(modelMatrix[2].xyz));
        return normalize(refractionVector) * thickness * modelScale;
    }

    float applyIorToRoughness(float roughness, float ior) {
        return roughness * clamp(ior * 2.0 - 2.0, 0.0, 1.0);
    }

    vec3 getTransmissionSample(vec2 fragCoord, float roughness, float ior) {
        float framebufferLod = log2(transmissionSamplerSize.x) * applyIorToRoughness(roughness, ior);
        return texture2D(transmissionSamplerMap, fragCoord.xy).rgb; // texture2DLodEXT 대체
    }

    vec3 applyVolumeAttenuation(vec3 radiance, float transmissionDistance, vec3 attenuationColor, float attenuationDistance) {
        if (attenuationDistance == 0.0) {
            return radiance;
        } else {
            vec3 attenuationCoefficient = -log(attenuationColor) / attenuationDistance;
            vec3 transmittance = exp(-attenuationCoefficient * transmissionDistance);
            return transmittance * radiance;
        }
    }

    vec3 getIBLVolumeRefraction(
        vec3 n, vec3 v, float perceptualRoughness, vec3 baseColor, vec3 specularColor,
        vec3 position, mat4 modelMatrix, mat4 viewMatrix, mat4 projMatrix,
        float ior, float thickness, vec3 attenuationColor, float attenuationDistance
    ) {
        vec3 transmissionRay = getVolumeTransmissionRay(n, v, thickness, ior, modelMatrix);
        vec3 refractedRayExit = position + transmissionRay;
        vec4 ndcPos = projMatrix * viewMatrix * vec4(refractedRayExit, 1.0);
        vec2 refractionCoords = ndcPos.xy / ndcPos.w;
        refractionCoords += 1.0;
        refractionCoords /= 2.0;
        vec3 transmittedLight = getTransmissionSample(refractionCoords, perceptualRoughness, ior);
        vec3 attenuatedColor = applyVolumeAttenuation(transmittedLight, length(transmissionRay), attenuationColor, attenuationDistance);
        return (1.0 - specularColor) * attenuatedColor * baseColor;
    }
#endif
`;

const transmissionTarget = /*glsl */ `#include <transmission_fragment>`;
const transmissionContent = /* glsl */ `
  #ifdef USE_TRANSMISSION
          
    float transmissionFactor = transmission;
    float thicknessFactor = thickness;
    specularRoughness = max(roughness, 0.02625000 );
    material.transmissionAlpha = 1.0;
// totalEmissiveRadiance = emissive;

    #ifdef USE_TRANSMISSIONMAP
        transmissionFactor *= transmissionMapTexelToLinear( texture2D(transmissionMap, vUvTransmission) ).r;
    #endif

    #ifdef USE_THICKNESSMAP
        thicknessFactor *=thicknessMapTexelToLinear( texture2D(thicknessMap, vUvTransmission) ).g;
    #endif

    vec3 pos = vWorldPosition;
    vec3 v = normalize(cameraPosition - pos);
    float ior  = (1.0 + 0.4 * reflectivity) / (1.0 - 0.4 * reflectivity);
 
    vec3 transmission = transmissionFactor * getIBLVolumeRefraction(
        geometryNormal,
        v,
        roughness,
        material.diffuseColor,
        material.specularColor,
        pos,
        modelMatrix,
        viewMatrix,
        projectionMatrix,
        ior,
        thicknessFactor,
        attenuationColor,
        attenuationDistance
    );            
   
    totalDiffuse = mix(totalDiffuse, transmission, transmissionFactor);
    
    vec3 specularLinear = (reflectedLight.directSpecular + reflectedLight.indirectSpecular);
    float specularLumi = linearToRelativeLuminance( specularLinear ); 
        float dotNV = saturate( dot( normal, normalize( vViewPosition ) ) );
    float FCustom = F_Schlick_RoughnessDependent( vec3(0.04), 1.0, dotNV, specularRoughness ).r;
    
    #ifdef USE_TRANSMISSIONMAP
    float finalTransmission = mix( transmissionFactor, transmissionMapTexelToLinear(texture2D(transmissionMap, vUvTransmission)).b, transmissionMapAmount );
    diffuseColor.a *= saturate( 1. - finalTransmission + specularLumi + FCustom );
    #else
    // diffuseColor.a *= clamp(1.0 - transmissionFactor + luminance(material.specularColor), 0.0, 1.0);
      diffuseColor.a *= saturate( 1. - transmissionFactor + specularLumi + FCustom );
     #endif 
  #endif    
`;

const debugging = /* glsl */ `

 gl_FragColor.rgb = vLinearToneMapping( gl_FragColor.rgb );

 vec4 color0 =gl_FragColor;
  vec4 color1 = vec4(0.0);



// if(uUseLightMapTransition){
//   gl_FragColor = texture2D(lightMapTo, vLightMapUv);
// }

    if(uUseBrightnessValue){
    e1MainImage(color0,  color1);
    color0 = blend23(color0, color1, 1.0);
    }
    if(uUseHighlightBurn){
    e2MainImage(color0,  color1);
    color0 = blend23(color0, color1, 1.0);
    }
    if(uUseWhiteBalance){
    e3MainImage(color0,color1);
    color0 = blend23(color0, color1, 1.0);
    }
    if(uUseSaturation){
    v4MainImage(color0,  color1);
    color0 = blend23(color0, color1, 1.0);
    }
    gl_FragColor = color0;
//END_OF_FRAG
`;

export const patchFragment = (shader: Shader) => {
  // 1. defines
  shader.fragmentShader = shader.fragmentShader.replace(definesTarget, defines);

  // 2. multiprobe
  shader.fragmentShader = shader.fragmentShader.replace(
    multiProbeTarget,
    multiProbe,
  );

  // 3. visibility transition
  shader.fragmentShader = shader.fragmentShader.replace(
    progAlphaTarget,
    progAlpha,
  );

  // 4. lightmap transition & contrast
  shader.fragmentShader = shader.fragmentShader.replace(
    lightmapTarget,
    lightmapContent,
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    transmissionParsTarget,
    transmissionParsContent,
  );

  shader.fragmentShader = shader.fragmentShader.replace(
    transmissionTarget,
    transmissionContent,
  );

  // 5. 디버깅용으로 셰이더 가장 마지막 부분에 추가
  shader.fragmentShader = shader.fragmentShader.replace(
    '//END_OF_FRAG',
    debugging,
  );

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
  transmissionParsTarget,
  transmissionParsContent,
  transmissionTarget,
  transmissionContent,
};
