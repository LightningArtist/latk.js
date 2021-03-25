
// ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ;

class Latk {

    constructor(init, coords, color) { // args string, Latk array, float tuple array, float tuple 
        this.layers = []; // LatkLayer
        this.frame_rate = 12;
        this.clearExisting = true;
        this.yUp = true;
        this.useScaleAndOffset = false;
        this.globalScale = [ 100,100,100 ];
        this.globalOffset = [ 0,0,0 ];
        this.ready = false;

        if (init === true) {
            this.layers.push(new LatkLayer());
            this.layers[0].frames.push(new LatkFrame());
            if (coords !== undefined) { // 
                let stroke = new LatkStroke();
                stroke.setCoords(coords);
                if (color !== undefined) stroke.color = color;
                this.layers[0].frames[0].strokes.push(stroke);
            }
            this.ready = true;
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
                    latk.layers = Latk.jsonToGp(JSON.parse(xobj.responseText));
                    console.log("Latk loaded from json.");
                    latk.ready = true;
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
                            latk.layers = Latk.jsonToGp(JSON.parse(response));
                            console.log("Latk loaded from zip.");
                            latk.ready = true;
                        });
                });
            });
        }

        return latk;
    }

    readJson(data) {
        this.layers = Latk.jsonToGp(data);
        console.log("Latk loaded from json.");
        this.ready = true;
    }

    readBase64(data) {
        // TODO
    }

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
                            
                            color = [ r,g,b,a ];
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

                            fill_color = [ r,g,b,a ];
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
                            let vertex_color = [ 0,0,0,1 ];

                            try {
                                pressure = jsonPoint["pressure"];
                                if (isNaN(pressure) === true) pressure = 1;
                            } catch (e) { }
                            try {
                                strength = jsonPoint["strength"];
                                if (isNaN(strength) === true) strength = 1;
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

        Latk.download("saved_" + Date.now() + ".json", s.join("\n"));
    }

    clean(epsilon) {
        if (epsilon === undefined) epsilon = 0.01;
        for (let layer of this.layers) {
            for (let frame of layer.frames) {
                for (let stroke of frame.strokes) {
                    coords = [];
                    pressures = [];
                    strengths = [];
                    for (let point of stroke.points) {
                        coords.push(point.co);
                        pressures.push(point.pressure);
                        strengths.push(point.strength);
                    }
                    stroke.setCoords(rdp(coords, epsilon=epsilon));
                    for (let i=0; i<stroke.points.length; i++) {
                        let index = this.remapInt(i, 0, stroke.points.length, 0, pressures.length);
                        stroke.points[i].pressure = pressures[index];
                        stroke.points[i].strength = strengths[index];
                    }
                }
            }
        }
    }

    filter(cleanMinPoints, cleanMinLength) {
        if (cleanMinPoints === undefined || cleanMinPoints < 2) cleanMinPoints = 2;
        if (cleanMinLength === undefined) cleanMinLength = 0.1;
        
        for (let layer of this.layers) {
            for (let frame of layer.frames) {
                for (let stroke of frame.strokes) {
                    // 1. Remove the stroke if it has too few points.;
                    if (stroke.points.length < cleanMinPoints) {
                        try {
                            frame.strokes.remove(stroke);
                        } catch (e) { }
                    } else {
                        totalLength = 0.0;
                        for (let i=1; i<stroke.points.length; i++) {
                            p1 = stroke.points[i] // float tuple;
                            p2 = stroke.points[i-1] // float tuple;
                            // 2. Remove the point if it's a duplicate.;
                            if (this.hitDetect3D(p1.co, p2.co, 0.1)) {
                                try {
                                    stroke.points.remove(stroke);
                                } catch (e) { }
                            } else {
                                totalLength += this.getDistance(p1.co, p2.co);
                            }
                        }
                        // 3. Remove the stroke if its length is too small.;
                        if (totalLength < cleanMinLength) {
                            try {
                                frame.strokes.remove(stroke);
                            } catch (e) { }
                        } else {
                            // 4. Finally, check the number of points again.;
                            if (stroke.points.length < cleanMinPoints) {
                                try {
                                    frame.strokes.remove(stroke);
                                } catch (e) { }
                            }
                        }
                    }
                }
            }
        }
    }

    normalize(minVal, maxVal) {
        if (minVal === undefined) minVal = 0;
        if (maxVal === undefined) maxVal = 1;

        let allX = [];
        let allY = [];
        let allZ = [];

        for (let layer of this.layers) {
            for (let frame of layer.frames) {
                for (let stroke of frame.strokes) {
                    for (let point of stroke.points) {
                        let coord = point.co;
                        allX.push(coord[0]);
                        allY.push(coord[1]);
                        allZ.push(coord[2]);
                    }
                }
            }
        }

        allX.sort();
        allY.sort();
        allZ.sort();
        // ~
        let leastValArray = [ allX[0], allY[0], allZ[0] ];
        let mostValArray = [ allX[len(allX)-1], allY[len(allY)-1], allZ[len(allZ)-1] ];
        leastValArray.sort();
        mostValArray.sort();
        
        let leastVal = leastValArray[0];
        let mostVal = mostValArray[2];
        let valRange = mostVal - leastVal;
        // ~
        let xRange = (allX[len(allX)-1] - allX[0]) / valRange;
        let yRange = (allY[len(allY)-1] - allY[0]) / valRange;
        let zRange = (allZ[len(allZ)-1] - allZ[0]) / valRange;
        // ~
        let minValX = minVal * xRange;
        let minValY = minVal * yRange;
        let minValZ = minVal * zRange;
        let maxValX = maxVal * xRange;
        let maxValY = maxVal * yRange;
        let maxValZ = maxVal * zRange;
        // ~
        for (let layer of this.layers) {
            for (let frame of layer.frames) {
                for (let stroke of frame.strokes) {
                    for (let point of stroke.points) {
                        coord = point.co;
                        x = this.remap(coord[0], allX[0], allX[len(allX)-1], minValX, maxValX);
                        y = this.remap(coord[1], allY[0], allY[len(allY)-1], minValY, maxValY);
                        z = this.remap(coord[2], allZ[0], allZ[len(allZ)-1], minValZ, maxValZ);
                        point.co = (x,y,z);
                    }
                }
            }
        }
    }

    smoothStroke(stroke) {
        let points = stroke.points;
        // ~
        let weight = 18;
        let scale = 1.0 / (weight + 2);
        let lower = 0;
        let upper = 0;
        let center = 0;
        // ~
        for (let i=1; i<points.length - 2; i++) {
            lower = points[i-1].co;
            center = points[i].co;
            upper = points[i+1].co;
            // ~
            let x = (lower[0] + weight * center[0] + upper[0]) * scale;
            let y = (lower[1] + weight * center[1] + upper[1]) * scale;
            let z = (lower[2] + weight * center[2] + upper[2]) * scale;
            stroke.points[i].co =  [ x, y, z ];
        }
    }

    splitStroke(stroke) {
        let points = stroke.points;
        // ~
        for (let i=1; i<points.length; i+=2) {
            let center = [ points[i].co[0], points[i].co[1], points[i].co[2] ];
            let lower = [ points[i-1].co[0], points[i-1].co[1], points[i-1].co[2] ];
            let x = (center[0] + lower[0]) / 2;
            let y = (center[1] + lower[1]) / 2;
            let z = (center[2] + lower[2]) / 2;
            let p = [ x, y, z ];
            // ~
            pressure = (points[i-1].pressure + points[i].pressure) / 2;
            strength = (points[i-1].strength + points[i].strength) / 2;
            // ~
            let pt = new LatkPoint(p, pressure, strength);
            stroke.points.insert(i, pt);
        }
    }

    reduceStroke(stroke) {
        for (let i=0; i<stroke.points.length; i += 2) {
            stroke.points.remove(stroke.points[i]);
        }
    }

    refine(splitReps, smoothReps, reduceReps, doClean) {
        if (splitReps === undefined) splitReps = 2;
        if (smoothReps === undefined) smoothReps = 10;
        if (reduceReps === undefined) reduceReps = 0;
        if (doClean === undefined) doClean = true;

        if (doClean === true) this.clean();

        if (smoothReps < splitReps) smoothReps = splitReps;

        for (let layer of this.layers) {
            for (let frame of layer.frames) {
                for (let stroke of frame.strokes) {
                    let points = stroke.points;
                    // ~
                    for (let i=0; i<splitReps; i++) { 
                        this.splitStroke(stroke);
                        this.smoothStroke(stroke);
                    }
                    // ~
                    for (let i=0; i<smoothReps - splitReps; i++) { 
                        this.smoothStroke(stroke);
                    }
                    // ~
                    for (let i=0; i<reduceReps; i++) { 
                        this.reduceStroke(stroke);
                    }
                }
            }
        }
    }

    setStroke(stroke) {
        let lastLayer = this.layers[len(this.layers)-1];
        let lastFrame = lastLayer.frames[len(lastLayer.frames)-1];
        lastFrame.strokes.push(stroke);
    }

    setPoints(points, color) {
        if (color === undefined) color = (0,0,0,1);

        let lastLayer = this.layers[len(this.layers)-1];
        let lastFrame = lastLayer.frames[len(lastLayer.frames)-1];
        let stroke = new LatkStroke();
        stroke.points = points;
        stroke.color = color;
        lastFrame.strokes.push(stroke);
    }
    
    setCoords(coords, color) {
        if (color === undefined) color = (0,0,0,1);

        let lastLayer = this.layers[this.layers.length-1];
        let lastFrame = lastLayer.frames[lastLayer.frames.length-1];
        let stroke = new LatkStroke();
        stroke.setCoords(coords);
        stroke.color = color;
        lastFrame.strokes.push(stroke);
    }

    getDistance(v1, v2) {
        return sqrt((v1[0] - v2[0])**2 + (v1[1] - v2[1])**2 + (v1[2] - v2[2])**2);
    }

    hitDetect3D(p1, p2, hitbox) {
        if (hitbox === undefined) hitbox=0.01;
        if (this.getDistance(p1, p2) <= hitbox) {
            return true;
        } else {
            return false;
        }
    }
             ;
    roundVal(a, b) {
        let formatter = "{0:." + str(b) + "f}";
        return formatter.format(a);
    }

    roundValInt(a) {
        let formatter = "{0:." + str(0) + "f}";
        return parseInt(formatter.format(a));
    }

    remap(value, min1, max1, min2, max2) {
        let range1 = max1 - min1;
        let range2 = max2 - min2;
        let valueScaled = (value - min1) / range1;
        return min2 + (valueScaled * range2);
    }

    remapInt(value, min1, max1, min2, max2) {
        return parseInt(this.remap(value, min1, max1, min2, max2));
    }

    getLastLayer() {
        return this.layers[this.layers.length-1];
    }

    getLoopFrame(_frame) {
        return this.getLongestLayer().loopCounter * (this.getLongestLayer().frames.length - 1);
    }

    getLongestLayer() {
        let index = 0;
        for (let i=0; i<this.layers.length; i++) {
            if (this.layers[i].frames.length > index) index = i;
        }
        return this.layers[i];
    }

    /*
    writeTextFile(name="test.txt", lines=undefined) {
        file = open(name,"w") ;
        for line in lines:;
            file.write(line) ;
        file.close() ;
    }

    readTextFile(name="text.txt") {
        file = open(name, "r") ;
        return file.read() ;
    }
    */

}









/*
function jsonToGp(data) {
    for (let h=0; h<data.layers.length; h++) {
        // ~ ~ ~;
        let layer = new LatkLayer();
        if (data.layers[h].name !== null) {
            layer.name = data.layers[h].name;
        } else {
            layer.name = "WebXR Layer " + (h+1);
        }
        let frameCount = data.layers[h].frames.length;
        let strokeCount = 0;
        let pointCount = 0;
        for (let i=0; i<data.layers[h].frames.length; i++) {
            //strokeCount += data.layers[h].frames[i].strokes.length;
            for (let j=0; j<data.layers[h].frames[i].strokes.length; j++) {
                //pointCount += data.layers[h].frames[i].strokes[j].points.length;
            }
        }
        let firstPoint = "*";
        try {
            firstPoint = data.layers[h].frames[0].strokes[0].points[0].co[0] * 100;
        } catch (e) { }
        
        if (latkDebug) {
            console.log("***********************");
            console.log("~INPUT~");
            console.log("total frames: " + frameCount);
            console.log("total strokes: " + strokeCount);
            console.log("total points: " + pointCount);
            console.log("first point: " + firstPoint);
            console.log("***********************");
        }

        for (let i=0; i<data.layers[h].frames.length; i++) { // frame;
            layer.strokeX = [];
            layer.strokeY = [];
            layer.strokeZ = [];
            layer.strokeColors = [];
            for (let j=0; j<data.layers[h].frames[i].strokes.length; j++) { // stroke ;
                let bufferX = new ArrayBuffer(data.layers[h].frames[i].strokes[j].points.length * 4);
                let bufferY = new ArrayBuffer(data.layers[h].frames[i].strokes[j].points.length * 4);
                let bufferZ = new ArrayBuffer(data.layers[h].frames[i].strokes[j].points.length * 4);
                
                let bufferXf = new Float32Array(bufferX);
                let bufferYf = new Float32Array(bufferY);
                let bufferZf = new Float32Array(bufferZ);
                
                for (let l=0; l<data.layers[h].frames[i].strokes[j].points.length; l++) { // point;
                    let x = cleanCoord(data.layers[h].frames[i].strokes[j].points[l].co[0]);
                    let y = cleanCoord(data.layers[h].frames[i].strokes[j].points[l].co[1]);
                    let z = cleanCoord(data.layers[h].frames[i].strokes[j].points[l].co[2]);

                    bufferXf[l] = (x * laScale) + laOffset.x;
                    bufferYf[l] = (y * laScale) + laOffset.y;
                    bufferZf[l] = (z * laScale) + laOffset.z;
                }

                layer.strokeX.push(bufferXf);
                layer.strokeY.push(bufferYf);
                layer.strokeZ.push(bufferZf);
                let newColor = defaultColor;
                try {
                    newColor = data.layers[h].frames[i].strokes[j].color;
                } catch (e) { }
                layer.strokeColors.push(newColor);
            }

            layer.frameX.push(layer.strokeX);
            layer.frameY.push(layer.strokeY);
            layer.frameZ.push(layer.strokeZ);
            layer.frameColors.push(layer.strokeColors);
        }

        if (latkDebug) console.log("* * * color check: " + layer.frameX.length + " " + layer.frameColors.length + " " + layer.frameX[0].length + " " + layer.frameColors[0].length);

        layer.frames = [];

        let oldStrokes = [];

        //special_mtl = createMtl(defaultColor, defaultOpacity, defaultLineWidth/1.5);
        //server_mtl = createMtl(serverColor, defaultOpacity, defaultLineWidth/1.5);

        for (let i=0; i<layer.frameX.length; i++) {
            let strokes = [];
            for (let j=0; j<layer.frameX[i].length; j++) {
                let geometry = new THREE.Geometry();
                geometry.dynamic = true;

                let origVerts = [];

                for (let l=0; l<layer.frameX[i][j].length; l++) {
                    origVerts.push(new THREE.Vector3(layer.frameX[i][j][l], layer.frameY[i][j][l], layer.frameZ[i][j][l]));

                    if (l === 0 || !useMinDistance || (useMinDistance && origVerts[l].distanceTo(origVerts[l-1]) > minDistance)) {
                        geometry.vertices.push(origVerts[l]);
                    }
                }

                geometry.verticesNeedUpdate = true;
                
                let line = new THREE.MeshLine();
                line.setGeometry(geometry);
                let meshLine = new THREE.Mesh(line.geometry, createUniqueMtl([layer.frameColors[i][j][0], layer.frameColors[i][j][1], layer.frameColors[i][j][2]]));
                //rotateAroundWorldAxis(meshLine, new THREE.Vector3(1,0,0), laRot.y * Math.PI/180); ;
                //rotateAroundWorldAxis(meshLine, new THREE.Vector3(0,1,0), laRot.x * Math.PI/180); ;
                strokes.push(meshLine);//line);
            }
            if (strokes.length !== 0) {
                oldStrokes = strokes;
                layer.frames.push(strokes);
            } else if (strokes.length === 0 && oldStrokes) {
                layer.frames.push(oldStrokes);
            }            
        }
        // ~ ~ ~;
        layers.push(layer);
    }
}

function writeJson() {
    let frameCount = layers[getLongestLayer()].frames.length;
    let strokeCount = 0;
    let pointCount = 0;
    // http://stackoverflow.com/questions/35370483/geometries-on-vertex-of-buffergeometry-in-three-js;
    let firstPoint = layers[getLongestLayer()].frames[0][0].geometry.attributes.position.array[0];
    for (let h=0; h<layers.length; h++) {
        for (let i=0; i<layers[h].frames.length; i++) {
            strokeCount += layers[h].frames[i].length;
            for (let j=0; j<layers[h].frames[i].length; j++) {
                for (let l=0; l<layers[h].frames[i][j].geometry.attributes.position.array.length; l += 6) {//l += 2) {
                    pointCount++;
                }
            }
        }
    }

    if (latkDebug) {
        console.log("***********************");
        console.log("~OUTPUT~");
        console.log("total frames: " + frameCount);
        console.log("total strokes: " + strokeCount);
        console.log("total points: " + pointCount);
        console.log("first point: " + firstPoint);
        console.log("***********************");
    }

    //let useScaleAndOffset = true;
    //let globalScale = new THREE.Vector3(0.01, 0.01, 0.01);
    //let globalOffset = new THREE.Vector3(0, 0, 0);

    let sg = [];
    sg.push("{");
    sg.push("\t\"creator\": \"webvr\",");
    sg.push("\t\"grease_pencil\": [");
    sg.push("\t\t{");
    sg.push("\t\t\t\"layers\": [");
    let sl = [];
    for (let f=0; f<layers.length; f++) {// gp.layers.length, f++) { ;
        let sb = [];
        let layer = layers[f]; //gp.layers[f] ;
        for (let h=0; h<layer.frames.length; h++) { //layer.frames.length, h++) { ;
            let currentFrame = h;
            sb.push("\t\t\t\t\t\t{"); // one frame;
            sb.push("\t\t\t\t\t\t\t\"strokes\": [");
            if (layer.frames[currentFrame].length > 0) {
                sb.push("\t\t\t\t\t\t\t\t{"); // one stroke;
            } else {
                sb.push("\t\t\t\t\t\t\t]"); // no strokes;
            }
            for (let i=0; i<layer.frames[currentFrame].length; i++) { //layer.frames[currentFrame].strokes.length) { ;
                let color = defaultColor;
                try {
                   //color = frames[currentFrame].strokes[i].color.color; //layer.frames[currentFrame].strokes[i].color.color ;
                   color = [layer.frameColors[currentFrame][i][0], layer.frameColors[currentFrame][i][1], layer.frameColors[currentFrame][i][2]];
                } catch (e) {
                    //;
                }
                sb.push("\t\t\t\t\t\t\t\t\t\"color\": [" + color[0] + ", " + color[1] + ", " + color[2]+ "],");
                sb.push("\t\t\t\t\t\t\t\t\t\"points\": [");
                for (let j=0; j<layer.frames[currentFrame][i].geometry.attributes.position.array.length; j += 6 ) { //layer.frames[currentFrame].strokes[i].points.length) { ;
                    let x = layer.frames[currentFrame][i].geometry.attributes.position.array[j];
                    let y = layer.frames[currentFrame][i].geometry.attributes.position.array[j+1];
                    let z = layer.frames[currentFrame][i].geometry.attributes.position.array[j+2];
                    let point = cleanPoint(x, y, z);
                    // ~
                    //let point = frames[currentFrame][i].geometry.attributes.position[j]; //layer.frames[currentFrame].strokes[i].points[j].co ;
                    if (useScaleAndOffset) {
                        point.x = (point.x * globalScale.x) + globalOffset.x;
                        point.y = (point.y * globalScale.y) + globalOffset.y;
                        point.z = (point.z * globalScale.z) + globalOffset.z;
                    }
                    // ~
                    if (roundValues) {
                        sb.push("\t\t\t\t\t\t\t\t\t\t{\"co\": [" + roundVal(point.x, numPlaces) + ", " + roundVal(point.y, numPlaces) + ", " + roundVal(point.z, numPlaces) + "]");
                    } else {
                        sb.push("\t\t\t\t\t\t\t\t\t\t{\"co\": [" + point.x + ", " + point.y + ", " + point.z + "]");                  ;
                    }
                    // ~
                    if (j >= layer.frames[currentFrame][i].geometry.attributes.position.array.length - 6) {  //layer.frames[currentFrame].strokes[i].points.length - 1) { ;
                        sb[sb.length-1] += "}";
                        sb.push("\t\t\t\t\t\t\t\t\t]");
                        if (i === layer.frames[currentFrame].length - 1) { //layer.frames[currentFrame].strokes.length - 1) { ;
                            sb.push("\t\t\t\t\t\t\t\t}"); // last stroke for this frame;
                        } else {
                            sb.push("\t\t\t\t\t\t\t\t},"); // end stroke;
                            sb.push("\t\t\t\t\t\t\t\t{"); // begin stroke;
                        }
                    } else {
                        sb[sb.length-1] += "},";
                    }
                }
                if (i === layer.frames[currentFrame].length - 1) { //layer.frames[currentFrame].strokes.length - 1) { ;
                    sb.push("\t\t\t\t\t\t\t]");
                }
            }
            if (h === layer.frames.length - 1) { //layer.frames.length - 1) { ;
                sb.push("\t\t\t\t\t\t}");
            } else {
                sb.push("\t\t\t\t\t\t},");
            }
        }
        // ~
        let sf = [];
        sf.push("\t\t\t\t{");
        sf.push("\t\t\t\t\t\"name\": \"" + layer.name + "\","); //layer.info + "\"," ;
        sf.push("\t\t\t\t\t\"frames\": [");
        sf.push(sb.join("\n"));
        sf.push("\t\t\t\t\t]");
        if (f === layers.length-1) { ;
            sf.push("\t\t\t\t}");
        } else {
            sf.push("\t\t\t\t},");
        }
        sl.push(sf.join("\n"));
        // ~
    }
    sg.push(sl.join("\n"));
    sg.push("\t\t\t]");
    sg.push("\t\t}");
    sg.push("\t]");
    sg.push("}");

    //let uriContent = "data:text/plain;charset=utf-8," + encodeURIComponent(sg.join("\n"));
    //pauseAnimation = false;
    //window.open(uriContent);
    download("saved_" + Date.now() + ".json", sg.join("\n"));
}

function cleanPoint(x, y, z) {
    return new THREE.Vector3(cleanCoord(x), cleanCoord(y), cleanCoord(z));
}

function cleanCoord(coord) {
    try {
        if (isNaN(coord) || coord.toString()[0] === 'N') {
            return 0.0;
        } else {
            return coord;
        }
    } catch (e) {
        return 0.0;
    }
}
*/
