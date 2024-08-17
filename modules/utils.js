exports.getErrorMessage = function (status) {
    switch (status) {
        case 403:
            return "Your access key is not valid";
        case 404:
            return "The server address is invalid";
        case 406:
            return "The resource couldn't be found";
        case 500:
            return "The server faced an error";
        case 0:
            return "The server couldn't be reached";
        default:
            return "An unknown error occurred";
    }
}

exports.getAverageRgb = function (imgEl) {
    // SOURCE: https://stackoverflow.com/questions/2541481/get-average-color-of-image-via-javascript
    var blockSize = 5,
        defaultRGB = {r:255,g:255,b:255},
        canvas = document.createElement('canvas'),
        context = canvas.getContext('2d'),
        data, width, height,
        i = -4,
        length,
        rgb = {r:0,g:0,b:0},
        count = 0;

    if (!context) {
        return defaultRGB;
    }

    height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height;
    width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width;

    context.drawImage(imgEl, 0, 0);

    try {
        data = context.getImageData(0, 0, width, height);
    } catch(e) {
        console.error("Error accessing the pixel data: ", e);
        return defaultRGB;
    }

    length = data.data.length;

    while ( (i += blockSize * 4) < length ) {
        ++count;
        rgb.r += data.data[i];
        rgb.g += data.data[i+1];
        rgb.b += data.data[i+2];
    }

    rgb.r = ~~(rgb.r/count);
    rgb.g = ~~(rgb.g/count);
    rgb.b = ~~(rgb.b/count);

    return rgb;
}