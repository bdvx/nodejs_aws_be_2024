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