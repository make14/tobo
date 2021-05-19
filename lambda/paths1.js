exports.handler = async function(event, context) {

    const { pathDataToPolys } = require('svg-path-to-polygons');
    var pathData;
    pathData = 'M5,15 c5.5,0 10-4.5 10,-10 h10';
    pathData = 'M 105 512 L 149.5 512 L 151 513.5 L 236 750 L 185.5 750 L 184 748.5 L 171 709.5 L 171 706.5 L 167.5 699 L 88.5 699 L 87 700.5 L 72 746.5 L 69.5 750 L 19.5 750 L 19 748.5 L 105 512 Z M 127 578 L 100 659 L 101 662 L 156 662 L 129 581 L 129 578 L 127 578 Z';
    let points = pathDataToPolys(pathData, {tolerance:1, decimals:1});

    return({
        statusCode: 200,
        body:
          JSON.stringify(points) + "\n"
    });
}

