import products from '../src/productList';
import { getAllProducts } from '../handler';

describe('test /api/products', () => {
  it('returns list of products', async () => {
    const response = await getAllProducts();

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(expect.arrayContaining(products));
  });
});