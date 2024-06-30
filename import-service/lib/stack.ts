import { Stack, StackProps } from 'aws-cdk-lib';
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from 'constructs';
import {
  Function,
  Runtime,
  AssetCode,
} from "aws-cdk-lib/aws-lambda";
import {
  LambdaIntegration,
  RestApi,
  Cors,
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
      bucketName: 'import-service-bucket',
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

    // Lambda function for importing products
    const importProductsLambda = new NodejsFunction(this, 'ImportProductsFileFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: 'src/importProductsFile.ts',
      handler: 'handler',
      environment: {
        BUCKET_NAME: importBucket.bucketName,
      },
    });

    // Lambda function for parsing imported files
    const importParserLambda = new NodejsFunction(this, 'ImportFileParserFunction', {
      runtime: Runtime.NODEJS_20_X,
      entry: 'src/importFileParser.ts',
      handler: 'handler',
      environment: {
        BUCKET_NAME: importBucket.bucketName,
      },
    });

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
      actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
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

    // Define import resource and its methods
    const importResource = api.root.addResource('import');
    importResource.addMethod('GET', new LambdaIntegration(importProductsLambda));

    // S3 event notification for new object creation
    importBucket.addEventNotification(
      EventType.OBJECT_CREATED,
      new LambdaDestination(importParserLambda),
      { prefix: 'uploaded/' }
    );
  }
}
