// https://rosettacode.org/wiki/Gaussian_elimination#JavaScript

import { SquareMatrix } from "./SquareMatrix"


// Lower Upper Solver
export function lusolve(matrix: SquareMatrix, b: number[], update: boolean = false) {
    let A = matrix.toNumberArray()
    let lu = ludcmp(A, update)
	if (lu === undefined) return // Singular Matrix!
	return lubksb(lu, b, update)
}
 
// Lower Upper Decomposition
function ludcmp(A: number[][], update: boolean) {
	// A is a matrix that we want to decompose into Lower and Upper matrices.
	let d = true
	let n = A.length
	let idx = new Array(n) // Output vector with row permutations from partial pivoting
	let vv = new Array(n)  // Scaling information
 
	for (let i=0; i<n; i++) {
		let max = 0
		for (let j=0; j<n; j++) {
			let temp = Math.abs(A[i][j])
			if (temp > max) max = temp
		}
		if (max === 0) return // Singular Matrix!
		vv[i] = 1 / max // Scaling
	}
 
	if (!update) { // make a copy of A 
		let Acpy = new Array(n)
		for (let i=0; i<n; i++) {		
			let Ai = A[i] 
			let Acpyi = new Array(Ai.length)
			for (let j=0; j<Ai.length; j+=1) Acpyi[j] = Ai[j]
			Acpy[i] = Acpyi
		}
		A = Acpy
	}
 
	let tiny = 1e-20 // in case pivot element is zero
	for (let i=0; ; i++) {
		for (let j=0; j<i; j++) {
			let sum = A[j][i]
			for (let k=0; k<j; k++) sum -= A[j][k] * A[k][i];
			A[j][i] = sum
		}
		let jmax = 0
		let max = 0;
		for (let j=i; j<n; j++) {
			let sum = A[j][i]
			for (let k=0; k<i; k++) sum -= A[j][k] * A[k][i];
			A[j][i] = sum
			let temp = vv[j] * Math.abs(sum)
			if (temp >= max) {
				max = temp
				jmax = j
			}
		}
		if (i <= jmax) {
			for (let j=0; j<n; j++) {
				let temp = A[jmax][j]
				A[jmax][j] = A[i][j]
				A[i][j] = temp
			}
			d = !d;
			vv[jmax] = vv[i]
		}
		idx[i] = jmax;
		if (i === n-1) break;
		let temp = A[i][i]
		if (temp === 0) A[i][i] = temp = tiny
		temp = 1 / temp
		for (let j=i+1; j<n; j++) A[j][i] *= temp
	}
	return {A:A, idx:idx, d:d}
}
 
// Lower Upper Back Substitution
function lubksb(lu: {A: number[][], idx: any[], d: boolean}, b: number[], update: boolean) {
	// solves the set of n linear equations A*x = b.
	// lu is the object containing A, idx and d as determined by the routine ludcmp.
	let A = lu.A
	let idx = lu.idx
	let n = idx.length
 
	if (!update) { // make a copy of b
		let bcpy = new Array(n) 
		for (let i=0; i<b.length; i+=1) bcpy[i] = b[i]
		b = bcpy
	}
 
	for (let ii=-1, i=0; i<n; i++) {
		let ix = idx[i]
		let sum = b[ix]
		b[ix] = b[i]
		if (ii > -1)
			for (let j=ii; j<i; j++) sum -= A[i][j] * b[j]
		else if (sum)
			ii = i
		b[i] = sum
	}
	for (let i=n-1; i>=0; i--) {
		let sum = b[i]
		for (let j=i+1; j<n; j++) sum -= A[i][j] * b[j]
		b[i] = sum / A[i][i]
	}
	return b // solution vector x
}
 