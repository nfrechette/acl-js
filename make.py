# coding: utf-8

from __future__ import print_function

import argparse
import codecs
import multiprocessing
import os
import platform
import re
import shutil
import subprocess
import sys

def parse_argv():
	parser = argparse.ArgumentParser(add_help=False)

	actions = parser.add_argument_group(title='Actions', description='If no action is specified, the solution/make files are generated. Multiple actions can be used simultaneously.')
	actions.add_argument('-build', action='store_true')
	actions.add_argument('-clean', action='store_true')
	actions.add_argument('-unit_test', action='store_true')

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

	parser.set_defaults(build=False, clean=False, unit_test=False, config='Release', num_threads=num_threads, tests_matching='')

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

def do_build(install_dir, js_dir, args):
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

	emcc_version = subprocess.check_output('emcc --version | head -n 1', shell=True)
	emcc_version = emcc_version.decode(sys.stdin.encoding)
	emcc_version = emcc_version.strip()

	# Now that the WASM modules have been built, patch our JS files
	encoder_wasm = os.path.join(install_dir, 'acl-encoder.wasm')
	encoder_wasm_data = None
	with open(encoder_wasm, 'rb') as f:
		encoder_wasm_data = f.read()
		(encoder_wasm_data, _) = codecs.getencoder('hex')(encoder_wasm_data)
		encoder_wasm_data = encoder_wasm_data.decode('utf-8')

	encoder_js = os.path.join(js_dir, 'src-js', 'encoder.wasm.js')
	encoder_js_data = None
	with open(encoder_js, 'r') as f:
		encoder_js_data = f.read()
		encoder_js_data = re.sub(r'^([ \t]*// Compiled with ).*$', r'\1{}'.format(emcc_version), encoder_js_data, flags = re.MULTILINE)
		encoder_js_data = re.sub(r'^([ \t]*export const wasmBinaryBlob =) "[<>_\w\d]*"$', r'\1 "{}"'.format(encoder_wasm_data), encoder_js_data, flags = re.MULTILINE)

	with open(encoder_js, 'w') as f:
		f.write(encoder_js_data)

	decoder_wasm = os.path.join(install_dir, 'acl-decoder.wasm')
	decoder_wasm_data = None
	with open(decoder_wasm, 'rb') as f:
		decoder_wasm_data = f.read()
		(decoder_wasm_data, _) = codecs.getencoder('hex')(decoder_wasm_data)
		decoder_wasm_data = decoder_wasm_data.decode('utf-8')

	decoder_js = os.path.join(js_dir, 'src-js', 'decoder.wasm.js')
	decoder_js_data = None
	with open(decoder_js, 'r') as f:
		decoder_js_data = f.read()
		decoder_js_data = re.sub(r'^([ \t]*// Compiled with ).*$', r'\1{}'.format(emcc_version), decoder_js_data, flags = re.MULTILINE)
		decoder_js_data = re.sub(r'^([ \t]*export const wasmBinaryBlob =) "[<>_\w\d]*"$', r'\1 "{}"'.format(decoder_wasm_data), decoder_js_data, flags = re.MULTILINE)

	with open(decoder_js, 'w') as f:
		f.write(decoder_js_data)

def do_tests(args):
	print('No unit tests specific to this library yet, contributions welcome!')

if __name__ == "__main__":
	args = parse_argv()

	build_dir = os.path.join(os.getcwd(), 'build')
	install_dir = os.path.join(os.getcwd(), 'bin')
	js_dir = os.path.join(os.getcwd(), 'acl-js')
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
	print('Using {} threads'.format(args.num_threads))

	# Make sure 'make' runs with all available cores
	os.environ['MAKEFLAGS'] = '-j{}'.format(args.num_threads)

	do_generate_solution(install_dir, args)

	if args.build:
		do_build(install_dir, js_dir, args)

	if args.unit_test:
		do_tests(args)

	sys.exit(0)
