// sample input (a series of svg fill paths, followed by hole paths):
//
//<path fill="rgb(0,0,0)" stroke="rgb(0,0,0)" stroke-width="1" opacity="1" d="M 0 0 L 863 0 L 863 483 L 0 483 L 0 0 Z M 362 187 L 362 217 L 363 217 L 460 217 L 460 188 L 460 187 L 362 187 Z M 517 278 L 460 387 L 517 387 L 517 278 Z M 362 279 L 311 386 L 312 387 L 362 387 L 362 279 Z " />
//<path fill="rgb(254,0,0)" stroke="rgb(254,0,0)" stroke-width="1" opacity="1" d="M 361.5 280 L 362 387 L 311 386.5 L 361.5 280 Z " />
//<path fill="rgb(254,0,0)" stroke="rgb(254,0,0)" stroke-width="1" opacity="1" d="M 362 187 L 459.5 187 L 460 187.5 L 460 217 L 362.5 217 L 362 216.5 L 362 187 Z " />
//<path fill="rgb(254,0,0)" stroke="rgb(254,0,0)" stroke-width="1" opacity="1" d="M 516.5 279 L 517 387 L 461.5 387 L 461 385.5 L 516.5 279 Z " />
//
// in the above sample "0,0,0" is the fill color, "254,0,0" is the hole color

// sample output:

const { pathDataToPolys } = require('svg-path-to-polygons');


exports.handler = async function(event, context) {
    var fillColor='0,0,0';
    var holeColor='254,0,0';
    if (event.queryStringParameters &&
         event.queryStringParameters.fillColor) {
       fillColor = event.queryStringParameters.fillColor
    }
    if (event.queryStringParameters &&
         event.queryStringParameters.holeColor) {
       holeColor = event.queryStringParameters.holeColor
    }
    var tmp, points;

    if (event.httpMethod != "POST") {
      return ({ statusCode: 200, body: "POST method accepted only\n" });
    }


    var inputLines = event.body.split("\n");
 
    var pointsArray = [];
    var holesArray = [];


    var fillPathsCount = 0, holePathsCount=0;
    var tmpf = new RegExp("<path [^>]*=.rgb." + fillColor + ".*$", 'mg');
    var tmph = new RegExp("<path [^>]*=.rgb." + holeColor + ".*$", 'mg');
    for (var l=0; l<inputLines.length; l++){
       var points = [];
       var tmp;
       if ( (inputLines[l].search(tmpf) != (-1)) || 
            (inputLines[l].search(tmph) != (-1)) ) {
         if (inputLines[l].search(tmph) != (-1)){
           // a hole path starts here
           // holesArray stores indices of vertices
           holesArray.push(pointsArray.length/2); // 2 coordinates per vertex
           holePathsCount++;
         } else {
           fillPathsCount++;
         };
         // keep the path part only
         tmp = inputLines[l].replace(/<path [^>]*d="([^"]*)"[^>]*>/, "$1");
         points = pathDataToPolys( tmp, {tolerance:1, decimals:1});
         var data = earcut.flatten(points); 
         // produces  data = {"vertices":[...], "holes":[...], "dimensions": 2}
         // data.holes is incorrect, and will be ignored
         for (var c=0; c <= data.vertices.length; c++) {
            if (data.vertices[c]!=null)
              pointsArray.push(data.vertices[c]);
         }
       }
    }
    pointsCount = (data.vertices.length / 2);  // 2 coefficients per vertex


    if (1==1)
    return({
        statusCode: 200,
        body: ""
        + "// fill paths: " + fillPathsCount + "\n"
        + "// hole paths: " + holePathsCount + "\n"
        + "// points: " + JSON.stringify(pointsArray) + "\n"
        + "// holes: " + JSON.stringify(holesArray) + "\n"
    });


    var allSvgPaths=event.body
      .replace(/<path [^>]*d="([^"]*)"[^>]*>/mig, "$1")

    // find fillSvgPaths by deleting holeSvgPaths
    tmp = new RegExp("<path [^>]*=.rgb." + holeColor + ".*$", 'mg');
    var fillSvgPaths=event.body
      .replace(tmp, "")
      .replace(/<path [^>]*d="([^"]*)"[^>]*>/mig, "$1")
    points = pathDataToPolys( fillSvgPaths, {tolerance:1, decimals:1});
    // points is now an array of polygons (arrays of point pairs)
    var fillPointsCount =
      JSON.stringify(points)             // [ [[a,b],[c,d]], [[e,f],[g,h]] ...] 
      .replace(/[0-9\.],[[0-9\.]/g,"#")  // coordinates pairs
      .replace(/[^#]/g,"")               // count them
      .length


    // count fillSvgPaths
    // (convert every line matching fillColor to a # character, and count #'s)
    tmp = new RegExp("<path [^>]*=.rgb." + fillColor + ".*$", 'mg');
    var fillSvgPathsCount = event.body
      .replace(tmp, "#")
      .replace(/[^#]/gm, "")
      .length

    if (1==0)
    return({
        statusCode: 200,
        body: ""
        + "// allSvgPaths:\n"
        + allSvgPaths
        + "--------------\n"
        + "// fillSvgPathsCount:\n"
        + fillSvgPathsCount
        + "\n--------------\n"
        + "fillPointsCount: " + fillPointsCount + "\n"
        + "fillPoints:" + "\n"
        + JSON.stringify(points) + "\n"
    });


    //
    // convert svg paths to polygons
    //
    points = pathDataToPolys( allSvgPaths, {tolerance:1, decimals:1});
    // points is now an array of polygons (arrays of point pairs)
    // [ [[a,b],[c,d]], [[e,f],[g,h]] ...] 

    var vertexStr = "";
    var indexStr = "";
    var colorStr = "";

    var triangles = [];
    var trianglesCount = 0;
    var pointsCount = 0;

    var data = earcut.flatten(points); 
    // produces  data = {"vertices":[...], "holes":[...], "dimensions": 2}
    // data.holes is incorrect, and will be ignored
    pointsCount = (data.vertices.length / 2);  // 2 coefficients for each point

    if (pointsCount > 0 ){

      vertexStr = ""
        + JSON.stringify(data.vertices)
              // remove square brackets and quotes
              .replace(/["\[\]]/g, "")
              // append a comma
              .replace(/$/,",")
              // convert pairs of coefficients to quartet
              // ..., a,b, ...  -->  ..., a,b,0,1, ...
              .replace(/([^,]*,[^,]*,)/g, "$10,1, ")
        + "\n"
      ;


      // all points after the first fillPointsCount ones correspond to holes
      if (fillPointsCount > 0) holesArray.push(fillPointsCount);
      triangles = earcut(data.vertices, holesArray);

      if (triangles.length > 0 ){
        indexStr = ""
          + JSON.stringify(triangles)
                // remove square brackets
                .replace(/[\[\]]/g, "")
          + ",\n"
          ;
        trianglesCount = triangles.length;
      }

    }


   // 10 τυπικά χρώματα: κόκκινο πράσινο μπλε κίτρινο ιώδες γαλάζιο καφέ ροζ πορτοκαλί λευκό
   var colors = ["1.0,0.0,0.0,1", "0.0,1.0,0.0,1", "0.0,0.0,1.0,1", "1.0,1.0,0.0,1", "1.0,0.0,1.0,1", "0.0,1.0,1.0,1", "0.6,0.2,0.0", "1.0,0.8,1.0", "1.0,0.39,0.13", "1.0,1.0,1.0" ];
   for (var i=0; i<pointsCount;i++) colorStr += colors[i % colors.length]+",";

    return({
        statusCode: 200,
        body: ""
        + "// points.length: " + points.length + "\n"
        + "// points: " + pointsCount + "\n"
        + "// fill points: 0-" + String(fillPointsCount-1) + "\n"
        + "// hole points: " + String(fillPointsCount) + "-" + String(pointsCount-1) + "\n"
        + "// points: " + JSON.stringify(points) + "\n"
        + "// holes: " + JSON.stringify(holes) + "\n"
        + "// data: " + JSON.stringify(data) + "\n"
        + "// triangles: \n/*\n" +  printTriangles(triangles) + "*/\n"
        + "var vertexMatrix"
        + " = new Float32Array(["
        + "\n"
        + vertexStr
        + "]);\n"

        + "\n"

        + "// triangles: " + trianglesCount/3 + " (" + trianglesCount + " points)" + "\n"
        + "var indexMatrix"
        + " = new  Uint16Array(["
        + "\n"
        + indexStr
        + "]);\n"

        + "\n"
        + "// color points: " + pointsCount + "\n"
        + "var colorMatrix"
        + " = new Float32Array(["
        + colorStr
        + "\n"
        + vertexStr
        + "]);\n"


    });
}

function printTriangles(triangles){
  var t = "";
  for (var i=0; i<(triangles.length);i=i+3){
    t += "  "
         + triangles[i] + ","
         + triangles[i+1] + ","
         + triangles[i+2] + "\n"
  };
  return t;
}



// earcut.js -------------------------------------------------------
'use strict';
function earcut(data, holeIndices, dim) {

    dim = dim || 2;

    var hasHoles = holeIndices && holeIndices.length,
        outerLen = hasHoles ? holeIndices[0] * dim : data.length,
        outerNode = linkedList(data, 0, outerLen, dim, true),
        triangles = [];

    if (!outerNode || outerNode.next === outerNode.prev) return triangles;

    var minX, minY, maxX, maxY, x, y, invSize;

    if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);

    // if the shape is not too simple, we'll use z-order curve hash later; calculate polygon bbox
    if (data.length > 80 * dim) {
        minX = maxX = data[0];
        minY = maxY = data[1];

        for (var i = dim; i < outerLen; i += dim) {
            x = data[i];
            y = data[i + 1];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }

        // minX, minY and invSize are later used to transform coords into integers for z-order calculation
        invSize = Math.max(maxX - minX, maxY - minY);
        invSize = invSize !== 0 ? 1 / invSize : 0;
    }

    earcutLinked(outerNode, triangles, dim, minX, minY, invSize);

    return triangles;
}





// create a circular doubly linked list from polygon points in the specified winding order
function linkedList(data, start, end, dim, clockwise) {
    var i, last;

    if (clockwise === (signedArea(data, start, end, dim) > 0)) {
        for (i = start; i < end; i += dim) last = insertNode(i, data[i], data[i + 1], last);
    } else {
        for (i = end - dim; i >= start; i -= dim) last = insertNode(i, data[i], data[i + 1], last);
    }

    if (last && equals(last, last.next)) {
        removeNode(last);
        last = last.next;
    }

    return last;
}

// eliminate colinear or duplicate points
function filterPoints(start, end) {
    if (!start) return start;
    if (!end) end = start;

    var p = start,
        again;
    do {
        again = false;

        if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
            removeNode(p);
            p = end = p.prev;
            if (p === p.next) break;
            again = true;

        } else {
            p = p.next;
        }
    } while (again || p !== end);

    return end;
}

// main ear slicing loop which triangulates a polygon (given as a linked list)
function earcutLinked(ear, triangles, dim, minX, minY, invSize, pass) {
    if (!ear) return;

    // interlink polygon nodes in z-order
    if (!pass && invSize) indexCurve(ear, minX, minY, invSize);

    var stop = ear,
        prev, next;

    // iterate through ears, slicing them one by one
    while (ear.prev !== ear.next) {
        prev = ear.prev;
        next = ear.next;

        if (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {
            // cut off the triangle
            triangles.push(prev.i / dim);
            triangles.push(ear.i / dim);
            triangles.push(next.i / dim);

            removeNode(ear);

            // skipping the next vertex leads to less sliver triangles
            ear = next.next;
            stop = next.next;

            continue;
        }

        ear = next;

        // if we looped through the whole remaining polygon and can't find any more ears
        if (ear === stop) {
            // try filtering points and slicing again
            if (!pass) {
                earcutLinked(filterPoints(ear), triangles, dim, minX, minY, invSize, 1);

            // if this didn't work, try curing all small self-intersections locally
            } else if (pass === 1) {
                ear = cureLocalIntersections(filterPoints(ear), triangles, dim);
                earcutLinked(ear, triangles, dim, minX, minY, invSize, 2);

            // as a last resort, try splitting the remaining polygon into two
            } else if (pass === 2) {
                splitEarcut(ear, triangles, dim, minX, minY, invSize);
            }

            break;
        }
    }
}

// check whether a polygon node forms a valid ear with adjacent nodes
function isEar(ear) {
    var a = ear.prev,
        b = ear,
        c = ear.next;

    if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

    // now make sure we don't have other points inside the potential ear
    var p = ear.next.next;

    while (p !== ear.prev) {
        if (pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
            area(p.prev, p, p.next) >= 0) return false;
        p = p.next;
    }

    return true;
}

function isEarHashed(ear, minX, minY, invSize) {
    var a = ear.prev,
        b = ear,
        c = ear.next;

    if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

    // triangle bbox; min & max are calculated like this for speed
    var minTX = a.x < b.x ? (a.x < c.x ? a.x : c.x) : (b.x < c.x ? b.x : c.x),
        minTY = a.y < b.y ? (a.y < c.y ? a.y : c.y) : (b.y < c.y ? b.y : c.y),
        maxTX = a.x > b.x ? (a.x > c.x ? a.x : c.x) : (b.x > c.x ? b.x : c.x),
        maxTY = a.y > b.y ? (a.y > c.y ? a.y : c.y) : (b.y > c.y ? b.y : c.y);

    // z-order range for the current triangle bbox;
    var minZ = zOrder(minTX, minTY, minX, minY, invSize),
        maxZ = zOrder(maxTX, maxTY, minX, minY, invSize);

    var p = ear.prevZ,
        n = ear.nextZ;

    // look for points inside the triangle in both directions
    while (p && p.z >= minZ && n && n.z <= maxZ) {
        if (p !== ear.prev && p !== ear.next &&
            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
            area(p.prev, p, p.next) >= 0) return false;
        p = p.prevZ;

        if (n !== ear.prev && n !== ear.next &&
            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
            area(n.prev, n, n.next) >= 0) return false;
        n = n.nextZ;
    }

    // look for remaining points in decreasing z-order
    while (p && p.z >= minZ) {
        if (p !== ear.prev && p !== ear.next &&
            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
            area(p.prev, p, p.next) >= 0) return false;
        p = p.prevZ;
    }

    // look for remaining points in increasing z-order
    while (n && n.z <= maxZ) {
        if (n !== ear.prev && n !== ear.next &&
            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
            area(n.prev, n, n.next) >= 0) return false;
        n = n.nextZ;
    }

    return true;
}

// go through all polygon nodes and cure small local self-intersections
function cureLocalIntersections(start, triangles, dim) {
    var p = start;
    do {
        var a = p.prev,
            b = p.next.next;

        if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {

            triangles.push(a.i / dim);
            triangles.push(p.i / dim);
            triangles.push(b.i / dim);

            // remove two nodes involved
            removeNode(p);
            removeNode(p.next);

            p = start = b;
        }
        p = p.next;
    } while (p !== start);

    return filterPoints(p);
}

// try splitting polygon into two and triangulate them independently
function splitEarcut(start, triangles, dim, minX, minY, invSize) {
    // look for a valid diagonal that divides the polygon into two
    var a = start;
    do {
        var b = a.next.next;
        while (b !== a.prev) {
            if (a.i !== b.i && isValidDiagonal(a, b)) {
                // split the polygon in two by the diagonal
                var c = splitPolygon(a, b);

                // filter colinear points around the cuts
                a = filterPoints(a, a.next);
                c = filterPoints(c, c.next);

                // run earcut on each half
                earcutLinked(a, triangles, dim, minX, minY, invSize);
                earcutLinked(c, triangles, dim, minX, minY, invSize);
                return;
            }
            b = b.next;
        }
        a = a.next;
    } while (a !== start);
}

// link every hole into the outer loop, producing a single-ring polygon without holes
function eliminateHoles(data, holeIndices, outerNode, dim) {
    var queue = [],
        i, len, start, end, list;

    for (i = 0, len = holeIndices.length; i < len; i++) {
        start = holeIndices[i] * dim;
        end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
        list = linkedList(data, start, end, dim, false);
        if (list === list.next) list.steiner = true;
        queue.push(getLeftmost(list));
    }

    queue.sort(compareX);

    // process holes from left to right
    for (i = 0; i < queue.length; i++) {
        eliminateHole(queue[i], outerNode);
        outerNode = filterPoints(outerNode, outerNode.next);
    }

    return outerNode;
}

function compareX(a, b) {
    return a.x - b.x;
}

// find a bridge between vertices that connects hole with an outer ring and and link it
function eliminateHole(hole, outerNode) {
    outerNode = findHoleBridge(hole, outerNode);
    if (outerNode) {
        var b = splitPolygon(outerNode, hole);

        // filter collinear points around the cuts
        filterPoints(outerNode, outerNode.next);
        filterPoints(b, b.next);
    }
}

// David Eberly's algorithm for finding a bridge between hole and outer polygon
function findHoleBridge(hole, outerNode) {
    var p = outerNode,
        hx = hole.x,
        hy = hole.y,
        qx = -Infinity,
        m;

    // find a segment intersected by a ray from the hole's leftmost point to the left;
    // segment's endpoint with lesser x will be potential connection point
    do {
        if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
            var x = p.x + (hy - p.y) * (p.next.x - p.x) / (p.next.y - p.y);
            if (x <= hx && x > qx) {
                qx = x;
                if (x === hx) {
                    if (hy === p.y) return p;
                    if (hy === p.next.y) return p.next;
                }
                m = p.x < p.next.x ? p : p.next;
            }
        }
        p = p.next;
    } while (p !== outerNode);

    if (!m) return null;

    if (hx === qx) return m; // hole touches outer segment; pick leftmost endpoint

    // look for points inside the triangle of hole point, segment intersection and endpoint;
    // if there are no points found, we have a valid connection;
    // otherwise choose the point of the minimum angle with the ray as connection point

    var stop = m,
        mx = m.x,
        my = m.y,
        tanMin = Infinity,
        tan;

    p = m;

    do {
        if (hx >= p.x && p.x >= mx && hx !== p.x &&
                pointInTriangle(hy < my ? hx : qx, hy, mx, my, hy < my ? qx : hx, hy, p.x, p.y)) {

            tan = Math.abs(hy - p.y) / (hx - p.x); // tangential

            if (locallyInside(p, hole) &&
                (tan < tanMin || (tan === tanMin && (p.x > m.x || (p.x === m.x && sectorContainsSector(m, p)))))) {
                m = p;
                tanMin = tan;
            }
        }

        p = p.next;
    } while (p !== stop);

    return m;
}

// whether sector in vertex m contains sector in vertex p in the same coordinates
function sectorContainsSector(m, p) {
    return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
}

// interlink polygon nodes in z-order
function indexCurve(start, minX, minY, invSize) {
    var p = start;
    do {
        if (p.z === null) p.z = zOrder(p.x, p.y, minX, minY, invSize);
        p.prevZ = p.prev;
        p.nextZ = p.next;
        p = p.next;
    } while (p !== start);

    p.prevZ.nextZ = null;
    p.prevZ = null;

    sortLinked(p);
}

// Simon Tatham's linked list merge sort algorithm
// http://www.chiark.greenend.org.uk/~sgtatham/algorithms/listsort.html
function sortLinked(list) {
    var i, p, q, e, tail, numMerges, pSize, qSize,
        inSize = 1;

    do {
        p = list;
        list = null;
        tail = null;
        numMerges = 0;

        while (p) {
            numMerges++;
            q = p;
            pSize = 0;
            for (i = 0; i < inSize; i++) {
                pSize++;
                q = q.nextZ;
                if (!q) break;
            }
            qSize = inSize;

            while (pSize > 0 || (qSize > 0 && q)) {

                if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {
                    e = p;
                    p = p.nextZ;
                    pSize--;
                } else {
                    e = q;
                    q = q.nextZ;
                    qSize--;
                }

                if (tail) tail.nextZ = e;
                else list = e;

                e.prevZ = tail;
                tail = e;
            }

            p = q;
        }

        tail.nextZ = null;
        inSize *= 2;

    } while (numMerges > 1);

    return list;
}

// z-order of a point given coords and inverse of the longer side of data bbox
function zOrder(x, y, minX, minY, invSize) {
    // coords are transformed into non-negative 15-bit integer range
    x = 32767 * (x - minX) * invSize;
    y = 32767 * (y - minY) * invSize;

    x = (x | (x << 8)) & 0x00FF00FF;
    x = (x | (x << 4)) & 0x0F0F0F0F;
    x = (x | (x << 2)) & 0x33333333;
    x = (x | (x << 1)) & 0x55555555;

    y = (y | (y << 8)) & 0x00FF00FF;
    y = (y | (y << 4)) & 0x0F0F0F0F;
    y = (y | (y << 2)) & 0x33333333;
    y = (y | (y << 1)) & 0x55555555;

    return x | (y << 1);
}

// find the leftmost node of a polygon ring
function getLeftmost(start) {
    var p = start,
        leftmost = start;
    do {
        if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) leftmost = p;
        p = p.next;
    } while (p !== start);

    return leftmost;
}

// check if a point lies within a convex triangle
function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
    return (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
           (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
           (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0;
}

// check if a diagonal between two polygon nodes is valid (lies in polygon interior)
function isValidDiagonal(a, b) {
    return a.next.i !== b.i && a.prev.i !== b.i && !intersectsPolygon(a, b) && // dones't intersect other edges
           (locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b) && // locally visible
            (area(a.prev, a, b.prev) || area(a, b.prev, b)) || // does not create opposite-facing sectors
            equals(a, b) && area(a.prev, a, a.next) > 0 && area(b.prev, b, b.next) > 0); // special zero-length case
}

// signed area of a triangle
function area(p, q, r) {
    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

// check if two points are equal
function equals(p1, p2) {
    return p1.x === p2.x && p1.y === p2.y;
}

// check if two segments intersect
function intersects(p1, q1, p2, q2) {
    var o1 = sign(area(p1, q1, p2));
    var o2 = sign(area(p1, q1, q2));
    var o3 = sign(area(p2, q2, p1));
    var o4 = sign(area(p2, q2, q1));

    if (o1 !== o2 && o3 !== o4) return true; // general case

    if (o1 === 0 && onSegment(p1, p2, q1)) return true; // p1, q1 and p2 are collinear and p2 lies on p1q1
    if (o2 === 0 && onSegment(p1, q2, q1)) return true; // p1, q1 and q2 are collinear and q2 lies on p1q1
    if (o3 === 0 && onSegment(p2, p1, q2)) return true; // p2, q2 and p1 are collinear and p1 lies on p2q2
    if (o4 === 0 && onSegment(p2, q1, q2)) return true; // p2, q2 and q1 are collinear and q1 lies on p2q2

    return false;
}

// for collinear points p, q, r, check if point q lies on segment pr
function onSegment(p, q, r) {
    return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
}

function sign(num) {
    return num > 0 ? 1 : num < 0 ? -1 : 0;
}

// check if a polygon diagonal intersects any polygon segments
function intersectsPolygon(a, b) {
    var p = a;
    do {
        if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i &&
                intersects(p, p.next, a, b)) return true;
        p = p.next;
    } while (p !== a);

    return false;
}

// check if a polygon diagonal is locally inside the polygon
function locallyInside(a, b) {
    return area(a.prev, a, a.next) < 0 ?
        area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 :
        area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
}

// check if the middle point of a polygon diagonal is inside the polygon
function middleInside(a, b) {
    var p = a,
        inside = false,
        px = (a.x + b.x) / 2,
        py = (a.y + b.y) / 2;
    do {
        if (((p.y > py) !== (p.next.y > py)) && p.next.y !== p.y &&
                (px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x))
            inside = !inside;
        p = p.next;
    } while (p !== a);

    return inside;
}

// link two polygon vertices with a bridge; if the vertices belong to the same ring, it splits polygon into two;
// if one belongs to the outer ring and another to a hole, it merges it into a single ring
function splitPolygon(a, b) {
    var a2 = new Node(a.i, a.x, a.y),
        b2 = new Node(b.i, b.x, b.y),
        an = a.next,
        bp = b.prev;

    a.next = b;
    b.prev = a;

    a2.next = an;
    an.prev = a2;

    b2.next = a2;
    a2.prev = b2;

    bp.next = b2;
    b2.prev = bp;

    return b2;
}

// create a node and optionally link it with previous one (in a circular doubly linked list)
function insertNode(i, x, y, last) {
    var p = new Node(i, x, y);

    if (!last) {
        p.prev = p;
        p.next = p;

    } else {
        p.next = last.next;
        p.prev = last;
        last.next.prev = p;
        last.next = p;
    }
    return p;
}

function removeNode(p) {
    p.next.prev = p.prev;
    p.prev.next = p.next;

    if (p.prevZ) p.prevZ.nextZ = p.nextZ;
    if (p.nextZ) p.nextZ.prevZ = p.prevZ;
}

function Node(i, x, y) {
    // vertex index in coordinates array
    this.i = i;

    // vertex coordinates
    this.x = x;
    this.y = y;

    // previous and next vertex nodes in a polygon ring
    this.prev = null;
    this.next = null;

    // z-order curve value
    this.z = null;

    // previous and next nodes in z-order
    this.prevZ = null;
    this.nextZ = null;

    // indicates whether this is a steiner point
    this.steiner = false;
}

// return a percentage difference between the polygon area and its triangulation area;
// used to verify correctness of triangulation
earcut.deviation = function (data, holeIndices, dim, triangles) {
    var hasHoles = holeIndices && holeIndices.length;
    var outerLen = hasHoles ? holeIndices[0] * dim : data.length;

    var polygonArea = Math.abs(signedArea(data, 0, outerLen, dim));
    if (hasHoles) {
        for (var i = 0, len = holeIndices.length; i < len; i++) {
            var start = holeIndices[i] * dim;
            var end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
            polygonArea -= Math.abs(signedArea(data, start, end, dim));
        }
    }

    var trianglesArea = 0;
    for (i = 0; i < triangles.length; i += 3) {
        var a = triangles[i] * dim;
        var b = triangles[i + 1] * dim;
        var c = triangles[i + 2] * dim;
        trianglesArea += Math.abs(
            (data[a] - data[c]) * (data[b + 1] - data[a + 1]) -
            (data[a] - data[b]) * (data[c + 1] - data[a + 1]));
    }

    return polygonArea === 0 && trianglesArea === 0 ? 0 :
        Math.abs((trianglesArea - polygonArea) / polygonArea);
};

function signedArea(data, start, end, dim) {
    var sum = 0;
    for (var i = start, j = end - dim; i < end; i += dim) {
        sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
        j = i;
    }
    return sum;
}

// turn a polygon in a multi-dimensional array form (e.g. as in GeoJSON) into a form Earcut accepts
earcut.flatten = function (data) {
    var dim = data[0][0].length,
        result = {vertices: [], holes: [], dimensions: dim},
        holeIndex = 0;

    for (var i = 0; i < data.length; i++) {
        for (var j = 0; j < data[i].length; j++) {
            for (var d = 0; d < dim; d++) result.vertices.push(data[i][j][d]);
        }
        if (i > 0) {
            holeIndex += data[i - 1].length;
            result.holes.push(holeIndex);
        }
    }
    return result;
};




//TEST /****************
//TEST earcut(vertices[, holes, dimensions = 2]).
//TEST
//TEST   vertices is a flat array of vertex coordinates like [x0,y0, x1,y1, x2,y2, ...]
//TEST   holes is an array of hole indices if any (e.g. [5, 8] for a 12-vertex input
//TEST         would mean one hole with vertices 5-7 and another with 8-11).
//TEST   dimensions is the number of coordinates per vertex in the input array
//TEST ****************/
//TEST
//TEST var triangles;
//TEST
//TEST function printTriangles(triangles){
//TEST   for (var i=0; i<(triangles.length);i=i+3){
//TEST     print (
//TEST      triangles[i], triangles[i+1], triangles[i+2],
//TEST      ""
//TEST     );
//TEST   };
//TEST }
//TEST
//TEST triangles = earcut([
//TEST    10,0, 0,50, 60,60, 70,10
//TEST ]); // returns [1,0,3, 3,2,1]
//TEST printTriangles(triangles);
