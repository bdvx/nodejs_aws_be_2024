import * as cdk from 'aws-cdk-lib';
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
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const getProductsList = new NodejsFunction(
        this,
        'GetProductsListHandler',
        {
          runtime: Runtime.NODEJS_20_X,
          entry: 'src/getAllProducts.ts',
          handler: "handler",
        }
    );

    const getProductById = new NodejsFunction(
        this,
        'GetProductByIdHandler',
        {
          runtime: Runtime.NODEJS_20_X,
          entry: 'src/getProductById.ts',
          handler: "handler",
        }
    );

    const createProduct = new NodejsFunction(
        this, 
        'CreateProduct', 
        {
          runtime: Runtime.NODEJS_20_X,
          entry: 'src/createProduct.ts',
          handler: "handler",
        }
    );

    // TABLES

    const productTable = new dynamodb.Table(this, 'ProductTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      tableName: 'products',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const countTable = new dynamodb.Table(this, 'StockTable', {
      partitionKey: { name: 'product_id', type: dynamodb.AttributeType.STRING },
      tableName: 'stocks',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    [getProductsList, getProductById, createProduct].forEach((fn) => {
        const envs = [
          {key: 'DYNAMODB_PRODUCTS_TABLE', value: productTable.tableName},
          {key: 'DYNAMODB_STOCKS_TABLE', value: countTable.tableName},
          {key: 'UI_URL', value: Config.UI_URL},
        ]

        for (const {key, value} of envs) {
          fn.addEnvironment(key, value);
        }
      }
    );

    [productTable, countTable].forEach((fn) => {
      fn.grantReadData(getProductsList);
      fn.grantReadData(getProductById);
      fn.grantWriteData(createProduct);
    })

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

    const productByIdPath = productsPath.addResource("{id}");

    productByIdPath.addMethod("GET", new LambdaIntegration(getProductById));
    
    productByIdPath.addMethod("POST", new LambdaIntegration(createProduct));
  }
}