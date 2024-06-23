export type Product = {
  map(arg0: ({ id }: { id: any; }) => { product_id: any; count: number; }): import("./productCount.type").ProductCount[];
  id: string;
  title: string;
  price: number;
  description: string;
};