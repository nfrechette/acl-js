cmake_minimum_required (VERSION 3.2)
project(acl_regression_tester CXX)

# Grab the regression tester tool from ACL and compile it with emscripten

set(CMAKE_CXX_STANDARD 11)

set(ACL_ROOT_DIR ${PROJECT_SOURCE_DIR}/../../external/acl)
set(ACL_REGRESSION_TESTER_SOURCE_DIR ${ACL_ROOT_DIR}/tools/acl_compressor)

include_directories(${ACL_ROOT_DIR}/includes)
include_directories(${ACL_ROOT_DIR}/external/rtm/includes)
include_directories(${ACL_ROOT_DIR}/external/sjson-cpp/includes)
include_directories(${ACL_REGRESSION_TESTER_SOURCE_DIR}/includes)

# Grab all of our source files
file(GLOB_RECURSE ALL_MAIN_SOURCE_FILES LIST_DIRECTORIES false
	${ACL_REGRESSION_TESTER_SOURCE_DIR}/main_generic/*.cpp
	${ACL_REGRESSION_TESTER_SOURCE_DIR}/sources/*.cpp
	${ACL_REGRESSION_TESTER_SOURCE_DIR}/includes/*.h)

add_executable(${PROJECT_NAME} ${ALL_MAIN_SOURCE_FILES})

# Abort on failure, easier to debug issues this way
add_definitions(-DACL_ON_ASSERT_ABORT)
add_definitions(-DRTM_ON_ASSERT_ABORT)
add_definitions(-DSJSON_CPP_ON_ASSERT_ABORT)

add_definitions(-DACL_USE_SJSON)

target_compile_options(${PROJECT_NAME} PRIVATE -Wall -Wextra)		# Enable all warnings
target_compile_options(${PROJECT_NAME} PRIVATE -Wshadow)			# Enable shadowing warnings
target_compile_options(${PROJECT_NAME} PRIVATE -Werror)				# Treat warnings as errors

# Exceptions are not enabled by default, enable them
target_compile_options(${PROJECT_NAME} PRIVATE -fexceptions)
target_link_libraries(${PROJECT_NAME} "-s DISABLE_EXCEPTION_CATCHING=0")

target_link_libraries(${PROJECT_NAME} "-s NODERAWFS=1")				# Enable the raw node file system
target_link_libraries(${PROJECT_NAME} -lnodefs.js)					# Link the node file system

target_link_libraries(${PROJECT_NAME} "-s ENVIRONMENT=node")		# Force the environment to node

target_link_libraries(${PROJECT_NAME} "-s ALLOW_MEMORY_GROWTH=1")	# Allow dynamic memory allocation

install(FILES
	${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}.js
	${CMAKE_CURRENT_BINARY_DIR}/${PROJECT_NAME}.wasm
	DESTINATION tools)
