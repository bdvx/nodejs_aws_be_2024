export const DynamoDBClient = jest.fn(() => ({
  send: jest.fn(),
}));

export const BatchWriteItemCommand = jest.fn();