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

#include <acl/core/track_writer.h>
#include <acl/decompression/decompress.h>

#include <cstdint>

struct scalar_decompression_settings final : public acl::decompression_settings
{
	static constexpr bool is_track_type_supported(acl::track_type8 type) { return type == acl::track_type8::float1f; }
};

struct scalar_track_writer final : public acl::track_writer
{
	float* output;

	scalar_track_writer(float* output_)
		: output(output_)
	{
	}

	RTM_FORCE_INLINE void RTM_SIMD_CALL write_float1(uint32_t track_index, rtm::scalarf_arg0 value)
	{
		output[track_index] = rtm::scalar_cast(value);
	}
};

struct transform_track_writer final : public acl::track_writer
{
	rtm::qvvf* output;

	transform_track_writer(rtm::qvvf* output_)
		: output(output_)
	{
	}

	RTM_FORCE_INLINE void RTM_SIMD_CALL write_rotation(uint32_t track_index, rtm::quatf_arg0 rotation)
	{
		output[track_index].rotation = rotation;
	}

	RTM_FORCE_INLINE void RTM_SIMD_CALL write_translation(uint32_t track_index, rtm::vector4f_arg0 translation)
	{
		output[track_index].translation = translation;
	}

	RTM_FORCE_INLINE void RTM_SIMD_CALL write_scale(uint32_t track_index, rtm::vector4f_arg0 scale)
	{
		output[track_index].scale = scale;
	}
};

struct single_scalar_track_writer final : public acl::track_writer
{
	float* output;

	single_scalar_track_writer(float* output_)
		: output(output_)
	{
	}

	RTM_FORCE_INLINE void RTM_SIMD_CALL write_float1(uint32_t track_index, rtm::scalarf_arg0 value)
	{
		(void)track_index;
		*output = rtm::scalar_cast(value);
	}
};

struct single_transform_track_writer final : public acl::track_writer
{
	rtm::qvvf* output;

	single_transform_track_writer(rtm::qvvf* output_)
		: output(output_)
	{
	}

	RTM_FORCE_INLINE void RTM_SIMD_CALL write_rotation(uint32_t track_index, rtm::quatf_arg0 rotation)
	{
		(void)track_index;
		output->rotation = rotation;
	}

	RTM_FORCE_INLINE void RTM_SIMD_CALL write_translation(uint32_t track_index, rtm::vector4f_arg0 translation)
	{
		(void)track_index;
		output->translation = translation;
	}

	RTM_FORCE_INLINE void RTM_SIMD_CALL write_scale(uint32_t track_index, rtm::vector4f_arg0 scale)
	{
		(void)track_index;
		output->scale = scale;
	}
};

int decompress_tracks(const unsigned char* compressed_buffer, size_t compressed_buffer_size, float sample_time, int rounding_policy, unsigned char* output_buffer, size_t output_buffer_size)
{
	if (compressed_buffer == nullptr)
		return -1;	// Invalid argument

	const acl::compressed_tracks* compressed_tracks = reinterpret_cast<const acl::compressed_tracks*>(compressed_buffer);
	if (compressed_tracks->is_valid(false).any())
		return -2;	// Compressed data is corrupted or invalid

	const acl::track_type8 track_type = compressed_tracks->get_track_type();
	if (track_type == acl::track_type8::qvvf)
	{
		// A transform clip
		if (compressed_buffer_size < compressed_tracks->get_size())
			return -1;	// Invalid compressed clip buffer

		const uint32_t num_tracks = compressed_tracks->get_num_tracks();
		const size_t expected_output_buffer_size = num_tracks * sizeof(rtm::qvvf);
		if (output_buffer_size < expected_output_buffer_size)
			return -3;	// Output buffer is too small

		if (!acl::is_aligned_to(output_buffer, alignof(rtm::qvvf)))
			return -4;	// Output buffer isn't aligned properly

		acl::decompression_context<acl::default_transform_decompression_settings> context;
		if (!context.initialize(*compressed_tracks))
			return -5;	// Failed to initialize our context

		const acl::sample_rounding_policy rounding_policy_ = static_cast<acl::sample_rounding_policy>(rounding_policy);
		context.seek(sample_time, rounding_policy_);

		rtm::qvvf* output_buffer_ = reinterpret_cast<rtm::qvvf*>(output_buffer);
		transform_track_writer pose_writer(output_buffer_);
		context.decompress_tracks(pose_writer);

		return 0;
	}
	else if (track_type == acl::track_type8::float1f)
	{
		// A scalar clip
		if (compressed_buffer_size < compressed_tracks->get_size())
			return -1;	// Invalid compressed tracks buffer

		const uint32_t num_tracks = compressed_tracks->get_num_tracks();
		const size_t expected_output_buffer_size = num_tracks * sizeof(float);
		if (output_buffer_size < expected_output_buffer_size)
			return -3;	// Output buffer is too small

		if (!acl::is_aligned_to(output_buffer, alignof(float)))
			return -4;	// Output buffer isn't aligned properly

		acl::decompression_context<scalar_decompression_settings> context;
		if (!context.initialize(*compressed_tracks))
			return -5;	// Failed to initialize our context

		const acl::sample_rounding_policy rounding_policy_ = static_cast<acl::sample_rounding_policy>(rounding_policy);
		context.seek(sample_time, rounding_policy_);

		float* output_buffer_ = reinterpret_cast<float*>(output_buffer);
		scalar_track_writer track_writer(output_buffer_);
		context.decompress_tracks(track_writer);

		return 0;
	}
	else
	{
		// An unsupported track type
		return -10;
	}
}

int decompress_track(const unsigned char* compressed_buffer, size_t compressed_buffer_size, float sample_time, int rounding_policy, int track_index, unsigned char* output_buffer, size_t output_buffer_size)
{
	if (compressed_buffer == nullptr)
		return -1;	// Invalid argument

	const acl::compressed_tracks* compressed_tracks = reinterpret_cast<const acl::compressed_tracks*>(compressed_buffer);
	if (compressed_tracks->is_valid(false).any())
		return -2;	// Compressed data is corrupted or invalid

	const acl::track_type8 track_type = compressed_tracks->get_track_type();
	if (track_type == acl::track_type8::qvvf)
	{
		// A transform clip
		if (compressed_buffer_size < compressed_tracks->get_size())
			return -1;	// Invalid compressed clip buffer

		if (output_buffer_size < sizeof(rtm::qvvf))
			return -3;	// Output buffer is too small

		if (!acl::is_aligned_to(output_buffer, alignof(rtm::qvvf)))
			return -4;	// Output buffer isn't aligned properly

		const uint32_t num_tracks = compressed_tracks->get_num_tracks();
		if (static_cast<uint32_t>(track_index) >= num_tracks)
			return -5;	// Invalid transform index

		acl::decompression_context<acl::default_transform_decompression_settings> context;
		if (!context.initialize(*compressed_tracks))
			return -6;	// Failed to initialize our context

		const acl::sample_rounding_policy rounding_policy_ = static_cast<acl::sample_rounding_policy>(rounding_policy);
		context.seek(sample_time, rounding_policy_);

		rtm::qvvf* output_buffer_ = reinterpret_cast<rtm::qvvf*>(output_buffer);
		single_transform_track_writer track_writer(output_buffer_);
		context.decompress_track(static_cast<uint32_t>(track_index), track_writer);

		return 0;
	}
	else if (track_type == acl::track_type8::float1f)
	{
		// A scalar clip
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
		if (!context.initialize(*compressed_tracks))
			return -6;	// Failed to initialize our context

		const acl::sample_rounding_policy rounding_policy_ = static_cast<acl::sample_rounding_policy>(rounding_policy);
		context.seek(sample_time, rounding_policy_);

		float* output_buffer_ = reinterpret_cast<float*>(output_buffer);
		single_scalar_track_writer track_writer(output_buffer_);
		context.decompress_track(track_index, track_writer);

		return 0;
	}
	else
	{
		// An unsupported track type
		return -10;
	}
}
