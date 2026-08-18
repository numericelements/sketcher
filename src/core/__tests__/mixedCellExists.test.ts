// ============================================================================
// C21 ANSWERED CONSTRUCTIVELY: the MIXED cell is not empty. A rational PH curve exists
// with one pole SOFT (σ(r) = 0, 𝒜(r) rank one) and another HARD at the same time — the
// connective tissue THE_MAP.md §6 asks for, since the λ-chart and the conformal
// construction otherwise cover disjoint strata, and two disjoint charts are not an atlas.
//
// THE METHOD — the ε-drive, not an endpoint connection. Take a λ-chart member, adjoin
// σ(r₁) = ε·û as an extra equation (û the initial direction, so σ shrinks along itself),
// and continue ε → 0 while the other poles are left alone. Reaching ε = 0 CONSTRUCTS a
// mixed member; stalling would instead report an obstruction with a number, ε*. No soft
// endpoint is needed, so the (n,m)-matching prerequisite disappears, and it targets the
// mixed cell directly rather than hoping a path happens to pass through one.
//
// WHY THE CONDITION CAN REACH σ = 0 AT ALL — the point the λ-form obscures. The no-log
// condition is CHART-FREE. Writing w = (t−r_k)v, partial fractions give the 1/(t−r_k)
// coefficient as
//
//     b_k = [N′(r_k) − 2Σ_k N(r_k)] / v(r_k)²          N = 𝒜i𝒜*
//
// so the residue condition is a statement about N, not about 𝒜. The λ-form
// 𝒜′(r) = 𝒜(r)(Σ + λi) is what you get by dividing it by 𝒜(r), which needs σ(r) ≠ 0. The
// λ-chart's hole is a hole in the COORDINATES, exactly as §5 concluded — the curves are
// there, and this file builds some.
//
// VERIFIED INDEPENDENTLY. Every witness is confirmed by CONTOUR INTEGRATION of N/w² around
// each pole, which uses none of the algebra above: a nonzero residue is a logarithm, and a
// logarithm means the curve is not rational. Measured at ~1e-14.
//
// THE TRAP THIS FILE EXISTS TO AVOID. softness = |σ(r)|/‖𝒜(r)‖² is identically 1 at a real
// pole (chartsAreDisjoint.test.ts), so it CANNOT certify that the hard pole is healthy —
// only ‖𝒜(r₀)‖² can. On six of eight seeds ‖𝒜(r₀)‖² collapses to ~1e-6: the "hard" pole is
// then nearly FAKE, the member is really a two-pole curve wearing a third, and the witness
// is worthless. Rank 1 and rank 0 are different degeneracies and only both numbers separate
// them. The seed pinned below keeps ‖𝒜(r₀)‖² at 7.7e-2.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { type Complex, cadd, csub, cmul, cdiv, cscale, cnorm } from '../complex'
import { type Quat } from '../quaternion'
import { sandwichPolynomial } from '../conformalPHHopf'
import { leastSquares } from '../linalg'
import { cx, familyBasis } from '../rationalPHComplexPoleSpatial'
const C=(re:number,im=0):Complex=>({re,im})
type CQ=[Complex,Complex,Complex,Complex]
const toQ=(x:readonly number[]):Quat[]=>Array.from({length:x.length/4},(_,k)=>({u:x[4*k],v:x[4*k+1],p:x[4*k+2],q:x[4*k+3]}))
function evalA(A:readonly Quat[],z:Complex):CQ{let a:CQ=[C(0),C(0),C(0),C(0)]
  for(let k=A.length-1;k>=0;k--){const c=[A[k].u,A[k].v,A[k].p,A[k].q];a=a.map((x,i)=>cadd(cmul(z,x),C(c[i]))) as CQ}return a}
const pevC=(p:readonly number[],z:Complex):Complex=>{let a:Complex=C(0);for(let k=p.length-1;k>=0;k--)a=cadd(cmul(z,a),C(p[k]));return a}
const pderiv=(p:readonly number[]):number[]=>p.length<=1?[0]:p.slice(1).map((c,i)=>c*(i+1))
const sigmaC=(a:CQ):Complex=>{let s:Complex=C(0);for(const x of a)s=cadd(s,cmul(x,x));return s}
const hermC=(a:CQ)=>a.reduce((t,x)=>t+x.re*x.re+x.im*x.im,0)
function bigSigma(all:Complex[],k:number):Complex{let s:Complex=C(0)
  for(let l=0;l<all.length;l++){if(l!==k)s=cadd(s,cdiv(C(1),csub(all[k],all[l])))}return s}
function makeF(all:Complex[],rep:number[],eps:{k:number,dir:Complex,val:number}|null){
  return (x:readonly number[]):number[]=>{
    const A=toQ(x);const Np=sandwichPolynomial(A);const dNp=Np.map(pderiv);const out:number[]=[]
    for(const k of rep){const S=bigSigma(all,k)
      for(let i=0;i<3;i++){const d=csub(pevC(dNp[i],all[k]),cmul(cscale(S,2),pevC(Np[i],all[k])))
        if(Math.abs(all[k].im)<1e-12)out.push(d.re);else out.push(d.re,d.im)}}
    out.push(x.reduce((t,v)=>t+v*v,0)-1)
    if(eps){const s=sigmaC(evalA(A,all[eps.k]));const t=cscale(eps.dir,eps.val);out.push(s.re-t.re,s.im-t.im)}
    return out}}
function newton(F:(x:readonly number[])=>number[],x0:number[],iters=200):number[]|null{
  let x=[...x0]
  for(let it=0;it<iters;it++){const f=F(x);if(Math.max(...f.map(Math.abs))<1e-13)return x
    const J=f.map(()=>new Array(x.length).fill(0))
    for(let j=0;j<x.length;j++){const h=1e-7*Math.max(1,Math.abs(x[j]));const u=[...x];u[j]+=h;const d=[...x];d[j]-=h
      const fu=F(u),fd=F(d);for(let i=0;i<f.length;i++)J[i][j]=(fu[i]-fd[i])/(2*h)}
    let s:number[];try{s=leastSquares(J,f.map(v=>-v),1e-12)}catch{return null}
    const n=Math.hypot(...s);x=x.map((v,i)=>v+(n>0.5?0.5/n:1)*s[i]);if(!x.every(Number.isFinite))return null}
  return Math.max(...F(x).map(Math.abs))<1e-10?x:null}
/** INDEPENDENT no-log check: residue of N/w^2 by contour integration around r_k. */
function contourResidue(A:Quat[],all:Complex[],k:number,rho:number,M=4000):number{
  const Np=sandwichPolynomial(A)
  const w=(z:Complex)=>{let p=C(1);for(const r of all)p=cmul(p,csub(z,r));return p}
  let acc=[C(0),C(0),C(0)]
  for(let j=0;j<M;j++){const th=2*Math.PI*(j+0.5)/M
    const z=cadd(all[k],C(rho*Math.cos(th),rho*Math.sin(th)))
    const dz=C(-rho*Math.sin(th)*2*Math.PI/M, rho*Math.cos(th)*2*Math.PI/M)
    const wz=w(z); const w2=cmul(wz,wz)
    for(let i=0;i<3;i++)acc[i]=cadd(acc[i],cmul(cdiv(pevC(Np[i],z),w2),dz))}
  // residue = integral/(2*pi*i); report magnitude relative to |N(r_k)|/|v(r_k)|^2 scale
  const scale=Math.max(...Np.map(p=>cnorm(pevC(p,all[k]))),1e-30)
  return Math.max(...acc.map(cnorm))/(2*Math.PI)/scale}

function drive(all:Complex[],rep:number[],target:number,start:number[]){
  const A0=toQ(start);const s0=sigmaC(evalA(A0,all[target]));const eps0=cnorm(s0)
  if(eps0<1e-10)return {eps0,best:eps0,x:start,stalled:false}
  const dir=cscale(s0,1/eps0)
  let x=start,eps=eps0,step=eps0/8,best=eps0,stalled=false
  for(let i=0;i<500&&eps>1e-13;i++){
    const y=newton(makeF(all,rep,{k:target,dir,val:Math.max(eps-step,0)}),x,80)
    if(y){x=y;eps=Math.max(eps-step,0);best=Math.min(best,eps);step=Math.min(step*1.4,eps0/4)}
    else{step/=2;if(step<eps0*1e-12){stalled=true;break}}}
  return {eps0,best,x,stalled}}


describe('the ε-drive: can one pole be driven soft while another stays hard?', () => {
  const PAIR = [C(0.5, 0.8), C(0.5, -0.8)]
  const M3 = [C(0.2, 0), C(0.9, 0.7), C(0.9, -0.7)]

  /** The λ-chart member at (3, one pair) — measurably HARD, so the drive has somewhere to start. */
  function hardStart(): number[] {
    const ZQ: Quat = { u: 0, v: 0, p: 0, q: 0 }
    const B = familyBasis({ A: Array.from({ length: 4 }, () => ZQ), pairs: [cx(0.5, 0.8)], lambdas: [cx(0.3, 0)] })
    const x = new Array<number>(16).fill(0)
    B.forEach((b, i) => { const a = 1.3 * Math.sin(1.7 * i + 0.6); for (let j = 0; j < 16; j++) x[j] += a * b[j] })
    const n = Math.hypot(...x)
    return x.map((v) => v / n)
  }

  it('CONTROL m=2: the drive reaches σ = 0, and the pair goes soft TOGETHER', () => {
    // not_mixedPoles_of_conjugate_pair (Lean, 2026-08-17): σ has real coefficients, so
    // σ(r̄) = conj(σ(r)) and a conjugate pair is both soft or both hard. If ε on one pole
    // dropped while its partner stayed hard, the machinery would be lying — a far sharper
    // failure signal than "the path broke".
    const start = hardStart()
    const A0 = toQ(start)
    const s0 = evalA(A0, PAIR[0])
    expect(cnorm(sigmaC(s0)) / hermC(s0)).toBeGreaterThan(0.5)        // genuinely hard to begin with
    expect(Math.max(...makeF(PAIR, [0], null)(start).slice(0, 6).map(Math.abs))).toBeLessThan(1e-12)

    const r = drive(PAIR, [0], 0, start)
    expect(r.eps0).toBeGreaterThan(0.1)
    expect(r.best).toBeLessThan(1e-12)                                 // ε = 0 reached

    const A = toQ(r.x)
    const [a, b] = PAIR.map((p) => evalA(A, p))
    expect(cnorm(sigmaC(a)) / hermC(a)).toBeLessThan(1e-12)
    expect(cnorm(sigmaC(b)) / hermC(b)).toBeLessThan(1e-12)
    // Identical, not merely both small: the two are one fact, as proved.
    expect(Math.abs(cnorm(sigmaC(a)) - cnorm(sigmaC(b)))).toBeLessThan(1e-20)
    expect(hermC(a)).toBeGreaterThan(1e-3)                             // rank 1, not a degree drop
  }, 300000)

  it('TEST m=3: a MIXED member — the pair soft, the real pole hard and NOT fake', () => {
    // The witness has to survive both degeneracies. softness is identically 1 at a real
    // pole (the triangle inequality's equality case), so it cannot certify the real pole
    // is healthy — only ‖𝒜(r₀)‖² can, and on most seeds it collapses to ~1e-6, meaning the
    // "hard" pole is nearly FAKE and the witness is worthless. This seed keeps it at 7.7e-2.
    const size = 20
    const t = 1
    const x0 = Array.from({ length: size }, (_, i) =>
      Math.cos(0.31 * i * i + 1.7 * t) - 0.8 * Math.sin(2.9 * i + 0.7 * t))
    const s0 = newton(makeF(M3, [0, 1], null), x0.map((v) => v / (Math.hypot(...x0) || 1)))
    expect(s0).not.toBeNull()

    const r = drive(M3, [0, 1], 1, s0!)
    expect(r.eps0).toBeGreaterThan(0.1)          // it really started hard at the pair
    expect(r.best).toBeLessThan(1e-12)           // and reached σ(r₁) = 0

    const A = toQ(r.x)
    const a0 = evalA(A, M3[0]), a1 = evalA(A, M3[1])
    expect(cnorm(sigmaC(a1)) / hermC(a1)).toBeLessThan(1e-10)   // the PAIR is soft…
    expect(hermC(a1)).toBeGreaterThan(1e-3)                     // …rank 1, not a degree drop
    expect(cnorm(sigmaC(a0)) / hermC(a0)).toBeGreaterThan(0.5)  // the REAL pole is hard…
    expect(hermC(a0)).toBeGreaterThan(1e-2)                     // …and NOT fake

    // INDEPENDENT confirmation that this is a genuine rational curve: the residue of
    // N/w² around r₁ by contour integration, which uses none of the algebra above. A
    // nonzero residue is a logarithm, and a logarithm means the curve is not rational.
    expect(contourResidue(A, M3, 1, 0.12)).toBeLessThan(1e-10)
    expect(contourResidue(A, M3, 0, 0.12)).toBeLessThan(1e-10)
  }, 300000)
})
