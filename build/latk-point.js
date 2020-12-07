


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

