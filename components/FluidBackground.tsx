'use client'
import { useEffect, useRef } from 'react'
// Real GPU fluid simulation (Navier–Stokes: advect → divergence → pressure solve → project), splatted by the cursor.
const VS = `#version 300 es
in vec2 p;out vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0,1);}`
const H = `#version 300 es
precision highp float;precision highp sampler2D;in vec2 uv;out vec4 o;uniform vec2 tx;`
const FS: Record<string, string> = {
  splat: H + `uniform sampler2D t;uniform vec2 pt;uniform vec3 col;uniform float r,ar;void main(){vec2 d=uv-pt;d.x*=ar;o=vec4(texture(t,uv).rgb+col*exp(-dot(d,d)/r),1);}`,
  adv: H + `uniform sampler2D v,s;uniform float dt,k;void main(){o=texture(s,uv-dt*texture(v,uv).xy*tx)/(1.+k*dt);}`,
  div: H + `uniform sampler2D v;void main(){float L=texture(v,uv-vec2(tx.x,0)).x,R=texture(v,uv+vec2(tx.x,0)).x,T=texture(v,uv+vec2(0,tx.y)).y,B=texture(v,uv-vec2(0,tx.y)).y;o=vec4(.5*(R-L+T-B),0,0,1);}`,
  prs: H + `uniform sampler2D p,d;void main(){float L=texture(p,uv-vec2(tx.x,0)).x,R=texture(p,uv+vec2(tx.x,0)).x,T=texture(p,uv+vec2(0,tx.y)).x,B=texture(p,uv-vec2(0,tx.y)).x;o=vec4((L+R+B+T-texture(d,uv).x)*.25,0,0,1);}`,
  grad: H + `uniform sampler2D p,v;void main(){float L=texture(p,uv-vec2(tx.x,0)).x,R=texture(p,uv+vec2(tx.x,0)).x,T=texture(p,uv+vec2(0,tx.y)).x,B=texture(p,uv-vec2(0,tx.y)).x;o=vec4(texture(v,uv).xy-vec2(R-L,T-B),0,1);}`,
  clr: H + `uniform sampler2D t;uniform float k;void main(){o=texture(t,uv)*k;}`,
  show: H + `uniform sampler2D t;void main(){vec3 c=max(texture(t,uv).rgb,0.);float m=max(c.r,max(c.g,c.b));float a=clamp(m*.9,0.,.3);o=vec4(c/max(m,.0001)*a,a);}`,
}
const hsv = (h: number, s: number, v: number) => { const f = (n: number) => { const k = (n + h * 6) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)) }; return [f(5), f(3), f(1)] }
const PAL = [[.04, .22, .9], [.02, .1, .5], [.08, .4, .95], [.02, .06, .32]]
export default function FluidBackground() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!
    const gl = c.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false }) as WebGL2RenderingContext | null
    if (!gl || !gl.getExtension('EXT_color_buffer_float') || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0, timer: any, hue = Math.random()
    try {
      const sh = (t: number, s: string) => { const x = gl.createShader(t)!; gl.shaderSource(x, s); gl.compileShader(x); return x }
      const vs = sh(gl.VERTEX_SHADER, VS), P: any = {}
      for (const k in FS) { const p = gl.createProgram()!; gl.attachShader(p, vs); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS[k])); gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p); P[k] = p }
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
      const fbo = (w: number, h: number) => {
        const t = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null)
        for (const [a, b] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, a, b)
        const f = gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
        return { t, f, w, h }
      }
      const dbl = (w: number, h: number) => { let a = fbo(w, h), b = fbo(w, h); return { get read() { return a }, get write() { return b }, swap() { [a, b] = [b, a] } } }
      let vel: any, dye: any, dv: any, pr: any
      const init = () => {
        const s = .6; c.width = Math.max(2, innerWidth * s | 0); c.height = Math.max(2, innerHeight * s | 0)
        const ar = c.width / c.height, sz = (n: number) => ar > 1 ? [Math.round(n * ar), n] : [n, Math.round(n / ar)]
        const [vw, vh] = sz(128), [dw, dh] = sz(512)
        vel = dbl(vw, vh); dye = dbl(dw, dh); dv = fbo(vw, vh); pr = dbl(vw, vh)
      }
      const draw = (name: string, out: any, u: Record<string, any>) => {
        const p = P[name]; gl.useProgram(p); let unit = 0
        gl.uniform2f(gl.getUniformLocation(p, 'tx'), 1 / vel.read.w, 1 / vel.read.h)
        for (const k in u) {
          const v = u[k], l = gl.getUniformLocation(p, k)
          if (v && v.t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v.t); gl.uniform1i(l, unit++) }
          else if (Array.isArray(v)) (v.length === 2 ? gl.uniform2f : gl.uniform3f).apply(gl, [l, ...v] as any)
          else gl.uniform1f(l, v)
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.f : null); gl.viewport(0, 0, out ? out.w : c.width, out ? out.h : c.height); gl.drawArrays(gl.TRIANGLES, 0, 3)
      }
      const splat = (x: number, y: number, dx: number, dy: number, col: number[], r = .0035) => {
        const ar = c.width / c.height
        draw('splat', vel.write, { t: vel.read, pt: [x, y], col: [dx, dy, 0], r, ar }); vel.swap()
        draw('splat', dye.write, { t: dye.read, pt: [x, y], col, r, ar }); dye.swap()
      }
      const step = (dt: number) => {
        draw('div', dv, { v: vel.read })
        draw('clr', pr.write, { t: pr.read, k: .8 }); pr.swap()
        for (let i = 0; i < 20; i++) { draw('prs', pr.write, { p: pr.read, d: dv }); pr.swap() }
        draw('grad', vel.write, { p: pr.read, v: vel.read }); vel.swap()
        draw('adv', vel.write, { v: vel.read, s: vel.read, dt, k: .2 }); vel.swap()
        draw('adv', dye.write, { v: vel.read, s: dye.read, dt, k: 1.8 }); dye.swap()
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.clearColor(0, 0, 0, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clear(gl.COLOR_BUFFER_BIT)
        draw('show', null, { t: dye.read }); gl.disable(gl.BLEND)
      }
      init()
      let lx = -1, ly = -1, last = performance.now()
      let ci = 0; const color = () => PAL[((ci++ / 6) | 0) % PAL.length].map(v => v * .5)
      const move = (e: PointerEvent) => {
        const x = e.clientX / innerWidth, y = 1 - e.clientY / innerHeight
        if (lx >= 0) splat(x, y, (x - lx) * 6000, (y - ly) * 6000, color())
        lx = x; ly = y
      }
      const down = (e: PointerEvent) => splat(e.clientX / innerWidth, 1 - e.clientY / innerHeight, 0, 0, 	PAL[(Math.random() * PAL.length) | 0].map(v => v * .8), .012)
      const idle = () => { const a = Math.random() * 6.28; splat(Math.random(), Math.random(), Math.cos(a) * 400, Math.sin(a) * 400, color(), .006) }
      let rt: any; const rs = () => { clearTimeout(rt); rt = setTimeout(init, 200) }
      addEventListener('pointermove', move); addEventListener('pointerdown', down); addEventListener('resize', rs)
      timer = setInterval(idle, 2200); idle()
      const loop = (now: number) => { step(Math.min((now - last) / 1000, .016)); last = now; raf = requestAnimationFrame(loop) }
      raf = requestAnimationFrame(loop)
      return () => { cancelAnimationFrame(raf); clearInterval(timer); removeEventListener('pointermove', move); removeEventListener('pointerdown', down); removeEventListener('resize', rs); gl.getExtension('WEBGL_lose_context')?.loseContext() }
    } catch { return }
  }, [])
  return <canvas ref={ref} className="fx-canvas" aria-hidden />
}
