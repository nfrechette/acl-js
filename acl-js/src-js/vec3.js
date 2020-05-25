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

////////////////////////////////////////////////////////////////////////////////
// Represents a 3D vector.
////////////////////////////////////////////////////////////////////////////////
export class Vec3 {
  ////////////////////////////////////////////////////////////////////////////////
  // Constructs a vec3 from its three values.
  constructor(x, y, z) {
    if (typeof x !== 'number') {
      throw new TypeError("'x' must be a Number")
    }

    if (typeof y !== 'number') {
      throw new TypeError("'y' must be a Number")
    }

    if (typeof z !== 'number') {
      throw new TypeError("'z' must be a Number")
    }

    this.x = x
    this.y = y
    this.z = z
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Returns true if this vec3 instance is finite.
  isValid() {
    if (!Number.isFinite(this.x)) return false
    if (!Number.isFinite(this.y)) return false
    if (!Number.isFinite(this.z)) return false
    return true
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Returns a deep copy of this vec3 instance.
  clone() {
    return new Vec3(this.x, this.y, this.z)
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Add two vec3 instances component wise.
  static add(lhs, rhs) {
    return new Vec3(lhs.x + rhs.x, lhs.y + rhs.y, lhs.z + rhs.z)
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Multiplies two vec3 instances component wise or a vec3 by a scalar.
  static mul(lhs, rhs) {
    if (typeof rhs === 'number') {
      return new Vec3(lhs.x * rhs, lhs.y * rhs, lhs.z * rhs)
    }
    else {
      return new Vec3(lhs.x * rhs.x, lhs.y * rhs.y, lhs.z * rhs.z)
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Returns the linear interpolation between two vec3s.
  static lerp(lhs, rhs, alpha) {
    return Vec3.add(Vec3.mul(lhs, 1.0 - alpha), Vec3.mul(rhs, alpha))
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Returns a new instance of a 0,0,0 vec3.
  static get zero() {
    return new Vec3(0.0, 0.0, 0.0)
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Returns a new instance of a 1,1,1 vec3.
  static get one() {
    return new Vec3(1.0, 1.0, 1.0)
  }
}
