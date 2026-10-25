export function successResponse(data, message = 'Success') {
    return {
        success: true,
        message,
        data
    };
}

export function errorResponse(message) {
    return {
        success: false,
        message
    };
}