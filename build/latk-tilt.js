
// ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~

// Adapted from three.js TiltLoader.

class TiltLoader {

	constructor() {
		this.ready = false;
		this.json;
		this.bytes;
		this.strokes = [];
		this.numStrokes;
	}

	static read(url) {
        let tl = new TiltLoader();

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
                    zip.file("metadata.json").async("string").then(function(response) {
                        tl.json = JSON.parse(response);

	                    zip.file("data.sketch").async("arraybuffer").then(function(response) {
	                        tl.bytes = new Uint8Array(response);
	                        tl.parse();
	                        //console.log("read " + tl.bytes.length + " bytes");
	                        tl.ready = true;
	                    });
                    });
                });
            });     

	    return tl;
    }

	// https://docs.google.com/document/d/11ZsHozYn9FnWG7y3s3WAyKIACfbfwb4PbaS8cZ_xjvo/edit#
	parse() {
		const data = new DataView(this.bytes.buffer);

		this.numStrokes = data.getInt32(16, true);

		let offset = 20;

		for (let i = 0; i < this.numStrokes; i++) {
			const brushIndex = data.getInt32(offset, true);

			let r = data.getFloat32(offset + 4, true) * 255;
			let g = data.getFloat32(offset + 8, true) * 255;
			let b = data.getFloat32(offset + 12, true) * 255;
			let a = data.getFloat32(offset + 16, true) * 255;

			const brushColor = color(r, g, b, a);

			const brushSize = data.getFloat32(offset + 20, true);
			const strokeMask = data.getUint32(offset + 24, true);
			const controlPointMask = data.getUint32(offset + 28, true);

			let offsetStrokeMask = 0;
			let offsetControlPointMask = 0;

			for (let j = 0; j < 4; j++) {
				const byte = 1 << j;
				if ((strokeMask & byte) > 0) offsetStrokeMask += 4;
				if ((controlPointMask & byte) > 0) offsetControlPointMask += 4;
			}

			offset += 28 + offsetStrokeMask + 4; 

			const numControlPoints = data.getInt32(offset, true);

			let positions = []; //new Float32Array(numControlPoints * 3);
			//let quaternions = []; //new Float32Array(numControlPoints * 4);

			offset += 4;

			for (let j = 0; j < numControlPoints; j++) {
				let x = data.getFloat32(offset + 0, true);
				let y = data.getFloat32(offset + 4, true);
				let z = data.getFloat32(offset + 8, true);
				positions.push(createVector(x, y, z));

				//qw = data.getFloat32(offset + 12, true);
				//qx = data.getFloat32(offset + 16, true);
				//qy = data.getFloat32(offset + 20, true);
				//qz = data.getFloat32(offset + 24, true);

				offset += 28 + offsetControlPointMask; 
			}

			let tiltStroke = new TiltStroke(positions, brushSize, brushColor);
			this.strokes.push(tiltStroke);
		}
	}

}


class TiltStroke {

	constructor(_positions, _brushSize, _brushColor) {
		this.positions = _positions;
		this.brushSize = _brushSize;
		this.brushColor = _brushColor;
	}

}
