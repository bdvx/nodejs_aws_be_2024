// mocked image
const URL = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=1950&q=80";
import { Product } from "../types/product.type";

// @ts-ignore
const productList: Product[] = [
  {
    "description": "Full-sized headphones",
    "price": 29990,
    "title": "Sony WH-1000XM4 Black",
    "image": URL
  },
  {
    "description": "Full-sized headphones 1",
    "price": 29990,
    "title": "Sony WH-1000XM4 Black 1",
    "image": URL
  },
  {
    "description": "Full-sized headphones",
    "price": 29990,
    "title": "Bowers & Wilkins PX7 Space Gray",
    "image": URL
  },
  {
    "description": "Full-sized headphones",
    "price": 26990,
    "title": "Sennheiser Momentum 3 Wireless M3AEBTXL Black",
    "image": URL
  },
  {
    "description": "Full-sized headphones",
    "price": 159990,
    "title": "Sennheiser HD820",
    "image": URL
  },
  {
    "description": "Full-sized headphones",
    "price": 14990,
    "title": "Audio-Technica ATH-M50xBT",
    "image": URL
  },
  {
    "description": "True wireless earphones",
    "price": 14990,
    "title": "Sony WF-1000XM3 Black",
    "image": URL
  },
  {
    "description": "True wireless earphones",
    "price": 22890,
    "title": "Sennheiser Momentum True Wireless 2 Black",
    "image": URL
  },
  {
    "description": "True wireless earphones",
    "price": 12790,
    "title": "Audio-Technica ATH-CKR7TW BK",
    "image": URL
  }
]

export default productList;