cmake_minimum_required (VERSION 3.2)
project(acl-js CXX)

set(CMAKE_CXX_STANDARD 11)

include_directories("${PROJECT_SOURCE_DIR}/../external/acl/includes")
include_directories("${PROJECT_SOURCE_DIR}/../external/acl/external/rtm/includes")

# Grab all of our source files
file(GLOB_RECURSE ALL_MAIN_SOURCE_FILES LIST_DIRECTORIES false
	${PROJECT_SOURCE_DIR}/sources/*.cpp
	${PROJECT_SOURCE_DIR}/sources/*.h)

add_executable(${PROJECT_NAME} ${ALL_MAIN_SOURCE_FILES})

target_compile_options(${PROJECT_NAME} PRIVATE -Wall -Wextra)	# Enable all warnings
target_compile_options(${PROJECT_NAME} PRIVATE -Wshadow)		# Enable shadowing warnings
target_compile_options(${PROJECT_NAME} PRIVATE -Werror)			# Treat warnings as errors

target_compile_options(${PROJECT_NAME} PRIVATE -fno-rtti)		# Disable RTTI
target_compile_options(${PROJECT_NAME} PRIVATE -fno-exceptions)	# Disable exceptions

install(FILES
	${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}.js
	${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}.wasm
	DESTINATION .)
