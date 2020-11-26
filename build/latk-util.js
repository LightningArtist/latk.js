class LatkUtil {

    static jsonToGp(data) {
    	let layers = [];

        for (let jsonGp of data["grease_pencil"]) {
            for (let jsonLayer of jsonGp["layers"]) {
                let layer = new LatkLayer(jsonLayer["name"]);

                for (let jsonFrame of jsonLayer["frames"]) {
                    let frame = new LatkFrame();
                    for (let jsonStroke of jsonFrame["strokes"]) {
                        let color = [ 0,0,0,1 ];
                        try {
                            let r = jsonStroke["color"][0];
                            let g = jsonStroke["color"][1];
                            let b = jsonStroke["color"][2];
                            let a = 1.0;
                            
                            try {
                                a = jsonStroke["color"][3];
                            } catch (e) { }
                            
                            color = (r,g,b,a);
                        } catch (e) { }

                        let fill_color = [ 0,0,0,0 ];
                        try {
                            let r = jsonStroke["fill_color"][0];
                            let g = jsonStroke["fill_color"][1];
                            let b = jsonStroke["fill_color"][2];
                            let a = 0.0;
                            try {
                                a = jsonStroke["fill_color"][3];
                            } catch (e) { }

                            fill_color = (r,g,b,a);
                        } catch (e) { }                              

                        let points = [];
                        for (let jsonPoint of jsonStroke["points"]) {
                            let x = jsonPoint["co"][0];
                            let y;
                            let z;
                            if (latk.yUp === false) {
                                y = jsonPoint["co"][2];
                                z = jsonPoint["co"][1];
                            } else {
                                y = jsonPoint["co"][1];
                                z = jsonPoint["co"][2];
                            }
                            // ~
                            if (latk.useScaleAndOffset === true) {
                                x = (x * globalScale[0]) + globalOffset[0];
                                y = (y * globalScale[1]) + globalOffset[1];
                                z = (z * globalScale[2]) + globalOffset[2];
                            }
                            //~                                                                                             ;
                            let pressure = 1;
                            let strength = 1;
                            let vertex_color = [ 0,0,0,0 ];

                            try {
                                pressure = jsonPoint["pressure"];
                                if (isNaN(pressure) === true) pressure = 1.0;
                            } catch (e) { }
                            try {
                                strength = jsonPoint["strength"];
                                if (isNaN(strength) === true) strength = 1.0;
                            } catch (e) { }
                            try {
                                vertex_color = jsonPoint["vertex_color"];
                                if (isNaN(vertex_color) === true) vertex_color = [ 0,0,0,1 ];
                            } catch (e) { }

                            points.push(new LatkPoint([ x,y,z ], pressure, strength, vertex_color));
                        }

                        let stroke = new LatkStroke(points, color, fill_color);
                        frame.strokes.push(stroke);
                    }
                    layer.frames.push(frame);
                }
                layers.push(layer);
            }
        }

        return layers;
    }

    static gpToJson(latk) {
        //
    }

    static download(strData, filename) {
        let link = document.createElement('a');
        if (typeof link.download === 'string') {
            document.body.appendChild(link); //Firefox requires the link to be in the body
            link.download = filename;
            link.href = strData;
            link.click();
            document.body.removeChild(link); //remove the link when done
        } else {
            location.replace(uri);
        }
    }

    static getFileNameNoExt(s) { // args string, return string;
        let returns = "";
        let temp = s.toString().split(".");
        if (temp.length > 1) {
            for (let i=0; i<temp.length-1; i++) {
                if (i > 0) returns += ".";
                returns += temp[i];
            }
        } else {
            return s;
        }
        return returns;
    }
        
    static getExtFromFileName(s) { // args string, returns string ;
        let returns = "";
        let temp = s.toString().split(".");
        returns = temp[temp.length-1];
        return returns;
    }

	static jsonContains(json, name) {
		let json_s = "" + json;
	    if (json_s.indexOf(name) > -1) {
	        return true;
	    } else{
	        return false;
	    }
	}

	static read(animationPath) {
        let latk = new Latk();

		if (animationPath.split(".")[animationPath.split(".").length-1] === "json") {
            let xobj = new XMLHttpRequest();
            xobj.overrideMimeType("application/json");
            xobj.open('GET', animationPath, true);
            xobj.onreadystatechange = function() {
                if (xobj.readyState == 4 && xobj.status == "200") {
                    // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
                    latk.layers = LatkUtil.jsonToGp(JSON.parse(xobj.responseText));
                }
            };
            xobj.send(null);  
	    } else {
	        JSZipUtils.getBinaryContent(animationPath, function(err, data) {
	            if (err) {
	                throw err; // or handle err
	            }

	            var zip = new JSZip();
	            zip.loadAsync(data).then(function () {
		                // https://github.com/Stuk/jszip/issues/375
		                var entries = Object.keys(zip.files).map(function (name) {
		                  return zip.files[name];
		                });

		                zip.file(entries[0].name).async("string").then(function(response) {
		                    latk.layers = LatkUtil.jsonToGp(JSON.parse(response));
		                });
	            });
	        });
	    }

	    return latk;
	}

    static write(filepath) { // defaults to Unity, Maya Y up;
        let FINAL_LAYER_LIST = []; // string array;

        for (let layer of this.layers) {
            let sb = [] // string array;
            let sbHeader = [] // string array;
            sbHeader.push("\t\t\t\t\t\"frames\": [");
            sb.push("\n".join(sbHeader));

            for (let [h, frame] of layer.frames) {
                let sbbHeader = [] // string array;
                sbbHeader.push("\t\t\t\t\t\t{");
                sbbHeader.push("\t\t\t\t\t\t\t\"strokes\": [");
                sb.push("\n".join(sbbHeader));
                
                for (let [i, stroke] of frame.strokes) {
                    let sbb = [] // string array;
                    sbb.push("\t\t\t\t\t\t\t\t{");
                    let color = [ 0,0,0,1 ];
                    let fill_color = [ 0,0,0,0 ];
                    
                    try {
                        color = stroke.color;
                        if (color.length < 4) color = [ color[0], color[1], color[2], 1 ];
                    } catch (e) { }

                    try {
                        fill_color = stroke.fill_color;
                        if (fill_color.length < 4) fill_color = [ fill_color[0], fill_color[1], fill_color[2], 0 ];
                    } catch (e) { }

                    sbb.push("\t\t\t\t\t\t\t\t\t\"color\": [" + color[0] + ", " + color[1] + ", " + color[2] + ", " + color[3] + "],");
                    sbb.push("\t\t\t\t\t\t\t\t\t\"fill_color\": [" + fill_color[0] + ", " + fill_color[1] + ", " + fill_color[2] + ", " + fill_color[3] + "],");

                    if (stroke.points.length > 0) {
                        sbb.push("\t\t\t\t\t\t\t\t\t\"points\": [");
                        for (let [j, point] of stroke.points) {
                            let x = point.co[0];
                            let y = undefined;
                            let z = undefined;
                            let r = point.vertex_color[0];
                            let g = point.vertex_color[1];
                            let b = point.vertex_color[2];
                            let a = point.vertex_color[3];
                            
                            if (yUp === true) {
                                y = point.co[2];
                                z = point.co[1];
                            } else {
                                y = point.co[1];
                                z = point.co[2];
                            }
                            // ~
                            if (useScaleAndOffset === true) {
                                x = (x * globalScale[0]) + globalOffset[0];
                                y = (y * globalScale[1]) + globalOffset[1];
                                z = (z * globalScale[2]) + globalOffset[2];
                            }
                            //~ ;
                            let pointStr = "\t\t\t\t\t\t\t\t\t\t{\"co\": [" + x + ", " + y + ", " + z + "], \"pressure\": " + point.pressure + ", \"strength\": " + point.strength + ", \"vertex_color\": [" + r + ", " + g + ", " + b + ", " + a + "]}";
                                          ;
                            if (j === stroke.points.length - 1) {
                                sbb.push(pointStr);
                                sbb.push("\t\t\t\t\t\t\t\t\t]");
                            } else {
                                pointStr += ",";
                                sbb.push(pointStr);
                            }
                        }
                    } else {
                        sbb.push("\t\t\t\t\t\t\t\t\t\"points\": []");
                    }
                    
                    if (i === frame.strokes.length - 1) {
                        sbb.push("\t\t\t\t\t\t\t\t}");
                    } else {
                        sbb.push("\t\t\t\t\t\t\t\t},");
                    }
                    
                    sb.push("\n".join(sbb));
                }

                let sbFooter = [];
                if (h === layer.frames.length - 1) {
                    sbFooter.push("\t\t\t\t\t\t\t]");
                    sbFooter.push("\t\t\t\t\t\t}");
                } else {
                    sbFooter.push("\t\t\t\t\t\t\t]");
                    sbFooter.push("\t\t\t\t\t\t},");
                }

                sb.push("\n".join(sbFooter));
            }

            FINAL_LAYER_LIST.push("\n".join(sb));
        }

        let s = [] // string;
        s.push("{");
        s.push("\t\"creator\": \"latk.js\",");
        s.push("\t\"version\": 2.8,");
        s.push("\t\"grease_pencil\": [");
        s.push("\t\t{");
        s.push("\t\t\t\"layers\": [");

        for (let [i, layer] of this.layers) {
            s.push("\t\t\t\t{");
            if (layer.name !== undefined && layer.name !== "") {
                s.push("\t\t\t\t\t\"name\": \"" + layer.name + "\",");
            } else {
                s.push("\t\t\t\t\t\"name\": \"layer" + str(i + 1) + "\",");
            }
            s.push(FINAL_LAYER_LIST[i]);

            s.push("\t\t\t\t\t]");
            if (i < len(this.layers) - 1) {
                s.push("\t\t\t\t},");
            } else {
                s.push("\t\t\t\t}");
                s.push("\t\t\t]") // end layers;
            }
        }
        s.push("\t\t}");
        s.push("\t]");
        s.push("}");
        
        //fileType = this.getExtFromFileName(filepath);
        /*
        if (zipped === true or fileType === "latk" or fileType === "zip") {
            filepathNoExt = this.getFileNameNoExt(filepath);
            imz = new InMemoryZip();
            imz.push(filepathNoExt + ".json", "\n".join(s));
            imz.writetofile(filepath)            ;
        } else {
            with open(filepath, "w") as f:
                f.write("\n".join(s));
                f.closed;
        }
        */

        this.download("saved_" + Date.now() + ".json", s.join("\n"));
    }

}

