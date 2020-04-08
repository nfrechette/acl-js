import argparse
import multiprocessing
import os
import platform
import shutil
import subprocess
import sys
import threading
import time
import zipfile

# The current test data version in use
current_test_data = 'test_data_v3'

def parse_argv():
	parser = argparse.ArgumentParser(add_help=False)

	actions = parser.add_argument_group(title='Actions', description='If no action is specified, the solution/make files are generated. Multiple actions can be used simultaneously.')
	actions.add_argument('-build', action='store_true')
	actions.add_argument('-clean', action='store_true')
	actions.add_argument('-unit_test', action='store_true')
	actions.add_argument('-regression_test', action='store_true')

	target = parser.add_argument_group(title='Target')
	target.add_argument('-config', choices=['Debug', 'Release'], type=str.capitalize)

	misc = parser.add_argument_group(title='Miscellaneous')
	misc.add_argument('-num_threads', help='Number of threads to use while compiling and regression testing')
	misc.add_argument('-tests_matching', help='Only run tests whose names match this regex')
	misc.add_argument('-help', action='help', help='Display this usage information')

	num_threads = multiprocessing.cpu_count()
	if platform.system() == 'Linux' and sys.version_info >= (3, 4):
		num_threads = len(os.sched_getaffinity(0))
	if not num_threads or num_threads == 0:
		num_threads = 4

	parser.set_defaults(build=False, clean=False, unit_test=False, regression_test=False, config='Release', num_threads=num_threads, tests_matching='')

	args = parser.parse_args()

	return args

def do_generate_solution(install_dir, args):
	extra_switches = ['--no-warn-unused-cli']
	extra_switches.append('-DCMAKE_BUILD_TYPE={}'.format(args.config.upper()))

	# Generate IDE solution
	print('Generating build files ...')
	cmake_cmd = 'emcmake cmake .. -DCMAKE_INSTALL_PREFIX="{}" {}'.format(install_dir, ' '.join(extra_switches))

	result = subprocess.call(cmake_cmd, shell=True)
	if result != 0:
		print('Failed to generate solution files!')
		sys.exit(result)

def do_build(args):
	print('Building ...')
	cmake_cmd = 'cmake --build .'
	if platform.system() == 'Darwin':
		cmake_cmd += ' --config {} --target install'.format(args.config)
	else:
		cmake_cmd += ' --target install'

	result = subprocess.call(cmake_cmd, shell=True)
	if result != 0:
		print('Build failed!')
		sys.exit(result)

def do_tests(args):
	print('Running unit tests ...')
	ctest_cmd = 'ctest --output-on-failure --parallel {}'.format(args.num_threads)

	if platform.system() == 'Darwin':
		ctest_cmd += ' -C {}'.format(args.config)

	if args.tests_matching:
		ctest_cmd += ' --tests-regex {}'.format(args.tests_matching)

	result = subprocess.call(ctest_cmd, shell=True)
	if result != 0:
		sys.exit(result)

def do_prepare_regression_test_data(test_data_dir, args):
	print('Preparing regression test data ...')

	current_test_data_zip = os.path.join(test_data_dir, '{}.zip'.format(current_test_data))

	# Validate that our regression test data is present
	if not os.path.exists(current_test_data_zip):
		print('Regression test data not found: {}'.format(current_test_data_zip))
		return

	# If it hasn't been decompressed yet, do so now
	current_test_data_dir = os.path.join(test_data_dir, current_test_data)
	needs_decompression = not os.path.exists(current_test_data_dir)
	if needs_decompression:
		print('Decompressing {} ...'.format(current_test_data_zip))
		with zipfile.ZipFile(current_test_data_zip, 'r') as zip_ref:
			zip_ref.extractall(test_data_dir)

	# Grab all the test clips
	regression_clips = []
	for (dirpath, dirnames, filenames) in os.walk(current_test_data_dir):
		for filename in filenames:
			if not filename.endswith('.acl.sjson'):
				continue

			clip_filename = os.path.join(dirpath, filename)
			regression_clips.append((clip_filename, os.path.getsize(clip_filename)))

	if len(regression_clips) == 0:
		print('No regression clips found')
		sys.exit(1)

	print('Found {} regression clips'.format(len(regression_clips)))

def format_elapsed_time(elapsed_time):
	hours, rem = divmod(elapsed_time, 3600)
	minutes, seconds = divmod(rem, 60)
	return '{:0>2}h {:0>2}m {:05.2f}s'.format(int(hours), int(minutes), seconds)

def print_progress(iteration, total, prefix='', suffix='', decimals = 1, bar_length = 40):
	# Taken from https://stackoverflow.com/questions/3173320/text-progress-bar-in-the-console
	# With minor tweaks
	"""
	Call in a loop to create terminal progress bar
	@params:
		iteration   - Required  : current iteration (Int)
		total       - Required  : total iterations (Int)
		prefix      - Optional  : prefix string (Str)
		suffix      - Optional  : suffix string (Str)
		decimals    - Optional  : positive number of decimals in percent complete (Int)
		bar_length  - Optional  : character length of bar (Int)
	"""
	str_format = "{0:." + str(decimals) + "f}"
	percents = str_format.format(100 * (iteration / float(total)))
	filled_length = int(round(bar_length * iteration / float(total)))
	bar = '█' * filled_length + '-' * (bar_length - filled_length)

	# We need to clear any previous line we might have to ensure we have no visual artifacts
	# Note that if this function is called too quickly, the text might flicker
	terminal_width = 80
	sys.stdout.write('{}\r'.format(' ' * terminal_width))
	sys.stdout.flush()

	sys.stdout.write('%s |%s| %s%s %s\r' % (prefix, bar, percents, '%', suffix)),
	sys.stdout.flush()

	if iteration == total:
		sys.stdout.write('\n')

def do_regression_tests(install_dir, test_data_dir, args):
	if sys.version_info < (3, 4):
		print('Python 3.4 or higher needed to run regression tests')
		sys.exit(1)

	import queue

	print('Running regression tests ...')

	# Validate that our regression testing tool is present
	regression_tester = os.path.join(install_dir, 'tools', 'regression-tester.js')
	regression_tester = os.path.abspath(regression_tester)

	if not os.path.exists(regression_tester):
		print('Regression testing tool not found: {}'.format(regression_tester))
		sys.exit(1)

	# Grab all the test clips
	regression_clips = []
	current_test_data_dir = os.path.join(test_data_dir, current_test_data)
	for (dirpath, dirnames, filenames) in os.walk(current_test_data_dir):
		for filename in filenames:
			if not filename.endswith('.acl.sjson'):
				continue

			clip_filename = os.path.join(dirpath, filename)
			regression_clips.append((clip_filename, os.path.getsize(clip_filename)))

	# Sort clips by size to test larger clips first, it parallelizes better
	regression_clips.sort(key=lambda entry: entry[1], reverse=True)

	# Iterate over every clip and perform the regression testing
	regression_start_time = time.perf_counter()

	cmd_queue = queue.Queue()
	completed_queue = queue.Queue()
	failed_queue = queue.Queue()

	for clip_filename, _ in regression_clips:
		cmd = 'node "{}" "{}"'.format(regression_tester, clip_filename)
		cmd_queue.put((clip_filename, cmd))

	# Add a marker to terminate the threads
	for i in range(args.num_threads):
		cmd_queue.put(None)

	def run_clip_regression_test(cmd_queue, completed_queue, failed_queue):
		while True:
			entry = cmd_queue.get()
			if not entry:
				return

			(clip_filename, cmd) = entry

			try:
				subprocess.check_output(cmd, shell=True)
			except subprocess.CalledProcessError as e:
				failed_queue.put((clip_filename, cmd, e))

			completed_queue.put(clip_filename)

	threads = [ threading.Thread(target = run_clip_regression_test, args = (cmd_queue, completed_queue, failed_queue)) for _i in range(args.num_threads) ]
	for thread in threads:
		thread.daemon = True
		thread.start()

	print_progress(0, len(regression_clips), 'Testing clips:', '{} / {}'.format(0, len(regression_clips)))
	try:
		# Run until we are done
		while True:
			for thread in threads:
				thread.join(1.0)

			num_processed = completed_queue.qsize()
			print_progress(num_processed, len(regression_clips), 'Testing clips:', '{} / {}'.format(num_processed, len(regression_clips)))

			all_threads_done = True
			for thread in threads:
				if thread.isAlive():
					all_threads_done = False

			if all_threads_done:
				break

		# Done, append a dummy error
		failed_queue.put(None)

		# Print out any errors we might have hit
		while True:
			entry = failed_queue.get()
			if not entry:
				break

			(clip_filename, cmd, e) = entry
			print('Failed to run regression test for clip: {}'.format(clip_filename))
			print(cmd)

	except KeyboardInterrupt:
		sys.exit(1)

	regression_testing_failed = not failed_queue.empty()

	regression_end_time = time.perf_counter()
	print('Done in {}'.format(format_elapsed_time(regression_end_time - regression_start_time)))

	if regression_testing_failed:
		sys.exit(1)

if __name__ == "__main__":
	args = parse_argv()

	build_dir = os.path.join(os.getcwd(), 'build')
	install_dir = os.path.join(os.getcwd(), 'bin')
	test_data_dir = os.path.join(os.getcwd(), 'test_data')

	if args.clean:
		print('Cleaning previous build ...')
		if os.path.exists(build_dir):
			shutil.rmtree(build_dir)
		if os.path.exists(install_dir):
			shutil.rmtree(install_dir)

	if not os.path.exists(build_dir):
		os.makedirs(build_dir)
	if not os.path.exists(install_dir):
		os.makedirs(install_dir)

	os.chdir(build_dir)

	print('Using config: {}'.format(args.config))

	# Make sure 'make' runs with all available cores
	os.environ['MAKEFLAGS'] = '-j{}'.format(args.num_threads)

	do_prepare_regression_test_data(test_data_dir, args)

	do_generate_solution(install_dir, args)

	if args.build:
		do_build(args)

	if args.unit_test:
		do_tests(args)

	if args.regression_test:
		do_regression_tests(install_dir, test_data_dir, args)

	sys.exit(0)
