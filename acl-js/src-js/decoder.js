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

import { wasmBinaryBlob } from './decoder.wasm.js'
import { CompressedTracks } from './compressed_tracks.js'
import { DecompressedTracks } from './decompressed_tracks.js'
import { isRoundingPolicy } from './rounding_policy.js'
import { WASMMemory } from './wasm_memory.js'

const wasmState = {
  module: null,
  instance: null,
  heap: null,
  initPromise: null,
}

const importObject = {
  env: {
    emscripten_notify_memory_growth: function(index) {
      wasmState.heap = new Uint8Array(wasmState.instance.exports.memory.buffer)
      //console.log(`Decoder WASM heap resized to ${wasmState.heap.byteLength} bytes`)
    }
  }
}

function unhex(data) {
  const bytes = new Uint8Array(data.length / 2)
  for (let i = 0; i < data.length; i += 2) {
    bytes[i / 2] = parseInt(data.substr(i, 2), 16)
  }
  return bytes.buffer
}

export class Decoder {
  constructor() {
    this._state = wasmState
    this._decompressTrackTmpBuffer = 0

    if (!wasmState.initPromise) {
      // The first time we create a decoder, we load the WASM code and init everything
      const that = this
      wasmState.initPromise = WebAssembly.instantiate(unhex(wasmBinaryBlob), importObject)
        .then(obj => {
          wasmState.module = obj.module
          wasmState.instance = obj.instance

          // Run static initializers
          wasmState.instance.exports._start()
          importObject.env.emscripten_notify_memory_growth(0)

          // Reserve memory to decompress single tracks, aligned to 16 bytes
          that._decompressTrackTmpBuffer = (wasmState.instance.exports.malloc(256) + 15) & ~15
        })
    }
  }

  isReady() {
    return wasmState.initPromise
  }

  // Allocate memory in the WASM heap
  // Memory allocated is always 16 bytes aligned and a multiply of 16 bytes
  malloc(bufferSize) {
    if (!wasmState.module) {
      throw new Error('WASM module not ready')
    }

    // Round to multiple of 16 bytes and add 16 bytes of padding
    const bufferSizePadded = ((bufferSize + 15) & ~15) + 16
    //console.log(`Allocating ${bufferSizePadded} bytes on WASM heap at ${bufferOffset}`)

    // Allocate and make sure we are aligned to 16 bytes
    const bufferOffset = wasmState.instance.exports.malloc(bufferSizePadded)
    const bufferOffsetAligned = (bufferOffset + 15) & ~15

    // Create our byte buffer and add metadata
    const buffer = new Uint8Array(wasmState.heap.buffer, bufferOffsetAligned, bufferSizePadded)

    return new WASMMemory(wasmState, buffer, bufferOffset)
  }

  // Free memory from our WASM heap
  free(mem) {
    if (!mem) {
      return  // Nothing to do
    }

    if (!wasmState.module) {
      throw new Error('WASM module not ready')
    }

    if (!(mem instanceof WASMMemory)) {
      throw new TypeError("'mem' must be a WASMMemory instance")
    }

    if (mem._wasmState !== wasmState) {
      throw new Error("Memory doesn't belong to this WASM heap")
    }

    if (mem._memPtr !== 0) {
      wasmState.instance.exports.free(mem._memPtr)
      mem._memPtr = 0
    }
  }

  decompressTracks(compressedTracks, sampleTime, roundingPolicy, decompressedTracks) {
    if (!wasmState.module) {
      throw new Error('WASM module not ready')
    }

    if (!compressedTracks || !(compressedTracks instanceof CompressedTracks)) {
      throw new TypeError("'compressedTracks' must be a CompressedTracks instance")
    }

    if (!compressedTracks.isBound) {
      throw new Error("'compressedTracks' must be bound")
    }

    if (!Number.isFinite(sampleTime)) {
      throw new RangeError(`Invalid sample time: ${sampleTime}`)
    }

    if (!isRoundingPolicy(roundingPolicy)) {
      throw new TypeError("'roundingPolicy' must be a RoundingPolicy")
    }

    if (decompressedTracks) {
      if (!(decompressedTracks instanceof DecompressedTracks)) {
        throw new TypeError("'decompressedTracks' must be null or a DecompressedTracks instance")
      }
    }
    else {
      decompressedTracks = new DecompressedTracks(this)
    }

    // Make sure we can store our result
    const outputBufferSize = compressedTracks.outputBufferSize
    if (decompressedTracks.byteLength < outputBufferSize) {
      decompressedTracks.resize(outputBufferSize)
    }

    const compressedTracksSize = compressedTracks._mem.byteLength
    const compressedTracksBuffer = compressedTracks._mem.byteOffset
    const outputBuffer = decompressedTracks._mem.byteOffset

    const result = wasmState.instance.exports.decompress_tracks(compressedTracksBuffer, compressedTracksSize, sampleTime, roundingPolicy.value, outputBuffer, outputBufferSize)
    //console.log(`Decompression result: ${result}`)
    if (result != 0) {
      throw new Error(`Decompression failed: ${result}`)
    }

    return decompressedTracks
  }

  decompressTrack(compressedTracks, trackIndex, sampleTime, roundingPolicy, decompressedTracks) {
    if (!wasmState.module) {
      throw new Error('WASM module not ready')
    }

    if (!compressedTracks || !(compressedTracks instanceof CompressedTracks)) {
      throw new TypeError("'compressedTracks' must be a CompressedTracks instance")
    }

    if (!compressedTracks.isBound) {
      throw new Error("'compressedTracks' must be bound")
    }

    if (!Number.isInteger(trackIndex) || trackIndex < 0 || trackIndex >= this._numTracks) {
      throw new RangeError(`Invalid track index: ${trackIndex}`);
    }

    if (!Number.isFinite(sampleTime)) {
      throw new RangeError(`Invalid sample time: ${sampleTime}`)
    }

    if (!isRoundingPolicy(roundingPolicy)) {
      throw new TypeError("'roundingPolicy' must be a RoundingPolicy")
    }

    const sampleSize = compressedTracks.sampleSize

    let resultBufferU8 = null
    let resultBufferOffset = 0

    if (decompressedTracks) {
      if (decompressedTracks instanceof DecompressedTracks) {
        // Make sure we can store our result
        const outputBufferSize = compressedTracks.outputBufferSize
        if (decompressedTracks.byteLength < outputBufferSize) {
          decompressedTracks.resize(outputBufferSize)
        }

        resultBufferU8 = decompressedTracks._mem.array
        resultBufferOffset = trackIndex * sampleSize
      }
      else if (decompressedTracks instanceof Uint8Array) {
        resultBufferU8 = decompressedTracks
      }
      else if (decompressedTracks instanceof Float32Array) {
        resultBufferU8 = new Uint8Array(decompressedTracks.buffer)
      }
      else {
        throw new TypeError("'decompressedTracks' must be one of a DecompressedTracks, Uint8Array, or Float32Array instance")
      }

      if (resultBufferOffset + sampleSize > resultBufferU8.byteLength) {
        throw new Error(`'decompressedTracks' must be at least ${sampleSize} bytes`)
      }
    }
    else {
      throw new Error("Must provide a 'decompressedTracks' output value")
    }

    const compressedTracksSize = compressedTracks._mem.byteLength
    const compressedTracksBuffer = compressedTracks._mem.byteOffset
    const outputBuffer = this._decompressTrackTmpBuffer

    const result = wasmState.instance.exports.decompress_track(compressedTracksBuffer, compressedTracksSize, sampleTime, roundingPolicy.value, trackIndex, outputBuffer, sampleSize)
    //console.log(`Decompression result: ${result}`)
    if (result != 0) {
      throw new Error(`Decompression failed: ${result}`)
    }

    // Copy our decompressed tracks out of the WASM heap
    //console.log(`Reading decompressed tracks from WASM heap offset ${outputBuffer}, ${outputBufferSize} bytes`)
    resultBufferU8.set(wasmState.heap.subarray(outputBuffer, outputBuffer + sampleSize), resultBufferOffset)

    return decompressedTracks
  }
}
