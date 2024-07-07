import { DynamoDBClient, BatchWriteItemCommand, BatchWriteItemCommandInput } from "@aws-sdk/client-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SQSHandler } from "aws-lambda";

const dynamodb = new DynamoDBClient({});
const snsClient = new SNSClient({});

export const handler: SQSHandler = async (event: any) => {
  const tableName = process.env.TABLE_NAME;
  const snsTopicArn = process.env.SNS_TOPIC_ARN;

  if (!tableName) {
    throw new Error("TABLE_NAME environment variable is not set");
  }

  if (!snsTopicArn) {
    throw new Error("SNS_TOPIC_ARN environment variable is not set");
  }

  const putRequests = event.Records.map((record: { body: string; }) => {
    const body = JSON.parse(record.body);

    return {
      PutRequest: {
        Item: {
          id: { S: body.id },
          name: { S: body.name },
          price: { N: body.price.toString() },
          // Add other fields as necessary
        }
      }
    };
  });

  const params: BatchWriteItemCommandInput = {
    RequestItems: {
      [tableName]: putRequests,
    }
  };

  try {
    const command = new BatchWriteItemCommand(params);
    await dynamodb.send(command);
    console.log('Batch write successful');

    // Publish to SNS topic
    const publishParams = {
      TopicArn: snsTopicArn,
      Message: JSON.stringify({
        message: 'Products have been created successfully',
        products: putRequests.map((req: { PutRequest: { Item: { id: { S: any; }; name: { S: any; }; price: { N: any; }; }; }; }) => ({
          id: req.PutRequest.Item.id.S,
          name: req.PutRequest.Item.name.S,
          price: Number(req.PutRequest.Item.price.N),
        }))
      }),
      Subject: 'Products Created',
      MessageAttributes: {
        price: {
          DataType: 'Number',
          StringValue: putRequests[0].PutRequest.Item.price.N,
        },
      },
    };
    await snsClient.send(new PublishCommand(publishParams));
    console.log('SNS publish successful');
  } catch (error) {
    console.error('Error processing batch', error);
  }
};
