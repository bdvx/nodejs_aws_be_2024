import products from '../../product-service/src/productList';
import { getProductById } from '../handler';

describe('/api/products/:id', () => {
  it('returns requested product', async () => {
    const product = products[1];
    const event = { pathParameters: { productId: product.id } } as any;
    const response = await getProductById(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toStrictEqual({
      count: product.count,
      description: product.description,
      id: product.id,
      image: product.image,
      price: product.price,
      title: product.title,
    });
  });

  it('should return 404 if product has not found', async () => {
    const event = { pathParameters: { productId: 'test' } } as any;
    const response = await getProductById(event);

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toBe('Target product was not found');
  });
});