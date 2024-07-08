import * as cdk from 'aws-cdk-lib';
import { aws_sqs as sqs, aws_sns as sns, aws_sns_subscriptions as subscriptions, CfnOutput } from 'aws-cdk-lib';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import {
  LambdaIntegration,
  RestApi,
  Cors,
} from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class CdkStack extends cdk.Stack {
  public readonly queueUrl: string;
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // TABLES

    const productTable = new dynamodb.Table(this, 'ProductTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      tableName: process.env.PRODUCTS_TABLE_NAME,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const countTable = new dynamodb.Table(this, 'StockTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      tableName: process.env.COUNT_TABLE_NAME,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create SNS topic
    const createProductTopic = new sns.Topic(this, 'CreateProductTopic');

    // Create primary email subscription without filter policy
    createProductTopic.addSubscription(new subscriptions.EmailSubscription('bdv2507@gmail.com'));

    // Create secondary email subscription with filter policy for high-priced products
    createProductTopic.addSubscription(
        new subscriptions.EmailSubscription('bdv2507@yandex.ru', {
          filterPolicy: {
            price: sns.SubscriptionFilter.numericFilter({
              greaterThan: 100,
            }),
          },
        })
    );

    // LAMBDAS

    const getProductsList = new NodejsFunction(
        this,
        'GetProductsListHandler',
        {
          runtime: Runtime.NODEJS_20_X,
          entry: 'src/getAllProducts.ts',
          handler: "handler",
          environment: {
            PRODUCTS_TABLE_NAME: productTable.tableName,
            COUNT_TABLE_NAME: countTable.tableName,
          }
        }
    );

    const getProductById = new NodejsFunction(
        this,
        'GetProductByIdHandler',
        {
          runtime: Runtime.NODEJS_20_X,
          entry: 'src/getProductById.ts',
          handler: "handler",
          environment: {
            PRODUCTS_TABLE_NAME: productTable.tableName,
            COUNT_TABLE_NAME: countTable.tableName,
          }
        }
    );

    const createProduct = new NodejsFunction(
        this, 
        'CreateProduct', 
        {
          runtime: Runtime.NODEJS_20_X,
          entry: 'src/createProduct.ts',
          handler: "handler",
          environment: {
            PRODUCTS_TABLE_NAME: productTable.tableName,
            COUNT_TABLE_NAME: countTable.tableName,
          }
        }
    );

    const fillDynamoDBLambda = new NodejsFunction(
      this,
      "FillDynamoDBLambda", {
        runtime: Runtime.NODEJS_20_X,
        entry: 'src/fillDynamoDB.ts',
        handler: 'handler',
        environment: {
          PRODUCTS_TABLE_NAME: productTable.tableName,
          COUNT_TABLE_NAME: countTable.tableName,
        }
      });

    const catalogBatchProcess = new NodejsFunction(
      this,
      "CatalogBatchProcess", {
        runtime: Runtime.NODEJS_20_X,
        entry: 'src/catalogBatchProcess.ts',
        handler: 'handler',
        environment: {
          PRODUCTS_TABLE_NAME: productTable.tableName,
          COUNT_TABLE_NAME: countTable.tableName,
          SNS_TOPIC_ARN: createProductTopic.topicArn,
        }
      });

    [getProductsList, getProductById, createProduct].forEach((fn) => {
        const envs = [
          {key: 'PRODUCTS_TABLE_NAME', value: productTable.tableName},
          {key: 'COUNT_TABLE_NAME', value: countTable.tableName}
        ]

        for (const {key, value} of envs) {
          fn.addEnvironment(key, value);
        }
      }
    );

    [productTable, countTable].forEach((table) => {
      table.grantReadData(getProductsList);
      table.grantReadData(getProductById);
      table.grantReadWriteData(createProduct);
      table.grantReadWriteData(fillDynamoDBLambda)
      table.grantReadWriteData(catalogBatchProcess)
    })

    // Create SQS queue
    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
      visibilityTimeout: cdk.Duration.seconds(30),
    });

    new CfnOutput(this, "CatalogQueueUrlOutput", { value: catalogItemsQueue.queueUrl, exportName: "CatalogQueueUrl" })
    new CfnOutput(this, "CatalogQueueArnOutput", { value: catalogItemsQueue.queueArn, exportName: "CatalogQueueArn" })

    // Grant the Lambda function permissions to write to the DynamoDB table
    productTable.grantWriteData(catalogBatchProcess);

    // Configure SQS event source for the Lambda function with batch size
    const eventSource = new SqsEventSource(catalogItemsQueue, {
      batchSize: 5,
    });
    catalogBatchProcess.addEventSource(eventSource);


    // Grant the Lambda function permissions to publish to the SNS topic
    createProductTopic.grantPublish(catalogBatchProcess);

    // API

    const api = new RestApi(this, "ProductService", {
      restApiName: "ProductService",
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
    });

    const productsPath = api.root.addResource("products");

    productsPath.addMethod("GET", new LambdaIntegration(getProductsList));
    
    productsPath.addMethod("POST", new LambdaIntegration(createProduct));

    const productByIdPath = productsPath.addResource("{id}");

    productByIdPath.addMethod("GET", new LambdaIntegration(getProductById));
  }
}