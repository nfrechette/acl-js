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

import { RoundingPolicy, isRoundingPolicy } from './rounding_policy.js'

//////////////////////////////////////////////////////////////////////////
// Calculates the sample indices and the interpolation required to linearly
// interpolate when the samples are uniform.
// The returned sample indices are clamped and do not loop.
export const findLinearInterpolationSamplesWithSampleRate = function(numSamples, sampleRate, sampleTime, roundingPolicy) {
  if (!Number.isInteger(numSamples) || numSamples < 0) {
    throw new RangeError(`Invalid number of samples: ${numSamples}`)
  }

  if (!Number.isFinite(sampleRate) || sampleRate < 0.0) {
    throw new RangeError(`Invalid sample rate: ${sampleRate}`)
  }

  if (!Number.isFinite(sampleTime) || sampleTime < 0.0) {
    throw new RangeError(`Invalid sampling time: ${sampleTime}`)
  }

  if (!isRoundingPolicy(roundingPolicy)) {
    throw new TypeError('Invalid rounding policy')
  }

  const sampleIndex = sampleTime * sampleRate;
  const sampleIndex0 = Math.floor(sampleIndex);
  const sampleIndex1 = Math.min(sampleIndex0 + 1, numSamples - 1);

  if (sampleIndex0 > sampleIndex1 || sampleIndex1 >= numSamples) {
    throw new RangeError('Invalid sample indices')
  }

  const interpolationAlpha = sampleIndex - sampleIndex0;

  if (interpolationAlpha < 0.0 || interpolationAlpha > 1.0) {
    throw new RangeError('Invalid interpolation alpha')
  }

  const result = {}
  result.sampleIndex0 = sampleIndex0
  result.sampleIndex1 = sampleIndex1

  switch (roundingPolicy) {
    case RoundingPolicy.None:
      result.interpolationAlpha = interpolationAlpha
      break
    case RoundingPolicy.Floor:
      result.interpolationAlpha = 0.0
      break
    case RoundingPolicy.Ceil:
      result.interpolationAlpha = 1.0
      break
    case RoundingPolicy.Nearest:
      result.interpolationAlpha = Math.floor(interpolationAlpha + 0.5)
      break
  }

  return result
}
