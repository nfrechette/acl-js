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

export class WASMMemory {
  constructor(wasmState, arrayU8) {
    this._wasmState = wasmState
    this._arrayU8 = arrayU8
    this._byteOffset = arrayU8.byteOffset
    this._byteLength = arrayU8.byteLength
    this._heap = wasmState.heap
    this._isQueuedForFree = false
    this._generation = 0
  }

  get array() {
    if (this._isQueuedForFree) {
      throw new Error('WASM memory has been freed already')
    }

    if (this._wasmState.heap !== this._heap) {
      // Heap reallocated, rebind our buffer
      this._arrayU8 = new Uint8Array(this._wasmState.heap.buffer, this._byteOffset, this._byteLength)
      this._heap = this._wasmState.heap
      this._generation++
    }

    return this._arrayU8
  }

  get byteOffset() {
    return this._byteOffset
  }

  get byteLength() {
    return this._byteLength
  }

  get generation() {
    return this._generation
  }
}
