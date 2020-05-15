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
#include <acl/decompression/decompress.h>
#include <acl/decompression/default_output_writer.h>

#include <cstdint>

struct scalar_decompression_settings final : public acl::decompression_settings
{
	constexpr bool is_track_type_supported(acl::track_type8 type) const { return type == acl::track_type8::float1f; }
};

struct scalar_track_writer final : public acl::track_writer
{
	float* output;

	scalar_track_writer(float* output_)
		: output(output_)
	{
	}

	void write_float1(uint32_t track_index, rtm::scalarf_arg0 value)
	{
		output[track_index] = rtm::scalar_cast(value);
	}
};

struct single_scalar_track_writer final : public acl::track_writer
{
	float* output;

	single_scalar_track_writer(float* output_)
		: output(output_)
	{
	}

	void write_float1(uint32_t track_index, rtm::scalarf_arg0 value)
	{
		(void)track_index;
		*output = rtm::scalar_cast(value);
	}
};

int decompress_tracks(const unsigned char* compressed_buffer, size_t compressed_buffer_size, float sample_time, int rounding_policy, unsigned char* output_buffer, size_t output_buffer_size)
{
	if (compressed_buffer == nullptr)
		return -1;	// Invalid argument

	const acl::CompressedClip* compressed_clip = reinterpret_cast<const acl::CompressedClip*>(compressed_buffer);
	if (compressed_clip->is_valid(false).empty())
	{
		if (compressed_buffer_size < compressed_clip->get_size())
			return -1;	// Invalid compressed clip buffer

		const acl::ClipHeader& header = acl::get_clip_header(*compressed_clip);
		const size_t expected_output_buffer_size = header.num_bones * sizeof(rtm::qvvf);
		if (output_buffer_size < expected_output_buffer_size)
			return -3;	// Output buffer is too small

		if (!acl::is_aligned_to(output_buffer, alignof(rtm::qvvf)))
			return -4;	// Output buffer isn't aligned properly

		acl::uniformly_sampled::DecompressionContext<acl::uniformly_sampled::DefaultDecompressionSettings> context;
		context.initialize(*compressed_clip);

		const acl::sample_rounding_policy rounding_policy_ = static_cast<acl::sample_rounding_policy>(rounding_policy);
		context.seek(sample_time, rounding_policy_);

		rtm::qvvf* output_buffer_ = reinterpret_cast<rtm::qvvf*>(output_buffer);
		acl::DefaultOutputWriter pose_writer(output_buffer_, header.num_bones);
		context.decompress_pose(pose_writer);

		return 0;
	}

	const acl::compressed_tracks* compressed_tracks = reinterpret_cast<const acl::compressed_tracks*>(compressed_buffer);

	if (compressed_tracks->is_valid(false).empty())
	{
		if (compressed_buffer_size < compressed_tracks->get_size())
			return -1;	// Invalid compressed tracks buffer

		const uint32_t num_tracks = compressed_tracks->get_num_tracks();
		const size_t expected_output_buffer_size = num_tracks * sizeof(float);
		if (output_buffer_size < expected_output_buffer_size)
			return -3;	// Output buffer is too small

		if (!acl::is_aligned_to(output_buffer, alignof(float)))
			return -4;	// Output buffer isn't aligned properly

		acl::decompression_context<scalar_decompression_settings> context;
		context.initialize(*compressed_tracks);

		const acl::sample_rounding_policy rounding_policy_ = static_cast<acl::sample_rounding_policy>(rounding_policy);
		context.seek(sample_time, rounding_policy_);

		float* output_buffer_ = reinterpret_cast<float*>(output_buffer);
		scalar_track_writer track_writer(output_buffer_);
		context.decompress_tracks(track_writer);

		return 0;
	}

	return -2;	// Compressed data is corrupted or invalid
}

int decompress_track(const unsigned char* compressed_buffer, size_t compressed_buffer_size, float sample_time, int rounding_policy, int track_index, unsigned char* output_buffer, size_t output_buffer_size)
{
	if (compressed_buffer == nullptr)
		return -1;	// Invalid argument

	const acl::CompressedClip* compressed_clip = reinterpret_cast<const acl::CompressedClip*>(compressed_buffer);
	if (compressed_clip->is_valid(false).empty())
	{
		if (compressed_buffer_size < compressed_clip->get_size())
			return -1;	// Invalid compressed clip buffer

		if (output_buffer_size < sizeof(rtm::qvvf))
			return -3;	// Output buffer is too small

		if (!acl::is_aligned_to(output_buffer, alignof(rtm::qvvf)))
			return -4;	// Output buffer isn't aligned properly

		const acl::ClipHeader& header = acl::get_clip_header(*compressed_clip);
		if (static_cast<uint32_t>(track_index) >= header.num_bones)
			return -5;	// Invalid transform index

		acl::uniformly_sampled::DecompressionContext<acl::uniformly_sampled::DefaultDecompressionSettings> context;
		context.initialize(*compressed_clip);

		const acl::sample_rounding_policy rounding_policy_ = static_cast<acl::sample_rounding_policy>(rounding_policy);
		context.seek(sample_time, rounding_policy_);

		rtm::qvvf& transform = *reinterpret_cast<rtm::qvvf*>(output_buffer);
		context.decompress_bone(static_cast<uint16_t>(track_index), &transform.rotation, &transform.translation, &transform.scale);

		return 0;
	}

	const acl::compressed_tracks* compressed_tracks = reinterpret_cast<const acl::compressed_tracks*>(compressed_buffer);

	if (compressed_tracks->is_valid(false).empty())
	{
		if (compressed_buffer_size < compressed_tracks->get_size())
			return -1;	// Invalid compressed tracks buffer

		if (output_buffer_size < sizeof(float))
			return -3;	// Output buffer is too small

		if (!acl::is_aligned_to(output_buffer, alignof(float)))
			return -4;	// Output buffer isn't aligned properly

		const uint32_t num_tracks = compressed_tracks->get_num_tracks();
		if (static_cast<uint32_t>(track_index) >= num_tracks)
			return -5;	// Invalid transform index

		acl::decompression_context<scalar_decompression_settings> context;
		context.initialize(*compressed_tracks);

		const acl::sample_rounding_policy rounding_policy_ = static_cast<acl::sample_rounding_policy>(rounding_policy);
		context.seek(sample_time, rounding_policy_);

		float* output_buffer_ = reinterpret_cast<float*>(output_buffer);
		single_scalar_track_writer track_writer(output_buffer_);
		context.decompress_track(track_index, track_writer);

		return 0;
	}

	return -2;	// Clip is corrupted or invalid
}
