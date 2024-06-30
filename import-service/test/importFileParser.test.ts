import { handler } from '../src/importFileParser';
import { Readable } from 'stream';
import { GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';


jest.mock('@aws-sdk/client-s3', () => {
  return {
      ...jest.requireActual('@aws-sdk/client-s3'),
      SQSClient: function send(command: any): Promise<void | { Body: Readable; }> {
          if (command instanceof GetObjectCommand) {
            const mockData = new Readable();
            mockData.push('test');
            mockData.push(null);
            return Promise.resolve({ Body: mockData });
          } else if (command instanceof CopyObjectCommand || command instanceof DeleteObjectCommand) {
            return Promise.resolve();
          } else return Promise.reject();
      },
  };
});

jest.mock('csv-parser');
//jest.mock('csv');

describe('importFileParser handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('processes S3 records and returns success', async () => {
    const mockEvent = {
      Records: [
        {
          s3: {
            bucket: {
              name: 'test-bucket',
            },
            object: {
              key: 'uploaded/test.csv',
            },
          },
        },
      ],
    };

    const mockData = new Readable();
    mockData.push('test');
    mockData.push(null);

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify({ message: 'File parsing completed.' }));
  });
});
