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
// Represents the possible types of samples that can be compressed and decompressed.
////////////////////////////////////////////////////////////////////////////////
export const SampleType = {
  ////////////////////////////////////////////////////////////////////////////////
  // A Quaternion-Vector3-Vector3 sample representing rotation, translation, and 3D scale.
  QVV: 'qvv',     // 0

  ////////////////////////////////////////////////////////////////////////////////
  // A float sample.
  Float: 'float'  // 1
}

////////////////////////////////////////////////////////////////////////////////
// Returns true if the provided value is a proper SampleType instance.
export function isSampleType(sampleType) {
  if (!sampleType) return false

  switch (sampleType) {
    case SampleType.QVV:
    case SampleType.Float:
      return true
    default:
      return false
  }
}

////////////////////////////////////////////////////////////////////////////////
// Returns the C++ enum value for the given SampleType.
export function sampleTypeToMetadata(sampleType) {
  switch (sampleType) {
    case SampleType.QVV:
      return 0
    case SampleType.Float:
      return 1
    default:
      return -1
  }
}

////////////////////////////////////////////////////////////////////////////////
// Returns the number of floats per sample for the given SampleType.
export function getNumFloatsPerSample(sampleType) {
  switch (sampleType) {
    case SampleType.QVV:
      return (4 + 3 + 3)
    case SampleType.Float:
      return 1
    default:
      throw new TypeError('Unknown sample type')
  }
}
