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

import { SampleTypes, isSampleType } from './sample_types.js'
import { QVV } from './qvv.js'

export class Sample {
  constructor(type, rawData, startIndex) {
    if (!isSampleType(type)) {
      throw new TypeError("'type' must be a SampleType")
    }

    if (!rawData || !(rawData instanceof Float32Array)) {
      throw new TypeError("'rawData' must be a Float32Array")
    }

    if (!Number.isInteger(startIndex)) {
      throw new TypeError("'startIndex' must be an integer")
    }

    if (startIndex < 0 || startIndex > rawData.length) {
      throw new RangeError(`Invalid start index: ${startIndex}`)
    }

    this._type = type
    this._rawData = rawData
    this._startIndex = startIndex
  }

  get type() {
    return this._type
  }

  getQVV(qvv) {
    if (this._type !== SampleTypes.QVV) {
      throw new TypeError('Sample is not a QVV')
    }

    const startIndex = this._startIndex
    qvv.rotation.x = this._rawData[startIndex + 0]
    qvv.rotation.y = this._rawData[startIndex + 1]
    qvv.rotation.z = this._rawData[startIndex + 2]
    qvv.rotation.w = this._rawData[startIndex + 3]
    qvv.translation.x = this._rawData[startIndex + 4]
    qvv.translation.y = this._rawData[startIndex + 5]
    qvv.translation.z = this._rawData[startIndex + 6]
    qvv.scale.x = this._rawData[startIndex + 7]
    qvv.scale.y = this._rawData[startIndex + 8]
    qvv.scale.z = this._rawData[startIndex + 9]

    return qvv
  }

  setQVV(qvv) {
    if (this._type !== SampleTypes.QVV) {
      throw new TypeError('Sample is not a QVV')
    }

    const startIndex = this._startIndex
    this._rawData[startIndex + 0] = qvv.rotation.x
    this._rawData[startIndex + 1] = qvv.rotation.y
    this._rawData[startIndex + 2] = qvv.rotation.z
    this._rawData[startIndex + 3] = qvv.rotation.w
    this._rawData[startIndex + 4] = qvv.translation.x
    this._rawData[startIndex + 5] = qvv.translation.y
    this._rawData[startIndex + 6] = qvv.translation.z
    this._rawData[startIndex + 7] = qvv.scale.x
    this._rawData[startIndex + 8] = qvv.scale.y
    this._rawData[startIndex + 9] = qvv.scale.z
  }

  getFloat() {
    if (this._type !== SampleTypes.Float) {
      throw new TypeError('Sample is not a Float')
    }

    return this._rawData[this._startIndex]
  }

  setFloat(flt) {
    if (this._type !== SampleTypes.Float) {
      throw new TypeError('Sample is not a Float')
    }

    this._rawData[this._startIndex] = flt
  }

  isValid() {
    switch (this._type) {
      case SampleTypes.QVV:
        const qvv = this.getQVV(QVV.identity)
        return qvv.isValid()
      case SampleTypes.Float:
        const flt = this.getFloat()
        return Number.isFinite(flt)
      default:
        return false
    }
  }
}
