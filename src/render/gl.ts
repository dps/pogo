// WebGL2 renderer: instanced forward 3D with one shadow-mapped sun, then a batched 2D pass on top.
import { mat4, mat4LookAt, mat4Mul, mat4Ortho, mat4Point, Color, Vec } from "../math";
import { PogoError } from "../errors";
import type { SpriteAsset } from "../assets";
import type { ViewState } from "../view";
import { CameraInfo, layoutText, Light3D, MeshItem, MODE_SOLID, Renderer, TextHandle, TextLayout, TextStyle } from "./backend";
import { FLOATS_PER_VERTEX, Geometry } from "./mesh";

const VS_2D = `#version 300 es
layout(location=0) in vec2 a_pos; layout(location=1) in vec2 a_uv; layout(location=2) in vec4 a_col;
layout(location=3) in vec4 a_par; layout(location=4) in float a_mode;
uniform vec4 u_cam; uniform vec2 u_off; uniform vec2 u_res;
out vec2 v_uv; out vec4 v_col; out vec4 v_par; flat out float v_mode;
void main(){
  vec2 p = vec2(u_cam.x*a_pos.x + u_cam.z*a_pos.y, u_cam.y*a_pos.x + u_cam.w*a_pos.y) + u_off;
  gl_Position = vec4(p.x/u_res.x*2.-1., 1.-p.y/u_res.y*2., 0., 1.);
  v_uv=a_uv; v_col=a_col; v_par=a_par; v_mode=a_mode;
}`;
const FS_2D = `#version 300 es
precision highp float;
in vec2 v_uv; in vec4 v_col; in vec4 v_par; flat in float v_mode;
uniform sampler2D u_tex; out vec4 o;
void main(){
  vec4 c = vec4(v_col.rgb*v_col.a, v_col.a);
  if (v_mode < .5) { o = texture(u_tex, v_uv)*c; return; }
  if (v_mode > 1.5) { o = c; return; }
  float r = v_par.z;
  vec2 q = abs(v_uv) - v_par.xy + r;
  float d = length(max(q,0.)) + min(max(q.x,q.y),0.) - r;
  float aa = max(fwidth(d), 1e-4);
  float a = 1. - smoothstep(-aa*.5, aa*.5, d);
  if (v_par.w > 0.) a *= smoothstep(-v_par.w-aa*.5, -v_par.w+aa*.5, d);
  o = c*a;
}`;
const VS_3D = `#version 300 es
layout(location=0) in vec3 a_pos; layout(location=1) in vec3 a_nor; layout(location=2) in vec2 a_uv; layout(location=3) in vec3 a_col;
layout(location=4) in vec4 i_m0; layout(location=5) in vec4 i_m1; layout(location=6) in vec4 i_m2; layout(location=7) in vec4 i_m3;
layout(location=8) in vec4 i_col; layout(location=9) in vec4 i_uv;
uniform mat4 u_vp; uniform mat4 u_light;
out vec3 v_nor; out vec3 v_w; out vec2 v_uv; out vec4 v_col; out vec3 v_s;
void main(){
  mat4 m = mat4(i_m0,i_m1,i_m2,i_m3);
  vec4 w = m*vec4(a_pos,1.);
  mat3 n = mat3(m);
  n[0]/=dot(n[0],n[0]); n[1]/=dot(n[1],n[1]); n[2]/=dot(n[2],n[2]);
  v_nor = n*a_nor; v_w=w.xyz; v_uv=mix(i_uv.xy,i_uv.zw,a_uv); v_col=vec4(a_col*i_col.rgb,i_col.a);
  vec4 s = u_light*vec4(w.xyz + normalize(v_nor)*.04,1.);
  v_s = s.xyz*.5+.5;
  gl_Position = u_vp*w;
}`;
const FS_3D = `#version 300 es
precision highp float; precision highp sampler2DShadow;
in vec3 v_nor; in vec3 v_w; in vec2 v_uv; in vec4 v_col; in vec3 v_s;
uniform sampler2D u_tex; uniform sampler2DShadow u_shadow;
uniform float u_useTex, u_unlit, u_shadows, u_texel, u_cutout;
uniform vec3 u_sun, u_sunCol, u_sky, u_ground, u_fogCol, u_eye; uniform vec2 u_fog;
out vec4 o;
float shadow(){
  if (u_shadows < .5 || v_s.x<0.||v_s.x>1.||v_s.y<0.||v_s.y>1.||v_s.z>1.) return 1.;
  float t=u_texel, z=v_s.z-.0015;
  return (texture(u_shadow,vec3(v_s.xy+vec2(-t,-t),z))+texture(u_shadow,vec3(v_s.xy+vec2(t,-t),z))
         +texture(u_shadow,vec3(v_s.xy+vec2(-t,t),z))+texture(u_shadow,vec3(v_s.xy+vec2(t,t),z)))*.25;
}
void main(){
  vec4 base = v_col;
  if (u_useTex > .5) { vec4 t = texture(u_tex,v_uv); if (u_cutout > .5 && t.a < .5) discard; base *= t; }
  vec3 c = base.rgb;
  if (u_unlit < .5) {
    vec3 n = normalize(v_nor);
    float diff = max(dot(n,-u_sun),0.);
    c *= mix(u_ground,u_sky,n.y*.5+.5) + u_sunCol*diff*shadow();
    if (u_fog.y > 0.) c = mix(c,u_fogCol,smoothstep(u_fog.x,u_fog.y,distance(v_w,u_eye)));
  }
  o = vec4(c*base.a, base.a);
}`;
const VS_DEPTH = `#version 300 es
layout(location=0) in vec3 a_pos;
layout(location=4) in vec4 i_m0; layout(location=5) in vec4 i_m1; layout(location=6) in vec4 i_m2; layout(location=7) in vec4 i_m3;
uniform mat4 u_light;
void main(){ gl_Position = u_light*mat4(i_m0,i_m1,i_m2,i_m3)*vec4(a_pos,1.); }`;
const FS_DEPTH = `#version 300 es
precision lowp float; void main(){}`;

const MAX_QUADS = 4096, FLOATS_2D = 10, VERTS_2D = MAX_QUADS * 6, FLOATS_INSTANCE = 24;
const SHADOW_SIZE = 1024, TEXT_CACHE = 256;

type Program = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };
type Bucket = { geom: Geometry; tex: SpriteAsset | null; unlit: boolean; cutout: boolean; start: number; count: number; casters: number };

export class GLRenderer implements Renderer {
    readonly kind = "gl" as const;
    stats = { drawCalls: 0, instances: 0, quads: 0 };
    /** Fraction of device pixels rendered; lowered automatically on slow devices. */
    quality = 1;
    lost = false;
    private gl!: WebGL2RenderingContext;
    private p2!: Program;
    private p3!: Program;
    private pd!: Program;
    private vao2!: WebGLVertexArrayObject;
    private vbo2!: WebGLBuffer;
    private instBuf!: WebGLBuffer;
    private shadowFbo!: WebGLFramebuffer;
    private shadowTex!: WebGLTexture;
    private verts = new ArrayBuffer(VERTS_2D * FLOATS_2D * 4);
    private f32 = new Float32Array(this.verts);
    private u32 = new Uint32Array(this.verts);
    private n2 = 0;
    private tex2: unknown = null;
    private cam2: Float32Array = new Float32Array([1, 0, 0, 1, 0, 0]);
    private view!: ViewState;
    private items: MeshItem[] = [];
    private instances = new Float32Array(FLOATS_INSTANCE * 2048);
    private geoms = new Map<Geometry, { vao: WebGLVertexArrayObject; count: number }>();
    private textures = new Map<SpriteAsset, { tex: WebGLTexture; loaded: boolean }>();
    private textCache = new Map<string, TextHandle>();
    private measurer: CanvasRenderingContext2D;
    private dpr = 1;
    private oldScale = 0;
    private lightVP = mat4();

    constructor(private canvas: HTMLCanvasElement, private opts: { pixelArt: boolean; maxDpr: number }) {
        const gl = canvas.getContext("webgl2", { alpha: false, antialias: true, depth: true, stencil: false, powerPreference: "default" });
        if (!gl) throw new PogoError("NO_WEBGL2", "WebGL2 is not available in this browser or web view.", "WebGL2 is required. Check that hardware acceleration is enabled for the web view.");
        this.gl = gl;
        this.measurer = document.createElement("canvas").getContext("2d")!;
        canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); this.lost = true; });
        canvas.addEventListener("webglcontextrestored", () => { this.init(); this.lost = false; });
        this.init();
    }

    /** Build every GL resource. Also runs after a lost context, which phones do on backgrounding. */
    private init() {
        const gl = this.gl;
        this.geoms.clear();
        this.textures.clear();
        this.textCache.clear();
        this.p2 = this.program(VS_2D, FS_2D, ["u_cam", "u_off", "u_res", "u_tex"]);
        this.p3 = this.program(VS_3D, FS_3D, ["u_vp", "u_light", "u_tex", "u_shadow", "u_useTex", "u_unlit", "u_shadows", "u_texel", "u_cutout", "u_sun", "u_sunCol", "u_sky", "u_ground", "u_fogCol", "u_eye", "u_fog"]);
        this.pd = this.program(VS_DEPTH, FS_DEPTH, ["u_light"]);

        this.vao2 = gl.createVertexArray()!;
        this.vbo2 = gl.createBuffer()!;
        gl.bindVertexArray(this.vao2);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo2);
        gl.bufferData(gl.ARRAY_BUFFER, this.verts.byteLength, gl.STREAM_DRAW);
        const s = FLOATS_2D * 4;
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, s, 0);
        gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, s, 8);
        gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, s, 16);
        gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, s, 20);
        gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 1, gl.FLOAT, false, s, 36);
        gl.bindVertexArray(null);

        this.instBuf = gl.createBuffer()!;
        this.shadowTex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, SHADOW_SIZE, SHADOW_SIZE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
        this.shadowFbo = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
        gl.drawBuffers([gl.NONE]);
        gl.readBuffer(gl.NONE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }

    private program(vs: string, fs: string, names: string[]): Program {
        const gl = this.gl;
        const compile = (type: number, src: string) => {
            const s = gl.createShader(type)!;
            gl.shaderSource(s, src);
            gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new PogoError("SHADER", gl.getShaderInfoLog(s) ?? "Shader failed to compile.");
            return s;
        };
        const p = gl.createProgram()!;
        gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
        gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new PogoError("SHADER", gl.getProgramInfoLog(p) ?? "Program failed to link.");
        return { p, u: Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)])) };
    }

    // --- Frame --------------------------------------------------------------------
    beginFrame(view: ViewState, bg: Color, bg2: Color | null, letterbox: Color) {
        this.view = view;
        this.stats = { drawCalls: 0, instances: 0, quads: 0 };
        if (this.lost) return;
        const gl = this.gl, S = view.screen, dpr = Math.min(S.dpr, this.opts.maxDpr) * this.quality;
        this.dpr = dpr;
        const w = Math.max(1, Math.round(S.width * dpr)), h = Math.max(1, Math.round(S.height * dpr));
        if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
        const scale = view.scale * dpr;
        if (scale !== this.oldScale) { this.oldScale = scale; this.dropText(); }
        while (this.textCache.size > TEXT_CACHE) {
            const key = this.textCache.keys().next().value!;
            gl.deleteTexture(this.textCache.get(key)!.tex as WebGLTexture);
            this.textCache.delete(key);
        }
        const vx = Math.round(view.x * dpr), vh = Math.round(view.height * scale), vy = h - Math.round(view.y * dpr) - vh, vw = Math.round(view.width * scale);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.disable(gl.SCISSOR_TEST);
        gl.viewport(0, 0, w, h);
        gl.clearColor(letterbox.r, letterbox.g, letterbox.b, 1);
        gl.depthMask(true);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(vx, vy, vw, vh);
        gl.viewport(vx, vy, vw, vh);
        gl.clearColor(bg.r, bg.g, bg.b, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        this.vp = [vx, vy, vw, vh];
        if (bg2) {
            this.begin2D(null);
            const W = view.width, H = view.height, t = [bg, bg, bg2, bg, bg2, bg2], p = [0, 0, W, 0, W, H, 0, 0, W, H, 0, H];
            for (let i = 0; i < 6; i++) this.vertex(p[i * 2], p[i * 2 + 1], 0, 0, packColor(t[i].r, t[i].g, t[i].b, 1), 0, 0, 0, 0, MODE_SOLID);
            this.flush();
        }
    }
    private vp = [0, 0, 1, 1];

    private dropText() {
        for (const t of this.textCache.values()) this.gl.deleteTexture(t.tex as WebGLTexture);
        this.textCache.clear();
    }

    endFrame() { this.flush(); }

    // --- 3D -------------------------------------------------------------------------
    mesh(item: MeshItem) { this.items.push(item); }

    private geom(g: Geometry) {
        let info = this.geoms.get(g);
        if (info) return info;
        const gl = this.gl, vao = gl.createVertexArray()!, vb = gl.createBuffer()!, ib = gl.createBuffer()!;
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, vb);
        gl.bufferData(gl.ARRAY_BUFFER, g.vertices, gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.indices, gl.STATIC_DRAW);
        const s = FLOATS_PER_VERTEX * 4;
        gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, s, 0);
        gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, s, 12);
        gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 2, gl.FLOAT, false, s, 24);
        gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 3, gl.FLOAT, false, s, 32);
        for (let i = 4; i <= 9; i++) { gl.enableVertexAttribArray(i); gl.vertexAttribDivisor(i, 1); }
        gl.bindVertexArray(null);
        info = { vao, count: g.indices.length };
        this.geoms.set(g, info);
        return info;
    }

    private bindInstances(start: number) {
        const gl = this.gl, s = FLOATS_INSTANCE * 4, o = start * s;
        for (let i = 0; i < 6; i++) gl.vertexAttribPointer(4 + i, 4, gl.FLOAT, false, s, o + i * 16);
    }

    render3D(cam: CameraInfo, light: Light3D) {
        const items = this.items;
        this.items = [];
        if (this.lost || !items.length) return;
        const gl = this.gl;

        // Group opaque work into instanced buckets; transparent items are sorted back to front, one per bucket.
        const groups = new Map<string, MeshItem[]>(), clear: { it: MeshItem; depth: number }[] = [];
        for (const it of items) {
            if (it.a < 0.999) {
                const dx = it.matrix[12] - cam.eye.x, dy = it.matrix[13] - cam.eye.y, dz = it.matrix[14] - cam.eye.z;
                clear.push({ it, depth: dx * dx + dy * dy + dz * dz });
                continue;
            }
            const key = `${it.geom.id}|${it.texture?.name ?? ""}|${it.unlit}|${it.cutout}`;
            let g = groups.get(key);
            if (!g) groups.set(key, (g = []));
            g.push(it);
        }
        clear.sort((a, b) => b.depth - a.depth);
        if (this.instances.length < items.length * FLOATS_INSTANCE) this.instances = new Float32Array(items.length * 2 * FLOATS_INSTANCE);
        const data = this.instances, buckets: Bucket[] = [];
        let n = 0;
        const write = (it: MeshItem) => {
            const o = n++ * FLOATS_INSTANCE;
            data.set(it.matrix, o);
            data[o + 16] = it.r; data[o + 17] = it.g; data[o + 18] = it.b; data[o + 19] = it.a;
            data[o + 20] = it.u0; data[o + 21] = it.v0; data[o + 22] = it.u1; data[o + 23] = it.v1;
        };
        for (const g of groups.values()) {
            // Casters first, so the shadow pass can draw a prefix of the bucket.
            g.sort((a, b) => +b.castShadow - +a.castShadow);
            const it = g[0], start = n;
            for (const x of g) write(x);
            buckets.push({ geom: it.geom, tex: it.texture, unlit: it.unlit, cutout: it.cutout, start, count: g.length, casters: g.filter((x) => x.castShadow).length });
        }
        const opaque = buckets.length;
        for (const { it } of clear) {
            const start = n;
            write(it);
            buckets.push({ geom: it.geom, tex: it.texture, unlit: it.unlit, cutout: it.cutout, start, count: 1, casters: 0 });
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
        gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, n * FLOATS_INSTANCE), gl.STREAM_DRAW);
        this.stats.instances += n;

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.disable(gl.BLEND);
        gl.enable(gl.CULL_FACE);
        const useShadows = light.shadows && buckets.some((b) => b.casters > 0);
        if (useShadows) this.shadowPass(buckets.slice(0, opaque), cam, light);
        else mat4Ortho(this.lightVP, -1, 1, -1, 1, -1, 1);

        const u = this.p3.u;
        gl.useProgram(this.p3.p);
        gl.uniformMatrix4fv(u.u_vp, false, cam.viewProj);
        gl.uniformMatrix4fv(u.u_light, false, this.lightVP);
        const sun = light.dir.norm();
        gl.uniform3f(u.u_sun, sun.x, sun.y, sun.z);
        gl.uniform3f(u.u_sunCol, light.color.r, light.color.g, light.color.b);
        gl.uniform3f(u.u_sky, light.sky.r, light.sky.g, light.sky.b);
        gl.uniform3f(u.u_ground, light.ground.r, light.ground.g, light.ground.b);
        gl.uniform3f(u.u_eye, cam.eye.x, cam.eye.y, cam.eye.z);
        const f = light.fog;
        gl.uniform3f(u.u_fogCol, f?.color.r ?? 0, f?.color.g ?? 0, f?.color.b ?? 0);
        gl.uniform2f(u.u_fog, f?.near ?? 0, f?.far ?? 0);
        gl.uniform1f(u.u_shadows, useShadows ? 1 : 0);
        gl.uniform1f(u.u_texel, 0.75 / SHADOW_SIZE);
        gl.uniform1i(u.u_tex, 0);
        gl.uniform1i(u.u_shadow, 1);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
        gl.activeTexture(gl.TEXTURE0);

        buckets.forEach((b, i) => {
            if (i === opaque) { gl.enable(gl.BLEND); gl.depthMask(false); }
            const info = this.geom(b.geom);
            gl.bindVertexArray(info.vao);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
            this.bindInstances(b.start);
            gl.uniform1f(u.u_useTex, b.tex ? 1 : 0);
            gl.uniform1f(u.u_unlit, b.unlit ? 1 : 0);
            gl.uniform1f(u.u_cutout, b.cutout ? 1 : 0);
            if (b.cutout) gl.disable(gl.CULL_FACE);
            if (b.tex) gl.bindTexture(gl.TEXTURE_2D, this.texture(b.tex) as WebGLTexture);
            gl.drawElementsInstanced(gl.TRIANGLES, info.count, gl.UNSIGNED_INT, 0, b.count);
            if (b.cutout) gl.enable(gl.CULL_FACE);
            this.stats.drawCalls++;
        });
        gl.bindVertexArray(null);
        gl.depthMask(true);
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.activeTexture(gl.TEXTURE0);
    }

    private shadowPass(buckets: Bucket[], cam: CameraInfo, light: Light3D) {
        const gl = this.gl, R = light.shadowRange, L = light.dir.norm(), lv = mat4(), lp = mat4();
        // Centre the shadow volume between the camera and what it looks at, to spend texels on the visible ground.
        const center = cam.look.lerp(cam.eye, 0.2);
        mat4LookAt(lv, center.sub(L.mul(R * 2)), center, new Vec(0, 1, 0));
        mat4Ortho(lp, -R, R, -R, R, 0.1, R * 4);
        mat4Mul(this.lightVP, lp, lv);
        // Snap to whole texels so shadow edges don't shimmer as the camera moves.
        const ndc = mat4Point(this.lightVP, center), t = SHADOW_SIZE / 2;
        this.lightVP[12] += Math.round(ndc.x * t) / t - ndc.x;
        this.lightVP[13] += Math.round(ndc.y * t) / t - ndc.y;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFbo);
        gl.disable(gl.SCISSOR_TEST);
        gl.viewport(0, 0, SHADOW_SIZE, SHADOW_SIZE);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.pd.p);
        gl.uniformMatrix4fv(this.pd.u.u_light, false, this.lightVP);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(1.5, 2);
        for (const b of buckets) {
            if (!b.casters) continue;
            const info = this.geom(b.geom);
            gl.bindVertexArray(info.vao);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
            this.bindInstances(b.start);
            gl.drawElementsInstanced(gl.TRIANGLES, info.count, gl.UNSIGNED_INT, 0, b.casters);
            this.stats.drawCalls++;
        }
        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.enable(gl.CULL_FACE);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.enable(gl.SCISSOR_TEST);
        const [x, y, w, h] = this.vp;
        gl.viewport(x, y, w, h);
    }

    // --- 2D ---------------------------------------------------------------------------
    begin2D(camera: Float32Array | null) {
        this.flush();
        this.cam2 = camera ?? IDENTITY;
    }

    private vertex(x: number, y: number, u: number, v: number, col: number, p0: number, p1: number, p2: number, p3: number, mode: number) {
        const f = this.f32, o = this.n2++ * FLOATS_2D;
        f[o] = x; f[o + 1] = y; f[o + 2] = u; f[o + 3] = v;
        this.u32[o + 4] = col;
        f[o + 5] = p0; f[o + 6] = p1; f[o + 7] = p2; f[o + 8] = p3; f[o + 9] = mode;
    }

    quad(m: Float32Array, x0: number, y0: number, x1: number, y1: number, u0: number, v0: number, u1: number, v1: number, r: number, g: number, b: number, a: number, tex: unknown, mode: number, p0: number, p1: number, p2: number, p3: number) {
        if (this.lost) return;
        if (this.n2 + 6 > VERTS_2D || (mode === 0 && tex !== this.tex2 && this.n2 > 0)) this.flush();
        if (mode === 0) this.tex2 = tex;
        const col = packColor(r, g, b, a);
        const ax = m[0] * x0 + m[2] * y0 + m[4], ay = m[1] * x0 + m[3] * y0 + m[5];
        const bx = m[0] * x1 + m[2] * y0 + m[4], by = m[1] * x1 + m[3] * y0 + m[5];
        const cx = m[0] * x1 + m[2] * y1 + m[4], cy = m[1] * x1 + m[3] * y1 + m[5];
        const dx = m[0] * x0 + m[2] * y1 + m[4], dy = m[1] * x0 + m[3] * y1 + m[5];
        this.vertex(ax, ay, u0, v0, col, p0, p1, p2, p3, mode);
        this.vertex(bx, by, u1, v0, col, p0, p1, p2, p3, mode);
        this.vertex(cx, cy, u1, v1, col, p0, p1, p2, p3, mode);
        this.vertex(ax, ay, u0, v0, col, p0, p1, p2, p3, mode);
        this.vertex(cx, cy, u1, v1, col, p0, p1, p2, p3, mode);
        this.vertex(dx, dy, u0, v1, col, p0, p1, p2, p3, mode);
        this.stats.quads++;
    }

    tris(m: Float32Array, pts: number[], r: number, g: number, b: number, a: number) {
        if (this.lost) return;
        const n = pts.length / 2;
        if (this.n2 + n > VERTS_2D) this.flush();
        const col = packColor(r, g, b, a);
        for (let i = 0; i < n; i++) {
            const x = pts[i * 2], y = pts[i * 2 + 1];
            this.vertex(m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5], 0, 0, col, 0, 0, 0, 0, MODE_SOLID);
        }
    }

    private flush() {
        if (!this.n2 || this.lost) { this.n2 = 0; return; }
        const gl = this.gl, u = this.p2.u, c = this.cam2;
        gl.useProgram(this.p2.p);
        gl.uniform4f(u.u_cam, c[0], c[1], c[2], c[3]);
        gl.uniform2f(u.u_off, c[4], c[5]);
        gl.uniform2f(u.u_res, this.view.width, this.view.height);
        gl.uniform1i(u.u_tex, 0);
        gl.enable(gl.BLEND);
        gl.bindVertexArray(this.vao2);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo2);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.f32.subarray(0, this.n2 * FLOATS_2D));
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, (this.tex2 as WebGLTexture) ?? null);
        gl.drawArrays(gl.TRIANGLES, 0, this.n2);
        gl.bindVertexArray(null);
        this.stats.drawCalls++;
        this.n2 = 0;
    }

    texture(asset: SpriteAsset): unknown {
        const gl = this.gl;
        let t = this.textures.get(asset);
        if (t && (t.loaded || !asset.loaded)) return t.tex;
        const tex = t?.tex ?? gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        if (asset.image) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, asset.image);
        else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, asset.width, asset.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, asset.data ?? null);
        const filter = asset.pixelated || this.opts.pixelArt ? gl.NEAREST : gl.LINEAR;
        const mips = !!asset.mipmaps && filter === gl.LINEAR;
        if (mips) gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.textures.set(asset, { tex, loaded: asset.loaded });
        return tex;
    }

    measureText(str: string, style: TextStyle): TextLayout {
        const c = this.measurer;
        c.font = `${style.bold ? "bold " : ""}${style.size}px ${style.font}`;
        return layoutText(str, style, (line) => c.measureText(line).width);
    }

    /** Rasterise at device resolution, so text stays sharp at any scale, and tint in the shader. */
    text(str: string, style: TextStyle): TextHandle {
        const key = `${str}|${style.size}|${style.font}|${style.bold}|${style.align}|${style.maxWidth}|${style.lineHeight}`;
        const hit = this.textCache.get(key);
        if (hit) { // refresh LRU position
            this.textCache.delete(key);
            this.textCache.set(key, hit);
            return hit;
        }
        const m = this.measureText(str, style), k = this.view.scale * this.dpr;
        const cv = document.createElement("canvas");
        cv.width = Math.max(1, Math.ceil(m.width * k) + 2);
        cv.height = Math.max(1, Math.ceil(m.height * k) + 2);
        const c = cv.getContext("2d")!;
        c.scale(k, k);
        c.font = `${style.bold ? "bold " : ""}${style.size}px ${style.font}`;
        c.fillStyle = "#fff";
        c.textBaseline = "middle";
        c.textAlign = style.align;
        const lh = style.size * style.lineHeight, x = style.align === "left" ? 0 : style.align === "right" ? m.width : m.width / 2;
        m.lines.forEach((line, i) => c.fillText(line, x + 1 / k, 1 / k + lh * (i + 0.5)));
        const gl = this.gl, tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        const h: TextHandle = { tex, width: cv.width / k, height: cv.height / k };
        this.textCache.set(key, h);
        return h;
    }

    screenshot() { return this.canvas.toDataURL("image/png"); }
}

const IDENTITY = new Float32Array([1, 0, 0, 1, 0, 0]);
const packColor = (r: number, g: number, b: number, a: number) =>
    ((Math.min(255, a * 255 + 0.5) << 24) | (Math.min(255, b * 255 + 0.5) << 16) | (Math.min(255, g * 255 + 0.5) << 8) | Math.min(255, r * 255 + 0.5)) >>> 0;
