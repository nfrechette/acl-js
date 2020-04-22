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

let wasmModule = null
let wasmInstance = null
let wasmHeap = null
let wasmInitPromise = null

const importObject = {
  env: {
    emscripten_notify_memory_growth: function(index) {
      wasmHeap = new Uint8Array(wasmInstance.exports.memory.buffer)
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
    if (!wasmInitPromise) {
      // The first time we create a decoder, we load the WASM code and init everything
      wasmInitPromise = WebAssembly.instantiate(unhex(wasmBinaryBlob), importObject)
        .then(obj => {
          wasmModule = obj.module
          wasmInstance = obj.instance

          // Run static initializers
          wasmInstance.exports._start()
          importObject.env.emscripten_notify_memory_growth(0)

          // Make sure our segment head is aligned to 16 bytes
          const segmentHead = wasmInstance.exports.sbrk(0)
          const alignmentOverhead = segmentHead & 0x15
          if (alignmentOverhead != 0) {
            wasmInstance.exports.sbrk(16 - alignmentOverhead)
          }
        })
    }
  }

  isReady() {
    return wasmInitPromise
  }

  decompressTracks(compressedTracks, sampleTime, roundingPolicy, decompressedTracks) {
    if (!wasmModule) {
      throw new Error('WASM module not ready')
    }

    if (!compressedTracks || !(compressedTracks instanceof CompressedTracks)) {
      throw new TypeError("'compressedTracks' must be a CompressedTracks instance")
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
      decompressedTracks = new DecompressedTracks()
    }

    const compressedTracksSize = compressedTracks.array.byteLength
    // Round to multiple of 16 bytes
    const compressedTracksBuffer = wasmInstance.exports.sbrk((compressedTracksSize + 15) & ~15)

    //console.log(`Writing compressed tracks to WASM heap offset ${compressedTracksBuffer}, ${compressedTracksSize} bytes`)
    wasmHeap.set(compressedTracks.array, compressedTracksBuffer)

    const outputBufferSize = compressedTracks.outputBufferSize
    const outputBuffer = wasmInstance.exports.sbrk(outputBufferSize)

    // Make sure we can store our result
    if (decompressedTracks.byteLength < outputBufferSize) {
      decompressedTracks.resize(outputBufferSize)
    }

    const result = wasmInstance.exports.decompress_tracks(compressedTracksBuffer, compressedTracksSize, sampleTime, roundingPolicy.value, outputBuffer, outputBufferSize)
    //console.log(`Decompression result: ${result}`)
    if (result != 0) {
      throw new Error(`Decompression failed: ${result}`)
    }

    // Copy our decompressed tracks out of the WASM heap
    //console.log(`Reading decompressed tracks from WASM heap offset ${outputBuffer}, ${outputBufferSize} bytes`)
    decompressedTracks._arrayU8.set(wasmHeap.subarray(outputBuffer, outputBuffer + outputBufferSize))

    // Reset our heap
    wasmInstance.exports.sbrk(compressedTracksBuffer - wasmInstance.exports.sbrk(0))

    return decompressedTracks
  }

  decompressTrack(compressedTracks, trackIndex, sampleTime, roundingPolicy, decompressedTracks) {
    if (!wasmModule) {
      throw new Error('WASM module not ready')
    }

    if (!compressedTracks || !(compressedTracks instanceof CompressedTracks)) {
      throw new TypeError("'compressedTracks' must be a CompressedTracks instance")
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

    if (decompressedTracks) {
      if (!(decompressedTracks instanceof DecompressedTracks)) {
        throw new TypeError("'decompressedTracks' must be null or a DecompressedTracks instance")
      }
    }
    else {
      decompressedTracks = new DecompressedTracks()
    }

    const compressedTracksSize = compressedTracks.array.byteLength
    // Round to multiple of 16 bytes
    const compressedTracksBuffer = wasmInstance.exports.sbrk((compressedTracksSize + 15) & ~15)

    //console.log(`Writing compressed tracks to WASM heap offset ${compressedTracksBuffer}, ${compressedTracksSize} bytes`)
    wasmHeap.set(compressedTracks.array, compressedTracksBuffer)

    const outputBufferSize = compressedTracks.outputBufferSize
    const qvvOutputBufferSize = 12 * 4
    const outputBuffer = wasmInstance.exports.sbrk(qvvOutputBufferSize)

    // Make sure we can store our result
    if (decompressedTracks.byteLength < outputBufferSize) {
      decompressedTracks.resize(outputBufferSize)
    }

    const result = wasmInstance.exports.decompress_track(compressedTracksBuffer, compressedTracksSize, sampleTime, roundingPolicy.value, trackIndex, outputBuffer, qvvOutputBufferSize)
    //console.log(`Decompression result: ${result}`)
    if (result != 0) {
      throw new Error(`Decompression failed: ${result}`)
    }

    // Copy our decompressed tracks out of the WASM heap
    //console.log(`Reading decompressed tracks from WASM heap offset ${outputBuffer}, ${outputBufferSize} bytes`)
    decompressedTracks._arrayU8.set(wasmHeap.subarray(outputBuffer, outputBuffer + qvvOutputBufferSize), trackIndex * 12 * 4)

    // Reset our heap
    wasmInstance.exports.sbrk(compressedTracksBuffer - wasmInstance.exports.sbrk(0))

    return decompressedTracks
  }
}
