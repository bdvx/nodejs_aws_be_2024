import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { headers, errMessage } from './helpers';

const s3Client = new S3Client({region: 'eu-west-1'});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log("Received event:", event);

    try {
        const { queryStringParameters } = event;
        const name = queryStringParameters?.name;

        if (!name) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ message: "A file name must be provided." }),
            };
        }

        const command = new PutObjectCommand({
            Bucket: process.env.BUCKET!,
            Key: `uploaded/${name}`,
            ContentType: 'text/csv',
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ signedUrl }),
        };

    } catch (error) {
        console.error("Error in importProductsFile lambda:", error);
        return errMessage;
    }
};
