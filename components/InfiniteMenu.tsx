'use client'

import { FC, useRef, useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Inline math — no external gl-matrix dependency
// ---------------------------------------------------------------------------

type Vec2 = Float32Array;
type Vec3 = Float32Array;
type Quat  = Float32Array; // [x, y, z, w]
type Mat4  = Float32Array;

// ── vec2 ────────────────────────────────────────────────────────────────────
const vec2 = {
  create:     (): Vec2                                  => new Float32Array(2),
  fromValues:  (x: number, y: number): Vec2             => new Float32Array([x, y]),
  set:  (o: Vec2, x: number, y: number): Vec2           => { o[0]=x; o[1]=y; return o; },
  copy: (o: Vec2, a: Vec2): Vec2                        => { o[0]=a[0]; o[1]=a[1]; return o; },
  add:  (o: Vec2, a: Vec2, b: Vec2): Vec2               => { o[0]=a[0]+b[0]; o[1]=a[1]+b[1]; return o; },
  sub:  (o: Vec2, a: Vec2, b: Vec2): Vec2               => { o[0]=a[0]-b[0]; o[1]=a[1]-b[1]; return o; },
  scale:(o: Vec2, a: Vec2, s: number): Vec2             => { o[0]=a[0]*s; o[1]=a[1]*s; return o; },
  sqrLen: (a: Vec2): number                             => a[0]*a[0]+a[1]*a[1],
};

// ── vec3 ────────────────────────────────────────────────────────────────────
const vec3 = {
  create:     (): Vec3                                   => new Float32Array(3),
  fromValues:  (x: number, y: number, z: number): Vec3   => new Float32Array([x, y, z]),
  copy:  (o: Vec3, a: Vec3): Vec3                        => { o[0]=a[0]; o[1]=a[1]; o[2]=a[2]; return o; },
  negate:(o: Vec3, a: Vec3): Vec3                        => { o[0]=-a[0]; o[1]=-a[1]; o[2]=-a[2]; return o; },
  scale: (o: Vec3, a: Vec3, s: number): Vec3             => { o[0]=a[0]*s; o[1]=a[1]*s; o[2]=a[2]*s; return o; },
  normalize: (o: Vec3, a: Vec3): Vec3 => {
    const l = Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]);
    if (l > 1e-6) { o[0]=a[0]/l; o[1]=a[1]/l; o[2]=a[2]/l; } else { o[0]=0; o[1]=0; o[2]=0; }
    return o;
  },
  dot:  (a: Vec3, b: Vec3): number => a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross:(o: Vec3, a: Vec3, b: Vec3): Vec3 => {
    o[0]=a[1]*b[2]-a[2]*b[1]; o[1]=a[2]*b[0]-a[0]*b[2]; o[2]=a[0]*b[1]-a[1]*b[0]; return o;
  },
  squaredDistance: (a: Vec3, b: Vec3): number => {
    const dx=b[0]-a[0], dy=b[1]-a[1], dz=b[2]-a[2]; return dx*dx+dy*dy+dz*dz;
  },
  transformQuat: (o: Vec3, a: Vec3, q: Quat): Vec3 => {
    const x=a[0],y=a[1],z=a[2], qx=q[0],qy=q[1],qz=q[2],qw=q[3];
    const ix= qw*x+qy*z-qz*y, iy= qw*y+qz*x-qx*z, iz= qw*z+qx*y-qy*x, iw=-qx*x-qy*y-qz*z;
    o[0]=ix*qw+iw*(-qx)+iy*(-qz)-iz*(-qy);
    o[1]=iy*qw+iw*(-qy)+iz*(-qx)-ix*(-qz);
    o[2]=iz*qw+iw*(-qz)+ix*(-qy)-iy*(-qx);
    return o;
  },
};

// ── quat ────────────────────────────────────────────────────────────────────
const quat = {
  create: (): Quat => new Float32Array([0,0,0,1]),
  copy:   (o: Quat, a: Quat): Quat => { o[0]=a[0]; o[1]=a[1]; o[2]=a[2]; o[3]=a[3]; return o; },
  normalize: (o: Quat, a: Quat): Quat => {
    const l = Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]+a[3]*a[3]);
    if (l>1e-6){o[0]=a[0]/l;o[1]=a[1]/l;o[2]=a[2]/l;o[3]=a[3]/l;}else{o[0]=0;o[1]=0;o[2]=0;o[3]=1;}
    return o;
  },
  multiply: (o: Quat, a: Quat, b: Quat): Quat => {
    const ax=a[0],ay=a[1],az=a[2],aw=a[3], bx=b[0],by=b[1],bz=b[2],bw=b[3];
    o[0]=ax*bw+aw*bx+ay*bz-az*by; o[1]=ay*bw+aw*by+az*bx-ax*bz;
    o[2]=az*bw+aw*bz+ax*by-ay*bx; o[3]=aw*bw-ax*bx-ay*by-az*bz;
    return o;
  },
  slerp: (o: Quat, a: Quat, b: Quat, t: number): Quat => {
    let cosHalf = a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];
    let bx=b[0],by=b[1],bz=b[2],bw=b[3];
    if (cosHalf<0){ cosHalf=-cosHalf; bx=-bx; by=-by; bz=-bz; bw=-bw; }
    if (cosHalf>=1){ o[0]=a[0];o[1]=a[1];o[2]=a[2];o[3]=a[3]; return o; }
    const sin2 = Math.sqrt(1-cosHalf*cosHalf);
    if (sin2<0.001){ o[0]=a[0]*0.5+bx*0.5;o[1]=a[1]*0.5+by*0.5;o[2]=a[2]*0.5+bz*0.5;o[3]=a[3]*0.5+bw*0.5; return o; }
    const half=Math.acos(cosHalf), rA=Math.sin((1-t)*half)/sin2, rB=Math.sin(t*half)/sin2;
    o[0]=a[0]*rA+bx*rB; o[1]=a[1]*rA+by*rB; o[2]=a[2]*rA+bz*rB; o[3]=a[3]*rA+bw*rB;
    return o;
  },
  setAxisAngle: (o: Quat, axis: Vec3, rad: number): Quat => {
    const s=Math.sin(rad/2); o[0]=axis[0]*s; o[1]=axis[1]*s; o[2]=axis[2]*s; o[3]=Math.cos(rad/2); return o;
  },
  conjugate: (o: Quat, a: Quat): Quat => { o[0]=-a[0]; o[1]=-a[1]; o[2]=-a[2]; o[3]=a[3]; return o; },
};

// ── mat4 ────────────────────────────────────────────────────────────────────
const mat4 = {
  create: (): Mat4 => { const m=new Float32Array(16); m[0]=m[5]=m[10]=m[15]=1; return m; },
  identity: (o: Mat4): Mat4 => {
    for(let i=0;i<16;i++) o[i]=0; o[0]=o[5]=o[10]=o[15]=1; return o;
  },
  copy: (o: Mat4, a: Mat4): Mat4 => { for(let i=0;i<16;i++) o[i]=a[i]; return o; },
  multiply: (o: Mat4, a: Mat4, b: Mat4): Mat4 => {
    const a00=a[0],a01=a[1],a02=a[2],a03=a[3], a10=a[4],a11=a[5],a12=a[6],a13=a[7];
    const a20=a[8],a21=a[9],a22=a[10],a23=a[11], a30=a[12],a31=a[13],a32=a[14],a33=a[15];
    let b0=b[0],b1=b[1],b2=b[2],b3=b[3];
    o[0]=b0*a00+b1*a10+b2*a20+b3*a30; o[1]=b0*a01+b1*a11+b2*a21+b3*a31;
    o[2]=b0*a02+b1*a12+b2*a22+b3*a32; o[3]=b0*a03+b1*a13+b2*a23+b3*a33;
    b0=b[4];b1=b[5];b2=b[6];b3=b[7];
    o[4]=b0*a00+b1*a10+b2*a20+b3*a30; o[5]=b0*a01+b1*a11+b2*a21+b3*a31;
    o[6]=b0*a02+b1*a12+b2*a22+b3*a32; o[7]=b0*a03+b1*a13+b2*a23+b3*a33;
    b0=b[8];b1=b[9];b2=b[10];b3=b[11];
    o[8]=b0*a00+b1*a10+b2*a20+b3*a30; o[9]=b0*a01+b1*a11+b2*a21+b3*a31;
    o[10]=b0*a02+b1*a12+b2*a22+b3*a32; o[11]=b0*a03+b1*a13+b2*a23+b3*a33;
    b0=b[12];b1=b[13];b2=b[14];b3=b[15];
    o[12]=b0*a00+b1*a10+b2*a20+b3*a30; o[13]=b0*a01+b1*a11+b2*a21+b3*a31;
    o[14]=b0*a02+b1*a12+b2*a22+b3*a32; o[15]=b0*a03+b1*a13+b2*a23+b3*a33;
    return o;
  },
  invert: (o: Mat4, a: Mat4): Mat4 => {
    const a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7];
    const a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
    const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10;
    const b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12;
    const b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30;
    const b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;
    let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
    if(!det) return o; det=1/det;
    o[0]=(a11*b11-a12*b10+a13*b09)*det; o[1]=(a02*b10-a01*b11-a03*b09)*det;
    o[2]=(a31*b05-a32*b04+a33*b03)*det; o[3]=(a22*b04-a21*b05-a23*b03)*det;
    o[4]=(a12*b08-a10*b11-a13*b07)*det; o[5]=(a00*b11-a02*b08+a03*b07)*det;
    o[6]=(a32*b02-a30*b05-a33*b01)*det; o[7]=(a20*b05-a22*b02+a23*b01)*det;
    o[8]=(a10*b10-a11*b08+a13*b06)*det; o[9]=(a01*b08-a00*b10-a03*b06)*det;
    o[10]=(a30*b04-a31*b02+a33*b00)*det; o[11]=(a21*b02-a20*b04-a23*b00)*det;
    o[12]=(a11*b07-a10*b09-a12*b06)*det; o[13]=(a00*b09-a01*b07+a02*b06)*det;
    o[14]=(a31*b01-a30*b03-a32*b00)*det; o[15]=(a20*b03-a21*b01+a22*b00)*det;
    return o;
  },
  perspective: (o: Mat4, fovy: number, aspect: number, near: number, far: number): Mat4 => {
    const f=1/Math.tan(fovy/2), nf=1/(near-far);
    for(let i=0;i<16;i++) o[i]=0;
    o[0]=f/aspect; o[5]=f; o[10]=(far+near)*nf; o[11]=-1; o[14]=2*far*near*nf;
    return o;
  },
  targetTo: (o: Mat4, eye: ArrayLike<number>, target: ArrayLike<number>, up: ArrayLike<number>): Mat4 => {
    let ex=eye[0],ey=eye[1],ez=eye[2];
    let zx=ex-target[0], zy=ey-target[1], zz=ez-target[2];
    let len=zx*zx+zy*zy+zz*zz;
    if(len>0){len=1/Math.sqrt(len); zx*=len; zy*=len; zz*=len;}
    let xx=up[1]*zz-up[2]*zy, xy=up[2]*zx-up[0]*zz, xz=up[0]*zy-up[1]*zx;
    len=xx*xx+xy*xy+xz*xz;
    if(len>0){len=1/Math.sqrt(len); xx*=len; xy*=len; xz*=len;}
    o[0]=xx;  o[1]=xy;  o[2]=xz;  o[3]=0;
    o[4]=zy*xz-zz*xy; o[5]=zz*xx-zx*xz; o[6]=zx*xy-zy*xx; o[7]=0;
    o[8]=zx;  o[9]=zy;  o[10]=zz; o[11]=0;
    o[12]=ex; o[13]=ey; o[14]=ez; o[15]=1;
    return o;
  },
  fromTranslation: (o: Mat4, v: ArrayLike<number>): Mat4 => {
    mat4.identity(o); o[12]=v[0]; o[13]=v[1]; o[14]=v[2]; return o;
  },
  fromScaling: (o: Mat4, v: ArrayLike<number>): Mat4 => {
    mat4.identity(o); o[0]=v[0]; o[5]=v[1]; o[10]=v[2]; return o;
  },
};

// ---------------------------------------------------------------------------
// Render Loop Scratchpads (Eliminates GC Pauses)
// ---------------------------------------------------------------------------
const _v0 = vec3.create();
const _v1 = vec3.create();
const _m0 = mat4.create();
const _m1 = mat4.create();
const _m2 = mat4.create();
const _m3 = mat4.create();

// ---------------------------------------------------------------------------
// GLSL shaders
// ---------------------------------------------------------------------------
const discVertShaderSource = `#version 300 es
uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPosition;
uniform vec4 uRotationAxisVelocity;

in vec3 aModelPosition;
in vec3 aModelNormal;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;
in int  aItemIndex;

out vec2 vUvs;
out float vAlpha;
flat out int vItemIndex;

#define PI 3.141593

void main() {
    vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);
    vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;
    float radius = length(centerPos.xyz);

    if (gl_VertexID > 0) {
        vec3 rotationAxis = uRotationAxisVelocity.xyz;
        float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);
        vec3 stretchDir = normalize(cross(centerPos, rotationAxis));
        vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
        float strength = dot(stretchDir, relativeVertexPos);
        float invAbsStrength = min(0., abs(strength) - 1.);
        strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);
        worldPosition.xyz += stretchDir * strength;
    }

    worldPosition.xyz = radius * normalize(worldPosition.xyz);
    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
    vAlpha = smoothstep(0.5, 1., normalize(worldPosition.xyz).z) * .9 + .1;
    vUvs = aModelUvs;
    vItemIndex = aItemIndex;
}`;

const discFragShaderSource = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;

out vec4 outColor;
in vec2 vUvs;
in float vAlpha;
flat in int vItemIndex;

void main() {
    int itemIndex = vItemIndex;
    int cellsPerRow = uAtlasSize;
    int cellX = itemIndex % cellsPerRow;
    int cellY = itemIndex / cellsPerRow;
    vec2 cellSize = vec2(1.0) / vec2(float(cellsPerRow));
    vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;

    ivec2 texSize = textureSize(uTex, 0);
    float imageAspect = float(texSize.x) / float(texSize.y);
    float scale = max(imageAspect / 1.0, 1.0 / imageAspect);

    vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);
    st = (st - 0.5) * scale + 0.5;
    st = clamp(st, 0.0, 1.0);
    st = st * cellSize + cellOffset;

    outColor = texture(uTex, st);
    outColor.a *= vAlpha;
}`;

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------
class Face { constructor(public a: number, public b: number, public c: number) {} }

class Vertex {
  public position: Vec3;
  public normal: Vec3;
  public uv: Vec2;
  constructor(x: number, y: number, z: number) {
    this.position = vec3.fromValues(x, y, z);
    this.normal   = vec3.create();
    this.uv       = vec2.create();
  }
}

class Geometry {
  public vertices: Vertex[] = [];
  public faces:    Face[]   = [];

  addVertex(...args: number[]): this {
    for (let i = 0; i < args.length; i += 3)
      this.vertices.push(new Vertex(args[i], args[i+1], args[i+2]));
    return this;
  }
  addFace(...args: number[]): this {
    for (let i = 0; i < args.length; i += 3)
      this.faces.push(new Face(args[i], args[i+1], args[i+2]));
    return this;
  }
  get lastVertex(): Vertex { return this.vertices[this.vertices.length - 1]; }

  subdivide(divisions = 1): this {
    const cache: Record<string, number> = {};
    let f = this.faces;
    for (let d = 0; d < divisions; ++d) {
      const next: Face[] = [];
      f.forEach(face => {
        const mAB = this.midPoint(face.a, face.b, cache);
        const mBC = this.midPoint(face.b, face.c, cache);
        const mCA = this.midPoint(face.c, face.a, cache);
        next.push(
          new Face(face.a, mAB, mCA), new Face(face.b, mBC, mAB),
          new Face(face.c, mCA, mBC), new Face(mAB,   mBC, mCA)
        );
      });
      f = next;
    }
    this.faces = f;
    return this;
  }

  spherize(radius = 1): this {
    this.vertices.forEach(v => {
      vec3.normalize(v.normal, v.position);
      vec3.scale(v.position, v.normal, radius);
    });
    return this;
  }

  get data() {
    return {
      vertices: new Float32Array(this.vertices.flatMap(v => [v.position[0], v.position[1], v.position[2]])),
      indices:  new Uint16Array(this.faces.flatMap(f => [f.a, f.b, f.c])),
      normals:  new Float32Array(this.vertices.flatMap(v => [v.normal[0],   v.normal[1],   v.normal[2]])),
      uvs:      new Float32Array(this.vertices.flatMap(v => [v.uv[0],       v.uv[1]])),
    };
  }

  private midPoint(ndxA: number, ndxB: number, cache: Record<string, number>): number {
    const key = ndxA < ndxB ? `${ndxB}_${ndxA}` : `${ndxA}_${ndxB}`;
    if (key in cache) return cache[key];
    const a = this.vertices[ndxA].position, b = this.vertices[ndxB].position;
    const ndx = this.vertices.length;
    cache[key] = ndx;
    this.addVertex((a[0]+b[0])*.5, (a[1]+b[1])*.5, (a[2]+b[2])*.5);
    return ndx;
  }
}

class IcosahedronGeometry extends Geometry {
  constructor() {
    super();
    const t = Math.sqrt(5)*.5+.5;
    this.addVertex(
      -1,t,0, 1,t,0, -1,-t,0, 1,-t,0,
       0,-1,t, 0,1,t, 0,-1,-t, 0,1,-t,
       t,0,-1, t,0,1, -t,0,-1, -t,0,1
    ).addFace(
      0,11,5, 0,5,1,  0,1,7,  0,7,10, 0,10,11,
      1,5,9,  5,11,4, 11,10,2, 10,7,6, 7,1,8,
      3,9,4,  3,4,2,  3,2,6,  3,6,8,  3,8,9,
      4,9,5,  2,4,11, 6,2,10, 8,6,7,  9,8,1
    );
  }
}

class DiscGeometry extends Geometry {
  constructor(steps = 4, radius = 1) {
    super();
    const s = Math.max(4, steps);
    const alpha = (2 * Math.PI) / s;
    this.addVertex(0, 0, 0);
    this.lastVertex.uv[0] = 0.5; this.lastVertex.uv[1] = 0.5;
    for (let i = 0; i < s; ++i) {
      const x = Math.cos(alpha * i), y = Math.sin(alpha * i);
      this.addVertex(radius * x, radius * y, 0);
      this.lastVertex.uv[0] = x * .5 + .5;
      this.lastVertex.uv[1] = y * .5 + .5;
      if (i > 0) this.addFace(0, i, i + 1);
    }
    this.addFace(0, s, 1);
  }
}

// ---------------------------------------------------------------------------
// WebGL helpers
// ---------------------------------------------------------------------------
function createShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type); if (!s) return null;
  gl.shaderSource(s, src); gl.compileShader(s);
  if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
  console.error(gl.getShaderInfoLog(s)); gl.deleteShader(s); return null;
}

function createProgram(
  gl: WebGL2RenderingContext,
  sources: [string, string],
  attribLocs?: Record<string, number>
): WebGLProgram | null {
  const p = gl.createProgram(); if (!p) return null;
  [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].forEach((t, i) => {
    const s = createShader(gl, t, sources[i]); if (s) gl.attachShader(p, s);
  });
  if (attribLocs) for (const a in attribLocs)
    gl.bindAttribLocation(p, attribLocs[a], a);
  gl.linkProgram(p);
  if (gl.getProgramParameter(p, gl.LINK_STATUS)) return p;
  console.error(gl.getProgramInfoLog(p)); gl.deleteProgram(p); return null;
}

function makeVAO(
  gl: WebGL2RenderingContext,
  pairs: Array<[WebGLBuffer, number, number]>,
  indices?: Uint16Array
): WebGLVertexArrayObject | null {
  const va = gl.createVertexArray(); if (!va) return null;
  gl.bindVertexArray(va);
  for (const [buf, loc, n] of pairs) {
    if (loc < 0) continue;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0);
  }
  if (indices) {
    const ib = gl.createBuffer();
    if (ib) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW); }
  }
  gl.bindVertexArray(null);
  return va;
}

function makeBuffer(gl: WebGL2RenderingContext, data: number | ArrayBufferView, usage: number): WebGLBuffer {
  const b = gl.createBuffer(); if (!b) throw new Error('buffer fail');
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  if (typeof data === 'number') gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  else gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return b;
}

function makeTex(gl: WebGL2RenderingContext, min: number, mag: number, wS: number, wT: number): WebGLTexture {
  const t = gl.createTexture(); if (!t) throw new Error('tex fail');
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wS);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mag);
  return t;
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(canvas.clientWidth * dpr);
  const h = Math.round(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
}

// ---------------------------------------------------------------------------
// ArcballControl
// ---------------------------------------------------------------------------
class ArcballControl {
  isPointerDown  = false;
  orientation    = quat.create();
  pointerRotation= quat.create();
  rotationVelocity = 0;
  rotationAxis   = vec3.fromValues(1, 0, 0);
  snapDirection  = vec3.fromValues(0, 0, -1);
  snapTargetDirection: Vec3 | null = null;

  private pos  = vec2.create();
  private prev = vec2.create();
  private _rv  = 0;
  private _cq  = quat.create();
  private readonly IDENT = quat.create();
  private handlers: { [key: string]: EventListenerOrEventListenerObject };

  constructor(private canvas: HTMLCanvasElement, private cb: (dt: number)=>void = ()=>{}) {
    this.handlers = {
      pointerdown: ((e: PointerEvent) => {
        vec2.set(this.pos, e.clientX, e.clientY);
        vec2.copy(this.prev, this.pos);
        this.isPointerDown = true;
      }) as EventListener,
      pointerup: (() => { this.isPointerDown = false; }) as EventListener,
      pointerleave: (() => { this.isPointerDown = false; }) as EventListener,
      pointermove: ((e: PointerEvent) => {
        if (this.isPointerDown) vec2.set(this.pos, e.clientX, e.clientY);
      }) as EventListener
    };

    canvas.addEventListener('pointerdown', this.handlers.pointerdown);
    window.addEventListener('pointerup', this.handlers.pointerup);
    canvas.addEventListener('pointerleave', this.handlers.pointerleave);
    window.addEventListener('pointermove', this.handlers.pointermove);
    canvas.style.touchAction = 'none';
  }

  dispose() {
    this.canvas.removeEventListener('pointerdown', this.handlers.pointerdown);
    window.removeEventListener('pointerup', this.handlers.pointerup);
    this.canvas.removeEventListener('pointerleave', this.handlers.pointerleave);
    window.removeEventListener('pointermove', this.handlers.pointermove);
  }

  update(dt: number, tfd = 16): void {
    const ts = dt / tfd + 1e-5;
    let af = ts;
    const snap = quat.create();

    if (this.isPointerDown) {
      const INT = 0.3 * ts, AMP = 5 / ts;
      const mid = vec2.sub(vec2.create(), this.pos, this.prev);
      vec2.scale(mid, mid, INT);
      if (vec2.sqrLen(mid) > 0.1) {
        vec2.add(mid, this.prev, mid);
        const a = vec3.normalize(vec3.create(), this.project(mid));
        const b = vec3.normalize(vec3.create(), this.project(this.prev));
        vec2.copy(this.prev, mid);
        af *= AMP;
        this.quatFromVecs(a, b, this.pointerRotation, af);
      } else {
        quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENT, INT);
      }
    } else {
      quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENT, 0.1 * ts);
      if (this.snapTargetDirection) {
        const sq  = vec3.squaredDistance(this.snapTargetDirection, this.snapDirection);
        const df  = Math.max(0.1, 1 - sq * 10);
        af *= 0.2 * df;
        this.quatFromVecs(this.snapTargetDirection, this.snapDirection, snap, af);
      }
    }

    const cq = quat.multiply(quat.create(), snap, this.pointerRotation);
    this.orientation = quat.multiply(quat.create(), cq, this.orientation);
    quat.normalize(this.orientation, this.orientation);

    quat.slerp(this._cq, this._cq, cq, 0.8 * ts);
    quat.normalize(this._cq, this._cq);

    const rad = Math.acos(Math.max(-1, Math.min(1, this._cq[3]))) * 2;
    const s   = Math.sin(rad / 2);
    let rv = 0;
    if (s > 1e-6) {
      rv = rad / (2 * Math.PI);
      this.rotationAxis[0] = this._cq[0] / s;
      this.rotationAxis[1] = this._cq[1] / s;
      this.rotationAxis[2] = this._cq[2] / s;
    }
    this._rv += (rv - this._rv) * 0.5 * ts;
    this.rotationVelocity = this._rv / ts;
    this.cb(dt);
  }

  private quatFromVecs(a: Vec3, b: Vec3, out: Quat, af = 1): void {
    const axis = vec3.normalize(vec3.create(), vec3.cross(vec3.create(), a, b));
    const d = Math.max(-1, Math.min(1, vec3.dot(a, b)));
    quat.setAxisAngle(out, axis, Math.acos(d) * af);
  }

  private project(pos: Vec2): Vec3 {
    const r = 2, w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const s = Math.max(w, h) - 1;
    const x = (2 * pos[0] - w - 1) / s;
    const y = (2 * pos[1] - h - 1) / s;
    const xySq = x*x + y*y, rSq = r*r;
    const z = xySq <= rSq/2 ? Math.sqrt(rSq - xySq) : rSq / Math.sqrt(xySq);
    return vec3.fromValues(-x, y, z);
  }
}

// ---------------------------------------------------------------------------
// InfiniteGridMenu (WebGL engine)
// ---------------------------------------------------------------------------
interface MenuItem { image: string; link: string; title: string; description: string; }

interface Camera {
  matrix: Mat4; near: number; far: number; fov: number; aspect: number;
  position: Vec3; up: Vec3;
  matrices: { view: Mat4; projection: Mat4; inversProjection: Mat4 };
}

class InfiniteGridMenu {
  private gl:      WebGL2RenderingContext | null = null;
  private prog:    WebGLProgram | null = null;
  private vao:     WebGLVertexArrayObject | null = null;
  private bufs!:   { vertices: Float32Array; indices: Uint16Array; normals: Float32Array; uvs: Float32Array };
  private tex:     WebGLTexture | null = null;
  private ctrl!:   ArcballControl;
  private locs!:   Record<string, number | WebGLUniformLocation | null>;
  private inst!:        { arr: Float32Array; mats: Float32Array[]; buf: WebGLBuffer | null };
  private idxBuf:  WebGLBuffer | null = null;
  private itemIndices:  Int32Array = new Int32Array(0);
  private pts:     Vec3[] = [];
  private COUNT  = 0;
  private atlas  = 1;
  private worldM = mat4.create();
  private t = 0; private dt = 0; private frames = 0;
  private moving = false;
  private TFD    = 1000 / 60;
  private SR     = 2;
  private rAF: number = 0;

  public camera: Camera = {
    matrix: mat4.create(), near: 0.1, far: 40, fov: Math.PI/4, aspect: 1,
    position: vec3.fromValues(0, 0, 3), up: vec3.fromValues(0, 1, 0),
    matrices: { view: mat4.create(), projection: mat4.create(), inversProjection: mat4.create() },
  };
  public smoothRV  = 0;
  public scaleFactor = 1;

  constructor(
    private canvas: HTMLCanvasElement,
    private items:  MenuItem[],
    private onActive: (i: number) => void,
    private onMoving: (m: boolean) => void,
    onInit?: (inst: InfiniteGridMenu) => void,
    scale = 1
  ) {
    this.scaleFactor = scale;
    this.camera.position[2] = 3 * scale;
    this.setup(onInit);
  }

  dispose(): void {
    if (this.rAF) cancelAnimationFrame(this.rAF);
    if (this.ctrl) this.ctrl.dispose();
    if (this.gl) {
      if (this.prog) this.gl.deleteProgram(this.prog);
      if (this.vao) this.gl.deleteVertexArray(this.vao);
      if (this.tex) this.gl.deleteTexture(this.tex);
      if (this.inst && this.inst.buf) this.gl.deleteBuffer(this.inst.buf);
      if (this.idxBuf) this.gl.deleteBuffer(this.idxBuf);
    }
  }

  resize(): void {
    resizeCanvas(this.canvas);
    if (!this.gl) return;
    this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    this.updateProj();
  }

  run(time = 0): void {
    this.dt = Math.min(32, time - this.t);
    this.t  = time;
    this.frames += this.dt / this.TFD;
    this.animate(this.dt);
    this.render();
    this.rAF = requestAnimationFrame(t => this.run(t));
  }

  private setup(onInit?: (inst: InfiniteGridMenu) => void): void {
    const gl = this.canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!gl) throw new Error('No WebGL2');
    this.gl = gl;

    this.prog = createProgram(gl, [discVertShaderSource, discFragShaderSource], {
      aModelPosition: 0, aModelNormal: 1, aModelUvs: 2, aInstanceMatrix: 3, aItemIndex: 7,
    });
    if (!this.prog) throw new Error('Shader link failed');

    const p = this.prog;
    this.locs = {
      aModelPosition:       gl.getAttribLocation(p, 'aModelPosition'),
      aModelUvs:            gl.getAttribLocation(p, 'aModelUvs'),
      aInstanceMatrix:      gl.getAttribLocation(p, 'aInstanceMatrix'),
      aItemIndex:           gl.getAttribLocation(p, 'aItemIndex'),
      uWorldMatrix:         gl.getUniformLocation(p, 'uWorldMatrix'),
      uViewMatrix:          gl.getUniformLocation(p, 'uViewMatrix'),
      uProjectionMatrix:    gl.getUniformLocation(p, 'uProjectionMatrix'),
      uCameraPosition:      gl.getUniformLocation(p, 'uCameraPosition'),
      uScaleFactor:         gl.getUniformLocation(p, 'uScaleFactor'),
      uRotationAxisVelocity:gl.getUniformLocation(p, 'uRotationAxisVelocity'),
      uTex:                 gl.getUniformLocation(p, 'uTex'),
      uFrames:              gl.getUniformLocation(p, 'uFrames'),
      uItemCount:           gl.getUniformLocation(p, 'uItemCount'),
      uAtlasSize:           gl.getUniformLocation(p, 'uAtlasSize'),
    };

    const disc = new DiscGeometry(56, 1);
    this.bufs = disc.data;
    this.vao  = makeVAO(gl, [
      [makeBuffer(gl, this.bufs.vertices, gl.STATIC_DRAW), this.locs.aModelPosition as number, 3],
      [makeBuffer(gl, this.bufs.uvs,      gl.STATIC_DRAW), this.locs.aModelUvs      as number, 2],
    ], this.bufs.indices);

    const ico = new IcosahedronGeometry();
    ico.subdivide(1).spherize(this.SR);
    this.pts   = ico.vertices.map(v => v.position);
    this.COUNT = this.pts.length;

    this.initInstances();
    this.initTexture();

    this.ctrl = new ArcballControl(this.canvas, dt => this.onCtrl(dt));
    this.updateCam();
    this.updateProj();
    this.resize();
    if (onInit) onInit(this);
  }

  private initTexture(): void {
    if (!this.gl) return;
    const gl = this.gl;
    this.tex = makeTex(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);

    const n    = Math.max(1, this.items.length);
    this.atlas = Math.ceil(Math.sqrt(n));
    const cell = 512;
    const cvs  = document.createElement('canvas');
    cvs.width  = this.atlas * cell;
    cvs.height = this.atlas * cell;
    const ctx  = cvs.getContext('2d')!;

    Promise.all(this.items.map(item => new Promise<HTMLImageElement>(res => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => res(img);
      img.onerror = () => res(new Image(cell, cell));
      img.src = item.image;
    }))).then(imgs => {
      imgs.forEach((img, i) => {
        const x = (i % this.atlas) * cell;
        const y = Math.floor(i / this.atlas) * cell;
        try { ctx.drawImage(img, x, y, cell, cell); } catch { /* skip */ }
      });
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cvs);
      gl.generateMipmap(gl.TEXTURE_2D);
    });
  }

  private initInstances(): void {
    if (!this.gl || !this.vao) return;
    const gl  = this.gl;
    const arr = new Float32Array(this.COUNT * 16);
    const mats: Float32Array[] = [];
    for (let i = 0; i < this.COUNT; ++i) {
      const m = new Float32Array(arr.buffer, i * 64, 16);
      mat4.identity(m as unknown as Mat4);
      mats.push(m);
    }
    this.inst = { arr, mats, buf: gl.createBuffer() };
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.inst.buf);
    gl.bufferData(gl.ARRAY_BUFFER, arr.byteLength, gl.DYNAMIC_DRAW);
    for (let j = 0; j < 4; ++j) {
      const loc = (this.locs.aInstanceMatrix as number) + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 64, j * 16);
      gl.vertexAttribDivisor(loc, 1);
    }

    const n = Math.max(1, this.items.length);
    const indexArr = new Int32Array(this.COUNT);
    for (let i = 0; i < this.COUNT; ++i) indexArr[i] = i % n;
    for (let i = this.COUNT - 1; i > 0; --i) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = indexArr[i]; indexArr[i] = indexArr[j]; indexArr[j] = tmp;
    }
    this.itemIndices = indexArr;

    this.idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.idxBuf);
    gl.bufferData(gl.ARRAY_BUFFER, indexArr, gl.STATIC_DRAW);
    const idxLoc = this.locs.aItemIndex as number;
    gl.enableVertexAttribArray(idxLoc);
    gl.vertexAttribIPointer(idxLoc, 1, gl.INT, 0, 0);
    gl.vertexAttribDivisor(idxLoc, 1);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  }

  private animate(dt: number): void {
    if (!this.gl) return;
    this.ctrl.update(dt, this.TFD);

    const SCALE       = 0.25;
    const SCALE_LERP  = 0.6;

    for (let i = 0; i < this.COUNT; ++i) {
      const p = vec3.transformQuat(_v0, this.pts[i], this.ctrl.orientation);
      const s  = (Math.abs(p[2]) / this.SR) * SCALE_LERP + (1 - SCALE_LERP);
      const fs = s * SCALE;
      const T1 = mat4.fromTranslation(_m0, vec3.negate(_v1, p));
      const TGT = mat4.targetTo(_m1, [0, 0, 0], [p[0], p[1], p[2]], [0, 1, 0]);
      const S = mat4.fromScaling(_m2, [fs, fs, fs]);
      const T2 = mat4.fromTranslation(_m3, [0, 0, -this.SR]);
      const m = this.inst.mats[i] as unknown as Mat4;
      mat4.multiply(m, T1, TGT);
      mat4.multiply(m, m, S);
      mat4.multiply(m, m, T2);
    }

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.inst.buf);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.inst.arr);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
    this.smoothRV = this.ctrl.rotationVelocity;
  }

  private render(): void {
    if (!this.gl || !this.prog) return;
    const gl = this.gl;
    gl.useProgram(this.prog);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const u = this.locs;
    gl.uniformMatrix4fv(u.uWorldMatrix      as WebGLUniformLocation, false, this.worldM);
    gl.uniformMatrix4fv(u.uViewMatrix       as WebGLUniformLocation, false, this.camera.matrices.view);
    gl.uniformMatrix4fv(u.uProjectionMatrix as WebGLUniformLocation, false, this.camera.matrices.projection);
    gl.uniform3f(u.uCameraPosition as WebGLUniformLocation,
      this.camera.position[0], this.camera.position[1], this.camera.position[2]);
    gl.uniform4f(u.uRotationAxisVelocity as WebGLUniformLocation,
      this.ctrl.rotationAxis[0], this.ctrl.rotationAxis[1],
      this.ctrl.rotationAxis[2], this.smoothRV * 1.1);
    gl.uniform1i(u.uItemCount  as WebGLUniformLocation, this.items.length);
    gl.uniform1i(u.uAtlasSize  as WebGLUniformLocation, this.atlas);
    gl.uniform1f(u.uFrames     as WebGLUniformLocation, this.frames);
    gl.uniform1f(u.uScaleFactor as WebGLUniformLocation, this.scaleFactor);
    gl.uniform1i(u.uTex        as WebGLUniformLocation, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.bindVertexArray(this.vao);
    gl.drawElementsInstanced(gl.TRIANGLES, this.bufs.indices.length, gl.UNSIGNED_SHORT, 0, this.COUNT);
    gl.bindVertexArray(null);
  }

  private updateCam(): void {
    mat4.targetTo(
      this.camera.matrix,
      [this.camera.position[0], this.camera.position[1], this.camera.position[2]],
      [0, 0, 0],
      [this.camera.up[0], this.camera.up[1], this.camera.up[2]]
    );
    mat4.invert(this.camera.matrices.view, this.camera.matrix);
  }

  private updateProj(): void {
    if (!this.gl) return;
    const cvs = this.gl.canvas as HTMLCanvasElement;
    this.camera.aspect = cvs.clientWidth / cvs.clientHeight;
    const h = this.SR * 0.35, d = this.camera.position[2];
    this.camera.fov = this.camera.aspect > 1
      ? 2 * Math.atan(h / d)
      : 2 * Math.atan(h / this.camera.aspect / d);
    mat4.perspective(this.camera.matrices.projection,
      this.camera.fov, this.camera.aspect, this.camera.near, this.camera.far);
    mat4.invert(this.camera.matrices.inversProjection, this.camera.matrices.projection);
  }

  private onCtrl(dt: number): void {
    const ts   = dt / this.TFD + 1e-4;
    let damp   = 5 / ts;
    let ctz    = 3 * this.scaleFactor;
    const mov  = this.ctrl.isPointerDown || Math.abs(this.smoothRV) > 0.01;
    if (mov !== this.moving) { this.moving = mov; this.onMoving(mov); }

    if (!this.ctrl.isPointerDown) {
      const ni = this.nearestVertex();
      this.onActive(this.itemIndices[ni] ?? ni % Math.max(1, this.items.length));
      this.ctrl.snapTargetDirection = vec3.normalize(vec3.create(), this.worldPos(ni));
    } else {
      ctz  += this.ctrl.rotationVelocity * 80 + 2.5;
      damp  = 7 / ts;
    }
    this.camera.position[2] += (ctz - this.camera.position[2]) / damp;
    this.updateCam();
  }

  private nearestVertex(): number {
    const inv = quat.conjugate(quat.create(), this.ctrl.orientation);
    const nt  = vec3.transformQuat(vec3.create(), this.ctrl.snapDirection, inv);
    let maxD  = -Infinity, best = 0;
    for (let i = 0; i < this.pts.length; ++i) {
      const d = vec3.dot(nt, this.pts[i]);
      if (d > maxD) { maxD = d; best = i; }
    }
    return best;
  }

  private worldPos(i: number): Vec3 {
    return vec3.transformQuat(vec3.create(), this.pts[i], this.ctrl.orientation);
  }
}

// ---------------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------------

const DEFAULT_ITEMS: MenuItem[] = [
  { image: 'https://picsum.photos/900/900?grayscale', link: '/', title: '', description: '' },
];

interface InfiniteMenuProps {
  items?: MenuItem[];
  scale?: number;
}

// ---------------------------------------------------------------------------
// Responsive CSS — mobile overlap fixed
// ---------------------------------------------------------------------------
const MENU_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');

  .im-root {
    font-family: 'DM Sans', sans-serif;
    /* Prevent text selection while dragging on all devices */
    user-select: none;
    -webkit-user-select: none;
  }

  /* ── Panel transition base ── */
  .im-panel {
    transition:
      opacity 0.42s cubic-bezier(.22,1,.36,1),
      transform 0.42s cubic-bezier(.22,1,.36,1);
  }
  .im-panel.hidden {
    opacity: 0 !important;
    pointer-events: none;
  }

  /* ── Glass card base ── */
  .im-glass {
    background: rgba(255,255,255,0.04);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(247,202,201,0.15);
    box-shadow: 0 8px 32px rgba(119,140,163,0.12);
  }

  /* ── LEFT panel ── */
  .im-left-panel {
    position: absolute;
    top: 50%;
    left: clamp(8px, 2.5vw, 48px);
    transform: translateY(-50%);
    border-radius: clamp(12px, 2vw, 24px);
    padding: clamp(10px, 2vw, 22px) clamp(10px, 2vw, 24px) clamp(12px, 2vw, 24px);
    /* Min reduced from 140px → 96px so it never crowds the globe on narrow viewports */
    width: clamp(96px, 26vw, 260px);
    max-width: calc(44vw - 12px);
    z-index: 10;
    box-sizing: border-box;
  }

  /* ── RIGHT panel ── */
  .im-right-panel {
    position: absolute;
    top: 50%;
    right: clamp(8px, 2.5vw, 48px);
    transform: translateY(-50%);
    border-radius: clamp(12px, 2vw, 24px);
    padding: clamp(10px, 1.8vw, 20px) clamp(10px, 1.8vw, 22px);
    width: clamp(96px, 22vw, 200px);
    max-width: calc(44vw - 12px);
    z-index: 10;
    text-align: right;
    box-sizing: border-box;
  }

  /* ── Hide right panel + tighten left on mobile ── */
  @media (max-width: 480px) {
    .im-right-panel { display: none; }

    /*
     * Left panel: hard-cap to 40% of viewport so it can never reach the
     * globe center regardless of product-name length.
     * overflow:hidden clips anything that would otherwise push it wider.
     */
    .im-left-panel {
      left: 8px;
      width: auto;
      max-width: calc(40vw);
      padding: 7px 9px 9px;
      border-radius: 11px;
      overflow: hidden;        /* ← prevents content from expanding the box */
    }

    /*
     * Title: clamp to 2 lines max via line-clamp.
     * This is the critical rule — without it a long name like
     * "black vincent chase" forces the panel to grow indefinitely.
     */
    .im-title {
      font-size: clamp(0.68rem, 3.4vw, 0.9rem) !important;
      overflow: hidden !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
      word-break: break-word;
    }

    /* Eyebrow label */
    .im-eyebrow {
      font-size: 5.5px !important;
      letter-spacing: 0.18em !important;
      margin-bottom: 3px !important;
      gap: 4px;
    }

    /* Dot — slightly smaller */
    .im-dot {
      width: 4px;
      height: 4px;
    }

    /* Divider rule */
    .im-rule {
      width: 14px !important;
      margin: 4px 0 !important;
    }

    /* CTA button — compact but still tappable */
    .im-cta {
      padding: 6px 9px !important;
      font-size: 5.5px !important;
      letter-spacing: 0.15em !important;
      min-height: 34px !important;
      gap: 3px !important;
      white-space: nowrap;
    }
    .im-cta svg {
      width: 9px !important;
      height: 9px !important;
    }

    /* Bottom bar */
    .im-bottom-bar {
      bottom: 8px;
      padding: 5px 10px;
      gap: 7px;
    }

    /* Arrow button */
    .im-bottom-arrow-btn {
      width: 26px;
      height: 26px;
      min-width: 26px;
      min-height: 26px;
    }
  }

  /* ── Product title ── */
  .im-title {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: clamp(1.0rem, 3.8vw, 3.2rem);
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: #f8fafc;
    margin: 0;
    word-break: break-word;
    text-shadow: 0 2px 24px rgba(0,0,0,0.5);
  }

  /* ── Eyebrow ── */
  .im-eyebrow {
    font-size: clamp(7px, 1.3vw, 9px);
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: rgba(248,250,252,0.5);
    font-weight: 600;
    margin: 0 0 clamp(6px, 1vw, 10px);
    display: flex;
    align-items: center;
    gap: 7px;
  }

  /* ── Thin rule ── */
  .im-rule {
    width: clamp(16px, 2.5vw, 32px);
    height: 1px;
    background: rgba(248,250,252,0.35);
    margin: clamp(6px, 1.2vw, 14px) 0;
  }

  /* ── Description (right panel) ── */
  .im-desc {
    font-size: clamp(0.65rem, 1.5vw, 0.85rem);
    line-height: 1.65;
    letter-spacing: 0.01em;
    color: rgba(248,250,252,0.72);
    margin: 0;
    text-align: right;
    word-break: break-word;
  }
  .im-desc-label {
    font-size: clamp(6px, 1.1vw, 8px);
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: rgba(248,250,252,0.38);
    font-weight: 600;
    display: block;
    margin-bottom: 6px;
    text-align: right;
  }

  /* ── In-stock badge ── */
  .im-stock-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: clamp(3px, 0.6vw, 5px) clamp(6px, 1.2vw, 10px);
    background: rgba(16,185,129,0.15);
    border: 1px solid rgba(16,185,129,0.3);
    border-radius: 100px;
    margin-top: clamp(8px, 1.5vw, 14px);
  }
  .im-stock-text {
    font-size: clamp(6px, 1vw, 8px);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #6ee7b7;
    font-weight: 600;
  }

  /* ── CTA button ── */
  .im-cta {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: clamp(8px, 1.5vw, 11px) clamp(12px, 2.5vw, 20px);
    background: #f8fafc;
    color: #0f172a;
    font-size: clamp(7px, 1.3vw, 9px);
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    border: none;
    border-radius: 100px;
    cursor: pointer;
    white-space: nowrap;
    box-shadow: 0 8px 32px rgba(0,0,0,0.35);
    transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    /* Minimum 44px touch target height */
    min-height: 44px;
  }
  .im-cta:hover {
    background: #e2e8f0;
    transform: scale(1.04);
    box-shadow: 0 12px 40px rgba(0,0,0,0.45);
  }
  /* Disable hover scale on touch — stays put */
  @media (hover: none) {
    .im-cta:hover { transform: none; }
    .im-cta:active { transform: scale(0.97); }
  }
  .im-cta svg { flex-shrink: 0; }

  /* ── Dot pulse ── */
  .im-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #10b981;
    display: inline-block;
    flex-shrink: 0;
    animation: imPulse 2s ease infinite;
  }
  @keyframes imPulse {
    0%,100% { opacity:1; transform:scale(1); }
    50%      { opacity:.5; transform:scale(.65); }
  }

  /* ── Bottom hint bar — full responsive ── */
  .im-bottom-bar {
    position: absolute;
    bottom: clamp(14px, 3vw, 32px);
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    align-items: center;
    gap: clamp(6px, 1.5vw, 12px);
    padding: clamp(7px, 1.5vw, 10px) clamp(12px, 2.5vw, 20px);
    background: rgba(255,255,255,0.07);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255,255,255,0.11);
    border-radius: 100px;
    /* Prevent the bar from being wider than the container */
    max-width: calc(100% - 32px);
    box-sizing: border-box;
    white-space: nowrap;
  }

  .im-bottom-arrow-btn {
    width: clamp(28px, 4.5vw, 34px);
    height: clamp(28px, 4.5vw, 34px);
    flex-shrink: 0;
    border-radius: 50%;
    background: #f8fafc;
    border: none;
    cursor: pointer;
    display: grid;
    place-items: center;
    color: #0f172a;
    transition: transform 0.2s ease;
    /* Ensure tap target */
    min-width: 28px;
    min-height: 28px;
  }
  .im-bottom-arrow-btn:hover { transform: scale(1.1); }
  @media (hover: none) {
    .im-bottom-arrow-btn:hover { transform: none; }
    .im-bottom-arrow-btn:active { transform: scale(0.93); }
  }

  .im-sep {
    width: 1px;
    height: clamp(16px, 2.5vw, 28px);
    background: rgba(248,250,252,0.18);
    flex-shrink: 0;
    align-self: center;
  }

  .im-hint-text {
    font-size: clamp(6px, 1.1vw, 8px);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: rgba(248,250,252,0.4);
    font-weight: 600;
    white-space: nowrap;
  }

  /* On very small phones: hide the drag hint, keep count + button */
  @media (max-width: 380px) {
    .im-hint-drag { display: none; }
    .im-sep-drag  { display: none; }
  }

  /* On small phones: hide count too, just show button */
  @media (max-width: 320px) {
    .im-hint-count { display: none; }
    .im-sep-count  { display: none; }
  }
`;

const InfiniteMenu: FC<InfiniteMenuProps> = ({ items = [], scale = 1.0 }) => {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [isMoving,   setIsMoving]   = useState(false);

  useEffect(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const menuItems = items.length ? items : DEFAULT_ITEMS;

    const sketch = new InfiniteGridMenu(
      canvas,
      menuItems,
      (i) => setActiveItem(menuItems[i % menuItems.length]),
      setIsMoving,
      sk => sk.run(),
      scale
    );

    const resizeObserver = new ResizeObserver(() => { sketch.resize(); });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      sketch.dispose();
    };
  }, [items, scale]);

  const handleClick = () => {
    if (!activeItem?.link) return;
    window.location.href = activeItem.link;
  };

  const show = activeItem && !isMoving;

  return (
    <div
      ref={containerRef}
      className="im-root relative w-full h-full select-none overflow-hidden"
    >
      <style dangerouslySetInnerHTML={{ __html: MENU_STYLES }} />

      <canvas
        ref={canvasRef}
        className="cursor-grab w-full h-full block outline-none active:cursor-grabbing"
      />

      {activeItem && (
        <>
          {/* ── LEFT: Product title panel ─────────────────────── */}
          <div
            className="im-panel im-glass im-left-panel"
            style={{
              transform: `translateY(-50%) translateX(${show ? '0' : '-12px'})`,
              opacity: show ? 1 : 0,
            }}
          >
            <p className="im-eyebrow">
              <span className="im-dot" />
              Now Viewing
            </p>
            <h2 className="im-title">{activeItem.title}</h2>
            <div className="im-rule" />
            <button
              onClick={handleClick}
              className="im-cta"
              aria-label={`Shop ${activeItem.title}`}
            >
              Shop Now
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>

          {/* ── RIGHT: Brand / description panel ──────────────── */}
          <div
            className="im-panel im-glass im-right-panel"
            style={{
              transform: `translateY(-50%) translateX(${show ? '0' : '12px'})`,
              opacity: show ? 1 : 0,
            }}
          >
            <span className="im-desc-label">Brand</span>
            <p className="im-desc">{activeItem.description || 'Icon Opticals'}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div className="im-stock-badge">
                <span className="im-dot" style={{ background: '#10b981' }} />
                <span className="im-stock-text">In Stock</span>
              </div>
            </div>
          </div>

          {/* ── BOTTOM CENTER: hint bar ────────────────────────── */}
          <div
            className="im-panel im-bottom-bar"
            style={{
              transform: `translateX(-50%) translateY(${show ? '0' : '10px'})`,
              opacity: show ? 1 : 0,
            }}
          >
            {/* Arrow button — always visible */}
            <button
              onClick={handleClick}
              aria-label={`View ${activeItem.title}`}
              className="im-bottom-arrow-btn"
              onMouseEnter={(e) => { if (window.matchMedia('(hover: hover)').matches) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="7" y1="17" x2="17" y2="7" />
                <polyline points="7 7 17 7 17 17" />
              </svg>
            </button>

            {/* Drag hint — hidden on very small phones */}
            <div className="im-sep im-sep-drag" />
            <span className="im-hint-text im-hint-drag">
              Drag to explore
            </span>

            {/* Item count — hidden on tiny phones */}
            <div className="im-sep im-sep-count" />
            <span className="im-hint-text im-hint-count">
              {items.length} pieces
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default InfiniteMenu;