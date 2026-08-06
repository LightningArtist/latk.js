# latk.js Architecture

`latk.js` is a JavaScript library designed for reading, writing, and manipulating spatial drawing and animation files, specifically using the **LATK (Lightning Artist Toolkit)** format. It provides a structured data model to handle 3D drawing strokes and includes loaders for other popular spatial drawing formats.

## Repository Structure

The repository is organized to maintain modular source files which are then bundled for distribution:

- `/build/`: Contains the modular source files (`latk-*.js`) that make up the core library. It also includes bundled dependencies (`JSZip`) and build scripts (`build.command`, `build.bat`).
- `/examples/`: Contains demonstration HTML files showing how to integrate `latk.js` with standard 2D Canvas, Three.js, and p5.js.
- `latk.js` & `latk.min.js`: The final concatenated and minified outputs distributed for use.
- `/tools/`: Contains auxiliary scripts for minification and decoding.

## Build System

The library relies on a simple build system using shell scripts (`build.command` for Unix/macOS, `build.bat` for Windows) that concatenate the source files in a specific order:
1. `latk-header.js`
2. `jszip.min.js` and `jszip-utils.min.js`
3. Loaders (`latk-tilt.js`, `latk-quill.js`)
4. Core data models (`latk-point.js`, `latk-stroke.js`, `latk-frame.js`, `latk-layer.js`)
5. Main entry point (`latk-main.js`)

The concatenated output is then minified using `uglifyjs`.

## Core Data Model

The architecture models 3D drawings as a hierarchical tree structure, reflecting how spatial animation data is organized in tools like Blender's Grease Pencil:

- **`Latk`**: The root object representing the entire drawing/animation. It manages a collection of `LatkLayer` instances and provides high-level I/O and geometry processing functions.
- **`LatkLayer`**: Represents an individual layer, allowing separation of different drawing elements. Contains a sequence of `LatkFrame` instances.
- **`LatkFrame`**: Represents a single frame of animation in a timeline sequence. Contains a list of `LatkStroke` instances.
- **`LatkStroke`**: Represents a continuous drawn line in 3D space. Contains a list of `LatkPoint` instances as well as styling properties like stroke color and fill color.
- **`LatkPoint`**: The fundamental vertex unit. Contains a 3D coordinate array (`co`), `pressure`, `strength`, and a localized `vertex_color`.

## I/O and Format Support

The library is capable of loading multiple spatial drawing formats asynchronously:

- **LATK Format (`Latk.read()`)**: Supports reading raw `.json` files or `.latk` zipped archives. It uses the bundled `JSZip` library to decompress archives and parses the Grease Pencil-style JSON schema into the core data model.
- **Tilt Brush (`Latk.readTiltBrush()`)**: Uses `TiltLoader` to parse `.sketch` ZIP archives, decoding the `data.sketch` binary payload to extract stroke data and brush colors.
- **Quill (`Latk.readQuill()`)**: Uses `QuillLoader` to parse Quill project ZIP archives, decoding the `Quill.qbin` binary file and the corresponding `Quill.json` metadata.
- **Exporting (`Latk.write()`)**: Serializes the internal object model back into the LATK JSON schema and triggers a browser download.

## Processing Utilities

The `Latk` class provides several built-in utilities to clean and modify the stroke geometry after it has been loaded:

- **Simplification & Cleaning**: `clean(epsilon)` uses the Ramer-Douglas-Peucker (RDP) algorithm to simplify strokes. `filter()` removes extremely short strokes or duplicate points.
- **Refinement**: `refine()`, `smoothStroke()`, `splitStroke()`, and `reduceStroke()` allow for iterative smoothing and interpolation of drawn lines to improve visual quality.
- **Transformation**: `normalize()` scales the entire drawing to fit within a specified unit range, ensuring consistency across different drawing apps.

## Dependencies

- **JSZip / JSZipUtils**: Bundled with the source code, used for reading and decompressing ZIP-based formats (`.latk`, `.sketch`, Oculus Quill archives).
- **UglifyJS**: Used strictly as a build tool dependency for minifying the final bundled library.
