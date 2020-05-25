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

import { Decoder } from './decoder.js'
import { SampleTypes } from './sample_types.js'
import { TrackError } from './track_error.js'

////////////////////////////////////////////////////////////////////////////////
// A CompressedTracks instance wraps an ArrayBuffer or Uint8Array that contains
// an ACL compressed buffer. This buffer must have been created either with the
// provided JS encoder or with a compatible ACL executable.
// The data within is read-only and contains a optional error information (present
// only when the JS encoder is used).
////////////////////////////////////////////////////////////////////////////////
export class CompressedTracks {
  ////////////////////////////////////////////////////////////////////////////////
  // Construct a CompressedTracks instance from an ArrayBuffer or Uint8Array
  // and an optional TrackError description.
  constructor(buffer, trackError) {
    if (!buffer) {
      throw new TypeError("'buffer' must be an ArrayBuffer or Uint8Array")
    }

    if (buffer instanceof ArrayBuffer) {
      this._array = new Uint8Array(buffer)
    }
    else if (buffer instanceof Uint8Array) {
      this._array = buffer
    }
    else {
      throw new TypeError("'buffer' must be an ArrayBuffer or Uint8Array")
    }

    if (trackError && !(trackError instanceof TrackError)) {
      throw new TypeError("'trackError' must be a TrackError")
    }

    // uint32 buffer_size
    // uint32 hash
    // uint32 tag
    const bufferHeader = new Uint32Array(this._array.buffer, 0, 3)

    if (bufferHeader[2] == 0xac10ac10) {
      // CompressedClip is 16 bytes, ClipHeader is 20 bytes + offsets
      const compressedClipHeaderSize = 4 + 5
      const compressedClipHeader = new Uint32Array(this._array.buffer, 0, compressedClipHeaderSize)

      this.version = compressedClipHeader[3] & 0xFFFF
      this.numTracks = compressedClipHeader[4] & 0xFFFF
      this.numSegments = compressedClipHeader[4] >> 16
      this.hasScale = compressedClipHeader[5] >> 24
      this.numSamplesPerTrack = compressedClipHeader[7]
      //this.sampleRate = compressedClipHeader[8]

      // QVV is 12 floats each
      this.outputBufferSize = this.numTracks * 12 * 4
      this.sampleSize = 12 * 4
      this.sampleType = SampleTypes.QVV
    }
    else if (bufferHeader[2] == 0xac11ac11) {
      // compressed_tracks is 8 bytes for raw buffer header, and 24 bytes for the tracks header
      const compressedTracksHeaderSize = 2 + 6
      const compressedTracksHeader = new Uint32Array(this._array.buffer, 0, compressedTracksHeaderSize)

      this.version = compressedTracksHeader[3] & 0xFFFF
      this.numTracks = compressedTracksHeader[4]
      this.numSamplesPerTrack = compressedTracksHeader[5]
      //this.sampleRate = compressedTracksHeader[6]

      // 1 float per track
      this.outputBufferSize = this.numTracks * 4
      this.sampleSize = 4
      this.sampleType = SampleTypes.Float
    }
    else {
      throw new Error('Unrecognized compressed buffer')
    }

    this._decoder = null
    this._mem = null
    this._error = trackError ? trackError : null
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Returns the length of the compressed buffer in bytes.
  get byteLength() {
    return this._array ? this._array.byteLength : this._mem.byteLength
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Returns the Uint8Array instance of the compressed buffer.
  get array() {
    return this._array ? this._array : this._mem.array
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Returns true if this compressed buffer has been bound to a decoder instance, false otherwise.
  get isBound() {
    return !!this._decoder
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Returns a TrackError instance if present, or null
  get error() {
    return this._error
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Binds this compressed buffer to the provided Decoder instance.
  // This copies the buffer into the decoder WASM heap, releasing the old buffer.
  // A CompressedTracks instance must be bound before it can be used to decompress.
  bind(decoder) {
    if (!decoder || !(decoder instanceof Decoder)) {
      throw new TypeError("'decoder' must be a Decoder instance")
    }

    if (this._decoder) {
      throw new Error('Already bound to a decoder')
    }

    // Allocate space on the WASM heap and copy our content over
    const mem = decoder.malloc(this.byteLength)
    mem.array.set(this._array)

    this._mem = mem
    this._array = null
    this._decoder = decoder
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Disposes of the WASM memory used in the bound decoder (if bound).
  // Because WASM cannot read JS heap memory, we have to copy data into the WASM heap
  // and as such we have to rely on manual memory management.
  dispose() {
    if (this._mem) {
      this._decoder.free(this._mem)
    }

    this._mem = null
    this._array = null
    this._decoder = null
  }
}
