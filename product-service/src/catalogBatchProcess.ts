import { DynamoDBClient, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { randomUUID } from "crypto";

const dynamodb = new DynamoDBClient({});
const sns = new SNSClient({ region: 'eu-west-1' });
const productsTableName = process.env.PRODUCTS_TABLE_NAME;
const stocksTableName = process.env.COUNT_TABLE_NAME;
const createProductTopicArn = process.env.SNS_TOPIC_ARN;

export const handler = async (event: any) => {
  if (!productsTableName || !stocksTableName || !createProductTopicArn) {
    console.error('Table names or SNS topic ARN not provided');
    return;
  }

  const results = [];

  for (const record of event.Records) {
    const { title, description, price, count } = JSON.parse(record.body);
    const productId = randomUUID();

    const productParams = {
      TableName: productsTableName,
      Item: {
        id: { S: productId },
        title: { S: title },
        description: { S: description },
        price: { N: String(price) },
      },
    };

    const stockParams = {
      TableName: stocksTableName,
      Item: {
        id: { S: productId },
        count: { N: String(count) },
      },
    };

    const transactItems = {
      TransactItems: [
        { Put: productParams },
        { Put: stockParams },
      ],
    };

    try {
      await dynamodb.send(new TransactWriteItemsCommand(transactItems));
      console.info('Table filled, message sending:', createProductTopicArn);
      const message = {
        Subject: 'New product created',
        Message: JSON.stringify({ id: productId, title, description, price, count }),
        TopicArn: createProductTopicArn,
      };

      const sentMessage = await sns.send(new PublishCommand(message));
      console.info('Message sent:', sentMessage);
      results.push({ status: 'Success', id: productId });
    } catch (error) {
      console.error('Error creating product or sending SNS message', error);
      // @ts-ignore
      results.push({ status: 'Error', error: error.message });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify(results),
  };
};
