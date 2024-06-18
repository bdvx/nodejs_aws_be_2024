import productList from './productList';

export const handler = async () => {
  // console.log('getAllProducts lambda called with event: ', event);

  // emulate delay from remote URL fetch
  // suppose we'll get real URL here and not file with hardcoded values
  await new Promise(resolve => setTimeout(resolve, 1000));

  // TODO:  Adding try/catch for error handling to uncomment in future tasks
  // try {

  return {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Methods': '*',
      'Content-Type': 'application/json'
    },
    statusCode: 200,
    body: JSON.stringify(productList)
  };

  // TODO: Adding try/catch for error handling to uncomment in future tasks
  /*} catch(error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Credentials': true,
        'Access-Control-Allow-Methods': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(error.message),
    };
  }*/

};