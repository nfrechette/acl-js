cmake_minimum_required (VERSION 3.2)
project(regression-tester CXX)

set(CMAKE_CXX_STANDARD 11)

include_directories("${PROJECT_SOURCE_DIR}/../../external/acl/includes")
include_directories("${PROJECT_SOURCE_DIR}/../../external/acl/external/rtm/includes")
include_directories("${PROJECT_SOURCE_DIR}/../../external/acl/external/sjson-cpp/includes")

# Grab all of our source files
file(GLOB_RECURSE ALL_MAIN_SOURCE_FILES LIST_DIRECTORIES false
	${PROJECT_SOURCE_DIR}/*.cpp
	${PROJECT_SOURCE_DIR}/*.h)

add_executable(${PROJECT_NAME} ${ALL_MAIN_SOURCE_FILES})

target_compile_options(${PROJECT_NAME} PRIVATE -Wall -Wextra)		# Enable all warnings
target_compile_options(${PROJECT_NAME} PRIVATE -Wshadow)			# Enable shadowing warnings
target_compile_options(${PROJECT_NAME} PRIVATE -Werror)				# Treat warnings as errors

target_compile_options(${PROJECT_NAME} PRIVATE -fno-rtti)			# Disable RTTI
target_compile_options(${PROJECT_NAME} PRIVATE -fno-exceptions)		# Disable exceptions

target_link_libraries(${PROJECT_NAME} "-s NODERAWFS=1")				# Enable the raw node file system
target_link_libraries(${PROJECT_NAME} -lnodefs.js)					# Link the node file system

target_link_libraries(${PROJECT_NAME} "-s ENVIRONMENT=node")		# Force the environment to node

target_link_libraries(${PROJECT_NAME} "-s ALLOW_MEMORY_GROWTH=1")	# Allow dynamic memory allocation

install(FILES
	${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}.js
	${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}.wasm
	DESTINATION tools)
