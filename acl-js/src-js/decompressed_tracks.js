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

////////////////////////////////////////////////////////////////////////////////
// DecompressedTracks hold a buffer of Float32Array that can be used to decompress.
// The memory owned by this instance belongs to the decoder WASM heap and it can
// relocate. Care must be taken now to hold and cache references to the underlying
// array. This is done to avoid unnecessary copying during decompression.
////////////////////////////////////////////////////////////////////////////////
export class DecompressedTracks {
  ////////////////////////////////////////////////////////////////////////////////
  // Constructs a DecompressedTracks instance and binds it to the provided decoder.
  constructor(decoder) {
    if (!decoder || !(decoder instanceof Decoder)) {
      throw new TypeError("'decoder' must be a Decoder instance")
    }

    this._decoder = decoder
    this._mem = null
    this._array = null  // Float32Array
    this._generation = -1
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Returns the buffer byte length.
  get byteLength() {
    return this._mem ? this._mem.byteLength : 0
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Returns the underlying Float32Array that contains the decompressed data.
  // This memory is owned by the WASM heap and it can relocate.
  // Do not cache references to this array.
  get array() {
    if (!this._mem) {
      return null
    }

    if (this._generation !== this._mem.generation) {
      // Our memory moved, recreate our float array
      const array = this._mem.array
      this._array = new Float32Array(array.buffer, array.byteOffset, array.byteLength / 4)
      this._generation = this._mem.generation
    }

    return this._array
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Grows or shrinks the underlying Float32Array to match the desired byte length.
  resize(byteLength) {
    if (byteLength !== this.byteLength) {
      if (this._mem) {
        this._decoder.free(this._mem)
      }

      this._mem = this._decoder.malloc(byteLength)
      this._array = null
      this._generation = -1
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Disposes of the WASM memory used by this instance.
  dispose() {
    if (this._mem) {
      this._decoder.free(this._mem)
      this._mem = null
      this._array = null
      this._generation = -1
    }
  }
}
