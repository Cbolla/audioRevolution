cmake_minimum_required(VERSION 3.22.1)
project("audiorevolution")

# Procura as bibliotecas nativas do Android
find_library(log-lib log)
find_library(android-lib android)
find_library(OpenSLES-lib OpenSLES)

add_library(audiorevolution SHARED
    native-lib.cpp
)

target_link_libraries(audiorevolution
    ${log-lib}
    ${android-lib}
    ${OpenSLES-lib}
)
