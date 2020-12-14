
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

