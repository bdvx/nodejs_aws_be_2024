export const headers = { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Methods': '*',
        'Content-Type': 'application/json',
}

export const errMessage = {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: "Internal Server Error" }),
};