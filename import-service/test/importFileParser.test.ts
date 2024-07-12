import { handler } from '../src/importFileParser';
import { Readable } from 'stream';

jest.mock('@aws-sdk/client-s3', () => {
  const s3client = jest.requireActual('@aws-sdk/client-s3');
  const {S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand} = s3client
  class S3ClientMock extends S3Client {
    send(command: any) {
      if (command instanceof CopyObjectCommand || command instanceof DeleteObjectCommand) {
        return Promise.resolve();
      } else if (command instanceof GetObjectCommand) {
        const data = new Readable();
        data.push('test');
        data.push(null);
        return Promise.resolve({ Body: data });
      } else return Promise.reject();
    }
  }

  return {
    ...s3client,
    S3Client: S3ClientMock,
  };
});
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

    const result = await handler(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(JSON.stringify({ message: 'File parsing completed.' }));
  });
});
