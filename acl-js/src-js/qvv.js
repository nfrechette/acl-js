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

import { Quat } from './quat.js'
import { Vec3 } from './vec3.js'

export class QVV {
  constructor(rotation, translation, scale) {
    if (!(rotation instanceof Quat)) {
      throw new TypeError("'rotation' must be a Quat")
    }

    if (!(translation instanceof Vec3)) {
      throw new TypeError("'translation' must be a Vec3")
    }

    if (!(scale instanceof Vec3)) {
      throw new TypeError("'scale' must be a Vec3")
    }

    this.rotation = rotation
    this.translation = translation
    this.scale = scale
  }

  isValid() {
    return this.rotation.isValid() && this.translation.isValid() && this.scale.isValid()
  }

  static get identity() {
    return new QVV(Quat.identity, Vec3.zero, Vec3.one)
  }
}
