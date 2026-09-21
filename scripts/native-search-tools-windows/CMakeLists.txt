cmake_minimum_required(VERSION 3.21)

cmake_policy(SET CMP0091 NEW)
project(kcode_native_ugrep LANGUAGES C CXX)

if(NOT MSVC)
  message(FATAL_ERROR "KCode Windows ugrep must be built with MSVC")
endif()

foreach(source_name UGREP PCRE2 ZLIB BZIP2 ZSTD BROTLI)
  if(NOT DEFINED KCODE_${source_name}_SOURCE_DIR)
    message(FATAL_ERROR "Missing KCODE_${source_name}_SOURCE_DIR")
  endif()
endforeach()

if(NOT DEFINED KCODE_UGREP_OUTPUT_DIR)
  message(FATAL_ERROR "Missing KCODE_UGREP_OUTPUT_DIR")
endif()

set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(BUILD_TESTING OFF CACHE BOOL "" FORCE)

# 随机构建目录不能进入最终 PE，否则同版本工具无法跨 CLI 复用同一份 runtime cache。
if(DEFINED KCODE_BUILD_PATH)
  add_compile_options("/pathmap:${KCODE_BUILD_PATH}=kcode-native-search")
endif()

set(BUILD_STATIC_LIBS ON CACHE BOOL "" FORCE)
set(PCRE2_BUILD_PCRE2_8 ON CACHE BOOL "" FORCE)
set(PCRE2_BUILD_PCRE2_16 OFF CACHE BOOL "" FORCE)
set(PCRE2_BUILD_PCRE2_32 OFF CACHE BOOL "" FORCE)
set(PCRE2_BUILD_PCRE2GREP OFF CACHE BOOL "" FORCE)
set(PCRE2_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(PCRE2_SHOW_REPORT OFF CACHE BOOL "" FORCE)
set(PCRE2_STATIC_RUNTIME ON CACHE BOOL "" FORCE)
set(PCRE2_SUPPORT_JIT ON CACHE BOOL "" FORCE)
add_subdirectory("${KCODE_PCRE2_SOURCE_DIR}" pcre2 EXCLUDE_FROM_ALL)

set(SKIP_INSTALL_ALL ON CACHE BOOL "" FORCE)
add_subdirectory("${KCODE_ZLIB_SOURCE_DIR}" zlib EXCLUDE_FROM_ALL)

add_library(kcode_bzip2 STATIC
  "${KCODE_BZIP2_SOURCE_DIR}/blocksort.c"
  "${KCODE_BZIP2_SOURCE_DIR}/huffman.c"
  "${KCODE_BZIP2_SOURCE_DIR}/crctable.c"
  "${KCODE_BZIP2_SOURCE_DIR}/randtable.c"
  "${KCODE_BZIP2_SOURCE_DIR}/compress.c"
  "${KCODE_BZIP2_SOURCE_DIR}/decompress.c"
  "${KCODE_BZIP2_SOURCE_DIR}/bzlib.c"
)
target_compile_definitions(kcode_bzip2 PRIVATE _CRT_SECURE_NO_WARNINGS)
target_include_directories(kcode_bzip2 PUBLIC "${KCODE_BZIP2_SOURCE_DIR}")

set(ZSTD_BUILD_CONTRIB OFF CACHE BOOL "" FORCE)
set(ZSTD_BUILD_PROGRAMS OFF CACHE BOOL "" FORCE)
set(ZSTD_BUILD_SHARED OFF CACHE BOOL "" FORCE)
set(ZSTD_BUILD_STATIC ON CACHE BOOL "" FORCE)
set(ZSTD_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(ZSTD_USE_STATIC_RUNTIME ON CACHE BOOL "" FORCE)
add_subdirectory("${KCODE_ZSTD_SOURCE_DIR}/build/cmake" zstd EXCLUDE_FROM_ALL)

set(BROTLI_BUNDLED_MODE ON CACHE BOOL "" FORCE)
add_subdirectory("${KCODE_BROTLI_SOURCE_DIR}" brotli EXCLUDE_FROM_ALL)

set(KCODE_VIIZ_SOURCE_DIR "${KCODE_UGREP_SOURCE_DIR}/lzma/C")
add_library(kcode_viiz STATIC
  "${KCODE_VIIZ_SOURCE_DIR}/viizip.c"
  "${KCODE_VIIZ_SOURCE_DIR}/7zAlloc.c"
  "${KCODE_VIIZ_SOURCE_DIR}/7zArcIn.c"
  "${KCODE_VIIZ_SOURCE_DIR}/7zBuf.c"
  "${KCODE_VIIZ_SOURCE_DIR}/7zBuf2.c"
  "${KCODE_VIIZ_SOURCE_DIR}/7zCrc.c"
  "${KCODE_VIIZ_SOURCE_DIR}/7zCrcOpt.c"
  "${KCODE_VIIZ_SOURCE_DIR}/7zDec.c"
  "${KCODE_VIIZ_SOURCE_DIR}/7zFile.c"
  "${KCODE_VIIZ_SOURCE_DIR}/7zStream.c"
  "${KCODE_VIIZ_SOURCE_DIR}/Bcj2.c"
  "${KCODE_VIIZ_SOURCE_DIR}/Bra.c"
  "${KCODE_VIIZ_SOURCE_DIR}/Bra86.c"
  "${KCODE_VIIZ_SOURCE_DIR}/BraIA64.c"
  "${KCODE_VIIZ_SOURCE_DIR}/CpuArch.c"
  "${KCODE_VIIZ_SOURCE_DIR}/Delta.c"
  "${KCODE_VIIZ_SOURCE_DIR}/Lzma2Dec.c"
  "${KCODE_VIIZ_SOURCE_DIR}/LzmaDec.c"
  "${KCODE_VIIZ_SOURCE_DIR}/Ppmd7.c"
  "${KCODE_VIIZ_SOURCE_DIR}/Ppmd7Dec.c"
)
target_compile_definitions(kcode_viiz PRIVATE
  Z7_PPMD_SUPPORT
  Z7_EXTRACT_ONLY
  NDEBUG
  _CRT_SECURE_NO_WARNINGS
)
target_include_directories(kcode_viiz PUBLIC "${KCODE_VIIZ_SOURCE_DIR}")

set(KCODE_REFLEX_SOURCES
  "${KCODE_UGREP_SOURCE_DIR}/lib/block_scripts.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/lib/composer.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/lib/convert.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/lib/debug.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/lib/error.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/lib/input.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/lib/language_scripts.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/lib/letter_case.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/lib/letter_scripts.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/lib/matcher.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/lib/pattern.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/lib/posix.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/lib/simd.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/lib/unicode.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/lib/utf8.cpp"
)

add_library(kcode_reflex STATIC ${KCODE_REFLEX_SOURCES})
target_compile_definitions(kcode_reflex PRIVATE WITH_NO_CODEGEN)

add_executable(ugrep
  "${KCODE_UGREP_SOURCE_DIR}/src/ugrep.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/src/cnf.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/src/glob.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/src/output.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/src/query.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/src/screen.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/src/stats.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/src/vkey.cpp"
  "${KCODE_UGREP_SOURCE_DIR}/src/zopen.c"
)

add_library(kcode_ugrep_contract INTERFACE)
target_compile_definitions(kcode_ugrep_contract INTERFACE
  HAVE_LIBBROTLI
  HAVE_LIBBZ2
  HAVE_LIBZ
  HAVE_LIBZSTD
  HAVE_PCRE2
  NDEBUG
  PCRE2_STATIC
  WITH_COLOR
  WITH_NO_INDENT
  _CONSOLE
  _CRT_NONSTDC_NO_WARNINGS
  _CRT_SECURE_NO_WARNINGS
)
if(CMAKE_GENERATOR_PLATFORM STREQUAL "ARM64")
  target_compile_definitions(kcode_ugrep_contract INTERFACE HAVE_NEON)
else()
  target_compile_definitions(kcode_ugrep_contract INTERFACE HAVE_SSE2)
endif()
target_compile_features(kcode_ugrep_contract INTERFACE cxx_std_17)
# ugrep 固定源码是无 BOM UTF-8；中文 Windows 按 CP936 解析时会触发 C4819/C1070，并改写 UTF-8 字符串字面量。
target_compile_options(kcode_ugrep_contract INTERFACE
  /utf-8
  $<$<COMPILE_LANGUAGE:CXX>:/EHsc>
)
target_include_directories(kcode_ugrep_contract INTERFACE
  "${KCODE_UGREP_SOURCE_DIR}/include"
  "${KCODE_UGREP_SOURCE_DIR}/src"
  "${KCODE_VIIZ_SOURCE_DIR}"
)

target_link_libraries(kcode_reflex PRIVATE kcode_ugrep_contract pcre2-8-static)
target_link_libraries(ugrep PRIVATE
  kcode_ugrep_contract
  kcode_reflex
  kcode_viiz
  pcre2-8-static
  zlibstatic
  kcode_bzip2
  libzstd_static
  brotlienc
  brotlidec
  brotlicommon
)
target_link_options(ugrep PRIVATE /Brepro)
set_target_properties(ugrep PROPERTIES
  RUNTIME_OUTPUT_DIRECTORY "${KCODE_UGREP_OUTPUT_DIR}"
  RUNTIME_OUTPUT_DIRECTORY_RELEASE "${KCODE_UGREP_OUTPUT_DIR}"
)
