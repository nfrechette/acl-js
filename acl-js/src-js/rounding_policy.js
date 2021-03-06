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

//////////////////////////////////////////////////////////////////////////
// This enum dictates how interpolation samples are calculated based on the sample time.
////////////////////////////////////////////////////////////////////////////////
export const RoundingPolicy = {
  //////////////////////////////////////////////////////////////////////////
  // If the sample time lies between two samples, both sample indices
  // are returned and the interpolation alpha lies in between.
  None: { key: 'none', value: 0 },

  //////////////////////////////////////////////////////////////////////////
  // If the sample time lies between two samples, both sample indices
  // are returned and the interpolation will be 0.0.
  Floor: { key: 'floor', value: 1 },

  //////////////////////////////////////////////////////////////////////////
  // If the sample time lies between two samples, both sample indices
  // are returned and the interpolation will be 1.0.
  Ceil: { key: 'ceil', value: 2 },

  //////////////////////////////////////////////////////////////////////////
  // If the sample time lies between two samples, both sample indices
  // are returned and the interpolation will be 0.0 or 1.0 depending
  // on which sample is nearest.
  Nearest: { key: 'nearest', value: 3 },
}

////////////////////////////////////////////////////////////////////////////////
// Returns true if the provided value is a proper RoundingPolicy instance.
export function isRoundingPolicy(policy) {
  if (!policy) return false

  switch (policy) {
    case RoundingPolicy.None:
    case RoundingPolicy.Floor:
    case RoundingPolicy.Ceil:
    case RoundingPolicy.Nearest:
      return true
    default:
      return false
  }
}
