// sample input (a series of paths, each on a different line): 
//
// M 432 26 L 607.5 26 L 608 26.5 L 608 68 L 545 68 L 545 263.5 L 544.5 264 L 495 264 L 495 68.5 L 494.5 68 L 432 68 L 432 26 Z 
// M 641 26 L 805.5 26 L 806 26.5 L 806 68 L 690 68 L 690 122 L 787 122 L 787 164 L 690 164 L 690 222 L 806 222 L 806 264 L 641 264 L 641 26 

exports.handler = async function(event, context) {
    const { pathDataToPolys } = require('svg-path-to-polygons');

    if (event.httpMethod != "POST") {
      return ({ statusCode: 200, body: "POST method accepted only\n" });
    }

    let points = pathDataToPolys(
        event.body,
        {tolerance:1, decimals:1});

    return({
        statusCode: 200,
        body: JSON.stringify(points) + "\n"
    });
}

