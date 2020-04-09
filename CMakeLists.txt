cmake_minimum_required(VERSION 3.2)
project(acl-js NONE)

if(CMAKE_CONFIGURATION_TYPES)
	set(CMAKE_CONFIGURATION_TYPES Debug Release)
	set(CMAKE_CONFIGURATION_TYPES "${CMAKE_CONFIGURATION_TYPES}" CACHE STRING "Reset the configurations to what we need" FORCE)
endif()

# Enable CTest
enable_testing()

# Add our projects
add_subdirectory(acl-js)
add_subdirectory(tests/acl_unit_tests)
add_subdirectory(tests/rtm_unit_tests)
add_subdirectory(tools/acl_regression_tester)
