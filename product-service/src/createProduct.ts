import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { CreateProduct } from "../types/createProduct.type";
import { randomUUID } from "crypto";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

const dynamoDbClient = new DynamoDBClient({});
const dynamoDbDocumentClient = DynamoDBDocumentClient.from(dynamoDbClient);

export const handler = async (event: any) => {
  console.log('createProduct event:', event);

  try {
    const requestBody = parseRequestBody(event.body);
    const { title, description, price, count } = requestBody;

    if (!isRequestDataValid(title, description, price, count)) {
      return createErrorResponse(400, 'Validation Error: request should contain title, description as STRING and price, count as NUMBER');
    }

    const productId = randomUUID();

    await saveProductToDynamoDB(productId, title, description, price, count);

    return createSuccessResponse(200, `Product: ${productId} CREATED!`);
  } catch (error: any) {
    console.error('Error creating product:', error);
    return createErrorResponse(500, `Unable to create new item. Error: ${error.message}`);
  }
};

/**
 * Parses and returns the request body data.
 * @param body - The request body as a string.
 * @returns The parsed request data.
 */
const parseRequestBody = (body: string | null): Record<string, any> => {
  return JSON.parse(body || "{}");
};

/**
* Validates the request data.
* @param data - The request data.
* @returns True if the request data is valid, otherwise false.
*/
const isRequestDataValid = (title: any, description: any, price: any, count: any): boolean => {
  return (
      typeof title === 'string' &&
      typeof description === 'string' &&
      typeof price === 'number' &&
      typeof count === 'number'
  );
};

/**
 * Saves the product data to DynamoDB.
 * @param productId - The product ID.
 * @param title - The product title.
 * @param description - The product description.
 * @param price - The product price.
 * @param count - The product count.
 */
const saveProductToDynamoDB = async (productId: string, title: string, description: string, price: number, count: number): Promise<void> => {
  const transactWriteCommand = new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: process.env.PRODUCTS_TABLE_NAME,
          Item: { id: productId, title, description, price },
        },
      },
      {
        Put: {
          TableName: process.env.COUNT_TABLE_NAME,
          Item: { id: productId, count },
        },
      },
    ],
  });

  await dynamoDbDocumentClient.send(transactWriteCommand);
};

/**
 * Creates a success response object.
 * @param statusCode - The HTTP status code.
 * @param message - The success message.
 * @returns The success response object.
 */
const createSuccessResponse = (statusCode: number, message: string) => {
  return {
    statusCode,
    headers,
    body: JSON.stringify(message),
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
    statusCode,
    headers,
    body: JSON.stringify({ error: message }),
  };
};
