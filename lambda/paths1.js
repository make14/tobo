exports.handler = async function(event, context) {

    const { pathDataToPolys } = require('svg-path-to-polygons');
    var pathData;
    //pathData = 'M5,15 c5.5,0 10-4.5 10,-10 h10';  // sample data


    if (event.httpMethod != "POST") {
      return ({ statusCode: 200, body: "POST method accepted only\n" });
    }
    pathData = JSON.parse(event.body);   // POST requests

    let points = pathDataToPolys(pathData, {tolerance:1, decimals:1});

    return({
        statusCode: 200,
        body:
          JSON.stringify(points) + "\n"
    });
}

