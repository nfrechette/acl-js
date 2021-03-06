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

////////////////////////////////////////////////////////////////////////////////
// Core types

export { Quat } from './src-js/quat.js'
export { QVV } from './src-js/qvv.js'
export { Vec3 } from './src-js/vec3.js'
export { RoundingPolicy, isRoundingPolicy } from './src-js/rounding_policy.js'
export { CompressedTracks } from './src-js/compressed_tracks.js'

////////////////////////////////////////////////////////////////////////////////
// Compression types

export { Sample } from './src-js/sample.js'
export { SampleType, isSampleType } from './src-js/sample_type.js'
export { Track } from './src-js/track.js'
export { TrackArray } from './src-js/track_array.js'
export { TrackError } from './src-js/track_error.js'
export { ScalarTrackDescription, TransformTrackDescription } from './src-js/track_desc.js'
export { Encoder } from './src-js/encoder.js'

////////////////////////////////////////////////////////////////////////////////
// Decompression types

export { DecompressedTracks } from './src-js/decompressed_tracks.js'
export { Decoder } from './src-js/decoder.js'
