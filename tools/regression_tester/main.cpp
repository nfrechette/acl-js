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

#include <sjson/writer.h>
#include <sjson/parser.h>

#include <acl/algorithm/uniformly_sampled/encoder.h>
#include <acl/algorithm/uniformly_sampled/decoder.h>
#include <acl/core/ansi_allocator.h>
#include <acl/io/clip_reader.h>

#include <emscripten.h>

#include <cstdio>

static bool read_acl_sjson_file(acl::IAllocator& allocator, const char* input_filename,
	acl::sjson_file_type& out_file_type,
	acl::sjson_raw_clip& out_raw_clip,
	acl::sjson_raw_track_list& out_raw_track_list)
{
	std::FILE* file = fopen(input_filename, "rb");
	if (file == nullptr)
	{
		printf("Failed to open input file: %s\n", input_filename);
		return false;
	}

	const int fseek_result = fseek(file, 0, SEEK_END);
	const size_t file_size = fseek_result == 0 ? static_cast<size_t>(ftello(file)) : static_cast<size_t>(-1);
	if (file_size == static_cast<size_t>(-1L))
	{
		printf("Failed to find input file size: %s\n", input_filename);
		fclose(file);
		return false;
	}

	rewind(file);

	char* sjson_file_buffer = acl::allocate_type_array<char>(allocator, file_size);
	if (sjson_file_buffer == nullptr)
	{
		printf("Failed to allocate %zu bytes to read input file: %s\n", file_size, input_filename);
		fclose(file);
		return false;
	}

	const size_t result = fread(sjson_file_buffer, 1, file_size, file);
	fclose(file);

	if (result != file_size)
	{
		printf("Failed to read input file: %s\n", input_filename);
		acl::deallocate_type_array(allocator, sjson_file_buffer, file_size);
		return false;
	}

	acl::ClipReader reader(allocator, sjson_file_buffer, file_size - 1);

	const acl::sjson_file_type ftype = reader.get_file_type();
	out_file_type = ftype;

	bool success = false;
	switch (ftype)
	{
	case acl::sjson_file_type::unknown:
	default:
		printf("Unknown file type\n");
		break;
	case acl::sjson_file_type::raw_clip:
		success = reader.read_raw_clip(out_raw_clip);
		break;
	case acl::sjson_file_type::raw_track_list:
		success = reader.read_raw_track_list(out_raw_track_list);
		break;
	}

	if (!success)
	{
		const acl::ClipReaderError err = reader.get_error();
		if (err.error != acl::ClipReaderError::None)
			printf("Error on line %d column %d: %s\n", err.line, err.column, err.get_description());
	}

	deallocate_type_array(allocator, sjson_file_buffer, file_size);
	return true;
}

int main(int argc, char* argv[])
{
	if (argc != 2)
	{
		printf("Usage: node acl-js-regression-tester <input filename.acl.sjson>\n");
		return 1;
	}

	const char* input_filename = argv[1];

	acl::ANSIAllocator allocator;

	acl::sjson_file_type sjson_type = acl::sjson_file_type::unknown;
	acl::sjson_raw_clip sjson_clip;
	acl::sjson_raw_track_list sjson_track_list;

	if (!read_acl_sjson_file(allocator, input_filename, sjson_type, sjson_clip, sjson_track_list))
		return -1;

	printf("Successfully read ACL SJSON clip!\n");

	if (sjson_type != acl::sjson_file_type::raw_clip)
	{
		printf("No raw clip found, nothing to compress\n");
		return 0;
	}

	acl::CompressionSettings settings = acl::get_default_compression_settings();

	acl::qvvf_transform_error_metric error_metric;
	settings.error_metric = &error_metric;

	acl::OutputStats stats;
	acl::CompressedClip* compressed_clip = nullptr;
	acl::ErrorResult error_result = acl::uniformly_sampled::compress_clip(allocator, *sjson_clip.clip, settings, compressed_clip, stats);

	if (error_result.any())
	{
		printf("Failed to compress clip: %s\n", error_result.c_str());
		return 1;
	}

	error_result = compressed_clip->is_valid(true);
	if (error_result.any())
	{
		printf("Compressed clip is invalid\n");
		return 1;
	}

	printf("Successfully compressed clip into %u bytes!\n", compressed_clip->get_size());

	// Make sure our compressed clip works
	{
		// Disable floating point exceptions since decompression assumes it
		acl::scope_disable_fp_exceptions fp_off;

		// Use the compressed clip to make sure the decoder works properly
		acl::uniformly_sampled::DecompressionContext<acl::uniformly_sampled::DefaultDecompressionSettings> context;
		context.initialize(*compressed_clip);

		const acl::BoneError bone_error = acl::calculate_error_between_clips(allocator, error_metric, *sjson_clip.clip, context);
		if (!rtm::scalar_is_finite(bone_error.error))
		{
			printf("Returned error is not a finite value\n");
			return 1;
		}

		printf("Max error %.3f cm for transform %u at %.2f seconds\n", bone_error.error, bone_error.index, bone_error.sample_time);

		const float regression_error_threshold = 0.075F;
		if (bone_error.error >= regression_error_threshold)
		{
			printf("Error %.3f too high for transform %u at time %.2f\n", bone_error.error, bone_error.index, bone_error.sample_time);
			return 1;
		}
	}

	// Regression test
	{
		// Disable floating point exceptions since decompression assumes it
		acl::scope_disable_fp_exceptions fp_off;

		acl::uniformly_sampled::DecompressionContext<acl::uniformly_sampled::DefaultDecompressionSettings> context;
		context.initialize(*compressed_clip);

		const acl::AnimationClip& clip = *sjson_clip.clip;

		const uint16_t num_bones = clip.get_num_bones();
		const float clip_duration = clip.get_duration();
		const float sample_rate = clip.get_sample_rate();
		const uint32_t num_samples = acl::calculate_num_samples(clip_duration, clip.get_sample_rate());

		rtm::qvvf* lossy_pose_transforms = acl::allocate_type_array<rtm::qvvf>(allocator, num_bones);

		acl::DefaultOutputWriter pose_writer(lossy_pose_transforms, num_bones);

		// Regression test
		for (uint32_t sample_index = 0; sample_index < num_samples; ++sample_index)
		{
			const float sample_time = rtm::scalar_min(float(sample_index) / sample_rate, clip_duration);

			// We use the nearest sample to accurately measure the loss that happened, if any
			context.seek(sample_time, acl::sample_rounding_policy::nearest);
			context.decompress_pose(pose_writer);

			// Validate decompress_bone for rotations only
			for (uint16_t bone_index = 0; bone_index < num_bones; ++bone_index)
			{
				rtm::quatf rotation;
				context.decompress_bone(bone_index, &rotation, nullptr, nullptr);
				if (!rtm::quat_near_equal(rotation, lossy_pose_transforms[bone_index].rotation))
				{
					printf("Failed to sample rotation for transform %u\n", bone_index);
					return 1;
				}
			}

			// Validate decompress_bone for translations only
			for (uint16_t bone_index = 0; bone_index < num_bones; ++bone_index)
			{
				rtm::vector4f translation;
				context.decompress_bone(bone_index, nullptr, &translation, nullptr);
				if (!rtm::vector_all_near_equal3(translation, lossy_pose_transforms[bone_index].translation))
				{
					printf("Failed to sample translation for transform %u\n", bone_index);
					return 1;
				}
			}

			// Validate decompress_bone for scales only
			for (uint16_t bone_index = 0; bone_index < num_bones; ++bone_index)
			{
				rtm::vector4f scale;
				context.decompress_bone(bone_index, nullptr, nullptr, &scale);
				if (!rtm::vector_all_near_equal3(scale, lossy_pose_transforms[bone_index].scale))
				{
					printf("Failed to sample scale for transform %u\n", bone_index);
					return 1;
				}
			}

			// Validate decompress_bone
			for (uint16_t bone_index = 0; bone_index < num_bones; ++bone_index)
			{
				rtm::quatf rotation;
				rtm::vector4f translation;
				rtm::vector4f scale;
				context.decompress_bone(bone_index, &rotation, &translation, &scale);

				if (!rtm::quat_near_equal(rotation, lossy_pose_transforms[bone_index].rotation))
				{
					printf("Failed to sample rotation for transform %u\n", bone_index);
					return 1;
				}

				if (!rtm::vector_all_near_equal3(translation, lossy_pose_transforms[bone_index].translation))
				{
					printf("Failed to sample translation for transform %u\n", bone_index);
					return 1;
				}

				if (!rtm::vector_all_near_equal3(scale, lossy_pose_transforms[bone_index].scale))
				{
					printf("Failed to sample scale for transform %u\n", bone_index);
					return 1;
				}
			}
		}

		acl::deallocate_type_array(allocator, lossy_pose_transforms, num_bones);

		printf("Regression test successful!\n");
	}

	allocator.deallocate(compressed_clip, compressed_clip->get_size());

	return 0;
}
