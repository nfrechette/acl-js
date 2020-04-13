////////////////////////////////////////////////////////////////////////////////
// The MIT License (MIT)
//
// Copyright (c) 2020 Nicholas Frechette & acl-js contributors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
////////////////////////////////////////////////////////////////////////////////

export class Quat {
  constructor(x, y, z, w) {
    if (typeof x !== 'number') {
      throw new TypeError("'x' must be a Number")
    }

    if (typeof y !== 'number') {
      throw new TypeError("'y' must be a Number")
    }

    if (typeof z !== 'number') {
      throw new TypeError("'z' must be a Number")
    }

    if (typeof w !== 'number') {
      throw new TypeError("'w' must be a Number")
    }

    this.x = x
    this.y = y
    this.z = z
    this.w = w
  }

  isValid() {
    const lenSq = (this.x * this.x) + (this.y * this.y) + (this.z * this.z) + (this.w * this.w)
    if (!Number.isFinite(lenSq)) return false
    return Math.abs(lenSq - 1.0) < 0.0001
  }

  clone() {
    return new Quat(this.x, this.y, this.z, this.w)
  }

  normalize() {
    const lenSq = Quat.dot(this, this)
    const invLen = 1.0 / Math.sqrt(lenSq)
    this.x *= invLen
    this.y *= invLen
    this.z *= invLen
    this.w *= invLen
    return this
  }

  static dot(lhs, rhs) {
    return (lhs.x * rhs.x) + (lhs.y * rhs.y) + (lhs.z * rhs.z) + (lhs.w * rhs.w)
  }

  static lerp(lhs, rhs, alpha) {
    const dot_ = Quat.dot(lhs, rhs)
    const alpha0 = 1.0 - alpha
    const alpha1 = dot_ >= 0.0 ? alpha : -alpha
    const x = (lhs.x * alpha0) + (rhs.x * alpha1)
    const y = (lhs.y * alpha0) + (rhs.y * alpha1)
    const z = (lhs.z * alpha0) + (rhs.z * alpha1)
    const w = (lhs.w * alpha0) + (rhs.w * alpha1)
    const result = new Quat(x, y, z, w)
    return result.normalize()
  }

  static get identity() {
    return new Quat(0.0, 0.0, 0.0, 1.0)
  }
}
