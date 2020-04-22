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

import { wasmBinaryBlob } from './encoder.wasm.js'
import { TrackArray } from "./track_array";
import { CompressedTracks } from './compressed_tracks.js'

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

export class Encoder {
  constructor() {
    if (!wasmInitPromise) {
      // The first time we create an encoder, we load the WASM code and init everything
      wasmInitPromise = WebAssembly.instantiate(unhex(wasmBinaryBlob), importObject)
        .then(obj => {
          wasmModule = obj.module
          wasmInstance = obj.instance

          // Run static initializers
          wasmInstance.exports._start()
          importObject.env.emscripten_notify_memory_growth(0)
        })
    }
  }

  isReady() {
    return wasmInitPromise
  }

  compress(tracks) {
    if (!wasmModule) {
      throw new Error('WASM module not ready')
    }

    if (!tracks || !(tracks instanceof TrackArray) || !tracks.isValid()) {
      throw new TypeError("'tracks' must be a valid TrackArray")
    }

    const metadataBufferSize = tracks._metadata.byteLength
    const metadataBuffer = wasmInstance.exports.sbrk(metadataBufferSize)

    //console.log(`Writing metadata to WASM heap offset ${metadataBuffer}, ${metadataBufferSize} bytes`)
    wasmHeap.set(new Uint8Array(tracks._metadata.buffer), metadataBuffer)

    const rawDataBufferSize = tracks._rawData.byteLength
    const rawDataBuffer = wasmInstance.exports.sbrk(rawDataBufferSize)

    //console.log(`Writing raw data to WASM heap offset ${rawDataBuffer}, ${rawDataBufferSize} bytes`)
    wasmHeap.set(new Uint8Array(tracks._rawData.buffer), rawDataBuffer)

    // Result is a buffer with the compressed clip or the compressed clip
    const result = wasmInstance.exports.compress(metadataBuffer, metadataBufferSize, rawDataBuffer, rawDataBufferSize)

    let compressedTracks = null
    if (result < metadataBuffer) {
      // An error occured
      throw new Error(`Failed to compress: ${result}`)
    }
    else {
      const compressedTracksHeaderSize = 4
      const compressedTracksHeader = new Uint32Array(wasmHeap.buffer, result, compressedTracksHeaderSize)
      const compressedTracksSize = compressedTracksHeader[0]

      //console.log(`Reading compressed clip from WASM heap offset ${result}, ${compressedTracksSize} bytes`)
      compressedTracks = new Uint8Array(compressedTracksSize)
      compressedTracks.set(wasmHeap.subarray(result, result + compressedTracksSize))

      compressedTracks = new CompressedTracks(compressedTracks)
    }

    // Reset our heap
    wasmInstance.exports.sbrk(metadataBuffer - wasmInstance.exports.sbrk(0))

    return compressedTracks
  }
}
