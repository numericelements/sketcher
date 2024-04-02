/**
 * A two dimensional complex vector
 */

export class ComplexMassPoint1d {

    constructor(public mP: Complex, public m: Complex) {
    }

    negative()  {
        return new ComplexMassPoint1d(negative(this.mP), negative(this.m))
    }

    add(v: ComplexMassPoint1d) {
        return new ComplexMassPoint1d(cadd(this.mP, v.mP), cadd(this.m, v.m))
    }

    multiply(value: Complex) {
        return new ComplexMassPoint1d(cmult(this.mP, value), cmult(this.m, value))
    }

    subtract(v: ComplexMassPoint1d) {
        return new ComplexMassPoint1d(csub(this.mP, v.mP), csub(this.m, v.m))
    }

    clone() {
        return new ComplexMassPoint1d({x: this.mP.x, y: this.mP.y}, {x: this.m.x, y: this.m.y})
    }

}


export type Complex = {
    x: number
    y: number
}



export function cnorm(p: Complex) {
    return Math.sqrt(p.x * p.x + p.y * p.y)
}

/**
 * Complex number addition
 */
export function cadd(p1: Complex, p2: Complex): Complex {
    return ({x: p1.x + p2.x, y: p1.y + p2.y})
}

/**
 * Complex number substraction
 */
export function csub(p1: Complex, p2: Complex): Complex {
    return ({x: p1.x - p2.x, y: p1.y - p2.y})
}

/**
 * Complex number multiplication
 */
export function cmult(p1: Complex, p2: Complex): Complex {
    return ({x: p1.x * p2.x - p1.y * p2.y, y: p1.x * p2.y + p1.y * p2.x})
}

/**
 * Complex number division
 */
export function cdiv(p1: Complex, p2: Complex): Complex {
    const l2 = p2.x * p2.x + p2.y * p2.y
    return {x: (p1.x * p2.x + p1.y * p2.y) / l2, y: (p2.x * p1.y - p2.y * p1.x) / l2}
}

/**
 * Complex number scalar multiplication
 */
export function cX(p: Complex, scalar: number): Complex {
    return ({x: p.x * scalar, y: p.y * scalar})
}

/**
 * Grassmann space
 */
export type MassPoint = {
    mP:{x: number, y: number}
    m: number 
}

/**
 * Mass point addition
 */
export function madd(p1: MassPoint, p2: MassPoint): MassPoint {
    return {mP: {x: p1.mP.x + p2.mP.x, y: p1.mP.y + p2.mP.y}, m: p1.m + p2.m }
}

export type ComplexMassPoint = {
    mP: Complex
    m: Complex
}

/**
 * Complex mass point addition
 */
export function cmadd(p1: ComplexMassPoint, p2: ComplexMassPoint) {
    return {mP: cadd(p1.mP, p2.mP), m: cadd(p1.m, p2.m) }
}

/**
 * Complex mass point multiplication by complex value
 */
export function cmX(p: ComplexMassPoint, scalar: Complex): ComplexMassPoint {
    return {mP: cmult(p.mP, scalar), m: cmult(p.m, scalar)}
}

/**
 * Complex mass point to complex number
 */
export function cm2c(p: ComplexMassPoint): Complex {
    return cdiv(p.mP, p.m)
} 

export function negative(c: Complex) {
    return {x: -c.x, y: -c.y}
}

export function cmNegative(p: ComplexMassPoint): ComplexMassPoint {
    return {mP: negative(p.mP), m: negative(p.m)}
}



