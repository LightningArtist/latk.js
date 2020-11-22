
class LatkLayer {

    constructor(name) {
        if (name === undefined) name = "layer";
        this.frames = [] // LatkFrame;
        this.name = name;
        this.parent = undefined;

        console.log("New layer: " + this.name);
    }

    getInfo(self) {
        return this.name.split(".")[0];
    }

}

