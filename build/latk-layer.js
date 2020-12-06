
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

