import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/client-sns');

import { handler } from '../src/catalogBatchProcess';

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/client-sns');

const dynamodbMock = DynamoDBClient.prototype.send as jest.Mock;
const snsMock = SNSClient.prototype.send as jest.Mock;

describe('catalogBatchProcess', () => {
  const productsTableName = 'ProductsTable';
  const stocksTableName = 'StocksTable';
  const createProductTopicArn = 'arn:aws:sns:region:account:createProductTopic';

  beforeEach(() => {
    process.env.PRODUCTS_TABLE_NAME = productsTableName;
    process.env.STOCKS_TABLE_NAME = stocksTableName;
    process.env.CREATE_PRODUCT_TOPIC_ARN = createProductTopicArn;

    dynamodbMock.mockReset();
    snsMock.mockReset();
  });

  it('should process SQS messages and create products with SNS notification', async () => {
    const productId = 'test-product-id';

    dynamodbMock.mockResolvedValue({});
    snsMock.mockResolvedValue({});

    const event = {
      Records: [
        {
          body: JSON.stringify({ title: 'Product 1', description: 'Description 1', price: 100, count: 10 }),
        },
        {
          body: JSON.stringify({ title: 'Product 2', description: 'Description 2', price: 200, count: 20 }),
        },
      ],
    };

    // @ts-ignore
    const {statusCode, body} = await handler(event);

    expect(statusCode).toBe(200);
    const results = JSON.parse(body);
    expect(results).toEqual([
      { status: 'Success', id: productId },
      { status: 'Success', id: productId },
    ]);

    expect(dynamodbMock).toHaveBeenCalledTimes(2);
    expect(snsMock).toHaveBeenCalledTimes(2);
  });

  it('should handle errors during product creation and SNS notification', async () => {
    const productId = 'test-product-id';

    dynamodbMock.mockRejectedValue(new Error('DynamoDB error'));
    snsMock.mockResolvedValue({});

    const event = {
      Records: [
        {
          body: JSON.stringify({ title: 'Product 1', description: 'Description 1', price: 100, count: 10 }),
        },
      ],
    };

    const response = await handler(event);
    
    // @ts-ignore
    const {statusCode, body} = await handler(event);
    
    expect(statusCode).toBe(200);
    const results = JSON.parse(body);
    expect(results).toEqual([
      { status: 'Error', error: 'DynamoDB error' },
    ]);

    expect(dynamodbMock).toHaveBeenCalledTimes(1);
    expect(snsMock).not.toHaveBeenCalled();
  });
});