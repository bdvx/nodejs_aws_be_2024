import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from "aws-cdk-lib/aws-lambda";
import {
  LambdaIntegration,
  RestApi,
  Cors,
} from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsList = new NodejsFunction(
        this,
        "GetProductsListHandler",
        {
          runtime: Runtime.NODEJS_20_X,
          entry: 'src/getAllProducts.ts',
          handler: "handler",
        }
    );

    const getProductById = new NodejsFunction(
        this,
        "GetProductByIdHandler",
        {
          runtime: Runtime.NODEJS_20_X,
          entry: 'src/getProductById.ts',
          handler: "handler",
        }
    );

    const api = new RestApi(this, "ProductService", {
      restApiName: "ProductService",
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
    });

    const productsPath = api.root.addResource("products");

    productsPath.addMethod("GET", new LambdaIntegration(getProductsList));

    const productByIdPath = productsPath.addResource("{id}");

    productByIdPath.addMethod("GET", new LambdaIntegration(getProductById));
  }
}