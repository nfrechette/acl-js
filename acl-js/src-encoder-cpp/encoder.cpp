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

#include "encoder.h"

#include <acl/compression/animation_clip.h>
#include <acl/compression/compress.h>
#include <acl/compression/skeleton.h>
#include <acl/core/ansi_allocator.h>

#include <acl/algorithm/uniformly_sampled/encoder.h>

#include <cstdint>

enum class sample_types
{
	unknown = -1,

	qvvd = 0,
	floatd = 1,
};

struct qvv_track_description
{
	double output_index;
	double parent_index;

	double precision;
	double shell_distance;

	double constant_rotation_threshold;
	double constant_translaton_threshold;
	double constant_scale_threshold;
};

struct scalar_track_description
{
	double output_index;

	double precision;
};

static acl::RigidSkeleton build_skeleton(const qvv_track_description* track_descriptions, uint32_t num_transforms, acl::IAllocator& allocator)
{
	acl::RigidBone* bones = acl::allocate_type_array<acl::RigidBone>(allocator, num_transforms);

	for (uint32_t transform_index = 0; transform_index < num_transforms; ++transform_index)
	{
		const qvv_track_description& desc = track_descriptions[transform_index];

		acl::RigidBone& bone = bones[transform_index];
		bone.vertex_distance = desc.shell_distance;
		bone.parent_index = desc.parent_index >= 0.0 ? static_cast<uint16_t>(desc.parent_index) : acl::k_invalid_bone_index;
	}

	acl::RigidSkeleton skeleton(allocator, bones, static_cast<uint16_t>(num_transforms));
	acl::deallocate_type_array(allocator, bones, num_transforms);
	return skeleton;
}

static acl::AnimationClip build_clip(const qvv_track_description* track_descriptions, const double* raw_data, const acl::RigidSkeleton& skeleton, uint32_t num_transforms, uint32_t num_samples_per_track, float sample_rate, acl::IAllocator& allocator)
{
	// Our raw data contains QVVs laid out: rotation0, translation0, scale0, rotation1, ...
	acl::AnimationClip clip(allocator, skeleton, num_samples_per_track, sample_rate, acl::String());

	for (uint32_t transform_index = 0; transform_index < num_transforms; ++transform_index)
	{
		acl::AnimatedBone& bone = clip.get_animated_bone(static_cast<uint16_t>(transform_index));

		const qvv_track_description& desc = track_descriptions[transform_index];
		bone.output_index = desc.output_index >= 0 ? static_cast<uint16_t>(desc.output_index) : acl::k_invalid_bone_index;

		const uint32_t transform_raw_data_offset = transform_index * 10 * num_samples_per_track;
		for (uint32_t sample_index = 0; sample_index < num_samples_per_track; ++sample_index)
		{
			const uint32_t sample_raw_data_offset = (sample_index * 10) + transform_raw_data_offset;

			const rtm::quatd rotation = rtm::quat_normalize(rtm::quat_load(raw_data + sample_raw_data_offset + 0));
			bone.rotation_track.set_sample(sample_index, rotation);

			const rtm::vector4d translation = rtm::vector_load3(raw_data + sample_raw_data_offset + 4);
			bone.translation_track.set_sample(sample_index, translation);

			const rtm::vector4d scale = rtm::vector_load3(raw_data + sample_raw_data_offset + 7);
			bone.scale_track.set_sample(sample_index, scale);
		}
	}

	return clip;
}

static int compress_transforms(const unsigned char* metadata, size_t metadata_size,
	unsigned char* raw_data, size_t raw_data_size)
{
	const double* metadata_ = reinterpret_cast<const double*>(metadata);

	const uint32_t num_tracks = static_cast<uint32_t>(metadata_[0]);
	const uint32_t num_samples_per_track = static_cast<uint32_t>(metadata_[2]);
	const float sample_rate = static_cast<float>(metadata_[3]);

	const size_t expected_metadata_size = sizeof(double) * 4 + sizeof(qvv_track_description) * num_tracks;
	if (expected_metadata_size != metadata_size)
		return -1;	// Invalid metadata size

	const size_t expected_raw_data_size = sizeof(double) * 10 * num_samples_per_track * num_tracks;
	if (raw_data_size < expected_raw_data_size)
		return -2;	// Invalid raw data size

	const double* raw_data_ = reinterpret_cast<const double*>(raw_data);
	const qvv_track_description* track_descriptions = reinterpret_cast<const qvv_track_description*>(metadata_ + 4);

	acl::ANSIAllocator allocator;

	const acl::RigidSkeleton skeleton = build_skeleton(track_descriptions, num_tracks, allocator);
	const acl::AnimationClip clip = build_clip(track_descriptions, raw_data_, skeleton, num_tracks, num_samples_per_track, sample_rate, allocator);

	acl::qvvf_transform_error_metric error_metric;

	acl::CompressionSettings settings = acl::get_default_compression_settings();
	settings.error_metric = &error_metric;

	settings.constant_rotation_threshold_angle = rtm::degrees(static_cast<float>(track_descriptions->constant_rotation_threshold));
	settings.constant_translation_threshold = static_cast<float>(track_descriptions->constant_translaton_threshold);
	settings.constant_scale_threshold = static_cast<float>(track_descriptions->constant_scale_threshold);
	settings.error_threshold = static_cast<float>(track_descriptions->precision);

	acl::CompressedClip* compressed_clip = nullptr;

	acl::OutputStats stats;
	const acl::ErrorResult result = acl::uniformly_sampled::compress_clip(allocator, clip, settings, compressed_clip, stats);
	if (result.any())
		return -3;	// Compression failed

	const uint32_t compressed_size = compressed_clip->get_size();
	if (raw_data_size < compressed_size)
	{
		allocator.deallocate(compressed_clip, compressed_size);
		return -4;	// Raw dara buffer is too small
	}

	// Copy our compressed clip back into the raw data buffer, it is no longer needed
	// and it should be large enough.
	std::memcpy(raw_data, compressed_clip, compressed_size);

	allocator.deallocate(compressed_clip, compressed_size);
	return compressed_size;
}

static int compress_scalars(const unsigned char* metadata, size_t metadata_size,
	unsigned char* raw_data, size_t raw_data_size)
{
	const double* metadata_ = reinterpret_cast<const double*>(metadata);

	const uint32_t num_tracks = static_cast<uint32_t>(metadata_[0]);
	const uint32_t num_samples_per_track = static_cast<uint32_t>(metadata_[2]);
	const float sample_rate = static_cast<float>(metadata_[3]);

	const size_t expected_metadata_size = sizeof(double) * 4 + sizeof(scalar_track_description) * num_tracks;
	if (expected_metadata_size != metadata_size)
		return -1;	// Invalid metadata size

	const size_t expected_raw_data_size = sizeof(double) * num_samples_per_track * num_tracks;
	if (raw_data_size < expected_raw_data_size)
		return -2;	// Invalid raw data size

	const double* raw_data_ = reinterpret_cast<const double*>(raw_data);
	const scalar_track_description* track_descriptions = reinterpret_cast<const scalar_track_description*>(metadata_ + 4);

	acl::ANSIAllocator allocator;

	acl::track_array tracks(allocator, num_tracks);
	for (uint32_t track_index = 0; track_index < num_tracks; ++track_index)
	{
		const scalar_track_description& js_desc = track_descriptions[track_index];

		acl::track_desc_scalarf desc;
		desc.output_index = js_desc.output_index >= 0.0 ? static_cast<uint32_t>(js_desc.output_index) : acl::k_invalid_track_index;
		desc.precision = static_cast<float>(js_desc.precision);

		acl::track_float1f track = acl::track_float1f::make_reserve(desc, allocator, num_samples_per_track, sample_rate);

		const uint32_t track_raw_data_offset = track_index * num_samples_per_track;
		for (uint32_t sample_index = 0; sample_index < num_samples_per_track; ++sample_index)
		{
			const uint32_t sample_raw_data_offset = sample_index + track_raw_data_offset;
			const rtm::scalard sample_value = rtm::scalar_load(raw_data_ + sample_raw_data_offset);

			track[sample_index] = rtm::scalar_cast(sample_value);
		}

		tracks[track_index] = std::move(track);
	}

	acl::compression_settings settings;

	acl::compressed_tracks* compressed_tracks = nullptr;
	acl::OutputStats stats;
	const acl::ErrorResult result = acl::compress_track_list(allocator, tracks, settings, compressed_tracks, stats);

	if (result.any())
		return -3;	// Compression failed

	const uint32_t compressed_size = compressed_tracks->get_size();
	if (raw_data_size < compressed_size)
	{
		allocator.deallocate(compressed_tracks, compressed_size);
		return -4;	// Raw dara buffer is too small
	}

	// Copy our compressed tracks back into the raw data buffer, it is no longer needed
	// and it should be large enough.
	std::memcpy(raw_data, compressed_tracks, compressed_size);

	allocator.deallocate(compressed_tracks, compressed_size);
	return compressed_size;
}

int compress(const unsigned char* metadata, size_t metadata_size,
	unsigned char* raw_data, size_t raw_data_size)
{
	const double* metadata_ = reinterpret_cast<const double*>(metadata);
	const sample_types sample_type = static_cast<sample_types>(metadata_[1]);

	if (sample_type == sample_types::qvvd)
		return compress_transforms(metadata, metadata_size, raw_data, raw_data_size);
	else if (sample_type == sample_types::floatd)
		return compress_scalars(metadata, metadata_size, raw_data, raw_data_size);
	else
		return 0;	// Sample type not supported
}
