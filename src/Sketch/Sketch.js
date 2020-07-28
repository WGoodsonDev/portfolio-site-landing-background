import Delaunator from "delaunator";
// https://mapbox.github.io/delaunator/

export default function sketch(p) {

    const numPoints = 25;

    const numColumns = 16;
    const numRows = 10;

    let gridX = 0;
    let gridY = 0;

    let gravityMag = 1;
    let mouseMass = 100;
    let pointMass = 1;

    let seedPoints = [];

    let cellColorSeeds = [];

    let noiseSeed = 0;
    let noiseIncrement = 0;
    const noiseMax = 50;

    function randomizeNoise() {
        noiseSeed = p.random(1);
        noiseIncrement = p.random(0.02, 0.05);
    }
    function incrementNoise() {
        noiseSeed += noiseIncrement;
        if(noiseSeed > noiseMax || noiseSeed < 0){
            noiseIncrement = -noiseIncrement;
        }
    }
    function newPoints() {
        seedPoints = [];
        gridX = p.width / numColumns;
        gridY = p.height / numRows;

        // Divide canvas into grid for initial point selection
        for(let i = -2; i < numRows + 2; i++){
            for(let j = -2; j < numColumns + 2; j++){
                const x = p.random(j * gridX, (j+1) * gridX);
                const y = p.random(i * gridY, (i+1) * gridY);
                seedPoints.push([x, y]);
            }
        }

        // Pure random initial point selection
        // for(let i = 0; i < numPoints; i++){
        //     const x = p.random(p.width);
        //     const y = p.random(p.height);
        //     seedPoints.push([x, y]);
        // }
    }


    function triangleOfEdge(e)  { return Math.floor(e / 3); }
    function nextHalfedge(e) { return (e % 3 === 2) ? e - 2 : e + 1; }
    function prevHalfedge(e) { return (e % 3 === 0) ? e + 2 : e - 1; }

    function forEachTriangleEdge(points, delaunay, callback) {
        for (let e = 0; e < delaunay.triangles.length; e++) {
            if (e > delaunay.halfedges[e]) {
                const a = points[delaunay.triangles[e]];
                const b = points[delaunay.triangles[nextHalfedge(e)]];
                callback(e, a, b);
            }
        }
    }

    function edgesOfTriangle(t) { return [3 * t, 3 * t + 1, 3 * t + 2]; }
    function pointsOfTriangle(delaunay, t) {
        return edgesOfTriangle(t).map(e => delaunay.triangles[e]);
    }
    function forEachTriangle(points, delaunay, callback) {
        for (let t = 0; t < delaunay.triangles.length / 3; t++) {
            callback(t, pointsOfTriangle(delaunay, t).map(p => points[p]));
        }
    }

    function triangleCenter(points, delaunay, t) {
        const vertices = pointsOfTriangle(delaunay, t).map(p => points[p]);
        return circumcenter(vertices[0], vertices[1], vertices[2]);
    }
    function circumcenter(a, b, c) {
        const ad = a[0] * a[0] + a[1] * a[1];
        const bd = b[0] * b[0] + b[1] * b[1];
        const cd = c[0] * c[0] + c[1] * c[1];
        const D = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
        return [
            1 / D * (ad * (b[1] - c[1]) + bd * (c[1] - a[1]) + cd * (a[1] - b[1])),
            1 / D * (ad * (c[0] - b[0]) + bd * (a[0] - c[0]) + cd * (b[0] - a[0])),
        ];
    }

    function forEachVoronoiEdge(points, delaunay, callback) {
        for (let e = 0; e < delaunay.triangles.length; e++) {
            if (e < delaunay.halfedges[e]) {
                const p = triangleCenter(points, delaunay, triangleOfEdge(e));
                const q = triangleCenter(points, delaunay, triangleOfEdge(delaunay.halfedges[e]));
                callback(e, p, q);
            }
        }
    }

    function edgesAroundPoint(delaunay, start) {
        const result = [];
        let incoming = start;
        do {
            result.push(incoming);
            const outgoing = nextHalfedge(incoming);
            incoming = delaunay.halfedges[outgoing];
        } while (incoming !== -1 && incoming !== start);
        return result;
    }

    function forEachVoronoiCell(points, delaunay, callback) {
        const seen = new Set();  // of point ids
        for (let e = 0; e < delaunay.triangles.length; e++) {
            const triangle = delaunay.triangles[nextHalfedge(e)];
            if (!seen.has(triangle)) {
                seen.add(triangle);
                const edges = edgesAroundPoint(delaunay, e);
                const triangles = edges.map(triangleOfEdge);
                const vertices = triangles.map(t => triangleCenter(points, delaunay, t));
                const seed = 100;
                const hue = p.map(seed, 0, 100, 90, 180);
                callback(triangle, vertices, hue);

            }
        }
    }

    const drawHalfLines = (e,a,b) => {

        p.line(a[0], a[1], b[0], b[1])
    };
    const drawTriangle = (t, pts) => {
        p.noFill();
        p.beginShape();
        pts.forEach(pt => {
            p.vertex(pt[0], pt[1]);
        });
        p.endShape();
    };
    const drawCircumcenter = (t, pts) => {
        const circCenter = circumcenter(...pts);
        p.fill('black');
        p.circle(circCenter[0], circCenter[1], 4);
    };

    const drawVCells = (pt, verts, hue) => {
        p.noFill();
        p.stroke('black');
        p.beginShape();
        verts.forEach(vert => {
            p.vertex(vert[0], vert[1]);
        });
        p.endShape();
    };

    p.setup = () => {
        p.createCanvas(1600, 800);
        newPoints();
        randomizeNoise();
        for(let i = 0; i < seedPoints.length * 2; i++){
            cellColorSeeds.push(p.random(100));
        }
    }

    p.draw = () => {
        p.background(180);

        seedPoints = seedPoints.map(point => {
            const ptVector = p.createVector(point[0], point[1]);
            const mouseVector = p.createVector(p.mouseX, p.mouseY);
            const mouseToPointDirection = mouseVector.sub(ptVector).normalize();

            const dist = mouseVector.dist(ptVector);
            const mappedDist = p.map(dist, 0, p.width / 2, 0, 1);
            // let gravForce = mouseToPoint.div(Math.pow(dist, 1));
            // let gravForce = mouseToPoint.normalize().div(8);
            // let pushForce = mouseToPointDirection.mult(gravityMag / (mappedDist));
            let pushForce = p.createVector(0, 0);

            const dx = pushForce.x;
            const dy = pushForce.y;

            return [point[0] + dx, point[1] + dy];
        });



        const delaunay = Delaunator.from(seedPoints);

        p.stroke('white');
        forEachTriangleEdge(seedPoints, delaunay, drawHalfLines);
        // forEachTriangle(seedPoints, delaunay, drawTriangle);
        p.stroke('black');
        // forEachTriangle(seedPoints, delaunay, drawCircumcenter);
        forEachVoronoiEdge(seedPoints, delaunay, drawHalfLines);
        // forEachVoronoiCell(seedPoints, delaunay, drawVCells);

        seedPoints.forEach(point => {
            const ptVector = p.createVector(point[0], point[1]);
            const mouseVector = p.createVector(p.mouseX, p.mouseY);
            const dist = ptVector.dist(mouseVector);
            const hue = p.map(dist, 0, 180, 0, 120);
            p.stroke(hue);
            if(dist < 180){
                p.line(ptVector.x, ptVector.y, mouseVector.x, mouseVector.y);
            }

        });

        p.fill('black');
        p.textSize(24);
        // p.text('Noise seed: ' + noiseSeed.toString(), 10, 30);
        // p.text('Noise value: ' + p.noise(noiseSeed), 10, 50);

        incrementNoise();

    }

    p.mouseClicked = () => {
        newPoints();
        randomizeNoise();

    }




}

