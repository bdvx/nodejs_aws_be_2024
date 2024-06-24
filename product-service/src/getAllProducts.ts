import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamoDbClient = new DynamoDBClient({});
const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient);

export const handler = async (event: any) => {
  console.log('getAllProducts lambda called with event:', event);

  const responseHeaders: Record<string, any> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Credentials': true,
    'Access-Control-Allow-Methods': '*',
    'Content-Type': 'application/json',
  };

  try {
    const productsTableName = process.env.PRODUCTS_TABLE_NAME;
    const stocksTableName = process.env.COUNT_TABLE_NAME;

    if (!productsTableName || !stocksTableName) {
      throw new Error('Table names are not defined in environment variables');
    }

    const productsData = await fetchTableData(productsTableName);
    const stocksData = await fetchTableData(stocksTableName);

    if (!productsData || productsData.length === 0) {
      throw new Error('No data to display');
    }

    const combinedProducts = combineProductData(productsData, stocksData);

    return createResponse(200, combinedProducts, responseHeaders);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return createResponse(500, { error: error.message }, responseHeaders);
  }
};

/**
 * Fetches data from the specified DynamoDB table.
 * @param tableName - The name of the DynamoDB table.
 * @returns The items from the table.
 */
const fetchTableData = async (tableName: string) => {
  const command = new ScanCommand({ TableName: tableName });
  const { Items } = await dynamoDbDocumentClient.send(command);
  return Items;
};

/**
 * Combines product data with corresponding stock data.
 * @param products - The product data.
 * @param stocks - The stock data.
 * @returns The combined product and stock data.
 */
const combineProductData = (products: any[], stocks: Record<string, any> | undefined) => {
  return products.map((product) => ({
    ...product,
    count: stocks?.find((p: any) => p.id === product.id)?.count,
  }));
};

/**
 * Creates a response object.
 * @param statusCode - The HTTP status code.
 * @param body - The response body.
 * @param headers - The response headers.
 * @returns The response object.
 */
const createResponse = (statusCode: number, body: any, headers: Record<string, string>) => {
  return {
    statusCode,
    headers,
    body: JSON.stringify(body),
  };
};
