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

import { SampleType, isSampleType, sampleTypeToMetadata, getNumFloatsPerSample } from './sample_type.js'
import { isRoundingPolicy } from './rounding_policy.js'
import { Track } from './track.js'
import { QVV } from './qvv.js'
import { Quat } from './quat.js'
import { Vec3 } from './vec3.js'
import { findLinearInterpolationSamplesWithSampleRate } from './util.js'

//////////////////////////////////////////////////////////////////////////
// An array of tracks.
// Each track has the same type, the same number of samples, and the same
// sample rate.
//////////////////////////////////////////////////////////////////////////
export class TrackArray {
  //////////////////////////////////////////////////////////////////////////
  // Number of metadata floats required
  static getMetadataSize(numTracks, sampleType, numSamplesPerTrack) {
    return Track.getMetadataSize(sampleType) * numTracks + 4
  }

  //////////////////////////////////////////////////////////////////////////
  // Constructs an array with the specified number of tracks, number of samples,
  // sample type, and sample rate.
  // Each track will pre-allocate.
  constructor(numTracks, sampleType, numSamplesPerTrack, sampleRate) {
    if (!Number.isInteger(numTracks)) {
      throw new TypeError("'numTracks' must be an integer")
    }

    if (numTracks < 0 || numTracks > (1 << 24)) {
      throw new RangeError(`Invalid number of tracks: ${numTracks}`)
    }

    if (!isSampleType(sampleType)) {
      throw new TypeError("'type' must be a SampleType")
    }

    if (!Number.isInteger(numSamplesPerTrack)) {
      throw new TypeError("'numSamples' must be an integer")
    }

    if (numSamplesPerTrack < 0 || numSamplesPerTrack > (1 << 24)) {
      throw new RangeError(`Invalid number of samples per track: ${numSamplesPerTrack}`)
    }

    if (!Number.isFinite(sampleRate) || sampleRate < 0.0 || sampleRate >= 10000.0) {
      throw new RangeError(`Invalid sample rate: ${sampleRate}`)
    }

    this._numTracks = numTracks
    this._sampleType = sampleType
    this._numSamplesPerTrack = numSamplesPerTrack
    this._sampleRate = sampleRate
    this._tracks = new Array(numTracks)

    const numFloatsPerSample = getNumFloatsPerSample(sampleType)

    // When we call into WASM, we can only use int/float/double and arrays
    // To simplify things, all our data is packed into two float64 arrays
    // One for the raw data of every track and one for the metadata

    const metadataSize = TrackArray.getMetadataSize(numTracks, sampleType, numSamplesPerTrack)
    const trackMetadataSize = Track.getMetadataSize(sampleType)
    const metadata = new Float64Array(metadataSize)
    this._metadata = metadata

    const rawData = new Float64Array(numFloatsPerSample * numSamplesPerTrack * numTracks)
    this._rawData = rawData

    // Allocate and initialize our tracks
    let rawDataOffset = 0
    let metadataOffset = 4
    for (let trackIndex = 0; trackIndex < numTracks; ++trackIndex) {
      this._tracks[trackIndex] = new Track(sampleType, numSamplesPerTrack, sampleRate, rawData, rawDataOffset, metadata, metadataOffset)
      this._tracks[trackIndex].description.outputIndex = trackIndex

      rawDataOffset += numFloatsPerSample * numSamplesPerTrack
      metadataOffset += trackMetadataSize
    }

    // Setup our metadata
    metadata[0] = numTracks
    metadata[1] = sampleTypeToMetadata(sampleType)
    metadata[2] = numSamplesPerTrack
    metadata[3] = sampleRate
  }

  //////////////////////////////////////////////////////////////////////////
  // Returns the number of tracks contained in this array.
  get numTracks() {
    return this._numTracks
  }

  //////////////////////////////////////////////////////////////////////////
  // Returns the number of samples per track in this array.
  get numSamplesPerTrack() {
    return this._numSamplesPerTrack
  }

  //////////////////////////////////////////////////////////////////////////
  // Returns the track type for tracks in this array.
  get sampleType() {
    return this._sampleType
  }

  //////////////////////////////////////////////////////////////////////////
  // Returns the sample rate for tracks in this array.
  get sampleRate() {
    return this._sampleRate
  }

  //////////////////////////////////////////////////////////////////////////
  // Returns the duration for tracks in this array.
  get duration() {
    if (this._numTracks === 0) {
      return 0.0
    }

    return this._tracks[0].duration
  }

  //////////////////////////////////////////////////////////////////////////
  // Returns the track at the specified index.
  at(trackIndex) {
    if (trackIndex < 0 || trackIndex >= this._numTracks) {
      throw new RangeError('Invalid track index');
    }

    return this._tracks[trackIndex]
  }

  //////////////////////////////////////////////////////////////////////////
  // Returns the raw size in bytes for this track array. Note that this differs from the actual
  // memory used by an instance of this class. It is meant for comparison against
  // the compressed size.
  getRawSize() {
    const numFloatsPerSample = getNumFloatsPerSample(this.sampleType)
    const numBytesPerSample = numFloatsPerSample * 4
    return numBytesPerSample * this._numSamplesPerTrack * this._numTracks
  }

  //////////////////////////////////////////////////////////////////////////
  // Returns whether a track array is valid or not.
  // An array is valid if:
  //    - It is empty
  //    - All tracks are valid
  isValid() {
    for (let i = 0; i < this._numTracks; ++i) {
      if (!this._tracks[i].isValid()) {
        return false
      }
    }

    return true
  }

  //////////////////////////////////////////////////////////////////////////
  // Sample all tracks within this array at the specified sample time and
  // desired rounding policy.
  // Returns an array of sample values (QVV, float, etc).
  sampleTracks(sampleTime, roundingPolicy) {
    const result = new Array(this._numTracks)

    for (let trackIndex = 0; trackIndex < this._numTracks; ++trackIndex) {
      result[trackIndex] = this.sampleTrack(trackIndex, sampleTime, roundingPolicy)
    }

    return result
  }

  //////////////////////////////////////////////////////////////////////////
  // Sample a single track within this array at the specified sample time and
  // desired rounding policy.
  // Returns a sample value (QVV, float, etc).
  sampleTrack(trackIndex, sampleTime, roundingPolicy) {
    if (!Number.isInteger(trackIndex) || trackIndex < 0 || trackIndex >= this._numTracks) {
      throw new RangeError(`Invalid track index: ${trackIndex}`);
    }

    if (!Number.isFinite(sampleTime)) {
      throw new RangeError(`Invalid sample time: ${sampleTime}`)
    }

    if (!isRoundingPolicy(roundingPolicy)) {
      throw new TypeError("'roundingPolicy' must be a RoundingPolicy")
    }

    // Clamp
    sampleTime = Math.max(Math.min(sampleTime, this.duration), 0.0)

    // Find the sample indices and interpolation alpha we need
    const interpolationData = findLinearInterpolationSamplesWithSampleRate(this._numSamplesPerTrack, this._sampleRate, sampleTime, roundingPolicy)

    // Get our samples
    const track = this._tracks[trackIndex]
    const sample0 = track.at(interpolationData.sampleIndex0)
    const sample1 = track.at(interpolationData.sampleIndex1)

    // Interpolate
    let value = null
    switch (this._sampleType) {
      case SampleType.QVV:
        const qvv0 = sample0.getQVV(QVV.identity)
        const qvv1 = sample1.getQVV(QVV.identity)
        const rotation = Quat.lerp(qvv0.rotation, qvv1.rotation, interpolationData.interpolationAlpha)
        const translation = Vec3.lerp(qvv0.translation, qvv1.translation, interpolationData.interpolationAlpha)
        const scale = Vec3.lerp(qvv0.scale, qvv1.scale, interpolationData.interpolationAlpha)
        value = new QVV(rotation, translation, scale)
        break
      case SampleType.Float:
        const float0 = sample0.getFloat()
        const float1 = sample1.getFloat()
        const alpha0 = 1.0 - interpolationData.interpolationAlpha
        const alpha1 = interpolationData.interpolationAlpha
        value = (float0 * alpha0) + (float1 * alpha1)
        break
    }

    // Done!
    return value
  }
}
