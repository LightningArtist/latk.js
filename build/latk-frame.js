
class LatkFrame {

    constructor(frame_number) {
        if (frame_number === undefined) frame_number = 0;
        this.strokes = [] // LatkStroke;
        this.frame_number = frame_number;
        this.parent_location = [ 0,0,0 ];
    }

}
