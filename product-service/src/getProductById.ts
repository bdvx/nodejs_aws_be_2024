import productList from './productList';

const headers = {
  'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Methods': '*',
    'Content-Type': 'application/json'
};

export const handler = async (event: any) => {
  console.log('getProductById lambda called with event: ', event);
  const { id } = event.pathParameters;
  // emulate delay from remote URL fetch
  // suppose we'll get real URL here and not file with hardcoded values
  await new Promise(resolve => setTimeout(resolve, 1000));

  // TODO: Adding try/catch for error handling to uncomment in future tasks
  // try {

  // search needed product - by id field
  const product = productList.find((prod) => prod.id == id);

  if (!product){
    return {
      headers,
      statusCode: 404,
      body: JSON.stringify("Target product was not found"),
    };
  }

  return {
    headers,
    statusCode: 200,
    body: JSON.stringify(product),
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