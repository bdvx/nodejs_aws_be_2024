import { Fn, Stack, StackProps } from 'aws-cdk-lib';
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from 'constructs';
import { Runtime, Function } from "aws-cdk-lib/aws-lambda";
import {
  LambdaIntegration,
  RestApi,
  Cors,
  TokenAuthorizer,
  AuthorizationType
} from "aws-cdk-lib/aws-apigateway";
import {
  PolicyStatement,
  Effect,
} from 'aws-cdk-lib/aws-iam';
import {
  Bucket,
  HttpMethods,
  EventType,
  BlockPublicAccess,
} from 'aws-cdk-lib/aws-s3';
import {
  LambdaDestination,
} from 'aws-cdk-lib/aws-s3-notifications';

export class CdkStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create S3 Bucket
    const importBucket = new Bucket(this, "ImportBucket", {
      bucketName: 'rs-school-aws-import-service-bucket',
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          maxAge: 3600,
          allowedOrigins: ['*'],
          allowedMethods: [HttpMethods.GET, HttpMethods.PUT, HttpMethods.DELETE],
          allowedHeaders: ['*'],
        },
      ],
    });

    const catalogQueueUrl = Fn.importValue("CatalogQueueUrl");
    const catalogQueueArn = Fn.importValue("CatalogQueueArn");
    const catalogItemsQueue = Queue.fromQueueArn(this, "CatalogQueueImport", catalogQueueArn)

    // Lambda function for importing products
    const importProductsLambda = new NodejsFunction(this, 'ImportProductsFileFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: 'src/importProductsFile.ts',
      handler: 'handler',
      environment: {
        BUCKET_NAME: importBucket.bucketName
      },
    });


    // Lambda function for parsing imported files
    const importParserLambda = new NodejsFunction(this, 'ImportFileParserFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: 'src/importFileParser.ts',
      handler: 'handler',
      environment: {
        BUCKET_NAME: importBucket.bucketName,
        SQS_QUEUE_URL: catalogQueueUrl,
      },
    });

    catalogItemsQueue.grantSendMessages(importParserLambda);

    // IAM policy for importing products lambda function
    const importProductsPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:PutObject'],
      resources: [importBucket.bucketArn + '/*'],
    });
    importProductsLambda.addToRolePolicy(importProductsPolicy);

    // IAM policy for import parser lambda function
    const importParserPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:CopyObject'],
      resources: [importBucket.bucketArn + '/*'],
    });
    importParserLambda.addToRolePolicy(importParserPolicy);

    // API Gateway for import service
    const api = new RestApi(this, "ImportService", {
      restApiName: "ImportService",
      cloudWatchRole: true,
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
    });

    const authorizerLambdaArn = Fn.importValue('BasicAuthorizerArn'); // Import the ARN from the Authorization service

    // Define authorizer
    const authorizer = new TokenAuthorizer(this, 'Authorizer', {
      handler: Function.fromFunctionArn(this, 'basicAuthorizer', authorizerLambdaArn),
      identitySource: 'method.request.header.Authorization',
    });

    // Define import resource and its methods
    const importResource = api.root.addResource('import');
    importResource.addMethod('GET', new LambdaIntegration(importProductsLambda), {
      authorizer,
      authorizationType: AuthorizationType.CUSTOM,
    });
    // S3 event notification for new object creation
    importBucket.addEventNotification(
      EventType.OBJECT_CREATED,
      new LambdaDestination(importParserLambda),
      { prefix: 'uploaded/' }
    );
  }
}
