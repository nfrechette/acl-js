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

export class CompressedTracks {
  constructor(buffer) {
    if (!buffer) {
      throw new TypeError("'buffer' must be an ArrayBuffer or Uint8Array")
    }

    if (buffer instanceof ArrayBuffer) {
      this._binaryBlob = new Uint8Array(buffer)
    }
    else if (buffer instanceof Uint8Array) {
      this._binaryBlob = buffer
    }
    else {
      throw new TypeError("'buffer' must be an ArrayBuffer or Uint8Array")
    }

    // CompressedClip is 16 bytes, ClipHeader is 20 bytes + offsets
    const compressedTracksHeaderSize = 4 + 5
    const compressedTracksHeader = new Uint32Array(this._binaryBlob.buffer, 0, compressedTracksHeaderSize)

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
    return this._binaryBlob.byteLength
  }

  get array() {
    return this._binaryBlob
  }

  get buffer() {
    return this._binaryBlob.buffer
  }
}
