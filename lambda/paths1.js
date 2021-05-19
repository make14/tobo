// sample input:       M5,15 c5.5,0 10-4.5 10,-10 h10
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

