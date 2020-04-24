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

export class CompressedTracks {
  constructor(buffer) {
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

    // CompressedClip is 16 bytes, ClipHeader is 20 bytes + offsets
    const compressedTracksHeaderSize = 4 + 5
    const compressedTracksHeader = new Uint32Array(this._array.buffer, 0, compressedTracksHeaderSize)

    this._decoder = null
    this._mem = null

    this.version = compressedTracksHeader[3] & 0xFFFF
    this.numTracks = compressedTracksHeader[4] & 0xFFFF
    this.numSegments = compressedTracksHeader[4] >> 16
    this.hasScale = compressedTracksHeader[5] >> 24
    this.numSamplesPerTrack = compressedTracksHeader[7]
    //this.sampleRate = compressedTracksHeader[8]

    // Only support QVV tracks for now, 12 floats each
    this.outputBufferSize = this.numTracks * 12 * 4
  }

  get byteLength() {
    return this._array ? this._array.byteLength : this._mem.byteLength
  }

  get array() {
    return this._array ? this._array : this._mem.array
  }

  get isBound() {
    return !!this._decoder
  }

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

  dispose() {
    if (this._mem) {
      this._decoder.queueFree(this._mem)
    }

    this._mem = null
    this._array = null
    this._decoder = null
  }
}
