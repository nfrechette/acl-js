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

//////////////////////////////////////////////////////////////////////////
// This structure describes the various settings for floating point scalar tracks.
// Used by: Float
//////////////////////////////////////////////////////////////////////////
export class ScalarTrackDescription {
  //////////////////////////////////////////////////////////////////////////
  // Number of metadata floats required
  static getMetadataSize() {
    return 2
  }

  //////////////////////////////////////////////////////////////////////////
  // Constructs a ScalarTrackDescription instance.
  // For performance reasons, metadata values are written at a specific position in a
  // larger array of data.
  constructor(metadata, metadataOffset) {
    if (!Number.isInteger(metadataOffset)) {
      throw new TypeError("'metadataOffset' must be an integer")
    }

    if (metadataOffset < 0 || metadataOffset + 2 > metadata.length) {
      throw new RangeError(`Invalid metadata offset: ${metadataOffset}`)
    }

    this._metadata = metadata
    this._metadataOffset = metadataOffset

    // Use setters
    this.outputIndex = 0

    this.precision = 0.0
  }

  //////////////////////////////////////////////////////////////////////////
  // The track output index. When writing out the compressed data stream, this index
  // will be used instead of the track index. This allows custom reordering for things
  // like LOD sorting or skeleton remapping. A value of '-1' will strip the track
  // from the compressed data stream. Output indices must be unique and contiguous.
  get outputIndex() {
    return this._outputIndex
  }

  //////////////////////////////////////////////////////////////////////////
  // The track output index. When writing out the compressed data stream, this index
  // will be used instead of the track index. This allows custom reordering for things
  // like LOD sorting or skeleton remapping. A value of '-1' will strip the track
  // from the compressed data stream. Output indices must be unique and contiguous.
  set outputIndex(value) {
    this._outputIndex = value
    this._metadata[this._metadataOffset + 0] = value
  }

  //////////////////////////////////////////////////////////////////////////
  // The per component precision threshold to try and attain when optimizing the bit rate.
  // If the error is below the precision threshold, we will remove bits until we reach it without
  // exceeding it. If the error is above the precision threshold, we will add more bits until
  // we lower it underneath.
  get precision() {
    return this._precision
  }

  //////////////////////////////////////////////////////////////////////////
  // The per component precision threshold to try and attain when optimizing the bit rate.
  // If the error is below the precision threshold, we will remove bits until we reach it without
  // exceeding it. If the error is above the precision threshold, we will add more bits until
  // we lower it underneath.
  set precision(value) {
    this._precision = value
    this._metadata[this._metadataOffset + 1] = value
  }

  //////////////////////////////////////////////////////////////////////////
  // Returns true if this instance contains valid data, false otherwise.
  isValid() {
    if (!Number.isInteger(this._outputIndex) || this._outputIndex < 0 || this._outputIndex >= 65535) {
      return false
    }

    if (!Number.isFinite(this._precision) || this._precision < 0.0 || this._precision >= 100.0) {
      return false
    }

    return true
  }
}

//////////////////////////////////////////////////////////////////////////
// This structure describes the various settings for transform tracks.
// Used by: QVV
//////////////////////////////////////////////////////////////////////////
export class TransformTrackDescription {
  //////////////////////////////////////////////////////////////////////////
  // Number of metadata floats required
  static getMetadataSize() {
    return 7
  }

  //////////////////////////////////////////////////////////////////////////
  // Constructs a TransformTrackDescription instance.
  // For performance reasons, metadata values are written at a specific position in a
  // larger array of data.
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

    this.precision = 0.0001 // 0.01cm
    this.shellDistance = 1.0 // 1.0m
    this.constantRotationThresholdAngle = 0.00284714461 // radians
    this.constantTranslationThreshold = 0.00001 // 0.001cm
    this.constantScaleThreshold = 0.00001
  }

  //////////////////////////////////////////////////////////////////////////
  // The track output index. When writing out the compressed data stream, this index
  // will be used instead of the track index. This allows custom reordering for things
  // like LOD sorting or skeleton remapping. A value of '-1' will strip the track
  // from the compressed data stream. Output indices must be unique and contiguous.
  get outputIndex() {
    return this._outputIndex
  }

  //////////////////////////////////////////////////////////////////////////
  // The track output index. When writing out the compressed data stream, this index
  // will be used instead of the track index. This allows custom reordering for things
  // like LOD sorting or skeleton remapping. A value of '-1' will strip the track
  // from the compressed data stream. Output indices must be unique and contiguous.
  set outputIndex(value) {
    this._outputIndex = value
    this._metadata[this._metadataOffset + 0] = value
  }

  //////////////////////////////////////////////////////////////////////////
  // The index of the parent transform track or `-1` if it has no parent.
  get parentIndex() {
    return this._parentIndex
  }

  //////////////////////////////////////////////////////////////////////////
  // The index of the parent transform track or `-1` if it has no parent.
  set parentIndex(value) {
    this._parentIndex = value
    this._metadata[this._metadataOffset + 1] = value
  }

  //////////////////////////////////////////////////////////////////////////
  // The shell precision threshold to try and attain when optimizing the bit rate.
  // If the error is below the precision threshold, we will remove bits until we reach it without
  // exceeding it. If the error is above the precision threshold, we will add more bits until
  // we lower it underneath.
  // Note that you will need to change this value if your units are not in meters.
  // Defaults to '0.0001' meter
  get precision() {
    return this._precision
  }

  //////////////////////////////////////////////////////////////////////////
  // The shell precision threshold to try and attain when optimizing the bit rate.
  // If the error is below the precision threshold, we will remove bits until we reach it without
  // exceeding it. If the error is above the precision threshold, we will add more bits until
  // we lower it underneath.
  // Note that you will need to change this value if your units are not in meters.
  // Defaults to '0.0001' meter
  set precision(value) {
    this._precision = value
    this._metadata[this._metadataOffset + 2] = value
  }

  //////////////////////////////////////////////////////////////////////////
  // The error is measured on a rigidly deformed shell around every transform at the specified distance.
  // Note that you will need to change this value if your units are not in meters.
  // Defaults to '1.0' meter
  get shellDistance() {
    return this._shellDistance
  }

  //////////////////////////////////////////////////////////////////////////
  // The error is measured on a rigidly deformed shell around every transform at the specified distance.
  // Note that you will need to change this value if your units are not in meters.
  // Defaults to '1.0' meter
  set shellDistance(value) {
    this._shellDistance = value
    this._metadata[this._metadataOffset + 3] = value
  }

  //////////////////////////////////////////////////////////////////////////
  // Threshold angle when detecting if rotation tracks are constant or default.
  // You will typically NEVER need to change this, the value has been
  // selected to be as safe as possible and is independent of game engine units.
  // Defaults to '0.00284714461' radians
  get constantRotationThresholdAngle() {
    return this._constantRotationThresholdAngle
  }

  //////////////////////////////////////////////////////////////////////////
  // Threshold angle when detecting if rotation tracks are constant or default.
  // You will typically NEVER need to change this, the value has been
  // selected to be as safe as possible and is independent of game engine units.
  // Defaults to '0.00284714461' radians
  set constantRotationThresholdAngle(value) {
    this._constantRotationThresholdAngle = value
    this._metadata[this._metadataOffset + 4] = value
  }

  //////////////////////////////////////////////////////////////////////////
  // Threshold value to use when detecting if translation tracks are constant or default.
  // Note that you will need to change this value if your units are not in meters.
  // Defaults to '0.00001' meters.
  get constantTranslationThreshold() {
    return this._constantTranslationThreshold
  }

  //////////////////////////////////////////////////////////////////////////
  // Threshold value to use when detecting if translation tracks are constant or default.
  // Note that you will need to change this value if your units are not in meters.
  // Defaults to '0.00001' meters.
  set constantTranslationThreshold(value) {
    this._constantTranslationThreshold = value
    this._metadata[this._metadataOffset + 5] = value
  }

  //////////////////////////////////////////////////////////////////////////
  // Threshold value to use when detecting if scale tracks are constant or default.
  // There are no units for scale as such a value that was deemed safe was selected
  // as a default.
  // Defaults to '0.00001'
  get constantScaleThreshold() {
    return this._constantScaleThreshold
  }

  //////////////////////////////////////////////////////////////////////////
  // Threshold value to use when detecting if scale tracks are constant or default.
  // There are no units for scale as such a value that was deemed safe was selected
  // as a default.
  // Defaults to '0.00001'
  set constantScaleThreshold(value) {
    this._constantScaleThreshold = value
    this._metadata[this._metadataOffset + 6] = value
  }

  //////////////////////////////////////////////////////////////////////////
  // Returns true if this instance contains valid data, false otherwise.
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

    if (!Number.isFinite(this._constantRotationThresholdAngle) || this._constantRotationThresholdAngle < 0.0 || this._constantRotationThresholdAngle >= 100.0) {
      return false
    }

    if (!Number.isFinite(this._constantTranslationThreshold) || this._constantTranslationThreshold < 0.0 || this._constantTranslationThreshold >= 100.0) {
      return false
    }

    if (!Number.isFinite(this._constantScaleThreshold) || this._constantScaleThreshold < 0.0 || this._constantScaleThreshold >= 100.0) {
      return false
    }

    return true
  }
}
