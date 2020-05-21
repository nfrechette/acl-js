[![CLA assistant](https://cla-assistant.io/readme/badge/nfrechette/acl-js)](https://cla-assistant.io/nfrechette/acl-js)
[![Build status](https://github.com/nfrechette/acl-js/workflows/build/badge.svg)](https://github.com/nfrechette/acl-js/actions)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://raw.githubusercontent.com/nfrechette/acl-js/master/LICENSE)
[![Discord](https://img.shields.io/discord/691048241864769647?label=discord)](https://discord.gg/UERt4bS)

# Animation Compression Library JavaScript Module

This module uses the C++11 [Animation Compression Library](https://github.com/nfrechette/acl) compiled with `emscripten 1.39.11` into WebAssembly. This allows fast compression and decompression of animations with Javascript. Animations can also be compressed offline with ACL and played back efficiently in a web browser.

The [glTF viewer](./tools/gltf_viewer) tool shows how this module can be used to both compress and decompress animations. You can see it live [here](https://nfrechette.github.io/acl_viewer/).

## How to contribute or built locally

If you wish to run the unit tests or contribute to `acl-js`, head on over to the [development setup](./docs/development_setup.md) section in order to setup your environment and make sure to check out the [contributing guidelines](CONTRIBUTING.md).

## External dependencies

You don't need anything else to get started: everything is self contained.
See [here](./external) for details.

## License, copyright, and code of conduct

This project uses the [MIT license](LICENSE).

Copyright (c) 2019 Nicholas Frechette & contributors

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.
