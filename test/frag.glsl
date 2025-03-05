#version 300 es
#define varying in
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#define gl_FragDepthEXT gl_FragDepth
#define texture2D texture
#define textureCube texture
#define texture2DProj textureProj
#define texture2DLodEXT textureLod
#define texture2DProjLodEXT textureProjLod
#define textureCubeLodEXT textureLod
#define texture2DGradEXT textureGrad
#define texture2DProjGradEXT textureProjGrad
#define textureCubeGradEXT textureGrad
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
#define GAMMA_FACTOR 2.200000047683716
#define gIxV
#define ufeZ
#define ubTV
#define UNSC
#define lnPt
#define EPB
#define JToV
#define LIGHTMAP_UV2
#define VC_F_T
#define USE_UV
#define DISSOLVE
#define riRU
#define PP_BURN
#define PP_TEMP
#define PP_SAT
#define PP_LUT
#define LUT_PRECISION_HIGH 1
#define LUT_3D 1
#define Frdd
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
#define NrYx
#ifndef saturate
    #define saturate(a) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
uniform float toneMappingOpacity;
#ifdef DISSOLVE
    #ifndef VC_HAD_vWorldPosition
        varying vec4 vWorldPosition;
        #define VC_HAD_vWorldPosition
    #endif
    uniform float dissolveFactor;
    uniform float dissolveMaxDist;
    uniform vec3 dissolveOrigin;
#endif
vec3 LinearToneMapping( vec3 color ) {
    return toneMappingExposure * color;
}
vec3 ReinhardToneMapping( vec3 color ) {
    color *= toneMappingExposure;
    return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 UCM(vec3 x, float P, float a, float m, float l, float c, float b) {
    float l0 = ((P - m) * l) / a;
    float L0 = m - m / a;
    float L1 = m + (1.0 - m) / a;
    float S0 = m + l0;
    float S1 = m + a * l0;
    float C2 = (a * P) / (P - S1);
    float CP = -C2 / P;
    vec3 w0 = 1.0 - smoothstep(0.0, m, x);
    vec3 w2 = step(m + l0, x);
    vec3 w1 = 1.0 - w0 - w2;
    vec3 T = m * pow(x / m, vec3(c)) + b;
    vec3 S = P - (P - S1) * exp(CP * (x - S0));
    vec3 L = m + a * (x - m);
    return T * w0 + L * w1 + S * w2;
}
vec3 V4ToneMapping( vec3 color ) {
    color *= toneMappingExposure;
    const float P = 1.0;
    const float a = 1.0;
    const float m = 0.001;
    const float l = 0.75;
    const float c = 1.0;
    const float b = 0.0;
    return UCM(color, P, a, m, l, c, b);
}
vec3 V4DimmerToneMapping( vec3 color ) {
    color *= toneMappingExposure;
    const float P = 1.0;
    const float a = 1.0;
    const float m = 0.001;
    const float l = 0.5;
    const float c = 1.0;
    const float b = 0.0;
    return UCM(color, P, a, m, l, c, b);
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
    color *= toneMappingExposure;
    color = max( vec3( 0.0 ), color - 0.004 );
    return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
    vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
    vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
    return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
    const mat3 ACESInputMat = mat3(
    vec3( 0.59719, 0.07600, 0.02840 ), vec3( 0.35458, 0.90834, 0.13383 ), vec3( 0.04823, 0.01566, 0.83777 )
    );
    const mat3 ACESOutputMat = mat3(
    vec3(	1.60475, -0.10208, -0.00327 ), vec3( -0.53108, 1.10813, -0.07276 ), vec3( -0.07367, -0.00605, 1.07602 )
    );
    color *= toneMappingExposure / 0.6;
    color = ACESInputMat * color;
    color = RRTAndODTFit( color );
    color = ACESOutputMat * color;
    return saturate( color );
}
vec3 CustomToneMapping( vec3 color ) {
    return color;
}
#if defined( NrYx )
    uniform float ppCst;
    #if defined( PP_BURN )
        uniform float ppBurn;
        vec3 rh(vec3 color, float b) {
            return (color * (vec3(1.0) + color / (b * b))) / (vec3(1.0) + color);
        }
    #endif
    #if defined( PP_TEMP )
        uniform float ppTemp;
        vec3 colorTemperatureToRGB(const in float temperature) {
            mat3 m = (temperature <= 6500.0) ? mat3(vec3(0.0, -2902.1955373783176, -8257.7997278925690), vec3(0.0, 1669.5803561666639, 2575.2827530017594), vec3(1.0, 1.3302673723350029, 1.8993753891711275)) :
            mat3(vec3(1745.0425298314172, 1216.6168361476490, -8257.7997278925690), vec3(-2666.3474220535695, -2173.1012343082230, 2575.2827530017594), vec3(0.55995389139931482, 0.70381203140554553, 1.8993753891711275));
            return mix(clamp(vec3(m[0] / (vec3(clamp(temperature, 1000.0, 40000.0)) + m[1]) + m[2]), vec3(0.0), vec3(1.0)), vec3(1.0), smoothstep(1000.0, 0.0, temperature));
        }
    #endif
    #if defined( PP_SAT )
        uniform float ppSat;
        vec3 applySaturation(vec3 rgb, float adjustment) {
            const vec3 W = vec3(0.2125, 0.7154, 0.0721);
            vec3 intensity = vec3(dot(rgb, W));
            return mix(intensity, rgb, adjustment);
        }
    #endif
#endif
#ifdef PP_LUT
    uniform vec3 ppLUTScale;
    uniform vec3 ppLUTOffset;
    uniform float ppLUTOpacity;
    uniform float ppLUTSize;
    uniform float ppLUTTexelWidth;
    uniform float ppLUTTexelHeight;
    #ifdef CUSTOM_INPUT_DOMAIN
        uniform vec3 ppLUTDomainMin;
        uniform vec3 ppLUTDomainMax;
    #endif
    #ifdef LUT_3D
        #ifdef LUT_PRECISION_HIGH
            #ifdef GL_FRAGMENT_PRECISION_HIGH
                uniform highp sampler3D ppLUT;
            #else
                uniform mediump sampler3D ppLUT;
            #endif
        #else
            uniform lowp sampler3D ppLUT;
        #endif
        vec4 applyLUT(const in vec3 rgb) {
            #ifdef TETRAHEDRAL_INTERPOLATION
                vec3 p = floor(rgb);
                vec3 f = rgb - p;
                vec3 v1 = (p + 0.5) * LUT_TEXEL_WIDTH;
                vec3 v4 = (p + 1.5) * LUT_TEXEL_WIDTH;
                vec3 v2, v3;
                vec3 frac;
                if(f.r >= f.g) {
                    if(f.g > f.b) {
                        frac = f.rgb;
                        v2 = vec3(v4.x, v1.y, v1.z);
                        v3 = vec3(v4.x, v4.y, v1.z);
                    }
                    else if(f.r >= f.b) {
                        frac = f.rbg;
                        v2 = vec3(v4.x, v1.y, v1.z);
                        v3 = vec3(v4.x, v1.y, v4.z);
                    }
                    else {
                        frac = f.brg;
                        v2 = vec3(v1.x, v1.y, v4.z);
                        v3 = vec3(v4.x, v1.y, v4.z);
                    }
            
                }
                else {
                    if(f.b > f.g) {
                        frac = f.bgr;
                        v2 = vec3(v1.x, v1.y, v4.z);
                        v3 = vec3(v1.x, v4.y, v4.z);
                    }
                    else if(f.r >= f.b) {
                        frac = f.grb;
                        v2 = vec3(v1.x, v4.y, v1.z);
                        v3 = vec3(v4.x, v4.y, v1.z);
                    }
                    else {
                        frac = f.gbr;
                        v2 = vec3(v1.x, v4.y, v1.z);
                        v3 = vec3(v1.x, v4.y, v4.z);
                    }
            
                }
                vec4 n1 = texture(ppLUT, v1);
                vec4 n2 = texture(ppLUT, v2);
                vec4 n3 = texture(ppLUT, v3);
                vec4 n4 = texture(ppLUT, v4);
                vec4 weights = vec4(
                1.0 - frac.x, frac.x - frac.y, frac.y - frac.z, frac.z
                );
                vec4 result = weights * mat4(
                vec4(n1.r, n2.r, n3.r, n4.r), vec4(n1.g, n2.g, n3.g, n4.g), vec4(n1.b, n2.b, n3.b, n4.b), vec4(1.0)
                );
                return vec4(result.rgb, 1.0);
            #else
                return texture(ppLUT, rgb);
            #endif
        }
    #else
        #ifdef LUT_PRECISION_HIGH
            #ifdef GL_FRAGMENT_PRECISION_HIGH
                uniform highp sampler2D ppLUT;
            #else
                uniform mediump sampler2D ppLUT;
            #endif
        #else
            uniform lowp sampler2D ppLUT;
        #endif
        vec4 applyLUT(const in vec3 rgb) {
            float slice = rgb.b * ppLUTSize;
            float slice0 = floor(slice);
            float interp = slice - slice0;
            float centeredInterp = interp - 0.5;
            float slice1 = slice0 + sign(centeredInterp);
            #ifdef LUT_STRIP_HORIZONTAL
                float xOffset = clamp(
                rgb.r * ppLUTTexelHeight, ppLUTTexelWidth * 0.5, ppLUTTexelHeight - ppLUTTexelWidth * 0.5
                );
                vec2 uv0 = vec2(slice0 * ppLUTTexelHeight + xOffset, rgb.g);
                vec2 uv1 = vec2(slice1 * ppLUTTexelHeight + xOffset, rgb.g);
            #else
                float yOffset = clamp(
                rgb.g * ppLUTTexelWidth, ppLUTTexelHeight * 0.5, ppLUTTexelWidth - ppLUTTexelHeight * 0.5
                );
                vec2 uv0 = vec2(rgb.r, slice0 * ppLUTTexelWidth + yOffset);
                vec2 uv1 = vec2(rgb.r, slice1 * ppLUTTexelWidth + yOffset);
            #endif
            vec4 sample0 = texture2D(ppLUT, uv0);
            vec4 sample1 = texture2D(ppLUT, uv1);
            return mix(sample0, sample1, abs(centeredInterp));
        }
    #endif
#endif
vec3 toneMapping( vec3 color ) {
    return LinearToneMapping( color );
}
vec4 LinearToLinear( in vec4 value ) {
    return value;
}
vec4 GammaToLinear( in vec4 value, in float gammaFactor ) {
    return vec4( pow( value.rgb, vec3( gammaFactor ) ), value.a );
}
vec4 LinearToGamma( in vec4 value, in float gammaFactor ) {
    return vec4( pow( value.rgb, vec3( 1.0 / gammaFactor ) ), value.a );
}
vec4 sRGBToLinear( in vec4 value ) {
    return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 LinearTosRGB( in vec4 value ) {
    return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 RGBEToLinear( in vec4 value ) {
    return vec4( value.rgb * exp2( value.a * 255.0 - 128.0 ), 1.0 );
}
vec4 LinearToRGBE( in vec4 value ) {
    float maxComponent = max( max( value.r, value.g ), value.b );
    float fExp = clamp( ceil( log2( maxComponent ) ), -128.0, 127.0 );
    return vec4( value.rgb / exp2( fExp ), ( fExp + 128.0 ) / 255.0 );
}
vec4 RMToLinear( in vec4 value, in float maxRange ) {
    return vec4( value.rgb * value.a * maxRange, 1.0 );
}
vec4 LinearToRM( in vec4 value, in float maxRange ) {
    float maxRGB = max( value.r, max( value.g, value.b ) );
    float M = clamp( maxRGB / maxRange, 0.0, 1.0 );
    M = ceil( M * 255.0 ) / 255.0;
    return vec4( value.rgb / ( M * maxRange ), M );
}
vec4 RGBDToLinear( in vec4 value, in float maxRange ) {
    return vec4( value.rgb * ( ( maxRange / 255.0 ) / value.a ), 1.0 );
}
vec4 LinearToRGBD( in vec4 value, in float maxRange ) {
    float maxRGB = max( value.r, max( value.g, value.b ) );
    float D = max( maxRange / maxRGB, 1.0 );
    D = clamp( floor( D ) / 255.0, 0.0, 1.0 );
    return vec4( value.rgb * ( D * ( 255.0 / maxRange ) ), D );
}
vec4 MultiplyToLinear( in vec4 value, in float factor ) {
    return vec4( value.rgb * factor, value.a );
}
vec4 LinearToMultiply( in vec4 value, in float factor ) {
    return value;
    return vec4( value.rgb / factor, value.a );
}
vec4 HCToLinear( in vec4 value, in float bf ) {
    vec3 x = value.rgb;
    vec3 b = vec3(bf);
    x = max( vec3(0.0), b * (vec3(0.5) * sqrt(pow(b, vec3(2)) * pow((x-vec3(1)), vec3(2)) + vec3(4)*x) + b * (vec3(0.5) * x - vec3(0.5))) );
    return vec4(x, value.a);
}
vec4 RCToLinear( in vec4 value, in float factor, in float bf ) {
    return HCToLinear(RMToLinear(value, factor), bf);
}
vec4 MHToLinear( in vec4 value, in float M, in float H ) {
    return GammaToLinear(HCToLinear(value, H)/M, 2.2);
}
vec4 ATLToLinear( in vec4 value, in float a, in float b ) {
    vec4 v = value;
    v.r = value.b;
    v.b = value.r;
    v.rgb = (v.rgb * (b - a) + a);
    return v;
}
const mat3 cLogLuvM = mat3( 0.2209, 0.3390, 0.4184, 0.1138, 0.6780, 0.7319, 0.0102, 0.1130, 0.2969 );
vec4 LinearToLogLuv( in vec4 value ) {
    vec3 Xp_Y_XYZp = cLogLuvM * value.rgb;
    Xp_Y_XYZp = max( Xp_Y_XYZp, vec3( 1e-6, 1e-6, 1e-6 ) );
    vec4 vResult;
    vResult.xy = Xp_Y_XYZp.xy / Xp_Y_XYZp.z;
    float Le = 2.0 * log2(Xp_Y_XYZp.y) + 127.0;
    vResult.w = fract( Le );
    vResult.z = ( Le - ( floor( vResult.w * 255.0 ) ) / 255.0 ) / 255.0;
    return vResult;
}
const mat3 cLogLuvInverseM = mat3( 6.0014, -2.7008, -1.7996, -1.3320, 3.1029, -5.7721, 0.3008, -1.0882, 5.6268 );
vec4 LogLuvToLinear( in vec4 value ) {
    float Le = value.z * 255.0 + value.w;
    vec3 Xp_Y_XYZp;
    Xp_Y_XYZp.y = exp2( ( Le - 127.0 ) / 2.0 );
    Xp_Y_XYZp.z = Xp_Y_XYZp.y / value.y;
    Xp_Y_XYZp.x = value.x * Xp_Y_XYZp.z;
    vec3 vRGB = cLogLuvInverseM * Xp_Y_XYZp.rgb;
    return vec4( max( vRGB, 0.0 ), 1.0 );
}
vec4 lcTexelToLinear ( vec4 value ) {
    return sRGBToLinear ( value );
}
vec4 envMapTexelToLinear ( vec4 value ) {
    return MultiplyToLinear ( value, 3.0 );
}
vec4 lightMapTexelToLinear ( vec4 value ) {
    return RCToLinear ( value, 7.0, 4.0 );
}
vec4 aoMapTexelToLinear ( vec4 value ) {
    return LinearToLinear ( value );
}
vec4 bumpMapTexelToLinear ( vec4 value ) {
    return LinearToLinear ( value );
}
vec4 normalMapTexelToLinear ( vec4 value ) {
    return LinearToLinear ( value );
}
vec4 reflectivityMapTexelToLinear ( vec4 value ) {
    return LinearToLinear ( value );
}
vec4 clearcoatMapTexelToLinear ( vec4 value ) {
    return LinearToLinear ( value );
}
vec4 clearcoatRoughnessMapTexelToLinear ( vec4 value ) {
    return LinearToLinear ( value );
}
vec4 clearcoatNormalMapTexelToLinear ( vec4 value ) {
    return LinearToLinear ( value );
}
vec4 displacementMapTexelToLinear ( vec4 value ) {
    return LinearToLinear ( value );
}
vec4 glossinessMapTexelToLinear ( vec4 value ) {
    return LinearToLinear ( value );
}
vec4 roughnessMapTexelToLinear ( vec4 value ) {
    return LinearToLinear ( value );
}
vec4 metalnessMapTexelToLinear ( vec4 value ) {
    return LinearToLinear ( value );
}
vec4 alphaMapTexelToLinear ( vec4 value ) {
    return LinearToLinear ( value );
}
vec4 transmissionMapTexelToLinear ( vec4 value ) {
    return LinearToLinear ( value );
}
vec4 thicknessMapTexelToLinear ( vec4 value ) {
    return LinearToLinear ( value );
}
vec4 linearToOutputTexel( vec4 value ) {
    return LinearToLinear( value );
}
#define STANDARD
#define YqTV
#ifdef PHYSICAL
    #define HpCw
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float glossiness;
uniform float metalness;
uniform vec3 specular;
uniform float opacity;
#ifdef HLxb
    uniform float transmission;
    uniform float thickness;
    uniform vec3 attenuationColor;
    uniform float attenuationDistance;
#endif
#if defined( HLxb ) || defined( EPB ) || defined( DISSOLVE )
    #ifndef VC_HAD_vWorldPosition
        varying vec4 vWorldPosition;
        #define VC_HAD_vWorldPosition
    #endif
#endif
#ifdef YqTV
    uniform float reflectivity;
#endif
#ifdef HpCw
    uniform float clearcoat;
    uniform float clearcoatRoughness;
#endif
#ifdef entC
    uniform vec3 sheen;
    uniform float sheenRoughness;
#endif
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
    varying vec3 vNormal;
    #ifdef USE_TANGENT
        varying vec3 vTangent;
        varying vec3 vBitangent;
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
vec3 packNormalToRGB( const in vec3 normal ) {
    return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
    return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;
const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
    vec4 r = vec4( fract( v * PackFactors ), v );
    r.yzw -= r.xyz * ShiftRight8;
    return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
    return dot( v, UnpackFactors );
}
vec4 pack2HalfToRGBA( vec2 v ) {
    vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ));
    return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w);
}
vec2 unpackRGBATo2Half( vec4 v ) {
    return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
    return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float linearClipZ, const in float near, const in float far ) {
    return linearClipZ * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
    return (( near + viewZ ) * far ) / (( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far ) {
    return ( near * far ) / ( ( far - near ) * invClipZ - far );
}
#ifdef ueCh
    vec3 dithering( vec3 color ) {
        float grid_position = rand( gl_FragCoord.xy );
        vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
        dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
        return color + dither_shift_RGB;
    }
#endif
#if defined( DVzy )
    varying vec4 vColor;
    #elif defined( xGru )
    varying vec3 vColor;
#endif
#if ( defined( USE_UV ) && ! defined( UVS_VERTEX_ONLY ) )
    #ifdef ePky
        varying vec2 vUvMap;
    #endif
    #ifdef oRrN
        varying vec2 vUvSpecular;
    #endif
    #ifdef TeIY
        varying vec2 vUvGlossiness;
    #endif
    #ifdef DuyS
        varying vec2 vUvDisplacement;
    #endif
    #ifdef XOsC
        varying vec2 vUvNormal;
    #endif
    #ifdef YhJN
        varying vec2 vUvBump;
    #endif
    #ifdef XXLK
        varying vec2 vUvRoughness;
    #endif
    #ifdef pGHF
        varying vec2 vUvMetalness;
    #endif
    #ifdef cZYY
        varying vec2 vUvAlpha;
    #endif
    #ifdef tort
        varying vec2 vUvEmissive;
    #endif
    #ifdef yICh
        varying vec2 vUvTransmission;
    #endif
    #ifdef sFFv
        varying vec2 vUvReflectivity;
    #endif
    #ifdef PrxB
        varying vec2 vUvClearcoat;
    #endif
    #ifdef PuNt
        varying vec2 vUvClearcoatRoughness;
    #endif
    #ifdef TZDa
        varying vec2 vUvClearcoatNormal;
    #endif
    #ifdef JToV
        #if __VERSION__ < 300	&& (! defined(HQS))
            varying vec2 vUvLight;
        #else
            centroid varying vec2 vUvLight;
        #endif
    #endif
    #ifdef owgO
        varying vec2 vUvAO;
    #endif
#endif

#ifdef ePky
    uniform sampler2D map;
    uniform float mapAmount;
    uniform float diffuseMapIntensity;
#endif
#ifdef cZYY
    uniform sampler2D alphaMap;
    uniform float alphaMapAmount;
#endif
#ifdef owgO
    uniform sampler2D aoMap;
    uniform float aoMapIntensity;
#endif
#ifdef JToV
    uniform sampler2D lightMap;
    uniform float lightMapIntensity;
    uniform float lightMapContrast;
    uniform vec2 lmR;
#endif
#ifdef tort
    uniform sampler2D emissiveMap;
#endif
#ifdef FsPb
    uniform float iblIntensity;
    uniform float iblContrast;
#endif
#ifdef gIxV
    uniform sampler2D lc;
    uniform float lcIntensity;
    uniform float lcContrast;
#endif
#ifdef VC_F_T
    #ifdef yICh
        uniform sampler2D transmissionMap;
        uniform float transmissionMapAmount;
    #endif
#endif
#ifndef VC_F_T
    #ifdef HLxb
        #ifdef yICh
            uniform sampler2D transmissionMap;
        #endif
        #ifdef LGWi
            uniform sampler2D thicknessMap;
        #endif
        uniform vec2 transmissionSamplerSize;
        uniform sampler2D transmissionSamplerMap;
        uniform mat4 modelMatrix;
        uniform mat4 projectionMatrix;
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
            return texture2DLodEXT(transmissionSamplerMap, fragCoord.xy, framebufferLod).rgb;
        }
        vec3 applyVolumeAttenuation(vec3 radiance, float transmissionDistance, vec3 attenuationColor, float attenuationDistance) {
            if (attenuationDistance == 0.0) {
                return radiance;
            }
            else {
                vec3 attenuationCoefficient = -log(attenuationColor) / attenuationDistance;
                vec3 transmittance = exp(-attenuationCoefficient * transmissionDistance);
                return transmittance * radiance;
            }
        
        }
        vec3 getIBLVolumeRefraction(vec3 n, vec3 v, float perceptualRoughness, vec3 baseColor, vec3 specularColor, vec3 position, mat4 modelMatrix, mat4 viewMatrix, mat4 projMatrix, float ior, float thickness, vec3 attenuationColor, float attenuationDistance) {
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
#endif
vec2 integrateSpecularBRDF( const in float dotNV, const in float roughness ) {
    const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
    const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
    vec4 r = roughness * c0 + c1;
    float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
    return vec2( -1.04, 1.04 ) * a004 + r.zw;
}
float punctualLightIntensityToIrradianceFactor( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
    #if defined ( Tbsr )
        float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
        if( cutoffDistance > 0.0 ) {
            distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
        }
        return distanceFalloff;
    #else
        if( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
            return pow( saturate( -lightDistance / cutoffDistance + 1.0 ), decayExponent );
        }
        return 1.0;
    #endif
}
vec3 BRDF_Diffuse_Lambert( const in vec3 diffuseColor ) {
    return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 specularColor, const in float F90, const in float dotVH ) {
    float fresnel = exp2( ( -5.55473 * dotVH - 6.98316 ) * dotVH );
    return ( F90 - specularColor ) * fresnel + specularColor;
}
vec3 F_Schlick_RoughnessDependent( const in vec3 F0, const in float F90, const in float dotNV, const in float roughness ) {
    float fresnel = exp2( ( -5.55473 * dotNV - 6.98316 ) * dotNV );
    vec3 Fr = max( vec3( F90 - roughness ), F0 ) - F0;
    return Fr * fresnel + F0;
}
float getFresnelFor_F_Schlick_RoughnessDependent( const in float dotNV ) {
    return exp2( ( -5.55473 * dotNV - 6.98316 ) * dotNV );
}
vec3 givenFresnel_F_Schlick_RoughnessDependent( const in vec3 F0, const in float fresnel, const in float roughness ) {
    vec3 Fr = max( vec3( 1.0 - roughness ), F0 ) - F0;
    return Fr * fresnel + F0;
}
float G_GGX_Smith( const in float alpha, const in float dotNL, const in float dotNV ) {
    float a2 = pow2( alpha );
    float gl = dotNL + sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
    float gv = dotNV + sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
    return 1.0 / ( gl * gv );
}
float G_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
    float a2 = pow2( alpha );
    float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
    float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
    return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
    float a2 = pow2( alpha );
    float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
    return RECIPROCAL_PI * a2 / pow2( denom );
}
vec3 BRDF_Specular_GGX( const in IncidentLight incidentLight, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float F90, const in float roughness ) {
    float alpha = pow2( roughness );
    vec3 halfDir = normalize( incidentLight.direction + viewDir );
    float dotNL = saturate( dot( normal, incidentLight.direction ) );
    float dotNV = saturate( dot( normal, viewDir ) );
    float dotNH = saturate( dot( normal, halfDir ) );
    float dotLH = saturate( dot( incidentLight.direction, halfDir ) );
    vec3 F = F_Schlick( specularColor, F90, dotLH );
    float G = G_GGX_SmithCorrelated( alpha, dotNL, dotNV );
    float D = D_GGX( alpha, dotNH );
    return F * ( G * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
    const float LUT_SIZE = 64.0;
    const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
    const float LUT_BIAS = 0.5 / LUT_SIZE;
    float dotNV = saturate( dot( N, V ) );
    vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
    uv = uv * LUT_SCALE + LUT_BIAS;
    return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
    float l = length( f );
    return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
    float x = dot( v1, v2 );
    float y = abs( x );
    float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
    float b = 3.4175940 + ( 4.1616724 + y ) * y;
    float v = a / b;
    float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
    return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
    vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
    vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
    vec3 lightNormal = cross( v1, v2 );
    if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
    vec3 T1, T2;
    T1 = normalize( V - N * dot( V, N ) );
    T2 = - cross( N, T1 );
    mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
    vec3 coords[ 4 ];
    coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
    coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
    coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
    coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
    coords[ 0 ] = normalize( coords[ 0 ] );
    coords[ 1 ] = normalize( coords[ 1 ] );
    coords[ 2 ] = normalize( coords[ 2 ] );
    coords[ 3 ] = normalize( coords[ 3 ] );
    vec3 vectorFormFactor = vec3( 0.0 );
    vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
    vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
    vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
    vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
    float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
    return vec3( result );
}
vec3 BRDF_Specular_GGX_Environment( const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float roughness ) {
    float dotNV = saturate( dot( normal, viewDir ) );
    vec2 brdf = integrateSpecularBRDF( dotNV, roughness );
    return specularColor * brdf.x + brdf.y;
}
#define HAS_GLOBALF
vec3 globalF;
float globalFresnelSchlick;
void BRDF_Specular_Multiscattering_Environment( const in GeometricContext geometry, const in vec3 specularColor, const in vec3 reflectivityColor, const in float F90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
    float dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );
    globalF = F_Schlick_RoughnessDependent( reflectivityColor, F90, dotNV, roughness );
    vec2 brdf = integrateSpecularBRDF( dotNV, roughness );
    vec3 FssEss = (globalF * brdf.x + brdf.y) * specularColor;
    float Ess = brdf.x + brdf.y;
    float Ems = 1.0 - Ess;
    vec3 Favg = specularColor + ( 1.0 - specularColor ) * 0.047619;
    vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
    singleScatter += FssEss;
    multiScatter += (Fms * Ems) * specularColor;
}
float G_BlinnPhong_Implicit( ) {
    return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
    return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_Specular_BlinnPhong( const in IncidentLight incidentLight, const in GeometricContext geometry, const in vec3 specularColor, const in float shininess ) {
    vec3 halfDir = normalize( incidentLight.direction + geometry.viewDir );
    float dotNH = saturate( dot( geometry.normal, halfDir ) );
    float dotLH = saturate( dot( incidentLight.direction, halfDir ) );
    vec3 F = F_Schlick( specularColor, 1.0, dotLH );
    float G = G_BlinnPhong_Implicit( );
    float D = D_BlinnPhong( shininess, dotNH );
    return F * ( G * D );
}
float GGXRoughnessToBlinnExponent( const in float ggxRoughness ) {
    return ( 2.0 / pow2( ggxRoughness + 0.0001 ) - 2.0 );
}
float BlinnExponentToGGXRoughness( const in float blinnExponent ) {
    return sqrt( 2.0 / ( blinnExponent + 2.0 ) );
}
#if defined( entC )
    float D_Charlie(float roughness, float NoH) {
        float invAlpha = 1.0 / roughness;
        float cos2h = NoH * NoH;
        float sin2h = max(1.0 - cos2h, 0.0078125);
        return (2.0 + invAlpha) * pow(sin2h, invAlpha * 0.5) / (2.0 * PI);
    }
    float V_Neubelt(float NoV, float NoL) {
        return saturate(1.0 / (4.0 * (NoL + NoV - NoL * NoV)));
    }
    vec3 BRDF_Specular_Sheen( const in float roughness, const in vec3 L, const in GeometricContext geometry, vec3 specularColor ) {
        vec3 N = geometry.normal;
        vec3 V = geometry.viewDir;
        vec3 H = normalize( V + L );
        float dotNH = saturate( dot( N, H ) );
        return specularColor * D_Charlie( roughness, dotNH );
    }
#endif
#ifdef bCRD
    #define cubeUV_maxMipLevel 8.0
    #define cubeUV_minMipLevel 4.0
    #define cubeUV_maxTileSize 256.0
    #define cubeUV_minTileSize 16.0
    float getFace( vec3 direction ) {
        vec3 absDirection = abs( direction );
        float face = - 1.0;
        if ( absDirection.x > absDirection.z ) {
            if ( absDirection.x > absDirection.y )
            face = direction.x > 0.0 ? 0.0 : 3.0;
            else
            face = direction.y > 0.0 ? 1.0 : 4.0;
        }
        else {
            if ( absDirection.z > absDirection.y )
            face = direction.z > 0.0 ? 2.0 : 5.0;
            else
            face = direction.y > 0.0 ? 1.0 : 4.0;
        }
        return face;
    }
    vec2 getUV( vec3 direction, float face ) {
        vec2 uv;
        if ( face == 0.0 ) {
            uv = vec2( direction.z, direction.y ) / abs( direction.x );
        }
        else if ( face == 1.0 ) {
            uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
        }
        else if ( face == 2.0 ) {
            uv = vec2( - direction.x, direction.y ) / abs( direction.z );
        }
        else if ( face == 3.0 ) {
            uv = vec2( - direction.z, direction.y ) / abs( direction.x );
        }
        else if ( face == 4.0 ) {
            uv = vec2( - direction.x, direction.z ) / abs( direction.y );
        }
        else {
            uv = vec2( direction.x, direction.y ) / abs( direction.z );
        }
        return 0.5 * ( uv + 1.0 );
    }
    vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
        float face = getFace( direction );
        float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
        mipInt = max( mipInt, cubeUV_minMipLevel );
        float faceSize = exp2( mipInt );
        float texelSize = 1.0 / ( 3.0 * cubeUV_maxTileSize );
        vec2 uv = getUV( direction, face ) * ( faceSize - 1.0 );
        vec2 f = fract( uv );
        uv += 0.5 - f;
        if ( face > 2.0 ) {
            uv.y += faceSize;
            face -= 3.0;
        }
        uv.x += face * faceSize;
        if ( mipInt < cubeUV_maxMipLevel ) {
            uv.y += 2.0 * cubeUV_maxTileSize;
        }
        uv.y += filterInt * 2.0 * cubeUV_minTileSize;
        uv.x += 3.0 * max( 0.0, cubeUV_maxTileSize - 2.0 * faceSize );
        uv *= texelSize;
        vec3 tl = envMapTexelToLinear( texture2D( envMap, uv ) ).rgb;
        uv.x += texelSize;
        vec3 tr = envMapTexelToLinear( texture2D( envMap, uv ) ).rgb;
        uv.y += texelSize;
        vec3 br = envMapTexelToLinear( texture2D( envMap, uv ) ).rgb;
        uv.x -= texelSize;
        vec3 bl = envMapTexelToLinear( texture2D( envMap, uv ) ).rgb;
        vec3 tm = mix( tl, tr, f.x );
        vec3 bm = mix( bl, br, f.x );
        return mix( tm, bm, f.y );
    }
    #define r0 1.0
    #define v0 0.339
    #define m0 - 2.0
    #define r1 0.8
    #define v1 0.276
    #define m1 - 1.0
    #define r4 0.4
    #define v4 0.046
    #define m4 2.0
    #define r5 0.305
    #define v5 0.016
    #define m5 3.0
    #define r6 0.21
    #define v6 0.0038
    #define m6 4.0
    float roughnessToMip( float roughness ) {
        float mip = 0.0;
        if ( roughness >= r1 ) {
            mip = ( r0 - roughness ) * ( m1 - m0 ) / ( r0 - r1 ) + m0;
        }
        else if ( roughness >= r4 ) {
            mip = ( r1 - roughness ) * ( m4 - m1 ) / ( r1 - r4 ) + m1;
        }
        else if ( roughness >= r5 ) {
            mip = ( r4 - roughness ) * ( m5 - m4 ) / ( r4 - r5 ) + m4;
        }
        else if ( roughness >= r6 ) {
            mip = ( r5 - roughness ) * ( m6 - m5 ) / ( r5 - r6 ) + m5;
        }
        else {
            mip = - 2.0 * log2( 1.16 * roughness );
        }
        return mip;
    }
    vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
        float mip = clamp( roughnessToMip( roughness ), m0, cubeUV_maxMipLevel );
        float mipF = fract( mip );
        float mipInt = floor( mip );
        vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
        if ( mipF == 0.0 ) {
            return vec4( color0, 1.0 );
        }
        else {
            vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
            return vec4( mix( color0, color1, mipF ), 1.0 );
        }
    
    }
#endif
#ifdef ufeZ
    uniform float envMapIntensity;
    uniform float envMapContrast;
    uniform float flipEnvMap;
    uniform int maxMipLevel;
    #ifdef ubTV
        uniform samplerCube ema[3];
    #else
        uniform sampler2D ema[3];
    #endif
    #ifdef EPB
        uniform bool embp[3];
        uniform vec3 emc[3];
        uniform vec3 emcp[3];
        uniform vec3 ems[3];
        uniform vec3 emis[3];
        uniform vec3 emio[3];
        const vec3 djE1 = vec3(1000.0);
        vec3 crn( vec3 djE2, vec3 djE3, vec3 djE4, vec3 djE5, vec3 djIw ) {
            vec3 djIx = djE4 * 0.5;
            vec3 djIy = (djE5 + djIx - djE3) / djE2;
            vec3 djIz = (djE5 - djIx - djE3) / djE2;
            vec3 djI0 = max(djIy, djIz);
            vec3 djI1 = step(0.0, -djI0) * djE1 + abs(djI0);
            float distance = min(min(djI1.x, djI1.y), djI1.z);
            vec3 djI2 = djE3 + djE2 * distance;
            return djI2 - djIw;
        }
        float gbi(vec3 djI4, vec3 djI5, vec3 innerSize, vec3 djM1) {
            vec3 djMw = innerSize / 2.0;
            vec3 djMx = djM1 / 2.0;
            vec3 djMy = djI4 - djI5;
            vec3 djMz = vec3(abs(djMy.x), abs(djMy.y), abs(djMy.z));
            djMz = (djMz - djMw) / (djMx - djMw);
            return max(djMz.x, max(djMz.y, djMz.z));
        }
    #endif
#endif
#if defined( ufeZ )
    #ifdef EPB
        #ifndef VC_HAD_vWorldPosition
            varying vec4 vWorldPosition;
            #define VC_HAD_vWorldPosition
        #endif
    #endif
    #ifdef gQgK
        uniform float refractionRatio;
    #endif
    vec3 bPhf( const in GeometricContext geometry, const in int maxMIPLevel ) {
        vec3 worldNormal = inverseTransformDirection( geometry.normal, viewMatrix );
        #ifdef ubTV
            vec3 djEz = vec3( flipEnvMap * worldNormal.x, worldNormal.yz );
            #ifdef EPB
                djEz = crn( djEz, vWorldPosition.xyz, ems[0], emc[0], emcp[0] );
            #endif
            #ifdef Frdd
                vec4 djE0 = textureCubeLodEXT( ema[0], djEz, float( maxMIPLevel ) );
            #else
                vec4 djE0 = textureCube( ema[0], djEz, float( maxMIPLevel ) );
            #endif
            djE0.rgb = envMapTexelToLinear( djE0 ).rgb;
            #elif defined( bCRD )
            vec4 djE0 = textureCubeUV( ema[0], worldNormal, 1.0 );
        #else
            vec4 djE0 = vec4( 0.0 );
        #endif
        return PI * ((djE0.rgb * envMapIntensity - 0.5) * envMapContrast + 0.5);
    }
    float gsm( const in float roughness, const in int maxMIPLevel ) {
        float maxMIPLevelScalar = float( maxMIPLevel );
        float sigma = PI * roughness * roughness / ( 1.0 + roughness );
        float desiredMIPLevel = maxMIPLevelScalar + log2( sigma );
        return clamp( desiredMIPLevel, 0.0, maxMIPLevelScalar );
    }
    vec3 pGxi( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in int maxMIPLevel ) {
        #ifdef UNSC
            vec3 djEw = reflect( -viewDir, normal );
            djEw = normalize( mix( djEw, normal, roughness * roughness) );
        #else
            vec3 djEw = refract( -viewDir, normal, refractionRatio );
        #endif
        djEw = inverseTransformDirection( djEw, viewMatrix );
        float specularMIPLevel = gsm( roughness, maxMIPLevel );
        #ifdef ubTV
            vec3 djk = vec3( flipEnvMap * djEw.x, djEw.yz );
        #endif
        #if 3 == 1 || ( ! defined( EPB ) )
            #ifdef EPB
                djk = crn( djk, vWorldPosition.xyz, ems[0], emc[0], emcp[0] );
            #endif
            #ifdef ubTV
                #ifdef Frdd
                    vec4 djE0 = textureCubeLodEXT( ema[0], djk, specularMIPLevel );
                #else
                    vec4 djE0 = textureCube( ema[0], djk, specularMIPLevel );
                #endif
                #elif defined( bCRD )
                vec4 djE0 = textureCubeUV( ema[0], djk, roughness );
            #endif
            djE0.rgb = envMapTexelToLinear( djE0 ).rgb;
            return ((djE0.rgb * envMapIntensity - 0.5) * envMapContrast + 0.5);
        #else
            float djA = 0.0;
            float djE = 0.0;
            float djI = 0.0;
            float djM[3];
            vec4 djQ[3];
            vec3 djEx;
            float djM0;
            vec3 djM1;
            #ifdef EPB
                djEx = crn( djk, vWorldPosition.xyz, ems[ 0 ], emc[ 0 ], emcp[ 0 ] );
            #endif
            #ifdef ubTV
                #ifdef Frdd
                    djQ[ 0 ] = textureCubeLodEXT( ema[ 0 ], djEx, specularMIPLevel );
                #else
                    djQ[ 0 ] = textureCube( ema[ 0 ], djEx, specularMIPLevel );
                #endif
                #elif defined( bCRD )
                djQ[ 0 ] = textureCubeUV( ema[ 0 ], djEx, roughness );
            #endif
            djQ[ 0 ].rgb = envMapTexelToLinear( djQ[ 0 ] ).rgb;
            djM0 = min( emis[ 0 ].x, emis[ 0 ].z );
            djM1 = vec3( emis[ 0 ].x + djM0, emis[ 0 ].y + djM0*0.3, emis[ 0 ].z + djM0 );
            djM[ 0 ] = gbi(vWorldPosition.xyz, emc[ 0 ]+emio[ 0 ], emis[ 0 ], djM1);
            if ( djM[ 0 ] <= 0.0 ) return ((djQ[ 0 ].rgb * envMapIntensity - 0.5) * envMapContrast + 0.5);
            djM[ 0 ] = clamp(djM[ 0 ], 0.000001, 1.0);
            djA += djM[ 0 ];
            djE += 1.0 - djM[ 0 ];
            #ifdef EPB
                djEx = crn( djk, vWorldPosition.xyz, ems[ 1 ], emc[ 1 ], emcp[ 1 ] );
            #endif
            #ifdef ubTV
                #ifdef Frdd
                    djQ[ 1 ] = textureCubeLodEXT( ema[ 1 ], djEx, specularMIPLevel );
                #else
                    djQ[ 1 ] = textureCube( ema[ 1 ], djEx, specularMIPLevel );
                #endif
                #elif defined( bCRD )
                djQ[ 1 ] = textureCubeUV( ema[ 1 ], djEx, roughness );
            #endif
            djQ[ 1 ].rgb = envMapTexelToLinear( djQ[ 1 ] ).rgb;
            djM0 = min( emis[ 1 ].x, emis[ 1 ].z );
            djM1 = vec3( emis[ 1 ].x + djM0, emis[ 1 ].y + djM0*0.3, emis[ 1 ].z + djM0 );
            djM[ 1 ] = gbi(vWorldPosition.xyz, emc[ 1 ]+emio[ 1 ], emis[ 1 ], djM1);
            if ( djM[ 1 ] <= 0.0 ) return ((djQ[ 1 ].rgb * envMapIntensity - 0.5) * envMapContrast + 0.5);
            djM[ 1 ] = clamp(djM[ 1 ], 0.000001, 1.0);
            djA += djM[ 1 ];
            djE += 1.0 - djM[ 1 ];
            #ifdef EPB
                djEx = crn( djk, vWorldPosition.xyz, ems[ 2 ], emc[ 2 ], emcp[ 2 ] );
            #endif
            #ifdef ubTV
                #ifdef Frdd
                    djQ[ 2 ] = textureCubeLodEXT( ema[ 2 ], djEx, specularMIPLevel );
                #else
                    djQ[ 2 ] = textureCube( ema[ 2 ], djEx, specularMIPLevel );
                #endif
                #elif defined( bCRD )
                djQ[ 2 ] = textureCubeUV( ema[ 2 ], djEx, roughness );
            #endif
            djQ[ 2 ].rgb = envMapTexelToLinear( djQ[ 2 ] ).rgb;
            djM0 = min( emis[ 2 ].x, emis[ 2 ].z );
            djM1 = vec3( emis[ 2 ].x + djM0, emis[ 2 ].y + djM0*0.3, emis[ 2 ].z + djM0 );
            djM[ 2 ] = gbi(vWorldPosition.xyz, emc[ 2 ]+emio[ 2 ], emis[ 2 ], djM1);
            if ( djM[ 2 ] <= 0.0 ) return ((djQ[ 2 ].rgb * envMapIntensity - 0.5) * envMapContrast + 0.5);
            djM[ 2 ] = clamp(djM[ 2 ], 0.000001, 1.0);
            djA += djM[ 2 ];
            djE += 1.0 - djM[ 2 ];
            float djU[3];
            float djY;
            djU[ 0 ] = (1.0 - (djM[ 0 ] / djA)) / (float(3)-1.0);
            #if 3 > 1
                djY = djM[ 0 ];
                djM[ 0 ] = 1.0;
                djU[ 0 ] *= djM[ 0 ];
                djU[ 0 ] *= djM[ 1 ];
                djU[ 0 ] *= djM[ 2 ];
                djM[ 0 ] = djY;
            #endif
            djU[ 0 ] *= ((1.0 - djM[ 0 ]) / djE);
            djI += djU[ 0 ];
            djU[ 1 ] = (1.0 - (djM[ 1 ] / djA)) / (float(3)-1.0);
            #if 3 > 1
                djY = djM[ 1 ];
                djM[ 1 ] = 1.0;
                djU[ 1 ] *= djM[ 0 ];
                djU[ 1 ] *= djM[ 1 ];
                djU[ 1 ] *= djM[ 2 ];
                djM[ 1 ] = djY;
            #endif
            djU[ 1 ] *= ((1.0 - djM[ 1 ]) / djE);
            djI += djU[ 1 ];
            djU[ 2 ] = (1.0 - (djM[ 2 ] / djA)) / (float(3)-1.0);
            #if 3 > 1
                djY = djM[ 2 ];
                djM[ 2 ] = 1.0;
                djU[ 2 ] *= djM[ 0 ];
                djU[ 2 ] *= djM[ 1 ];
                djU[ 2 ] *= djM[ 2 ];
                djM[ 2 ] = djY;
            #endif
            djU[ 2 ] *= ((1.0 - djM[ 2 ]) / djE);
            djI += djU[ 2 ];
            vec3 djg = vec3(0.0);
            djU[ 0 ] /= djI;
            djQ[ 0 ] *= max(djU[ 0 ], 0.0);
            djg += djQ[ 0 ].rgb;
            djU[ 1 ] /= djI;
            djQ[ 1 ] *= max(djU[ 1 ], 0.0);
            djg += djQ[ 1 ].rgb;
            djU[ 2 ] /= djI;
            djQ[ 2 ] *= max(djU[ 2 ], 0.0);
            djg += djQ[ 2 ].rgb;
            return ((djg * envMapIntensity - 0.5) * envMapContrast + 0.5);
        #endif
    }
#endif
#ifdef RWEA
    uniform vec3 fogColor;
    varying float fogDepth;
    #ifdef spyl
        uniform float fogDensity;
    #else
        uniform float fogNear;
        uniform float fogFar;
    #endif
#endif
uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#ifdef LIGHT_PROBE
    uniform vec3 lightProbe[ 9 ];
    vec3 VIHR( in vec3 normal, in vec3 MzZM[ 9 ] ) {
        float x = normal.x, y = normal.y, z = normal.z;
        vec3 result = MzZM[ 0 ] * 0.886227;
        result += MzZM[ 1 ] * 2.0 * 0.511664 * y;
        result += MzZM[ 2 ] * 2.0 * 0.511664 * z;
        result += MzZM[ 3 ] * 2.0 * 0.511664 * x;
        result += MzZM[ 4 ] * 2.0 * 0.429043 * x * y;
        result += MzZM[ 5 ] * 2.0 * 0.429043 * y * z;
        result += MzZM[ 6 ] * ( 0.743125 * z * z - 0.247708 );
        result += MzZM[ 7 ] * 2.0 * 0.429043 * x * z;
        result += MzZM[ 8 ] * 0.429043 * ( x * x - y * y );
        return result;
    }
    vec3 cQdG( const in vec3 lightProbe[ 9 ], const in GeometricContext geometry ) {
        vec3 worldNormal = inverseTransformDirection( geometry.normal, viewMatrix );
        vec3 irradiance = VIHR( worldNormal, lightProbe );
        return irradiance;
    }
#endif
vec3 QfdC( const in vec3 ambientLightColor ) {
    vec3 irradiance = ambientLightColor;
    return irradiance;
}
#if 0 > 0
    struct DirectionalLight {
        vec3 direction;
        vec3 color;
    };
    uniform DirectionalLight directionalLights[ 0 ];
    void getDirectionalDirectLightIrradiance( const in DirectionalLight directionalLight, const in GeometricContext geometry, out IncidentLight directLight ) {
        directLight.color = directionalLight.color;
        directLight.direction = directionalLight.direction;
        directLight.visible = true;
    }
#endif
#if 0 > 0
    struct PointLight {
        vec3 position;
        vec3 color;
        float distance;
        float decay;
    };
    uniform PointLight pointLights[ 0 ];
    void getPointDirectLightIrradiance( const in PointLight pointLight, const in GeometricContext geometry, out IncidentLight directLight ) {
        vec3 lVector = pointLight.position - geometry.position;
        directLight.direction = normalize( lVector );
        float lightDistance = length( lVector );
        directLight.color = pointLight.color;
        directLight.color *= punctualLightIntensityToIrradianceFactor( lightDistance, pointLight.distance, pointLight.decay );
        directLight.visible = ( directLight.color != vec3( 0.0 ) );
    }
#endif
#if 0 > 0
    struct SpotLight {
        vec3 position;
        vec3 direction;
        vec3 color;
        float distance;
        float decay;
        float coneCos;
        float penumbraCos;
    };
    uniform SpotLight spotLights[ 0 ];
    void getSpotDirectLightIrradiance( const in SpotLight spotLight, const in GeometricContext geometry, out IncidentLight directLight ) {
        vec3 lVector = spotLight.position - geometry.position;
        directLight.direction = normalize( lVector );
        float lightDistance = length( lVector );
        float angleCos = dot( directLight.direction, spotLight.direction );
        if ( angleCos > spotLight.coneCos ) {
            float spotEffect = smoothstep( spotLight.coneCos, spotLight.penumbraCos, angleCos );
            directLight.color = spotLight.color;
            directLight.color *= spotEffect * punctualLightIntensityToIrradianceFactor( lightDistance, spotLight.distance, spotLight.decay );
            directLight.visible = true;
        }
        else {
            directLight.color = vec3( 0.0 );
            directLight.visible = false;
        }
    
    }
#endif
#if 0 > 0
    struct RectAreaLight {
        vec3 color;
        vec3 position;
        vec3 halfWidth;
        vec3 halfHeight;
    };
    uniform sampler2D ltc_1;
    uniform sampler2D ltc_2;
    uniform RectAreaLight rectAreaLights[ 0 ];
#endif
#if 0 > 0
    struct HemisphereLight {
        vec3 direction;
        vec3 skyColor;
        vec3 groundColor;
    };
    uniform HemisphereLight hemisphereLights[ 0 ];
    vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in GeometricContext geometry ) {
        float dotNL = dot( geometry.normal, hemiLight.direction );
        float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
        vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
        return irradiance;
    }
#endif
struct PhysicalMaterial {
    vec3 diffuseColor;
    float specularRoughness;
    vec3 specularColor;
    vec3		reflectivityColor;
    float specularF90;
    #ifdef HpCw
        float clearcoat;
        float clearcoatRoughness;
    #endif
    #ifdef entC
        vec3 sheenColor;
        float sheenRoughness;
    #endif
};
#ifdef YqTV
    #ifdef sFFv
        uniform sampler2D reflectivityMap;
        uniform float reflectivityMapAmount;
    #endif
#endif
#define MAXIMUM_SPECULAR_COEFFICIENT 0.16
#define DEFAULT_SPECULAR_COEFFICIENT 0.04
float clearcoatDHRApprox( const in float roughness, const in float dotNL ) {
    return DEFAULT_SPECULAR_COEFFICIENT + ( 1.0 - DEFAULT_SPECULAR_COEFFICIENT ) * ( pow( 1.0 - dotNL, 5.0 ) * pow( 1.0 - roughness, 2.0 ) );
}
#if 0 > 0
    void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
        vec3 normal = geometry.normal;
        vec3 viewDir = geometry.viewDir;
        vec3 position = geometry.position;
        vec3 lightPos = rectAreaLight.position;
        vec3 halfWidth = rectAreaLight.halfWidth;
        vec3 halfHeight = rectAreaLight.halfHeight;
        vec3 lightColor = rectAreaLight.color;
        float roughness = material.specularRoughness;
        vec3 rectCoords[ 4 ];
        rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;
        rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
        rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
        rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
        vec2 uv = LTC_Uv( normal, viewDir, roughness );
        vec4 t1 = texture2D( ltc_1, uv );
        vec4 t2 = texture2D( ltc_2, uv );
        mat3 mInv = mat3(
        vec3( t1.x, 0, t1.y ), vec3(		0, 1, 0 ), vec3( t1.z, 0, t1.w )
        );
        vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
        reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
        reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
    }
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
    float dotNL = saturate( dot( geometry.normal, directLight.direction ) );
    vec3 irradiance = dotNL * directLight.color;
    #ifdef HpCw
        float ccDotNL = saturate( dot( geometry.clearcoatNormal, directLight.direction ) );
        vec3 ccIrradiance = ccDotNL * directLight.color;
        float clearcoatDHR = material.clearcoat * clearcoatDHRApprox( material.clearcoatRoughness, ccDotNL );
        reflectedLight.directSpecular += ccIrradiance * material.clearcoat * BRDF_Specular_GGX( directLight, geometry.viewDir, geometry.clearcoatNormal, vec3( DEFAULT_SPECULAR_COEFFICIENT ), material.specularF90, material.clearcoatRoughness );
    #else
        float clearcoatDHR = 0.0;
    #endif
    #ifdef entC
        reflectedLight.directSpecular += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Specular_Sheen(
        material.sheenRoughness, directLight.direction, geometry, material.sheenColor
        );
    #else
        reflectedLight.directSpecular += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Specular_GGX( directLight, geometry.viewDir, geometry.normal, material.specularColor, material.specularF90, material.specularRoughness);
    #endif
    reflectedLight.directDiffuse += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
    reflectedLight.indirectDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
    #ifdef HpCw
        float ccDotNV = saturate( dot( geometry.clearcoatNormal, geometry.viewDir ) );
        reflectedLight.indirectSpecular += clearcoatRadiance * material.clearcoat * BRDF_Specular_GGX_Environment( geometry.viewDir, geometry.clearcoatNormal, vec3( DEFAULT_SPECULAR_COEFFICIENT ), material.clearcoatRoughness );
        float ccDotNL = ccDotNV;
        float clearcoatDHR = material.clearcoat * clearcoatDHRApprox( material.clearcoatRoughness, ccDotNL );
    #else
        float clearcoatDHR = 0.0;
    #endif
    float clearcoatInv = 1.0 - clearcoatDHR;
    vec3 singleScattering = vec3( 0.0 );
    vec3 multiScattering = vec3( 0.0 );
    vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
    BRDF_Specular_Multiscattering_Environment( geometry, material.specularColor, material.reflectivityColor, material.specularF90, material.specularRoughness, singleScattering, multiScattering );
    vec3 diffuse = material.diffuseColor * ( 1.0 - ( singleScattering + multiScattering ) );
    #ifdef entC
        reflectedLight.indirectSpecular += BRDF_Specular_Sheen(
        material.sheenRoughness, geometry.viewDir + vec3(-0.2, -0.2, -0.2), geometry, material.sheenColor * 0.25
        );
    #endif
    reflectedLight.indirectSpecular += clearcoatInv * radiance * singleScattering;
    reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
    reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float vStK( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
    return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}
#ifdef nByF
    #if 0 > 0
        uniform sampler2D directionalShadowMap[ 0 ];
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
        uniform sampler2D spotShadowMap[ 0 ];
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
        uniform sampler2D pointShadowMap[ 0 ];
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
    float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
        return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
    }
    vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
        return unpackRGBATo2Half( texture2D( shadow, uv ) );
    }
    float VSMShadow (sampler2D shadow, vec2 uv, float compare ) {
        float occlusion = 1.0;
        vec2 distribution = texture2DDistribution( shadow, uv );
        float hard_shadow = step( compare, distribution.x );
        if (hard_shadow != 1.0 ) {
            float distance = compare - distribution.x ;
            float variance = max( 0.00000, distribution.y * distribution.y );
            float softness_probability = variance / (variance + distance * distance );
            softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );
            occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
        }
        return occlusion;
    }
    float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
        float shadow = 1.0;
        shadowCoord.xyz /= shadowCoord.w;
        shadowCoord.z += shadowBias;
        bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
        bool inFrustum = all( inFrustumVec );
        bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );
        bool frustumTest = all( frustumTestVec );
        if ( frustumTest ) {
            #if defined( SHADOWMAP_TYPE_PCF )
                vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
                float dx0 = - texelSize.x * shadowRadius;
                float dy0 = - texelSize.y * shadowRadius;
                float dx1 = + texelSize.x * shadowRadius;
                float dy1 = + texelSize.y * shadowRadius;
                float dx2 = dx0 / 2.0;
                float dy2 = dy0 / 2.0;
                float dx3 = dx1 / 2.0;
                float dy3 = dy1 / 2.0;
                shadow = (
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
                ) * ( 1.0 / 17.0 );
                #elif defined( SHADOWMAP_TYPE_PCF_SOFT )
                vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
                float dx = texelSize.x;
                float dy = texelSize.y;
                vec2 uv = shadowCoord.xy;
                vec2 f = fract( uv * shadowMapSize + 0.5 );
                uv -= f * texelSize;
                shadow = (
                texture2DCompare( shadowMap, uv, shadowCoord.z ) +
                texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
                texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
                texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
                mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ), texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ), f.x ) +
                mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ), texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ), f.x ) +
                mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ), texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ), f.y ) +
                mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ), texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ), f.y ) +
                mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ), texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ), f.x ), mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ), texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ), f.x ), f.y )
                ) * ( 1.0 / 9.0 );
                #elif defined( SHADOWMAP_TYPE_VSM )
                shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
            #else
                shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
            #endif
        }
        return shadow;
    }
    vec2 cubeToUV( vec3 v, float texelSizeY ) {
        vec3 absV = abs( v );
        float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
        absV *= scaleToCube;
        v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
        vec2 planar = v.xy;
        float almostATexel = 1.5 * texelSizeY;
        float almostOne = 1.0 - almostATexel;
        if ( absV.z >= almostOne ) {
            if ( v.z > 0.0 )
            planar.x = 4.0 - v.x;
        }
        else if ( absV.x >= almostOne ) {
            float signX = sign( v.x );
            planar.x = v.z * signX + 2.0 * signX;
        }
        else if ( absV.y >= almostOne ) {
            float signY = sign( v.y );
            planar.x = v.x + 2.0 * signY + 2.0;
            planar.y = v.z * signY - 2.0;
        }
        return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
    }
    float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
        vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
        vec3 lightToPosition = shadowCoord.xyz;
        float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );
        dp += shadowBias;
        vec3 bd3D = normalize( lightToPosition );
        #if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
            vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
            return (
            texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
            texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
            texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
            texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
            texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
            texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
            texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
            texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
            texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
            ) * ( 1.0 / 9.0 );
        #else
            return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
        #endif
    }
#endif
#ifdef YhJN
    uniform sampler2D bumpMap;
    uniform float bumpScale;
    vec2 dHdxy_fwd() {
        vec2 dSTdx = dFdx( vUvBump );
        vec2 dSTdy = dFdy( vUvBump );
        float Hll = bumpScale * bumpMapTexelToLinear( texture2D( bumpMap, vUvBump ) ).x;
        float dBx = bumpScale * bumpMapTexelToLinear( texture2D( bumpMap, vUvBump + dSTdx ) ).x - Hll;
        float dBy = bumpScale * bumpMapTexelToLinear( texture2D( bumpMap, vUvBump + dSTdy ) ).x - Hll;
        return vec2( dBx, dBy );
    }
    vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
        vec3 vSigmaX = dFdx( surf_pos.xyz );
        vec3 vSigmaY = dFdy( surf_pos.xyz );
        vec3 vN = surf_norm;
        vec3 R1 = cross( vSigmaY, vN );
        vec3 R2 = cross( vN, vSigmaX );
        float fDet = dot( vSigmaX, R1 ) * faceDirection;
        vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
        return normalize( abs( fDet ) * surf_norm - vGrad );
    }
#endif
#ifdef XOsC
    uniform sampler2D normalMap;
    uniform vec2 normalScale;
    uniform vec2 nmR;
#endif
#ifdef YDcw
    uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( wKlc ) || defined ( TZDa ) )
    vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm, vec3 mapN, float faceDirection ) {
        vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );
        vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );
        vec2 st0 = dFdx( vUvNormal.st );
        vec2 st1 = dFdy( vUvNormal.st );
        vec3 N = surf_norm;
        vec3 q1perp = cross( q1, N );
        vec3 q0perp = cross( N, q0 );
        vec3 T = q1perp * st0.x + q0perp * st1.x;
        vec3 B = q1perp * st0.y + q0perp * st1.y;
        float det = max( dot( T, T ), dot( B, B ) );
        float scale = ( det == 0.0 ) ? 0.0 : faceDirection * inversesqrt( det );
        return normalize( T * ( mapN.x * scale ) + B * ( mapN.y * scale ) + N * mapN.z );
    }
#endif
#ifdef PrxB
    uniform sampler2D clearcoatMap;
#endif
#ifdef PuNt
    uniform sampler2D clearcoatRoughnessMap;
#endif
#ifdef TZDa
    uniform sampler2D clearcoatNormalMap;
    uniform vec2 clearcoatNormalScale;
#endif
#ifdef TeIY
    uniform sampler2D glossinessMap;
    uniform float glossinessMapAmount;
#endif
#ifdef pGHF
    uniform sampler2D metalnessMap;
    uniform float metalnessMapAmount;
#endif
#ifdef oRrN
    uniform sampler2D specularMap;
    uniform float specularMapAmount;
#endif
#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
    uniform float logDepthBufFC;
    varying float vFragDepth;
    varying float vIsPerspective;
#endif
#if 6 > 0
    varying vec3 vClipPosition;
    uniform vec4 clippingPlanes[ 6 ];
#endif
#ifdef riRU
    uniform float highlightOpacity;
#endif
void main() {
    #if 6 > 0
        vec4 plane;
        plane = clippingPlanes[ 0 ];
        if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
        plane = clippingPlanes[ 1 ];
        if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
        plane = clippingPlanes[ 2 ];
        if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
        plane = clippingPlanes[ 3 ];
        if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
        plane = clippingPlanes[ 4 ];
        if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
        plane = clippingPlanes[ 5 ];
        if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
        #if 6 < 6
            bool clipped = true;
            if ( clipped ) discard;
        #endif
    #endif
    vec4 diffuseColor = vec4( diffuse, opacity );
    ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
    vec3 totalEmissiveRadiance = emissive;
    #if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
        gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
    #endif
    #ifdef ePky
        vec4 texelColor = texture2D( map, vUvMap );
        texelColor = mapTexelToLinear( texelColor ) * diffuseMapIntensity;
        diffuseColor = vec4( mix( diffuseColor, texelColor, mapAmount ).rgb, diffuseColor.a );
    #endif
    #if defined( DVzy )
        diffuseColor *= vColor;
        #elif defined( xGru )
        diffuseColor.rgb *= vColor;
    #endif
    #ifdef cZYY
        diffuseColor.a = mix( diffuseColor.a, alphaMapTexelToLinear( texture2D(alphaMap, vUvAlpha) ).b, alphaMapAmount );
    #endif
    #ifdef ALPHATEST
        if ( diffuseColor.a < ALPHATEST ) discard;
    #endif
    float glossinessFactor = glossiness;
    #ifdef TeIY
        float texelGlossiness = glossinessMapTexelToLinear( texture2D(glossinessMap, vUvGlossiness) ).g;
        #ifdef dyPH
            texelGlossiness = 1.0 - texelGlossiness;
        #endif
        glossinessFactor = mix( glossinessFactor, texelGlossiness, glossinessMapAmount );
    #endif
    float roughnessFactor = 1.0 - glossinessFactor;
    float metalnessFactor = metalness;
    #ifdef pGHF
        vec4 texelMetalness = metalnessMapTexelToLinear( texture2D(metalnessMap, vUvMetalness) );
        metalnessFactor = mix( metalnessFactor, texelMetalness.b, metalnessMapAmount );
    #endif
    vec3 specularFactor = specular;
    #ifdef oRrN
        vec4 texelSpecular = texture2D( specularMap, vUvSpecular );
        texelSpecular = specularMapTexelToLinear( texelSpecular );
        specularFactor = mix( specularFactor, texelSpecular.rgb, specularMapAmount );
    #endif
    float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
    #ifdef FLAT_SHADED
        vec3 fdx = vec3( dFdx( vViewPosition.x ), dFdx( vViewPosition.y ), dFdx( vViewPosition.z ) );
        vec3 fdy = vec3( dFdy( vViewPosition.x ), dFdy( vViewPosition.y ), dFdy( vViewPosition.z ) );
        vec3 normal = normalize( cross( fdx, fdy ) );
    #else
        vec3 normal = normalize( vNormal );
        #ifdef RXJP
            normal = normal * faceDirection;
        #endif
        #ifdef USE_TANGENT
            vec3 tangent = normalize( vTangent );
            vec3 bitangent = normalize( vBitangent );
            #ifdef RXJP
                tangent = tangent * faceDirection;
                bitangent = bitangent * faceDirection;
            #endif
            #if defined( wKlc ) || defined( TZDa )
                mat3 vTBN = mat3( tangent, bitangent, normal );
            #endif
        #endif
    #endif
    vec3 geometryNormal = normal;
    #ifdef YDcw
        normal = normalMapTexelToLinear( vtb(normalMap, vUvNormal, nmR) ).xyz * 2.0 - 1.0;
        float nY = -normal.y;
        normal.y = normal.z;
        normal.z = nY;
        #ifdef FLIP_SIDED
            normal = - normal;
        #endif
        #ifdef RXJP
            normal = normal * faceDirection;
        #endif
        normal = normalize( normalMatrix * normal );
        #elif defined( wKlc )
        vec3 mapN = normalMapTexelToLinear( vtb(normalMap, vUvNormal, nmR) ).xyz * 2.0 - 1.0;
        mapN.xy *= normalScale;
        #ifdef USE_TANGENT
            normal = normalize( vTBN * mapN );
        #else
            normal = perturbNormal2Arb( -vViewPosition, normal, mapN, faceDirection );
        #endif
    #endif
    #if defined( YhJN )
        normal = perturbNormalArb( -vViewPosition, normal, dHdxy_fwd(), faceDirection );
    #endif
    #ifdef HpCw
        vec3 clearcoatNormal = geometryNormal;
    #endif
    #ifdef TZDa
        vec3 clearcoatMapN = clearcoatNormalMapTexelToLinear( texture2D( clearcoatNormalMap, vUvClearcoatNormal ) ).xyz * 2.0 - 1.0;
        clearcoatMapN.xy *= clearcoatNormalScale;
        #ifdef USE_TANGENT
            clearcoatNormal = normalize( vTBN * clearcoatMapN );
        #else
            clearcoatNormal = perturbNormal2Arb( - vViewPosition, clearcoatNormal, clearcoatMapN, faceDirection );
        #endif
    #endif
    #ifdef tort
        vec4 emissiveColor = texture2D( emissiveMap, vUvEmissive );
        emissiveColor.rgb = emissiveMapTexelToLinear( emissiveColor ).rgb;
        totalEmissiveRadiance *= emissiveColor.rgb;
    #endif
    PhysicalMaterial material;
    vec3 reflectivityColorFactor = vec3( reflectivity );
    #ifdef sFFv
        float mapVal = reflectivityMapTexelToLinear(texture2D(reflectivityMap, vUvReflectivity)).r;
        mapVal = pow2( (mapVal - 1.0) / (mapVal + 1.0) );
        reflectivityColorFactor = mix( reflectivityColorFactor, vec3(mapVal), reflectivityMapAmount);
    #endif
    material.reflectivityColor = mix( reflectivityColorFactor, diffuseColor.rgb, metalnessFactor );
    vec3 dxy = max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) );
    float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
    material.specularRoughness = max( 1.0 - glossinessFactor, 0.02625000 );
    material.specularRoughness += geometryRoughness;
    material.specularRoughness = min( material.specularRoughness, 1.0 );
    material.specularColor = mix( specularFactor.rgb, diffuseColor.rgb, metalnessFactor );
    float dotNV = saturate( dot( normal, normalize( vViewPosition ) ) );
    material.specularF90 = RGBToLightness(material.specularColor);
    float F = F_Schlick_RoughnessDependent( material.reflectivityColor, material.specularF90, dotNV, material.specularRoughness ).r;
    material.diffuseColor = diffuseColor.rgb  *  ( 1.0 - metalnessFactor )  *  (1.0 - F * ( max( max( specularFactor.r, specularFactor.g ), specularFactor.b ) ));
    #ifdef HpCw
        material.clearcoat = saturate( clearcoat );
        material.clearcoatRoughness = clamp( clearcoatRoughness, 0.04, 1.0 );
    #endif
    #ifdef entC
        material.sheenColor = sheen;
        material.sheenRoughness = max( sheenRoughness, 0.001 );
    #endif
    
    GeometricContext geometry;
    geometry.position = - vViewPosition;
    geometry.normal = normal;
    geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
    #ifdef HpCw
        geometry.clearcoatNormal = clearcoatNormal;
    #endif
    IncidentLight directLight;
    #if ( 0 > 0 ) && defined( RE_Direct )
        PointLight pointLight;
        #if defined( nByF ) && 0 > 0
            PointLightShadow pointLightShadow;
        #endif
        
    #endif
    #if ( 0 > 0 ) && defined( RE_Direct )
        SpotLight spotLight;
        #if defined( nByF ) && 0 > 0
            SpotLightShadow spotLightShadow;
        #endif
        
    #endif
    #if ( 0 > 0 ) && defined( RE_Direct )
        DirectionalLight directionalLight;
        #if defined( nByF ) && 0 > 0
            DirectionalLightShadow directionalLightShadow;
        #endif
        
    #endif
    #if ( 0 > 0 ) && defined( RE_Direct_RectArea )
        RectAreaLight rectAreaLight;
    #endif
    #if defined( RE_IndirectDiffuse )
        vec3 iblIrradiance = vec3( 0.0 );
        vec3 irradiance = QfdC( ambientLightColor );
        #ifdef LIGHT_PROBE
            irradiance += cQdG( lightProbe, geometry );
        #endif
        #if defined( USE_INDIRECT_DIFFUSE_SH )
            irradiance += cQdG( indirectDiffuseSH, geometry );
        #endif
        #if ( 0 > 0 )
            
        #endif
    #endif
    #if defined( RE_IndirectSpecular )
        vec3 radiance = vec3( 0.0 );
        vec3 clearcoatRadiance = vec3( 0.0 );
    #endif
    #ifdef gIxV
        vec3 viewDirLC = normalize( vViewPosition );
        vec3 xLC = normalize( vec3( viewDirLC.z, 0.0, - viewDirLC.x ) );
        vec3 yLC = cross( viewDirLC, xLC );
        vec2 lcUv = vec2( dot( xLC, normal ), -dot( yLC, normal ) ) * 0.495 + 0.5;
        vec4 lcColor = texture2D( lc, lcUv );
        irradiance += PI * ( (lcColor.rgb * lcIntensity - 0.5) * lcContrast + 0.5 );
    #endif
    #if defined( RE_IndirectDiffuse )
        #ifdef JToV
            vec3 lightMapIrradiance = max( vec3(0.0), pow( (lightMapTexelToLinear(vtb(lightMap, vUvLight, lmR)).rgb * lightMapIntensity), vec3(lightMapContrast) ) );
            #ifndef Tbsr
            #endif
            irradiance *= lightMapIrradiance;
        #endif
        #if defined( ufeZ ) && defined( STANDARD ) && defined( FsPb )
            iblIrradiance += (bPhf( geometry, maxMipLevel ) * iblIntensity - 0.5) * iblContrast + 0.5;
        #endif
    #endif
    #if defined( ufeZ ) && defined( RE_IndirectSpecular )
        radiance += pGxi( geometry.viewDir, geometry.normal, material.specularRoughness, maxMipLevel );
        #ifdef HpCw
            clearcoatRadiance += pGxi( geometry.viewDir, geometry.clearcoatNormal, material.clearcoatRoughness, maxMipLevel );
        #endif
    #endif
    #if defined( RE_IndirectDiffuse )
        RE_IndirectDiffuse( irradiance, geometry, material, reflectedLight );
    #endif
    #if defined( RE_IndirectSpecular )
        RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometry, material, reflectedLight );
    #endif
    #ifdef NO_LIGHT_SPECULAR
        reflectedLight.directSpecular = vec3( 0.0 );
    #endif
    #ifdef NO_LIGHT_DIFFUSE
        reflectedLight.directDiffuse = vec3( 0.0 );
    #endif
    #ifdef NO_LIGHT
        reflectedLight.directSpecular = vec3( 0.0 );
        reflectedLight.directDiffuse = vec3( 0.0 );
    #endif
    #ifdef owgO
        vec3 ambientOcclusion = saturate( vec3( aoMapTexelToLinear( texture2D(aoMap, vUvAO) ) ) - 1.0 ) * aoMapIntensity + 1.0;
        reflectedLight.indirectDiffuse *= ambientOcclusion;
        #if defined( ufeZ ) && defined( STANDARD )
            float dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );
            float aoLightness = RGBToLightness(ambientOcclusion);
            reflectedLight.indirectSpecular *= vStK( dotNV, aoLightness, material.specularRoughness );
        #endif
    #endif
    #ifdef JToV
        #if defined( RE_IndirectDiffuse )
            float lmLightness = saturate( RGBToLightness(lightMapIrradiance) * 2.0 );
            float lmLightnessB = (1.0-lmLightness) * 0.7;
            reflectedLight.directDiffuse -= reflectedLight.directDiffuse * lmLightnessB;
            reflectedLight.directSpecular -= reflectedLight.directSpecular * lmLightnessB;
            #if defined( ufeZ ) && defined( STANDARD )
                reflectedLight.indirectSpecular *= lmLightness;
            #endif
        #endif
    #endif
    vec3 ZxGf = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
    vec3 Tcap = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
    #ifndef VC_F_T
        #ifdef HLxb
            float transmissionFactor = transmission;
            float thicknessFactor = thickness;
            #ifdef yICh
                transmissionFactor *= transmissionMapTexelToLinear( texture2D(transmissionMap, vUvTransmission) ).r;
            #endif
            #ifdef LGWi
                thicknessFactor *= thicknessMapTexelToLinear( texture2D(thicknessMap, vUvTransmission) ).g;
            #endif
            vec3 pos = vWorldPosition.xyz / vWorldPosition.w;
            vec3 v = normalize( cameraPosition - pos );
            float ior = ( 1.0 + 0.4 * reflectivity ) / ( 1.0 - 0.4 * reflectivity );
            vec3 transmission = transmissionFactor * getIBLVolumeRefraction(
            normal, v, roughnessFactor, material.diffuseColor, material.specularColor, pos, modelMatrix, viewMatrix, projectionMatrix, ior, thicknessFactor, attenuationColor, attenuationDistance );
            totalDiffuse = mix( ZxGf, transmission, transmissionFactor );
        #endif
    #endif
    vec3 outgoingLight = ZxGf + Tcap + totalEmissiveRadiance;
    #ifdef VC_F_T
        #ifdef HLxb
            vec3 specularLinear = (reflectedLight.directSpecular + reflectedLight.indirectSpecular);
            float specularLumi = linearToRelativeLuminance( specularLinear );
            float FCustom = F_Schlick_RoughnessDependent( vec3(0.04), 1.0, dotNV, material.specularRoughness ).r;
            #ifdef yICh
                float finalTransmission = mix( transmission, transmissionMapTexelToLinear(texture2D(transmissionMap, vUvTransmission)).b, transmissionMapAmount );
                diffuseColor.a *= saturate( 1. - finalTransmission + specularLumi + FCustom );
            #else
                diffuseColor.a *= saturate( 1. - transmission + specularLumi + FCustom );
            #endif
        #endif
    #endif
    gl_FragColor = vec4( outgoingLight, diffuseColor.a );
    #ifdef riRU
        gl_FragColor = mix( gl_FragColor, vec4(0.0, 1.0, 0.63, 1.0), highlightOpacity);
    #endif
    
    #if defined( NrYx )
        gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
        #if defined( PP_IN_MAT )
            vec3 color = gl_FragColor.rgb;
            color = pow( color / vec3(0.18), vec3(ppCst) ) * vec3(0.18);
            #if defined( PP_BURN )
                color = rh(color, 1.0/ppBurn);
            #endif
            #if defined( PP_TEMP )
                vec3 inputColor = color;
                color = mix(inputColor, inputColor * (vec3(1.0) / colorTemperatureToRGB(ppTemp)), 1.0);
                color *= mix(1.0, dot(inputColor, vec3(0.2126, 0.7152, 0.0722)) / max(dot(color, vec3(0.2126, 0.7152, 0.0722)), 1e-5), 1.0);
            #endif
            #if defined( PP_SAT )
                color = applySaturation(color, ppSat+1.0);
            #endif
            gl_FragColor.rgb = mix( gl_FragColor.rgb, color, toneMappingOpacity );
        #endif
    #endif
    gl_FragColor = linearToOutputTexel( gl_FragColor );
    #ifdef RWEA
        #ifdef spyl
            float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );
        #else
            float fogFactor = smoothstep( fogNear, fogFar, fogDepth );
        #endif
        gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
    #endif
    #ifdef PREMULTIPLIED_ALPHA
        gl_FragColor.rgb *= gl_FragColor.a;
    #endif
    #ifdef ueCh
        gl_FragColor.rgb = dithering( gl_FragColor.rgb );
    #endif
    #if defined( NrYx ) && defined ( PP_IN_MAT )
        #if defined( PP_LUT )
            color = saturate( gl_FragColor.rgb );
            vec3 c = color;
            #ifdef CUSTOM_INPUT_DOMAIN
                if(c.r >= ppLUTDomainMin.r && c.g >= ppLUTDomainMin.g && c.b >= ppLUTDomainMin.b &&
                c.r <= ppLUTDomainMax.r && c.g <= ppLUTDomainMax.g && c.b <= ppLUTDomainMax.b) {
                    c = applyLUT( ppLUTScale * c + ppLUTOffset ).rgb;
                }
                else {
                    c = color.rgb;
                }
            #else
                #if !defined(LUT_3D) || defined(TETRAHEDRAL_INTERPOLATION)
                #endif
                c = applyLUT( ppLUTScale * c + ppLUTOffset ).rgb;
            #endif
            gl_FragColor.rgb = mix( color, c, ppLUTOpacity * toneMappingOpacity );
        #endif
    #endif
    #ifdef DISSOLVE
        float distance = distance(vWorldPosition.xyz, dissolveOrigin );
        float falloffRange = dissolveMaxDist * 0.01;
        float distToBorder = (dissolveMaxDist + falloffRange) * abs(dissolveFactor);
        float falloff = step( distToBorder-falloffRange, distance );
        float glowFalloff;
        if ( dissolveFactor > -0.00000001 ) {
            glowFalloff = smoothstep(distToBorder-falloffRange, distToBorder, distance);
        }
        else {
            falloff = 1.0 - falloff;
            glowFalloff = 1.0 - smoothstep(distToBorder-falloffRange*5.0, distToBorder+falloffRange*4.0, distance);
        }
        gl_FragColor.a *= falloff;
        vec3 glowColor = vec3(0.3, 0.7, 0.7);
        gl_FragColor.rgb = mix(glowColor, gl_FragColor.rgb, glowFalloff);
    #endif
}
