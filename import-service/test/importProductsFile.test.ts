import { handler } from '../src/importProductsFile';
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mocked } from "jest-mock";

// Mocking AWS SDK modules
jest.mock("@aws-sdk/client-s3");
jest.mock("@aws-sdk/s3-request-presigner");

// Mocked instances with shallow option
const mockedS3Client = mocked(S3Client, { shallow: true });
const mockedGetSignedUrl = mocked(getSignedUrl, { shallow: true });
const signedUrl = 'http://signed-url'

describe('handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test case for missing file name
  it('should return 400 if name is not provided', async () => {
    const event = {
      queryStringParameters: null
    };

    const response = await handler(event as any);

    expect(response.statusCode).toBe(400);
    expect(response.body).toBe(JSON.stringify({ message: "A file name must be provided." }));
  });

  // Test case for successful retrieval of signed URL
  it('should return signed URL if name is provided', async () => {
    const event = {
      queryStringParameters: {
        name: 'test.csv'
      }
    };

    mockedGetSignedUrl.mockResolvedValue(signedUrl);

    const response = await handler(event as any);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).signedUrl).toBe(signedUrl);
    expect(mockedGetSignedUrl).toHaveBeenCalledWith(
      expect.any(mockedS3Client),
      expect.any(PutObjectCommand),
      { expiresIn: 300 }
    );
  });

  // Test case for failure in getting signed URL
  it('should return 500 if getting signed URL fails', async () => {
    const event = {
      queryStringParameters: {
        name: 'test.csv'
      }
    };

    mockedGetSignedUrl.mockRejectedValue(new Error('Error'));

    const response = await handler(event as any);

    expect(response.statusCode).toBe(500);
    expect(response.body).toBe(JSON.stringify({ message: "Internal Server Error" }));
  });
});
