import { CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import {
  LambdaIntegration,
  RestApi,
  Cors,
} from 'aws-cdk-lib/aws-apigateway';
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

    // Lambda function for authorizing users
    const basicAuthorizer = new NodejsFunction(this, 'BasicAuthorizer', {
      runtime: Runtime.NODEJS_20_X,
      entry: 'src/basicAuthorizer.ts',
      handler: 'handler',
      environment: {
        username: process.env.bdvx
      }
    });

    new CfnOutput(this, 'BasicAuthorizerArn', {
      value: basicAuthorizer.functionArn,
      exportName: 'BasicAuthorizerArn',
    });

  }
}
