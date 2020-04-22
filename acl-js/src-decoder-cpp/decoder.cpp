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

#include "decoder.h"

#include <acl/algorithm/uniformly_sampled/decoder.h>
#include <acl/decompression/default_output_writer.h>

#include <cstdint>

int decompress_tracks(const unsigned char* compressed_clip, size_t compressed_clip_size, float sample_time, int rounding_policy, unsigned char* output_buffer, size_t output_buffer_size)
{
	const acl::CompressedClip* compressed_clip_ = reinterpret_cast<const acl::CompressedClip*>(compressed_clip);
	if (!compressed_clip_ || compressed_clip_->get_size() != compressed_clip_size)
		return -1;	// Invalid compressed clip buffer

	if (compressed_clip_->is_valid(false).any())
		return -2;	// Clip is corrupted or invalid

	const acl::ClipHeader& header = acl::get_clip_header(*compressed_clip_);
	const size_t expected_output_buffer_size = header.num_bones * sizeof(rtm::qvvf);
	if (expected_output_buffer_size != output_buffer_size)
		return -3;	// Output buffer is too small

	if (!acl::is_aligned_to(output_buffer, alignof(rtm::qvvf)))
		return -4;	// Output buffer isn't aligned properly

	acl::uniformly_sampled::DecompressionContext<acl::uniformly_sampled::DefaultDecompressionSettings> context;
	context.initialize(*compressed_clip_);

	const acl::sample_rounding_policy rounding_policy_ = static_cast<acl::sample_rounding_policy>(rounding_policy);
	context.seek(sample_time, rounding_policy_);

	rtm::qvvf* output_buffer_ = reinterpret_cast<rtm::qvvf*>(output_buffer);
	acl::DefaultOutputWriter pose_writer(output_buffer_, header.num_bones);
	context.decompress_pose(pose_writer);

	return 0;
}

int decompress_track(const unsigned char* compressed_clip, size_t compressed_clip_size, float sample_time, int rounding_policy, int transform_index, unsigned char* output_buffer, size_t output_buffer_size)
{
	const acl::CompressedClip* compressed_clip_ = reinterpret_cast<const acl::CompressedClip*>(compressed_clip);
	if (!compressed_clip_ || compressed_clip_->get_size() != compressed_clip_size)
		return -1;	// Invalid compressed clip buffer

	if (compressed_clip_->is_valid(false).any())
		return -2;	// Clip is corrupted or invalid

	if (sizeof(rtm::qvvf) != output_buffer_size)
		return -3;	// Output buffer is too small

	if (!acl::is_aligned_to(output_buffer, alignof(rtm::qvvf)))
		return -4;	// Output buffer isn't aligned properly

	const acl::ClipHeader& header = acl::get_clip_header(*compressed_clip_);
	if (static_cast<uint32_t>(transform_index) >= header.num_bones)
		return -5;	// Invalid transform index

	acl::uniformly_sampled::DecompressionContext<acl::uniformly_sampled::DefaultDecompressionSettings> context;
	context.initialize(*compressed_clip_);

	const acl::sample_rounding_policy rounding_policy_ = static_cast<acl::sample_rounding_policy>(rounding_policy);
	context.seek(sample_time, rounding_policy_);

	rtm::qvvf& transform = *reinterpret_cast<rtm::qvvf*>(output_buffer);
	context.decompress_bone(static_cast<uint16_t>(transform_index), &transform.rotation, &transform.translation, &transform.scale);

	return 0;
}
