"use strict";


class LatkPointThree extends LatkPoint {

    constructor(co, pressure, strength, vertex_color) { // args float tuple, float, float;
    	super(co, pressure, strength, vertex_color);
	}
	
}

class LatkStrokeThree extends LatkStroke {

    constructor(points, color, fill_color) {
    	super(points, color, fill_color);
	}
	
}

class LatkFrameThree extends LatkFrame {

    constructor(frame_number) {
    	super(frame_number);
	}
	
}

class LatkLayerThree extends LatkLayer {

    constructor(name) {
    	super(name);
	}
	
}

class LatkThree extends Latk {

    constructor(init, coords, color) { // args string, Latk array, float tuple array, float tuple 
    	super(init, coords, color);
	}

}