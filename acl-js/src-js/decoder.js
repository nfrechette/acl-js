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
  heapAllocations: [],
  heapFreeQueue: [],
  heapInitialSize: 0,
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

    if (!wasmState.initPromise) {
      // The first time we create a decoder, we load the WASM code and init everything
      wasmState.initPromise = WebAssembly.instantiate(unhex(wasmBinaryBlob), importObject)
        .then(obj => {
          wasmState.module = obj.module
          wasmState.instance = obj.instance

          // Run static initializers
          wasmState.instance.exports._start()
          importObject.env.emscripten_notify_memory_growth(0)

          // Make sure our segment head is aligned to 16 bytes
          const segmentHead = wasmState.instance.exports.sbrk(0)
          const alignmentOverhead = segmentHead & 0x15
          if (alignmentOverhead != 0) {
            wasmState.instance.exports.sbrk(16 - alignmentOverhead)
          }

          wasmState.heapInitialSize = wasmState.instance.exports.sbrk(0)
        })
    }
  }

  isReady() {
    return wasmState.initPromise
  }

  // Allocate memory in the WASM heap
  malloc(bufferSize) {
    if (!wasmState.module) {
      throw new Error('WASM module not ready')
    }

    // Round to multiple of 16 bytes
    const bufferSizePadded = (bufferSize + 15) & ~15
    const bufferOffset = wasmState.instance.exports.sbrk(bufferSizePadded)
    //console.log(`Allocating ${bufferSizePadded} bytes on WASM heap at ${bufferOffset}`)

    // Create our byte buffer and add metadata
    const buffer = new Uint8Array(wasmState.heap.buffer, bufferOffset, bufferSizePadded)

    const mem = new WASMMemory(wasmState, buffer)
    wasmState.heapAllocations.push(mem)

    return mem
  }

  // Flag the memory as no longer being in use and queue it for freeing
  // Memory will actually be freed once garbageCollect() is called
  queueFree(mem) {
    if (!mem) {
      return  // Nothing to do
    }

    if (!wasmState.module) {
      throw new Error('WASM module not ready')
    }

    if (mem._wasmState !== wasmState) {
      throw new Error("Memory doesn't belong to this WASM heap")
    }

    if (mem._isQueuedForFree) {
      throw new Error('Memory is already queued for free')
    }

    // Flag and queue our buffer
    mem._isQueuedForFree = true
    wasmState.heapFreeQueue.push(mem)
  }

  // Free any memory we might have queued up for freeing
  garbageCollect() {
    if (!wasmState.module) {
      throw new Error('WASM module not ready')
    }

    if (wasmState.heapFreeQueue.length == 0) {
      return  // Nothing to do
    }

    const liveHeapAllocations = []

    let heapOffset = wasmState.heapInitialSize
    //console.log(`Running WASM heap garbage collection from offset ${heapOffset} ...`)

    wasmState.heapAllocations.forEach((mem) => {
      if (mem._isQueuedForFree) {
        return  // This memory block is being freed, skip it
      }

      if (mem.byteOffset != heapOffset) {
        //console.log(`Moving allocation from ${mem.byteOffset} to ${heapOffset} ...`)
        wasmState.heap.set(mem.array, heapOffset)

        // Update and invalidate our memory bindings to avoid keeping stale references
        mem._arrayU8 = null
        mem._heap = null
        mem._byteOffset = heapOffset
      }

      liveHeapAllocations.push(mem)
      heapOffset += mem.byteLength
    })

    // Reset our heap
    //console.log(`Freed ${wasmState.instance.exports.sbrk(0) - heapOffset} bytes!`)
    wasmState.instance.exports.sbrk(heapOffset - wasmState.instance.exports.sbrk(0))
    wasmState.heapAllocations = liveHeapAllocations
    wasmState.heapFreeQueue = []

    // Rebind if needed
    wasmState.heapAllocations.forEach((mem) => {
      mem.array
    })
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

    let resultBufferU8 = null
    let resultBufferOffset = 0
    const sampleSize = compressedTracks.sampleSize
    const outputBuffer = wasmState.instance.exports.sbrk(sampleSize)

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

    const result = wasmState.instance.exports.decompress_track(compressedTracksBuffer, compressedTracksSize, sampleTime, roundingPolicy.value, trackIndex, outputBuffer, sampleSize)
    //console.log(`Decompression result: ${result}`)
    if (result != 0) {
      // Reset our heap
      wasmState.instance.exports.sbrk(outputBuffer - wasmState.instance.exports.sbrk(0))

      throw new Error(`Decompression failed: ${result}`)
    }

    // Copy our decompressed tracks out of the WASM heap
    //console.log(`Reading decompressed tracks from WASM heap offset ${outputBuffer}, ${outputBufferSize} bytes`)
    resultBufferU8.set(wasmState.heap.subarray(outputBuffer, outputBuffer + sampleSize), resultBufferOffset)

    // Reset our heap
    wasmState.instance.exports.sbrk(outputBuffer - wasmState.instance.exports.sbrk(0))

    return decompressedTracks
  }
}
