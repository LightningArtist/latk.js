
class LatkLayer {

    constructor(name) {
        if (name === undefined) name = "layer";
        this.frames = [] // LatkFrame;
        this.name = name;
        this.parent = undefined;
    }

    getInfo(self) {
        return this.name.split(".")[0];
    }

}

