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
import { TrackError } from './track_error.js';

let wasmModule = null
let wasmInstance = null
let wasmHeap = null
let wasmInitPromise = null

const importObject = {
  env: {
    emscripten_notify_memory_growth: function(index) {
      wasmHeap = new Uint8Array(wasmInstance.exports.memory.buffer)
      //console.log(`Encoder WASM heap resized to ${wasmHeap.byteLength} bytes`)
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

////////////////////////////////////////////////////////////////////////////////
// An ACL encoder instance.
// Constructing a encoder instance initializes WASM. All other instances will
// share the WASM code and heap for encoding.
// This class is the bridge between JS and the WASM code.
////////////////////////////////////////////////////////////////////////////////
export class Encoder {
  ////////////////////////////////////////////////////////////////////////////////
  // Construct an instance of the ACL encoder.
  // The first instance will initialize WASM and every subsequent instance will share the WASM
  // code and heap for encoding.
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

  ////////////////////////////////////////////////////////////////////////////////
  // Returns a promise that resolves once the encoder is ready to be used.
  isReady() {
    return wasmInitPromise
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Compresses a TrackArray into a CompressedTracks instance.
  compress(tracks) {
    if (!wasmModule) {
      throw new Error('WASM module not ready')
    }

    if (!tracks || !(tracks instanceof TrackArray) || !tracks.isValid()) {
      throw new TypeError("'tracks' must be a valid TrackArray")
    }

    // Add a bit of padding to account for our header, etc
    // We'll use the raw data buffer for our output as well
    const rawDataBufferSize = tracks._rawData.byteLength + (64 * 1024)
    const metadataBufferSize = tracks._metadata.byteLength + 64

    // Allocate a single buffer for efficiency
    const totalBufferSize = rawDataBufferSize + metadataBufferSize
    const buffer = wasmInstance.exports.malloc(totalBufferSize)
    const metadataBuffer = buffer
    const rawDataBuffer = buffer + metadataBufferSize   // Alignment is fine, both double arrays

    //console.log(`Writing metadata to WASM heap offset ${metadataBuffer}, ${metadataBufferSize} bytes`)
    wasmHeap.set(new Uint8Array(tracks._metadata.buffer), metadataBuffer)

    //console.log(`Writing raw data to WASM heap offset ${rawDataBuffer}, ${rawDataBufferSize} bytes`)
    wasmHeap.set(new Uint8Array(tracks._rawData.buffer), rawDataBuffer)

    // Our compressed data will overwrite our raw data with the new size returned
    const compressedTracksSize = wasmInstance.exports.compress(metadataBuffer, metadataBufferSize, rawDataBuffer, rawDataBufferSize)
    //console.log(`Compression result: ${compressedTracksSize}`)

    let compressedTracks = null
    if (compressedTracksSize <= 0) {
      wasmInstance.exports.free(buffer)

      throw new Error(`Failed to compress: ${compressedTracksSize}`)
    }
    else {
      //console.log(`Reading compressed clip from WASM heap offset ${rawDataBuffer}, ${compressedTracksSize} bytes`)
      const compressedBuffer = new Uint8Array(compressedTracksSize)
      compressedBuffer.set(wasmHeap.subarray(rawDataBuffer, rawDataBuffer + compressedTracksSize))

      const errorDataSize = 8 * 3 // 3x double values
      const errorData = new Float64Array(wasmHeap.buffer, metadataBuffer, 3)
      const trackError = new TrackError(errorData[0], errorData[1], errorData[2])

      compressedTracks = new CompressedTracks(compressedBuffer, trackError)
    }

    wasmInstance.exports.free(buffer)

    return compressedTracks
  }
}
