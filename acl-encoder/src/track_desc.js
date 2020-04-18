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

export class ScalarTrackDescription {
  static getMetadataSize() {
    return 3
  }

  constructor(metadata, metadataOffset) {
    if (!Number.isInteger(metadataOffset)) {
      throw new TypeError("'metadataOffset' must be an integer")
    }

    if (metadataOffset < 0 || metadataOffset + 3 > metadata.length) {
      throw new RangeError(`Invalid metadata offset: ${metadataOffset}`)
    }

    this._metadata = metadata
    this._metadataOffset = metadataOffset

    // Use setters
    this.outputIndex = 0

    this.precision = 0.0
    this.constantThreshold = 0.0
  }

  get outputIndex() {
    return this._outputIndex
  }

  set outputIndex(value) {
    this._outputIndex = value
    this._metadata[this._metadataOffset + 0] = value
  }

  get precision() {
    return this._precision
  }

  set precision(value) {
    this._precision = value
    this._metadata[this._metadataOffset + 1] = value
  }

  get constantThreshold() {
    return this._constantThreshold
  }

  set constantThreshold(value) {
    this._constantThreshold = value
    this._metadata[this._metadataOffset + 2] = value
  }

  isValid() {
    if (!Number.isInteger(this._outputIndex) || this._outputIndex < 0 || this._outputIndex >= 65535) {
      return false
    }

    if (!Number.isFinite(this._precision) || this._precision < 0.0 || this._precision >= 100.0) {
      return false
    }

    if (!Number.isFinite(this._constantThreshold) || this._constantThreshold < 0.0 || this._constantThreshold >= 100.0) {
      return false
    }

    return true
  }
}

export class TransformTrackDescription {
  static getMetadataSize() {
    return 7
  }

  constructor(metadata, metadataOffset) {
    if (!Number.isInteger(metadataOffset)) {
      throw new TypeError("'metadataOffset' must be an integer")
    }

    if (metadataOffset < 0 || metadataOffset + 7 > metadata.length) {
      throw new RangeError(`Invalid metadata offset: ${metadataOffset}`)
    }

    this._metadata = metadata
    this._metadataOffset = metadataOffset

    // Use setters
    this.outputIndex = 0
    this.parentIndex = -1

    this.precision = 0.0001 // 0.1cm
    this.shellDistance = 1.0 // 1.0m
    this.constantRotationThreshold = 0.00284714461 // degrees
    this.constantTranslatonThreshold = 0.00001 // 0.001cm
    this.constantScaleThreshold = 0.00001
  }

  get outputIndex() {
    return this._outputIndex
  }

  set outputIndex(value) {
    this._outputIndex = value
    this._metadata[this._metadataOffset + 0] = value
  }

  get parentIndex() {
    return this._parentIndex
  }

  set parentIndex(value) {
    this._parentIndex = value
    this._metadata[this._metadataOffset + 1] = value
  }

  get precision() {
    return this._precision
  }

  set precision(value) {
    this._precision = value
    this._metadata[this._metadataOffset + 2] = value
  }

  get shellDistance() {
    return this._shellDistance
  }

  set shellDistance(value) {
    this._shellDistance = value
    this._metadata[this._metadataOffset + 3] = value
  }

  get constantRotationThreshold() {
    return this._constantRotationThreshold
  }

  set constantRotationThreshold(value) {
    this._constantRotationThreshold = value
    this._metadata[this._metadataOffset + 4] = value
  }

  get constantTranslatonThreshold() {
    return this._constantTranslatonThreshold
  }

  set constantTranslatonThreshold(value) {
    this._constantTranslatonThreshold = value
    this._metadata[this._metadataOffset + 5] = value
  }

  get constantScaleThreshold() {
    return this._constantScaleThreshold
  }

  set constantScaleThreshold(value) {
    this._constantScaleThreshold = value
    this._metadata[this._metadataOffset + 6] = value
  }

  isValid() {
    if (!Number.isInteger(this._outputIndex) || this._outputIndex < 0 || this._outputIndex >= 65535) {
      return false
    }

    if (!Number.isInteger(this._outputIndex) || this._parentIndex < -1 || this._parentIndex >= 65535) {
      return false
    }

    if (!Number.isFinite(this._precision) || this._precision < 0.0 || this._precision >= 100.0) {
      return false
    }

    if (!Number.isFinite(this._shellDistance) || this._shellDistance < 0.0 || this._shellDistance >= 10000.0) {
      return false
    }

    if (!Number.isFinite(this._constantRotationThreshold) || this._constantRotationThreshold < 0.0 || this._constantRotationThreshold >= 100.0) {
      return false
    }

    if (!Number.isFinite(this._constantTranslatonThreshold) || this._constantTranslatonThreshold < 0.0 || this._constantTranslatonThreshold >= 100.0) {
      return false
    }

    if (!Number.isFinite(this._constantScaleThreshold) || this._constantScaleThreshold < 0.0 || this._constantScaleThreshold >= 100.0) {
      return false
    }

    return true
  }
}
