import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import productList from './productList';
import { ProductCount } from "../types/productCount.type";
import { Product } from "../types/product.type";

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  try {
    const productsTableName = process.env.DB_PRODUCTS;

    if (!productsTableName) {
      throw new Error('Please definde <DB_PRODUCTS>!');
    }

    const fillProductsTable = new BatchWriteCommand({
      RequestItems: {
        [productsTableName]: productList.map((item) => ({
          PutRequest: { Item: item },
        })),
      },
    });

    const productsTableResponse = await documentClient.send(fillProductsTable);
    console.log("!!!!!!!!!!!!productsTableResponse", productsTableResponse);

    const stocksTableName = process.env.DB_STOCK;

    if (!stocksTableName) {
      throw new Error('Please definde <DB_STOCK>!');
    }

    const fillStockTable = new BatchWriteCommand({
      RequestItems: {
        [stocksTableName]: fillProductCount(productList).map((item) => ({
          PutRequest: { Item: item },
        })),
      },
    });
    const stocksTableResponse = await documentClient.send(fillStockTable);
    console.log("!!!!!!!!!!!stocksTableResponse", stocksTableResponse);

  } catch (error) {
    console.error(error);
  }
};

export const fillProductCount = (products: Product): ProductCount[] => {
  return products.map(({ id }) => {
    return {
      product_id: id,
      count: Math.floor(Math.random() * 100),
    }
  })
};