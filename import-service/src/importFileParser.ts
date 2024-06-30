import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PassThrough, Readable } from 'stream';
import csv from 'csv-parser';
import { headers, errMessage } from './helpers';

const s3Client = new S3Client({region: 'eu-west-1'});

export const handler = async (event: any) => {
  console.log('Received event:', event);

  try {
    for (const s3Record of event.Records) {
      const bucketName = s3Record.s3.bucket.name;
      const key = decodeURIComponent(s3Record.s3.object.key.replace(/\+/g, ' '));

      console.log('Processing S3 record', { bucketName, key });

      const getObjectParams = { Bucket: bucketName, Key: key };

      // Fetch the object from S3
      const { Body: data } = await s3Client.send(new GetObjectCommand(getObjectParams));

      // Ensure the fetched data is a readable stream
      if (!(data instanceof Readable)) {
        throw new Error('Fetched data is not a readable stream');
      }

      // Process CSV data asynchronously
      await new Promise<void>((resolve, reject) => {
        data.pipe(new PassThrough())
            .pipe(csv())
            .on('data', (row) => console.log('CSV row:', row)) // Logging each CSV row (can be replaced with actual processing logic)
            .on('error', reject)
            .on('end', async () => {
              // Prepare parameters for copying and deleting objects in S3
              const copyObjectParams = {
                Bucket: bucketName,
                CopySource: `${bucketName}/${key}`,
                Key: key.replace('uploaded', 'parsed'),
              };

              console.log('Copying object with parameters', copyObjectParams);
              await s3Client.send(new CopyObjectCommand(copyObjectParams));
              console.log('Copy object: completed');

              await s3Client.send(new DeleteObjectCommand(getObjectParams));
              console.log('Delete object: completed');

              resolve();
            });
      });

      console.log('Completed file processing', { bucketName, key });
    }

    // Return success response after processing all records
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'File parsing completed.' }),
    };

  } catch (error) {
    // Handle and log any errors that occur during processing
    console.error('Error in importFileParser lambda:', error);
    return errMessage
  }
};
