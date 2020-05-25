[![CLA assistant](https://cla-assistant.io/readme/badge/nfrechette/acl-js)](https://cla-assistant.io/nfrechette/acl-js)
[![Build status](https://github.com/nfrechette/acl-js/workflows/build/badge.svg)](https://github.com/nfrechette/acl-js/actions)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/nfrechette/acl-js/master/LICENSE)
[![Discord](https://img.shields.io/discord/691048241864769647?label=discord)](https://discord.gg/UERt4bS)

# Animation Compression Library JavaScript Module

This module uses the C++11 [Animation Compression Library](https://github.com/nfrechette/acl) compiled with `emscripten 1.39.11` into WebAssembly. This allows fast compression and decompression of animations with Javascript. Animations can also be compressed offline with ACL and played back efficiently in a web browser.

The [glTF viewer](./tools/gltf_viewer) tool shows how this module can be used to both compress and decompress animations. You can see it live [here](https://nfrechette.github.io/acl_viewer/).

## Example compression usage

```js
import * as ACL from '@nfrechette/acl'

// Create a QVV track array to hold our hierarchical/joint transform raw data.
// Note that scalar float tracks have the same API with ACL.SampleType.Float instead.
const numTracks = 5           // 5 joint transforms
const numSamplesPerTrack = 30 // 1 second at 30 FPS
const sampleRate = 30.0       // 30 FPS
const qvvTracks = new ACL.TrackArray(numTracks, ACL.SampleType.QVV, numSamplesPerTrack, sampleRate);

// ...

// For each transform track, setup its description.
const trackIndex = ...
const parentTrackIndex = ...
const qvvTrack = qvvTracks.at(trackIndex)
qvvTrack.description.precision = 0.0001  // meters, default value
qvvTrack.description.shellDistance = 1.0 // meters, default value
if (node.parent) {
  qvvTrack.description.parentIndex = parentTrackIndex
}

// Scalar float tracks have a slightly different description as they have
// no shell distance nor a parent index.

// ...

// For each transform track sample, set its value.
// Note that scalar float tracks have the same API but use setFloat instead.
const sampleIndex = ...
const sampleValue = ...
const sample = qvvTrack.at(sampleIndex)
sample.setQVV(sampleValue)

// We are ready to compress our raw data.
// Note that the API is the same for scalar float tracks.
const encoder = new ACL.Encoder()
const compressedTracks = encoder.compress(qvvTracks)
```

## Example decompression usage

```js
import * as ACL from '@nfrechette/acl'

// Retrieve a Uint8Array of your compressed tracks.
// That buffer must have been compressed with a compatible ACL version (JS or otherwise).
const compressedTracks = ...
const decoder = new ACL.Decoder()

// Bind the compressed buffer to the decoder WASM heap.
// WASM can't read from the JS heap so we require manual memory management.
// This only needs to be done once.
compressedTracks.bind(decoder)

// Allocate memory where we can decompress our track data.
// It can be re-used multiple times but it is best if it is only ever used
// with a single compressed buffer to avoid excessive resizing of the allocated memory.
const decompressedTracks = new ACL.DecompressedTracks(decoder)

// Decompress every track at the specified sample time.
// Note that the API is the same for scalar float tracks and transform tracks.
const sampleTime = ...
const roundingPolicy = ACL.RoundingPolicy.None // no rounding means we interpolate between keys
decoder.decompressTracks(compressedTracks, sampleTime, roundingPolicy, decompressedTracks)

// Decompressed data is ready to be read but in a contiguous float32 array
const float32Data = decompressedTracks.array

// Decompress a single track at the specified sample time.
// This will write the data where it would have ended up had all tracks been decompressed
// in the output array.
// Note that the API is the same for scalar float tracks and transform tracks.
const trackIndex = ...
decoder.decompressTrack(compressedTracks, trackIndex, sampleTime, roundingPolicy, decompressedTracks)

// When you are done, don't forget to dispose of the allocated WASM memory
compressedTracks.dispose() // only required if we actually bound it to a decoder
decompressedTracks.dispose()
```

## How to contribute or build locally

If you wish to run the unit tests or contribute to `acl-js`, head on over to the [development setup](./docs/development_setup.md) section in order to setup your environment and make sure to check out the [contributing guidelines](CONTRIBUTING.md).

## External dependencies

You don't need anything else to get started: everything is self contained. There are no JS dependencies required for this module and all C++ dependencies used during decompression use the MIT license.

See [here](./external) for details.

## License, copyright, and code of conduct

This project uses the [MIT license](LICENSE).

Copyright (c) 2019 Nicholas Frechette & contributors

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.
