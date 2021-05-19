exports.handler = async function(event, context) {

    const { pathDataToPolys } = require('svg-path-to-polygons');
    let pathData = 'M5,15 c5.5,0 10-4.5 10,-10 h10';
    let points = pathDataToPolys(pathData, {tolerance:1, decimals:1});

    return({
        statusCode: 200,
        body:
          JSON.stringify(points) + "\n"
    });
}

