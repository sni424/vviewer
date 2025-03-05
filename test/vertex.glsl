#version 300 es
precision mediump sampler2DArray;
#define attribute in
#define varying out
#define texture2D texture
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp samplerCube;
precision highp sampler3D;
precision highp sampler2DArray;
precision highp sampler2DShadow;
precision highp samplerCubeShadow;
precision highp sampler2DArrayShadow;
precision highp isampler2D;
precision highp isampler3D;
precision highp isamplerCube;
precision highp isampler2DArray;
precision highp usampler2D;
precision highp usampler3D;
precision highp usamplerCube;
precision highp usampler2DArray;
#define HIGH_PRECISION
#define SHADER_NAME tcdv
#define STANDARD 
#define PHYSICAL 
#define VERTEX_TEXTURES
#define GAMMA_FACTOR 2.200000047683716
#define MAX_BONES undefined
#define ufeZ
#define UNSC
#define EPB
#define JToV
#define LIGHTMAP_UV2
#define VC_F_T
#define USE_UV
#define DISSOLVE
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
#ifdef USE_INSTANCING
    attribute mat4 instanceMatrix;
#endif
#ifdef uchG
    attribute vec3 instanceColor;
#endif
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
attribute vec2 uv2;
#ifdef USE_TANGENT
    attribute vec4 tangent;
#endif
#if defined( DVzy )
    attribute vec4 color;
    #elif defined( xGru )
    attribute vec3 color;
#endif
#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )
    attribute vec3 morphTarget0;
    attribute vec3 morphTarget1;
    attribute vec3 morphTarget2;
    attribute vec3 morphTarget3;
    #ifdef USE_MORPHNORMALS
        attribute vec3 morphNormal0;
        attribute vec3 morphNormal1;
        attribute vec3 morphNormal2;
        attribute vec3 morphNormal3;
    #else
        attribute vec3 morphTarget4;
        attribute vec3 morphTarget5;
        attribute vec3 morphTarget6;
        attribute vec3 morphTarget7;
    #endif
#endif
#ifdef TWik
    attribute vec4 skinIndex;
    attribute vec4 skinWeight;
#endif

#define STANDARD
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
    varying vec3 vNormal;
    #ifdef USE_TANGENT
        varying vec3 vTangent;
        varying vec3 vBitangent;
    #endif
#endif
#if defined( HLxb ) || defined( EPB ) || defined( DISSOLVE )
    #ifndef VC_HAD_vWorldPosition
        varying vec4 vWorldPosition;
        #define VC_HAD_vWorldPosition
    #endif
#endif
#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
    #define saturate(a) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement(a) ( 1.0 - saturate( a ) )
float pow2( const in float x ) {
    return x*x;
}
float pow3( const in float x ) {
    return x*x*x;
}
float pow4( const in float x ) {
    float x2 = x*x;
    return x2*x2;
}
float average( const in vec3 color ) {
    return dot( color, vec3( 0.3333 ) );
}
highp float rand( const in vec2 uv ) {
    const highp float a = 12.9898, b = 78.233, c = 43758.5453;
    highp float dt = dot( uv.xy, vec2( a, b ) ), sn = mod( dt, PI );
    return fract(sin(sn) * c);
}
#ifdef HIGH_PRECISION
    float precisionSafeLength( vec3 v ) {
        return length( v );
    }
#else
    float max3( vec3 v ) {
        return max( max( v.x, v.y ), v.z );
    }
    float precisionSafeLength( vec3 v ) {
        float maxComponent = max3( abs( v ) );
        return length( v / maxComponent ) * maxComponent;
    }
#endif
struct IncidentLight {
    vec3 color;
    vec3 direction;
    bool visible;
};
struct ReflectedLight {
    vec3 directDiffuse;
    vec3 directSpecular;
    vec3 indirectDiffuse;
    vec3 indirectSpecular;
};
struct GeometricContext {
    vec3 position;
    vec3 normal;
    vec3 viewDir;
    #ifdef HpCw
        vec3 clearcoatNormal;
    #endif
};
float RGBToLightness(vec3 color) {
    float max = max(max(color.r, color.g), color.b);
    float min = min(min(color.r, color.g), color.b);
    float l = (max + min) / 2.0;
    return l;
}
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
    return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
    return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
vec3 projectOnPlane(in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {
    float distance = dot( planeNormal, point - pointOnPlane );
    return - distance * planeNormal + point;
}
float sideOfPlane( in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {
    return sign( dot( point - pointOnPlane, planeNormal ) );
}
vec3 linePlaneIntersect( in vec3 pointOnLine, in vec3 lineDirection, in vec3 pointOnPlane, in vec3 planeNormal ) {
    return lineDirection * ( dot( planeNormal, pointOnPlane - pointOnLine ) / dot( planeNormal, lineDirection ) ) + pointOnLine;
}
mat3 transposeMat3( const in mat3 m ) {
    mat3 tmp;
    tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
    tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
    tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
    return tmp;
}
float linearToRelativeLuminance( const in vec3 color ) {
    vec3 weights = vec3( 0.2126, 0.7152, 0.0722 );
    return dot( weights, color.rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
    return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
    float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
    float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
    return vec2( u, v );
}
#if __VERSION__ < 300
    float determinant(float m) {
        return m;
    }
    float determinant(mat2 m) {
        return m[0][0] * m[1][1] - m[0][1] * m[1][0];
    }
    float determinant(mat3 m) {
        return m[0][0] * (m[2][2]*m[1][1] - m[1][2]*m[2][1])
        + m[0][1] * (m[1][2]*m[2][0] - m[2][2]*m[1][0])
        + m[0][2] * (m[2][1]*m[1][0] - m[1][1]*m[2][0]);
    }
    float determinant(mat4 m) {
        float
        b00 = m[0][0] * m[1][1] - m[0][1] * m[1][0], b01 = m[0][0] * m[1][2] - m[0][2] * m[1][0], b02 = m[0][0] * m[1][3] - m[0][3] * m[1][0], b03 = m[0][1] * m[1][2] - m[0][2] * m[1][1], b04 = m[0][1] * m[1][3] - m[0][3] * m[1][1], b05 = m[0][2] * m[1][3] - m[0][3] * m[1][2], b06 = m[2][0] * m[3][1] - m[2][1] * m[3][0], b07 = m[2][0] * m[3][2] - m[2][2] * m[3][0], b08 = m[2][0] * m[3][3] - m[2][3] * m[3][0], b09 = m[2][1] * m[3][2] - m[2][2] * m[3][1], b10 = m[2][1] * m[3][3] - m[2][3] * m[3][1], b11 = m[2][2] * m[3][3] - m[2][3] * m[3][2];
        return b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    }
#endif
float w0(float a) {
    return (1.0/6.0)*(a*(a*(-a + 3.0) - 3.0) + 1.0);
}
float w1(float a) {
    return (1.0/6.0)*(a*a*(3.0*a - 6.0) + 4.0);
}
float w2(float a) {
    return (1.0/6.0)*(a*(a*(-3.0*a + 3.0) + 3.0) + 1.0);
}
float w3(float a) {
    return (1.0/6.0)*(a*a*a);
}
float g0(float a) {
    return w0(a) + w1(a);
}
float g1(float a) {
    return w2(a) + w3(a);
}
float h0(float a) {
    return -1.0 + w1(a) / (w0(a) + w1(a));
}
float h1(float a) {
    return 1.0 + w3(a) / (w2(a) + w3(a));
}
vec4 vtb(sampler2D tex, vec2 uv, vec2 txR) {
    #ifdef HQS
        vec4 ts = vec4(1.0/txR, txR);
        uv = uv*ts.zw + 0.5;
        vec2 iuv = floor( uv );
        vec2 fuv = fract( uv );
        float g0x = g0(fuv.x);
        float g1x = g1(fuv.x);
        float h0x = h0(fuv.x);
        float h1x = h1(fuv.x);
        float h0y = h0(fuv.y);
        float h1y = h1(fuv.y);
        vec2 p0 = (vec2(iuv.x + h0x, iuv.y + h0y) - 0.5) * ts.xy;
        vec2 p1 = (vec2(iuv.x + h1x, iuv.y + h0y) - 0.5) * ts.xy;
        vec2 p2 = (vec2(iuv.x + h0x, iuv.y + h1y) - 0.5) * ts.xy;
        vec2 p3 = (vec2(iuv.x + h1x, iuv.y + h1y) - 0.5) * ts.xy;
        return g0(fuv.y) * (g0x * texture2D(tex, p0)	+ g1x * texture2D(tex, p1)) + g1(fuv.y) * (g0x * texture2D(tex, p2)	+ g1x * texture2D(tex, p3));
    #else
        return texture2D( tex, uv );
    #endif
}
#ifdef NGD
    uniform float nqr;
    vec3 ngdf(vec2 e, float r) {
        e = e / r * 2.0 - 1.0;
        vec3 v = vec3(e.xy, 1.0 - abs(e.x) - abs(e.y));
        if (v.z < 0.0) v.xy = (1.0 - abs(v.yx)) * vec2((v.x >= 0.0) ? 1.0 : -1.0, (v.y >= 0.0) ? 1.0 : -1.0);
        return normalize(v);
    }
#endif

#ifdef USE_UV
    #ifdef UVS_VERTEX_ONLY
        vec2 vUv;
    #else
    #endif
    #ifdef UVGD
        uniform float uvqm;
        uniform vec2 uvqo;
    #endif
    #ifdef UV2GD
        uniform float uv2qm;
        uniform vec2 uv2qo;
    #endif
    #ifdef ePky
        varying vec2 vUvMap;
        uniform mat3 uvTransformMap;
    #endif
    #ifdef oRrN
        varying vec2 vUvSpecular;
        uniform mat3 uvTransformSpecular;
    #endif
    #ifdef TeIY
        varying vec2 vUvGlossiness;
        uniform mat3 uvTransformGlossiness;
    #endif
    #ifdef DuyS
        varying vec2 vUvDisplacement;
        uniform mat3 uvTransformDisplacement;
    #endif
    #ifdef XOsC
        varying vec2 vUvNormal;
        uniform mat3 uvTransformNormal;
    #endif
    #ifdef YhJN
        varying vec2 vUvBump;
        uniform mat3 uvTransformBump;
    #endif
    #ifdef XXLK
        varying vec2 vUvRoughness;
        uniform mat3 uvTransformRoughness;
    #endif
    #ifdef pGHF
        varying vec2 vUvMetalness;
        uniform mat3 uvTransformMetalness;
    #endif
    #ifdef cZYY
        varying vec2 vUvAlpha;
        uniform mat3 uvTransformAlpha;
    #endif
    #ifdef tort
        varying vec2 vUvEmissive;
        uniform mat3 uvTransformEmissive;
    #endif
    #ifdef yICh
        varying vec2 vUvTransmission;
        uniform mat3 uvTransformTransmission;
    #endif
    #ifdef sFFv
        varying vec2 vUvReflectivity;
        uniform mat3 uvTransformReflectivity;
    #endif
    #ifdef PrxB
        varying vec2 vUvClearcoat;
        uniform mat3 uvTransformClearcoat;
    #endif
    #ifdef PuNt
        varying vec2 vUvClearcoatRoughness;
        uniform mat3 uvTransformClearcoatRoughness;
    #endif
    #ifdef TZDa
        varying vec2 vUvClearcoatNormal;
        uniform mat3 uvTransformClearcoatNormal;
    #endif
    #ifdef JToV
        #if __VERSION__ < 300 && (! defined(HQS))
            varying vec2 vUvLight;
        #else
            centroid varying vec2 vUvLight;
        #endif
        uniform mat3 uvTransformLight;
    #endif
    #ifdef owgO
        varying vec2 vUvAO;
        uniform mat3 uvTransformAO;
    #endif
#endif

#ifdef DuyS
    uniform sampler2D displacementMap;
    uniform float displacementScale;
    uniform float displacementBias;
#endif
#if defined( DVzy )
    varying vec4 vColor;
    #elif defined( xGru ) || defined( uchG )
    varying vec3 vColor;
#endif
#ifdef RWEA
    varying float fogDepth;
#endif
#ifdef USE_MORPHTARGETS
    uniform float morphTargetBaseInfluence;
    #ifndef USE_MORPHNORMALS
        uniform float morphTargetInfluences[ 8 ];
    #else
        uniform float morphTargetInfluences[ 4 ];
    #endif
#endif
#ifdef TWik
    uniform mat4 bindMatrix;
    uniform mat4 bindMatrixInverse;
    uniform highp sampler2D boneTexture;
    uniform int boneTextureSize;
    mat4 getBoneMatrix( const in float i ) {
        float j = i * 4.0;
        float x = mod( j, float( boneTextureSize ) );
        float y = floor( j / float( boneTextureSize ) );
        float dx = 1.0 / float( boneTextureSize );
        float dy = 1.0 / float( boneTextureSize );
        y = dy * ( y + 0.5 );
        vec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );
        vec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );
        vec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );
        vec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );
        mat4 bone = mat4( v1, v2, v3, v4 );
        return bone;
    }
#endif
#ifdef nByF
    #if 0 > 0
        uniform mat4 directionalShadowMatrix[ 0 ];
        varying vec4 vDirectionalShadowCoord[ 0 ];
        struct DirectionalLightShadow {
            float shadowBias;
            float shadowNormalBias;
            float shadowRadius;
            vec2 shadowMapSize;
        };
        uniform DirectionalLightShadow directionalLightShadows[ 0 ];
    #endif
    #if 0 > 0
        uniform mat4 spotShadowMatrix[ 0 ];
        varying vec4 vSpotShadowCoord[ 0 ];
        struct SpotLightShadow {
            float shadowBias;
            float shadowNormalBias;
            float shadowRadius;
            vec2 shadowMapSize;
        };
        uniform SpotLightShadow spotLightShadows[ 0 ];
    #endif
    #if 0 > 0
        uniform mat4 pointShadowMatrix[ 0 ];
        varying vec4 vPointShadowCoord[ 0 ];
        struct PointLightShadow {
            float shadowBias;
            float shadowNormalBias;
            float shadowRadius;
            vec2 shadowMapSize;
            float shadowCameraNear;
            float shadowCameraFar;
        };
        uniform PointLightShadow pointLightShadows[ 0 ];
    #endif
#endif
#ifdef USE_LOGDEPTHBUF
    #ifdef USE_LOGDEPTHBUF_EXT
        varying float vFragDepth;
        varying float vIsPerspective;
    #else
        uniform float logDepthBufFC;
    #endif
#endif
#if 6 > 0
    varying vec3 vClipPosition;
#endif
void main() {
    #ifdef USE_UV
        #ifdef UVGD
            vec2 vUv = uvqo + uv * uvqm;
        #else
            vec2 vUv = uv;
        #endif
        #ifdef UV2GD
            vec2 vUv2 = uv2qo + uv2 * uv2qm;
        #else
            vec2 vUv2 = uv2;
        #endif
    #endif
    #ifdef ePky
        #ifdef MAP_UV2
            vUvMap = ( uvTransformMap * vec3( vUv2, 1 ) ).xy;
        #else
            vUvMap = ( uvTransformMap * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef oRrN
        #ifdef SPECULARMAP_UV2
            vUvSpecular = ( uvTransformSpecular * vec3( vUv2, 1 ) ).xy;
        #else
            vUvSpecular = ( uvTransformSpecular * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef TeIY
        #ifdef GLOSSINESSMAP_UV2
            vUvGlossiness = ( uvTransformGlossiness * vec3( vUv2, 1 ) ).xy;
        #else
            vUvGlossiness = ( uvTransformGlossiness * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef DuyS
        #ifdef DISPLACEMENTMAP_UV2
            vUvDisplacement = ( uvTransformDisplacement * vec3( vUv2, 1 ) ).xy;
        #else
            vUvDisplacement = ( uvTransformDisplacement * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef XOsC
        #ifdef NORMALMAP_UV2
            vUvNormal = ( uvTransformNormal * vec3( vUv2, 1 ) ).xy;
        #else
            vUvNormal = ( uvTransformNormal * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef YhJN
        #ifdef BUMPMAP_UV2
            vUvBump = ( uvTransformBump * vec3( vUv2, 1 ) ).xy;
        #else
            vUvBump = ( uvTransformBump * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef XXLK
        #ifdef ROUGHNESSMAP_UV2
            vUvRoughness = ( uvTransformRoughness * vec3( vUv2, 1 ) ).xy;
        #else
            vUvRoughness = ( uvTransformRoughness * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef pGHF
        #ifdef METALNESSMAP_UV2
            vUvMetalness = ( uvTransformMetalness * vec3( vUv2, 1 ) ).xy;
        #else
            vUvMetalness = ( uvTransformMetalness * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef cZYY
        #ifdef ALPHAMAP_UV2
            vUvAlpha = ( uvTransformAlpha * vec3( vUv2, 1 ) ).xy;
        #else
            vUvAlpha = ( uvTransformAlpha * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef tort
        #ifdef EMISSIVEMAP_UV2
            vUvEmissive = ( uvTransformEmissive * vec3( vUv2, 1 ) ).xy;
        #else
            vUvEmissive = ( uvTransformEmissive * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef yICh
        #ifdef TRANSMISSIONMAP_UV2
            vUvTransmission = ( uvTransformTransmission * vec3( vUv2, 1 ) ).xy;
        #else
            vUvTransmission = ( uvTransformTransmission * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef sFFv
        #ifdef REFLECTIVITYMAP_UV2
            vUvReflectivity = ( uvTransformReflectivity * vec3( vUv2, 1 ) ).xy;
        #else
            vUvReflectivity = ( uvTransformReflectivity * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef PrxB
        #ifdef CLEARCOATMAP_UV2
            vUvClearcoat = ( uvTransformClearcoat * vec3( vUv2, 1 ) ).xy;
        #else
            vUvClearcoat = ( uvTransformClearcoat * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef PuNt
        #ifdef CLEARCOAT_ROUGHNESSMAP_UV2
            vUvClearcoatRoughness = ( uvTransformClearcoatRoughness * vec3( vUv2, 1 ) ).xy;
        #else
            vUvClearcoatRoughness = ( uvTransformClearcoatRoughness * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef TZDa
        #ifdef CLEARCOAT_NORMALMAP_UV2
            vUvClearcoatNormal = ( uvTransformClearcoatNormal * vec3( vUv2, 1 ) ).xy;
        #else
            vUvClearcoatNormal = ( uvTransformClearcoatNormal * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef JToV
        #ifdef LIGHTMAP_UV2
            vUvLight = ( uvTransformLight * vec3( vUv2, 1 ) ).xy;
        #else
            vUvLight = ( uvTransformLight * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    #ifdef owgO
        #ifdef AOMAP_UV2
            vUvAO = ( uvTransformAO * vec3( vUv2, 1 ) ).xy;
        #else
            vUvAO = ( uvTransformAO * vec3( vUv, 1 ) ).xy;
        #endif
    #endif
    
    #if defined( DVzy )
        vColor = vec4( 1.0 );
        #elif defined( xGru ) || defined( uchG )
        vColor = vec3( 1.0 );
    #endif
    #ifdef xGru
        vColor *= color;
    #endif
    #ifdef uchG
        vColor.xyz *= instanceColor.xyz;
    #endif
    #ifdef NGD
        vec3 objectNormal = ngdf( normal.xy, nqr ).zxy;
    #else
        vec3 objectNormal = vec3( normal );
    #endif
    #ifdef USE_TANGENT
        vec3 objectTangent = vec3( tangent.xyz );
    #endif
    #ifdef USE_MORPHNORMALS
        objectNormal *= morphTargetBaseInfluence;
        objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
        objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
        objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
        objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
    #endif
    #ifdef TWik
        mat4 boneMatX = getBoneMatrix( skinIndex.x );
        mat4 boneMatY = getBoneMatrix( skinIndex.y );
        mat4 boneMatZ = getBoneMatrix( skinIndex.z );
        mat4 boneMatW = getBoneMatrix( skinIndex.w );
    #endif
    #ifdef TWik
        mat4 skinMatrix = mat4( 0.0 );
        skinMatrix += skinWeight.x * boneMatX;
        skinMatrix += skinWeight.y * boneMatY;
        skinMatrix += skinWeight.z * boneMatZ;
        skinMatrix += skinWeight.w * boneMatW;
        skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
        objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
        #ifdef USE_TANGENT
            objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
        #endif
    #endif
    vec3 transformedNormal = objectNormal;
    #ifdef USE_INSTANCING
        mat3 m = mat3( instanceMatrix );
        transformedNormal /= vec3( dot( m[ 0 ], m[ 0 ] ), dot( m[ 1 ], m[ 1 ] ), dot( m[ 2 ], m[ 2 ] ) );
        transformedNormal = m * transformedNormal;
        float instMatScaleSign = determinant(instanceMatrix);
        transformedNormal *= instMatScaleSign;
    #endif
    transformedNormal = normalMatrix * transformedNormal;
    #ifdef FLIP_SIDED
        transformedNormal = - transformedNormal;
    #endif
    #ifdef USE_TANGENT
        vec3 transformedTangent = ( modelViewMatrix * vec4( objectTangent, 0.0 ) ).xyz;
        #ifdef USE_INSTANCING
            transformedTangent *= instMatScaleSign;
        #endif
        #ifdef FLIP_SIDED
            transformedTangent = - transformedTangent;
        #endif
    #endif
    #ifndef FLAT_SHADED
        vNormal = normalize( transformedNormal );
        #ifdef USE_TANGENT
            vTangent = normalize( transformedTangent );
            vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
        #endif
    #endif
    vec3 transformed = vec3( position );
    #ifdef USE_MORPHTARGETS
        transformed *= morphTargetBaseInfluence;
        transformed += morphTarget0 * morphTargetInfluences[ 0 ];
        transformed += morphTarget1 * morphTargetInfluences[ 1 ];
        transformed += morphTarget2 * morphTargetInfluences[ 2 ];
        transformed += morphTarget3 * morphTargetInfluences[ 3 ];
        #ifndef USE_MORPHNORMALS
            transformed += morphTarget4 * morphTargetInfluences[ 4 ];
            transformed += morphTarget5 * morphTargetInfluences[ 5 ];
            transformed += morphTarget6 * morphTargetInfluences[ 6 ];
            transformed += morphTarget7 * morphTargetInfluences[ 7 ];
        #endif
    #endif
    #ifdef TWik
        vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
        vec4 skinned = vec4( 0.0 );
        skinned += boneMatX * skinVertex * skinWeight.x;
        skinned += boneMatY * skinVertex * skinWeight.y;
        skinned += boneMatZ * skinVertex * skinWeight.z;
        skinned += boneMatW * skinVertex * skinWeight.w;
        transformed = ( bindMatrixInverse * skinned ).xyz;
    #endif
    #ifdef DuyS
        transformed += normalize( objectNormal ) * ( displacementMapTexelToLinear( texture2D(displacementMap, vUvDisplacement) ).x * displacementScale + displacementBias );
    #endif
    vec4 mvPosition = vec4( transformed, 1.0 );
    #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
    #endif
    mvPosition = modelViewMatrix * mvPosition;
    gl_Position = projectionMatrix * mvPosition;
    #ifdef USE_LOGDEPTHBUF
        #ifdef USE_LOGDEPTHBUF_EXT
            vFragDepth = 1.0 + gl_Position.w;
            vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
        #else
            if ( isPerspectiveMatrix( projectionMatrix ) ) {
                gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
                gl_Position.z *= gl_Position.w;
            }
        #endif
    #endif
    #if 6 > 0
        vClipPosition = - mvPosition.xyz;
    #endif
    vViewPosition = - mvPosition.xyz;
    #if defined( ufeZ ) || defined( DISTANCE ) || defined ( nByF ) || defined ( HLxb ) || defined( DISSOLVE ) || defined( EPB )
        vec4 worldPosition = vec4( transformed, 1.0 );
        #ifdef USE_INSTANCING
            worldPosition = instanceMatrix * worldPosition;
        #endif
        worldPosition = modelMatrix * worldPosition;
        #ifdef VC_HAD_vWorldPosition
            vWorldPosition = worldPosition;
        #endif
    #endif
    #ifdef nByF
        #if 0 > 0 || 0 > 0 || 0 > 0
            vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
            vec4 shadowWorldPosition;
        #endif
        #if 0 > 0
            
        #endif
        #if 0 > 0
            
        #endif
        #if 0 > 0
            
        #endif
    #endif
    #ifdef RWEA
        fogDepth = - mvPosition.z;
    #endif
}
