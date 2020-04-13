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
  constructor() {
    this.outputIndex = 0

    this.precision = 0.0
    this.constantThreshold = 0.0
  }

  isValid() {
    if (!Number.isInteger(this.outputIndex) || this.outputIndex < 0 || this.outputIndex >= 65535) {
      return false
    }

    if (!Number.isFinite(this.precision) || this.precision < 0.0 || this.precision >= 100.0) {
      return false
    }

    if (!Number.isFinite(this.constantThreshold) || this.constantThreshold < 0.0 || this.constantThreshold >= 100.0) {
      return false
    }

    return true
  }
}

export class TransformTrackDescription {
  constructor() {
    this.outputIndex = 0
    this.parentIndex = -1

    this.precision = 0.0001 // 0.1cm
    this.shellDistance = 1.0 // 1.0m
    this.constantRotationThreshold = 0.00284714461 // degrees
    this.constantTranslatonThreshold = 0.00001 // 0.001cm
    this.constantScaleThreshold = 0.00001
  }

  isValid() {
    if (!Number.isInteger(this.outputIndex) || this.outputIndex < 0 || this.outputIndex >= 65535) {
      return false
    }

    if (!Number.isInteger(this.outputIndex) || this.parentIndex < -1 || this.parentIndex >= 65535) {
      return false
    }

    if (!Number.isFinite(this.precision) || this.precision < 0.0 || this.precision >= 100.0) {
      return false
    }

    if (!Number.isFinite(this.shellDistance) || this.shellDistance < 0.0 || this.shellDistance >= 10000.0) {
      return false
    }

    if (!Number.isFinite(this.constantRotationThreshold) || this.constantRotationThreshold < 0.0 || this.constantRotationThreshold >= 100.0) {
      return false
    }

    if (!Number.isFinite(this.constantTranslatonThreshold) || this.constantTranslatonThreshold < 0.0 || this.constantTranslatonThreshold >= 100.0) {
      return false
    }

    if (!Number.isFinite(this.constantScaleThreshold) || this.constantScaleThreshold < 0.0 || this.constantScaleThreshold >= 100.0) {
      return false
    }

    return true
  }
}
