class LatkPoint {

    constructor(co, pressure, strength, vertex_color) { // args float tuple, float, float;
        if (co === undefined) co = [ 0,0,0 ];
        if (pressure === undefined) pressure = 1;
        if (strength === undefined) strength = 1;
        if (vertex_color === undefined) vertex_color = [ 0,0,0,0 ];

        this.co = co;
        this.pressure = pressure;
        this.strength = strength;
        this.vertex_color = vertex_color;

        //console.log("New point: " + this.co);
    }

}


class LatkStroke {

    constructor(points, color, fill_color) {
        if (points === undefined) points = [];
        if (color === undefined) color = [ 0,0,0,1 ];
        if (fill_color === undefined) fill_color = [ 0,0,0,0 ];

        this.points = points;
        this.color = color;
        this.fill_color = fill_color;
        this.timestamp = new Date().getTime();
        //console.log("New stroke: " + this.points.length);
    }

    setCoords(coords) {
        this.points = [];
        for (let coord of coords) {
            this.points.push(new LatkPoint(coord));
        }
    }

    getCoords() {
        let returns = [];
        for (let point of this.points) {
            returns.push(point.co);
        }
        return returns;
    }

    getPressures() {
        let returns = [];
        for (let point of this.points) {
            returns.push(point.pressure);
        }
        return returns;
    }

    getStrengths() {
        let returns = [];
        for (let point of this.points) {
            returns.push(point.strength);
        }
        return returns;
    }

}


class LatkFrame {

    constructor(frame_number) {
        if (frame_number === undefined) frame_number = 0;
        this.strokes = [] // LatkStroke;
        this.frame_number = frame_number;
        this.parent_location = [ 0,0,0 ];

        console.log("New frame: " + frame_number);
    }

    getLastStroke() {
    	return this.strokes[this.strokes.length-1];
    }

}


class LatkLayer {

    constructor(name) {
        if (name === undefined) name = "layer";
        this.frames = [] // LatkFrame;
        this.name = name;
        this.parent = undefined;
        // for compatibility with old project;
        this.counter = 0;
        this.loopCounter = 0;
        this.previousFrame = 0;
        
        console.log("New layer: " + this.name);
    }

    getInfo(self) {
        return this.name.split(".")[0];
    }

    getPreviousFrame() {
        return this.frames[this.previousFrame];
    }

    getLastFrame() {
        return this.frames[this.frames.length-1];
    }

    getCurrentFrame() {
        return this.frames[this.counter];
    }

}


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

}
