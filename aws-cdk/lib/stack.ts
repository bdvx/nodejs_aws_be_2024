import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Function,
  Runtime,
  Code,
} from "aws-cdk-lib/aws-lambda";
import {
  LambdaIntegration,
  RestApi,
  Cors,
} from "aws-cdk-lib/aws-apigateway";

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
  super(scope, id, props);

  const getProductsList = new Function(
      this,
      "GetProductsListHandler",
      {
        runtime: Runtime.NODEJS_20_X,
        code: Code.fromAsset('lambda'),
        handler: "getProductList.handler",
      }
  );

  const getProductById = new Function(
      this,
      "GetProductByIdHandler",
      {
        runtime: Runtime.NODEJS_20_X,
        code: Code.fromAsset('lambda'),
        handler: "getProductsById.handler",
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