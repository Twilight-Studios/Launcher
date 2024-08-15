// MISC
// --------------------------------------------------------------------------------------

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

// --------------------------------------------------------------------------------------