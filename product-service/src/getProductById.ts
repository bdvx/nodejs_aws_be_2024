import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamoDbClient = new DynamoDBClient({});
const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient);

const RESPONSE_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Methods': '*',
  'Content-Type': 'application/json',
};

export const handler = async (event: any) => {
  console.log('getProductById lambda called with event:', event);

  const { id: productId } = event.pathParameters;

  // Emulate delay from remote URL fetch
  await simulateNetworkDelay(1000);

  try {
    const product = await fetchProductById(productId);
    const stock = await fetchStockById(productId);

    if (!product || !stock) {
      return createErrorResponse(404, `Product with id ${productId} was not found or some data is missing`);
    }

    const combinedProductData = { ...product, ...stock };

    return createSuccessResponse(200, combinedProductData);
  } catch (error: any) {
    console.error('Error fetching product by id:', error);
    return createErrorResponse(500, error.message);
  }
};

/**
 * Simulates network delay.
 * @param delay - The delay in milliseconds.
 * @returns A promise that resolves after the specified delay.
 */
const simulateNetworkDelay = (delay: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, delay));
};

/**
 * Fetches product data by product ID from the DynamoDB table.
 * @param productId - The ID of the product.
 * @returns The product data.
 */
const fetchProductById = async (productId: string) => {
  const params = {
    TableName: process.env.PRODUCTS_TABLE_NAME,
    Key: { id: productId },
  };

  const { Item } = await dynamoDbDocumentClient.send(new GetCommand(params));
  return Item;
};

/**
 * Fetches stock data by product ID from the DynamoDB table.
 * @param productId - The ID of the product.
 * @returns The stock data.
 */
const fetchStockById = async (productId: string) => {
  const params = {
    TableName: process.env.COUNT_TABLE_NAME,
    Key: { id: productId },
  };

  const { Item } = await dynamoDbDocumentClient.send(new GetCommand(params));
  return Item;
};

/**
 * Creates a success response object.
 * @param statusCode - The HTTP status code.
 * @param body - The response body.
 * @returns The success response object.
 */
const createSuccessResponse = (statusCode: number, body: any) => {
  return {
    headers: RESPONSE_HEADERS,
    statusCode,
    body: JSON.stringify(body),
  };
};

/**
 * Creates an error response object.
 * @param statusCode - The HTTP status code.
 * @param message - The error message.
 * @returns The error response object.
 */
const createErrorResponse = (statusCode: number, message: string) => {
  return {
    headers: RESPONSE_HEADERS,
    statusCode,
    body: JSON.stringify({ error: message }),
  };
};
