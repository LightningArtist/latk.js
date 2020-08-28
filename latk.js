"use strict";

function jsonToGp(data) {
    for (var h=0; h<data.layers.length; h++) {
        // ~ ~ ~
        var layer = new LatkLayer();
        if (data.layers[h].name != null) {
            layer.name = data.layers[h].name;
        } else {
            layer.name = "WebVR Layer " + (h+1);
        }
        var frameCount = data.layers[h].frames.length;
        var strokeCount = 0;
        var pointCount = 0;
        for (var i=0; i<data.layers[h].frames.length; i++) {
            //strokeCount += data.layers[h].frames[i].strokes.length;
            for (var j=0; j<data.layers[h].frames[i].strokes.length; j++) {
                //pointCount += data.layers[h].frames[i].strokes[j].points.length;
            }
        }
        var firstPoint = "*";
        try {
            firstPoint = data.layers[h].frames[0].strokes[0].points[0].co[0] * 100;
        } catch (e) { }
        
        if (latkDebug) {
            console.log("***********************");
            console.log("~INPUT~")
            console.log("total frames: " + frameCount);
            console.log("total strokes: " + strokeCount);
            console.log("total points: " + pointCount);
            console.log("first point: " + firstPoint);
            console.log("***********************");
        }

        for (var i=0; i<data.layers[h].frames.length; i++) { // frame
            layer.strokeX = [];
            layer.strokeY = [];
            layer.strokeZ = [];
            layer.strokeColors = [];
            for (var j=0; j<data.layers[h].frames[i].strokes.length; j++) { // stroke 
                var bufferX = new ArrayBuffer(data.layers[h].frames[i].strokes[j].points.length * 4);
                var bufferY = new ArrayBuffer(data.layers[h].frames[i].strokes[j].points.length * 4);
                var bufferZ = new ArrayBuffer(data.layers[h].frames[i].strokes[j].points.length * 4);
                
                var bufferXf = new Float32Array(bufferX);
                var bufferYf = new Float32Array(bufferY);
                var bufferZf = new Float32Array(bufferZ);
                
                for (var l=0; l<data.layers[h].frames[i].strokes[j].points.length; l++) { // point
                    var x = cleanCoord(data.layers[h].frames[i].strokes[j].points[l].co[0]);
                    var y = cleanCoord(data.layers[h].frames[i].strokes[j].points[l].co[1]);
                    var z = cleanCoord(data.layers[h].frames[i].strokes[j].points[l].co[2]);

                    bufferXf[l] = (x * laScale) + laOffset.x;
                    bufferYf[l] = (y * laScale) + laOffset.y;
                    bufferZf[l] = (z * laScale) + laOffset.z;
                }

                layer.strokeX.push(bufferXf);
                layer.strokeY.push(bufferYf);
                layer.strokeZ.push(bufferZf);
                var newColor = defaultColor;
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

        var oldStrokes = [];

        texture = THREE.ImageUtils.loadTexture(brushPath);

        //special_mtl = createMtl(defaultColor, defaultOpacity, defaultLineWidth/1.5);
        //server_mtl = createMtl(serverColor, defaultOpacity, defaultLineWidth/1.5);

        for (var i=0; i<layer.frameX.length; i++) {
            var strokes = [];
            for (var j=0; j<layer.frameX[i].length; j++) {
                var geometry = new THREE.Geometry();
                geometry.dynamic = true;

                var origVerts = [];

                for (var l=0; l<layer.frameX[i][j].length; l++) {
                    origVerts.push(new THREE.Vector3(layer.frameX[i][j][l], layer.frameY[i][j][l], layer.frameZ[i][j][l]));

                    if (l === 0 || !useMinDistance || (useMinDistance && origVerts[l].distanceTo(origVerts[l-1]) > minDistance)) {
                        geometry.vertices.push(origVerts[l]);
                    }
                }

                geometry.verticesNeedUpdate = true;
                
                var line = new THREE.MeshLine();
                line.setGeometry(geometry);
                var meshLine = new THREE.Mesh(line.geometry, createUniqueMtl([layer.frameColors[i][j][0], layer.frameColors[i][j][1], layer.frameColors[i][j][2]]));
                //rotateAroundWorldAxis(meshLine, new THREE.Vector3(1,0,0), laRot.y * Math.PI/180); 
                //rotateAroundWorldAxis(meshLine, new THREE.Vector3(0,1,0), laRot.x * Math.PI/180); 
                strokes.push(meshLine);//line);
            }
            if (strokes.length !== 0) {
                oldStrokes = strokes;
                layer.frames.push(strokes);  
            } else if (strokes.length === 0 && oldStrokes) {
                layer.frames.push(oldStrokes);
            }            
        }
        // ~ ~ ~
        layers.push(layer);
    }

    if (useAudioSync) {
        Tone.Buffer.on("load", function(){
            player.loop = true;
            player.loopStart = 0;
            player.loopEnd = layers[getLongestLayer()].frames.length * frameInterval;
            player.sync();
            Tone.Transport.start();
            
            Tone.Transport.scheduleRepeat(function(time){
                    frameDelta = frameInterval;
            }, frameInterval);

            scheduleSubtitles();
        });
    }
        
    animate();
}

function writeJson() {
    var frameCount = layers[getLongestLayer()].frames.length;
    var strokeCount = 0;
    var pointCount = 0;
    // http://stackoverflow.com/questions/35370483/geometries-on-vertex-of-buffergeometry-in-three-js
    var firstPoint = layers[getLongestLayer()].frames[0][0].geometry.attributes.position.array[0];
    for (var h=0; h<layers.length; h++) {
        for (var i=0; i<layers[h].frames.length; i++) {
            strokeCount += layers[h].frames[i].length;
            for (var j=0; j<layers[h].frames[i].length; j++) {
                for (var l=0; l<layers[h].frames[i][j].geometry.attributes.position.array.length; l += 6) {//l += 2) {
                    pointCount++;
                }
            }
        }
    }

    if (latkDebug) {
        console.log("***********************");
        console.log("~OUTPUT~")
        console.log("total frames: " + frameCount);
        console.log("total strokes: " + strokeCount);
        console.log("total points: " + pointCount);
        console.log("first point: " + firstPoint);
        console.log("***********************");
    }

    //var useScaleAndOffset = true;
    //var globalScale = new THREE.Vector3(0.01, 0.01, 0.01);
    //var globalOffset = new THREE.Vector3(0, 0, 0);

    var sg = [];
    sg.push("{");
    sg.push("\t\"creator\": \"webvr\",");
    sg.push("\t\"grease_pencil\": [");
    sg.push("\t\t{");
    sg.push("\t\t\t\"layers\": [");
    var sl = [];
    for (var f=0; f<layers.length; f++) {// gp.layers.length, f++) { 
        var sb = [];
        var layer = layers[f]; //gp.layers[f] 
        for (var h=0; h<layer.frames.length; h++) { //layer.frames.length, h++) { 
            var currentFrame = h;
            sb.push("\t\t\t\t\t\t{"); // one frame
            sb.push("\t\t\t\t\t\t\t\"strokes\": [");
            if (layer.frames[currentFrame].length > 0) {
                sb.push("\t\t\t\t\t\t\t\t{"); // one stroke
            } else {
                sb.push("\t\t\t\t\t\t\t]"); // no strokes
            }
            for (var i=0; i<layer.frames[currentFrame].length; i++) { //layer.frames[currentFrame].strokes.length) { 
                var color = defaultColor;
                try {
                   //color = frames[currentFrame].strokes[i].color.color; //layer.frames[currentFrame].strokes[i].color.color 
                   color = [layer.frameColors[currentFrame][i][0], layer.frameColors[currentFrame][i][1], layer.frameColors[currentFrame][i][2]];
                } catch (e) {
                    //
                }
                sb.push("\t\t\t\t\t\t\t\t\t\"color\": [" + color[0] + ", " + color[1] + ", " + color[2]+ "],");
                sb.push("\t\t\t\t\t\t\t\t\t\"points\": [");
                for (var j=0; j<layer.frames[currentFrame][i].geometry.attributes.position.array.length; j += 6 ) { //layer.frames[currentFrame].strokes[i].points.length) { 
                    var x = layer.frames[currentFrame][i].geometry.attributes.position.array[j];
                    var y = layer.frames[currentFrame][i].geometry.attributes.position.array[j+1];
                    var z = layer.frames[currentFrame][i].geometry.attributes.position.array[j+2];
                    var point = cleanPoint(x, y, z);
                    //~
                    //var point = frames[currentFrame][i].geometry.attributes.position[j]; //layer.frames[currentFrame].strokes[i].points[j].co 
                    if (useScaleAndOffset) {
                        point.x = (point.x * globalScale.x) + globalOffset.x
                        point.y = (point.y * globalScale.y) + globalOffset.y
                        point.z = (point.z * globalScale.z) + globalOffset.z
                    }
                    //~
                    if (roundValues) {
                        sb.push("\t\t\t\t\t\t\t\t\t\t{\"co\": [" + roundVal(point.x, numPlaces) + ", " + roundVal(point.y, numPlaces) + ", " + roundVal(point.z, numPlaces) + "]");
                    } else {
                        sb.push("\t\t\t\t\t\t\t\t\t\t{\"co\": [" + point.x + ", " + point.y + ", " + point.z + "]");                  
                    }
                    //~
                    if (j >= layer.frames[currentFrame][i].geometry.attributes.position.array.length - 6) {  //layer.frames[currentFrame].strokes[i].points.length - 1) { 
                        sb[sb.length-1] += "}";
                        sb.push("\t\t\t\t\t\t\t\t\t]");
                        if (i == layer.frames[currentFrame].length - 1) { //layer.frames[currentFrame].strokes.length - 1) { 
                            sb.push("\t\t\t\t\t\t\t\t}"); // last stroke for this frame
                        } else {
                            sb.push("\t\t\t\t\t\t\t\t},"); // end stroke
                            sb.push("\t\t\t\t\t\t\t\t{"); // begin stroke
                        }
                    } else {
                        sb[sb.length-1] += "},";
                    }
                }
                if (i == layer.frames[currentFrame].length - 1) { //layer.frames[currentFrame].strokes.length - 1) { 
                    sb.push("\t\t\t\t\t\t\t]");
                }
            }
            if (h == layer.frames.length - 1) { //layer.frames.length - 1) { 
                sb.push("\t\t\t\t\t\t}");
            } else {
                sb.push("\t\t\t\t\t\t},");
            }
        }
        //~
        var sf = [];
        sf.push("\t\t\t\t{");
        sf.push("\t\t\t\t\t\"name\": \"" + layer.name + "\","); //layer.info + "\"," 
        sf.push("\t\t\t\t\t\"frames\": [");
        sf.push(sb.join("\n"));
        sf.push("\t\t\t\t\t]");
        if (f == layers.length-1) { 
            sf.push("\t\t\t\t}");
        } else {
            sf.push("\t\t\t\t},");
        }
        sl.push(sf.join("\n"));
        //~
    }
    sg.push(sl.join("\n"));
    sg.push("\t\t\t]");
    sg.push("\t\t}");
    sg.push("\t]");
    sg.push("}");

    //var uriContent = "data:text/plain;charset=utf-8," + encodeURIComponent(sg.join("\n"));
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

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

function loadJSON(filepath, callback) { 
    // https://codepen.io/KryptoniteDove/post/load-json-file-locally-using-pure-javascript  
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', filepath, true);
    xobj.onreadystatechange = function() {
        if (xobj.readyState == 4 && xobj.status == "200") {
            callback(xobj.responseText);
        }
    };
    xobj.send(null);  
}

/*
JSZipUtils.getBinaryContent(animationPath, function(err, data) {
    if (err) {
        throw err; // or handle err
    }

    var zip = new JSZip();
    zip.loadAsync(data).then(function () {
        var fileNameOrig = animationPath.split('\\').pop().split('/').pop();
        var fileName = fileNameOrig.split('.')[0] + ".json";
        zip.file(fileName).async("string").then(function(response) {
            jsonToGp(JSON.parse(response).grease_pencil[0]);
        });
    });
});
*/

class LatkLayer {
    constructor() {
        this.name = "";
        this.strokeX = [];
        this.strokeY = [];
        this.strokeZ = [];
        this.frameX = [];
        this.frameY = [];
        this.frameZ = [];
        this.strokeColors = [];
        this.frameColors = [];
        this.frames = [];
        this.counter = 0;
        this.loopCounter = 0;
        this.previousFrame = 0;
    }
}

class LatkFrame {
    constructor() {
        //
    }
}

class LatkStroke {
    constructor() {
        //
    }
}