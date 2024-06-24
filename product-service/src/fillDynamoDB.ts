import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import productList from './productList';
import { ProductCount } from "../types/productCount.type";
import { Product } from "../types/product.type";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);
const ids = Array(productList.length).fill(0).map(() => randomUUID())

/**
 * Handler function for AWS Lambda.
 * @param event - The event data.
 */
export const handler = async (event: any) => {
  try {
    await fillTableWithProducts();
    await fillTableWithStocks();
  } catch (error) {
    console.error(error);
  }
};

/**
 * Fills the products table in DynamoDB with data from productList.
 */
const fillTableWithProducts = async () => {
  const productsTableName = process.env.PRODUCTS_TABLE_NAME;
  if (!productsTableName) {
    throw new Error('Please define <PRODUCTS_TABLE_NAME>!');
  }

  const productWriteCommand = new BatchWriteCommand({
    RequestItems: {
      [productsTableName]: productList.map((item, i) => ({
        PutRequest: { Item: {...item, id: ids[i] } },
      })),
    },
  });

  await documentClient.send(productWriteCommand);
};

/**
 * Fills the stocks table in DynamoDB with data generated from productList.
 */
const fillTableWithStocks = async () => {
  const stocksTableName = process.env.COUNT_TABLE_NAME;
  if (!stocksTableName) {
    throw new Error('Please define <COUNT_TABLE_NAME>!');
  }
  
  const stockWriteCommand = new BatchWriteCommand({
    RequestItems: {
      [stocksTableName]: generateProductCounts(productList).map((item) => ({
        PutRequest: { Item: item },
      })),
    },
  });

  await documentClient.send(stockWriteCommand);
};

/**
 * Generates product counts for each product.
 * @param products - The list of products.
 * @returns An array of ProductCount objects.
 */
const generateProductCounts = (products: Product[]): ProductCount[] => {
  return products.map((_, i) => ({
    id: ids[i],
    count: Math.floor(Math.random() * 100),
  } as ProductCount));
};
