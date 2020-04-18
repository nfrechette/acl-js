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

import { QVV } from './qvv.js'
import { SampleTypes, isSampleType } from './sample_types.js'
import { Sample } from './sample.js'
import { ScalarTrackDescription, TransformTrackDescription } from './track_desc.js'

export class Track {
  constructor(sampleType, numSamples, sampleRate) {
    if (!isSampleType(sampleType)) {
      throw new TypeError("'type' must be a SampleType")
    }

    if (!Number.isInteger(numSamples)) {
      throw new TypeError("'numSamples' must be an integer")
    }

    if (numSamples < 0 || numSamples > (1 << 24)) {
      throw new RangeError(`Invalid number of samples: ${numSamples}`)
    }

    if (!Number.isFinite(sampleRate) || sampleRate < 0.0 || sampleRate >= 10000.0) {
      throw new RangeError(`Invalid sample rate: ${sampleRate}`)
    }

    this._sampleType = sampleType
    this._numSamples = numSamples
    this._sampleRate = sampleRate

    let numFloatsPerSample = 0
    let identity = null
    switch (sampleType) {
      case SampleTypes.QVV:
        numFloatsPerSample = (4 + 3 + 3)
        identity = QVV.identity
        this._desc = new TransformTrackDescription()
        break
        numFloatsPerSample = 1
      case SampleTypes.Float:
        identity = 0.0
        this._desc = new ScalarTrackDescription()
        break
      default:
        throw new TypeError('Unknown sample type')
    }

    const rawData = new Float32Array(numFloatsPerSample * numSamples)
    this._rawData = rawData
    this._samples = new Array(numSamples)

    // Allocate and initialize our samples to the identity
    let floatIndex = 0
    for (let i = 0; i < numSamples; ++i) {
      this._samples[i] = new Sample(sampleType, rawData, floatIndex)

      switch (sampleType) {
        case SampleTypes.QVV:
          this._samples[i].setQVV(identity)
          break
        case SampleTypes.Float:
          this._samples[i].setFloat(identity)
          break
      }

      floatIndex += numFloatsPerSample
    }
  }

  get numSamples() {
    return this._numSamples
  }

  get sampleType() {
    return this._sampleType
  }

  get sampleRate() {
    return this._sampleRate
  }

  get sampleSize() {
    switch (this.sampleType) {
      case SampleTypes.QVV:       return (4 + 3 + 3) * 4
      case SampleTypes.Float:     return 4
      default:                    throw new TypeError('Unknown sample type')
    }
  }

  get duration() {
    if (this._numSamples === 0) {
      // No samples means no duration
      return 0.0
    }

    if (this._numSamples === 1) {
      // A single sample means we have an indefinite duration (static pose)
      return Number.POSITIVE_INFINITY
    }

    // Otherwise we have some duration
    return (this._numSamples - 1) / this._sampleRate
  }

  get description() {
    return this._desc
  }

  at(sampleIndex) {
    if (sampleIndex < 0 || sampleIndex >= this._numSamples) {
      throw new RangeError('Invalid sample index');
    }

    return this._samples[sampleIndex]
  }

  isValid() {
    if (!this._desc.isValid()) {
      return false
    }

    for (let i = 0; i < this._numSamples; ++i) {
      if (!this._samples[i].isValid()) {
        return false
      }
    }

    return true
  }
}
