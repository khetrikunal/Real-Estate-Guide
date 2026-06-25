import { useEffect, useRef } from 'react';
import './DarkVeil.css';

const vertex = `#version 300 es
in vec2 position;
void main(){gl_Position=vec4(position,0.0,1.0);}
`;

const fragment = `#version 300 es
precision mediump float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uHueShift;
uniform float uNoise;
uniform float uScan;
uniform float uScanFreq;
uniform float uWarp;
out vec4 outColor;
#define iTime uTime
#define iResolution uResolution

vec3 hueShiftRGB(vec3 color, float shift) {
    const vec3 k = vec3(0.57735, 0.57735, 0.57735);
    float cosAngle = cos(shift);
    return vec3(color * cosAngle + cross(k, color) * sin(shift) + k * dot(k, color) * (1.0 - cosAngle));
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec4 sigmoid(vec4 x) {
  return 1.0 / (1.0 + exp(-x));
}

void mainImage(out vec4 fragColor,in vec2 fragCoord){
    vec2 uv=fragCoord/uResolution.xy;
    vec2 p=uv*2.0-1.0;
    p.x*=uResolution.x/uResolution.y;
    p+=uWarp*vec2(sin(p.y*6.283+uTime*0.5),cos(p.x*6.283+uTime*0.5))*0.05;

    float waveA=sin((p.x*0.92+p.y*0.42+uTime*0.18)*6.283);
    float waveB=sin((p.x*-0.36+p.y*0.78-uTime*0.14)*6.283+sin(p.x*2.2+uTime*0.24));
    float waveC=sin(length(p-vec2(0.18,-0.12))*4.4-uTime*0.38);
    float veil=smoothstep(-0.36,0.92,waveA*0.48+waveB*0.36+waveC*0.20);
    float ribbon=exp(-abs((p.y+0.10)-0.22*sin(p.x*1.6+uTime*0.22))*4.8);
    float glow=exp(-length(p-vec2(-0.42,0.34))*1.9)+exp(-length(p-vec2(0.64,-0.24))*1.45);

    vec3 base=vec3(0.006,0.008,0.020);
    vec3 cobalt=vec3(0.020,0.190,0.520);
    vec3 violet=vec3(0.270,0.060,0.560);
    vec3 cyan=vec3(0.050,0.360,0.680);
    vec3 color=base+cobalt*veil*0.78+violet*ribbon*0.72+cyan*glow*0.18;
    color+=vec3(0.020,0.018,0.060)*(sin(uTime*0.20+p.x*2.0)+1.0)*0.22;
    fragColor=vec4(color,1.0);
}

void main(){
    vec4 col;mainImage(col,gl_FragCoord.xy);
    col.rgb=hueShiftRGB(col.rgb,uHueShift);
    float scanline_val=sin(gl_FragCoord.y*uScanFreq)*0.5+0.5;
    col.rgb*=1.-(scanline_val*scanline_val)*uScan;
    col.rgb+=(rand(gl_FragCoord.xy+uTime)-0.5)*uNoise;
    outColor=vec4(clamp(col.rgb,0.0,1.0),1.0);
}
`;

export interface DarkVeilProps {
  hueShift?: number;
  noiseIntensity?: number;
  scanlineIntensity?: number;
  speed?: number;
  scanlineFrequency?: number;
  warpAmount?: number;
  resolutionScale?: number;
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGL2RenderingContext) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertex);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragment);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

export default function DarkVeil({
  hueShift = 0,
  noiseIntensity = 0,
  scanlineIntensity = 0,
  speed = 0.5,
  scanlineFrequency = 0,
  warpAmount = 0,
  resolutionScale = 1,
}: DarkVeilProps) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    if (!gl) return;

    const program = createProgram(gl);
    if (!program) return;

    const positionLocation = gl.getAttribLocation(program, 'position');
    const uniforms = {
      resolution: gl.getUniformLocation(program, 'uResolution'),
      time: gl.getUniformLocation(program, 'uTime'),
      hueShift: gl.getUniformLocation(program, 'uHueShift'),
      noise: gl.getUniformLocation(program, 'uNoise'),
      scan: gl.getUniformLocation(program, 'uScan'),
      scanFreq: gl.getUniformLocation(program, 'uScanFreq'),
      warp: gl.getUniformLocation(program, 'uWarp'),
    };

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    let width = 1;
    let height = 1;
    const resize = () => {
      width = Math.max(1, parent.clientWidth);
      height = Math.max(1, parent.clientHeight);
      const renderWidth = Math.max(1, Math.floor(width * resolutionScale));
      const renderHeight = Math.max(1, Math.floor(height * resolutionScale));
      if (canvas.width !== renderWidth || canvas.height !== renderHeight) {
        canvas.width = renderWidth;
        canvas.height = renderHeight;
        gl.viewport(0, 0, renderWidth, renderHeight);
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    resize();

    const start = performance.now();
    let frame = 0;
    const loop = () => {
      if (!document.hidden) {
        gl.useProgram(program);
        gl.uniform2f(uniforms.resolution, width, height);
        gl.uniform1f(uniforms.time, ((performance.now() - start) / 1000) * speed);
        gl.uniform1f(uniforms.hueShift, hueShift);
        gl.uniform1f(uniforms.noise, noiseIntensity);
        gl.uniform1f(uniforms.scan, scanlineIntensity);
        gl.uniform1f(uniforms.scanFreq, scanlineFrequency);
        gl.uniform1f(uniforms.warp, warpAmount);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      frame = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      gl.deleteProgram(program);
      if (buffer) gl.deleteBuffer(buffer);
    };
  }, [hueShift, noiseIntensity, resolutionScale, scanlineFrequency, scanlineIntensity, speed, warpAmount]);

  return <canvas ref={ref} className="darkveil-canvas" aria-hidden="true" />;
}
