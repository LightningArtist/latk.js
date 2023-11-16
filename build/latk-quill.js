
// ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~

// Adapted from SharpQuill by @JoanCharmant

class QuillLoader {

	constructor() {
		this.ready = false;
		this.json;
		this.bytes;
		this.strokes = [];
		this.numStrokes;
	}

	static read(url) {
        let ql = new QuillLoader();

            JSZipUtils.getBinaryContent(url, function(err, data) {
                if (err) {
                    throw err; // or handle err
                }

                let zip = new JSZip();
                zip.loadAsync(data).then(function () {
                    // https://github.com/Stuk/jszip/issues/375
                    let entries = Object.keys(zip.files).map(function (name) {
                      return zip.files[name];
                    });

					// A tilt zipfile should contain three items: thumbnail.png, data.sketch, metadata.json
                    zip.file("Quill.json").async("string").then(function(response) {
                        ql.json = JSON.parse(response);

	                    zip.file("Quill.qbin").async("arraybuffer").then(function(response) {
	                        ql.bytes = new Uint8Array(response);
	                        ql.parse();
	                        //console.log("read " + ql.bytes.length + " bytes");
	                        ql.ready = true;
	                    });
                    });
                });
            });     

	    return ql;
    }

	parse() {
		const data = new DataView(this.bytes.buffer);

		const children = this.json["Sequence"]["RootLayer"]["Implementation"]["Children"];

		for (let i=0; i < children.length; i++) {
  			const childNode = children[i];

			// skip the child node if it contains no drawings
			let drawingCount = 0;
			try {
				drawingCount = childNode["Implementation"]["Drawings"].length;
			} catch (e) { 
				continue;
			}

			for (let j=0; j < drawingCount; j++) {
				const drawingNode  = childNode["Implementation"]["Drawings"][j];

				const dataFileOffsetString = drawingNode["DataFileOffset"];

				const dataFileOffset = parseInt("0x" + dataFileOffsetString);

				const numNodeStrokes = data.getInt32(dataFileOffset, true);
				this.numStrokes += numNodeStrokes;

				let offset = dataFileOffset + 4;

				for (let k = 0; k < numNodeStrokes; k++) {
					offset += 36;
					
					const numVertices = data.getInt32(offset, true);

					const positions = [];
					const colors = [];
					const widths = [];

					offset += 4;

					for (let l = 0; l < numVertices; l++) {
						const x = data.getFloat32(offset + 0, true); // x
						const y = data.getFloat32(offset + 4, true); // y
						const z = data.getFloat32(offset + 8, true); // z
						positions.push([x, y, z]);

						offset += 36;

						const r = data.getFloat32(offset + 0, true) * 255; // r
						const g = data.getFloat32(offset + 4, true) * 255; // g
						const b = data.getFloat32(offset + 8, true) * 255; // b
						const a = data.getFloat32(offset + 12, true) * 255; // a
						colors.push([r, g, b, a]);

						offset += 16;

						widths.push(data.getFloat32(offset + 0, true));

						offset += 4;
					}
					
					const brushSize = widths[parseInt(widths.length/2)];
					const brushColor = colors[parseInt(colors.length/2)];
					const quillStroke = new QuillStroke(positions, brushSize, brushColor);
					this.strokes.push(quillStroke);
				}
			}
		}
	}

}


class QuillStroke {

	constructor(_positions, _brushSize, _brushColor) {
		this.positions = _positions;
		this.brushSize = _brushSize;
		this.brushColor = _brushColor;
	}

}
