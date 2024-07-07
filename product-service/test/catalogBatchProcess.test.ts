import { DynamoDBClient, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/client-sns');

import { handler } from '../src/catalogBatchProcess';

const dynamodbMock = DynamoDBClient.prototype.send as jest.Mock;
const snsMock = SNSClient.prototype.send as jest.Mock;

describe('catalogBatchProcess Lambda Function', () => {
  const tableName = 'ProductsTable';
  const snsTopicArn = 'arn:aws:sns:us-east-1:123456789012:CreateProductTopic';

  beforeEach(() => {
    process.env.TABLE_NAME = tableName;
    process.env.SNS_TOPIC_ARN = snsTopicArn;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should process SQS messages and write to DynamoDB', async () => {
    const event = {
      Records: [
        {
          body: JSON.stringify({ id: '1', name: 'Product 1', price: 100 }),
        },
        {
          body: JSON.stringify({ id: '2', name: 'Product 2', price: 200 }),
        },
      ],
    };

    dynamodbMock.mockResolvedValue({});

    snsMock.mockResolvedValue({});

    // @ts-ignore
    await handler(event as any);

    expect(dynamodbMock).toHaveBeenCalledWith(
        expect.any(BatchWriteItemCommand)
    );

    expect(snsMock).toHaveBeenCalledWith(
        expect.any(PublishCommand)
    );

    const sentDynamoDBCommands = dynamodbMock.mock.calls[0][0] as BatchWriteItemCommand;
    const items = sentDynamoDBCommands.input.RequestItems![tableName];

    expect(items).toEqual([
      {
        PutRequest: {
          Item: {
            id: { S: '1' },
            name: { S: 'Product 1' },
            price: { N: '100' },
          },
        },
      },
      {
        PutRequest: {
          Item: {
            id: { S: '2' },
            name: { S: 'Product 2' },
            price: { N: '200' },
          },
        },
      },
    ]);

    const sentSnsCommand = snsMock.mock.calls[0][0] as PublishCommand;

    expect(sentSnsCommand.input.TopicArn).toBe(snsTopicArn);
    expect(sentSnsCommand.input.Message).toContain('Products have been created successfully');
    expect(sentSnsCommand.input.Message).toContain('"id":{"S":"1"}');
    expect(sentSnsCommand.input.Message).toContain('"id":{"S":"2"}');
  });

  it('should handle DynamoDB errors gracefully', async () => {
    const event = {
      Records: [
        {
          body: JSON.stringify({ id: '1', name: 'Product 1', price: 100 }),
        },
      ],
    };

    dynamodbMock.mockRejectedValue(new Error('DynamoDB error'));

    snsMock.mockResolvedValue({});

    // @ts-ignore
    await handler(event as any);

    expect(dynamodbMock).toHaveBeenCalled();
    expect(snsMock).not.toHaveBeenCalled();
  });

  it('should handle SNS errors gracefully', async () => {
    const event = {
      Records: [
        {
          body: JSON.stringify({ id: '1', name: 'Product 1', price: 100 }),
        },
      ],
    };

    dynamodbMock.mockResolvedValue({});
    snsMock.mockRejectedValue(new Error('SNS error'));

    // @ts-ignore
    await handler(event as any);

    expect(dynamodbMock).toHaveBeenCalled();
    expect(snsMock).toHaveBeenCalled();
  });
});
