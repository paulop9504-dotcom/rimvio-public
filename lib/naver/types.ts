export type NaverSearchKind =
  | "local"
  | "shop"
  | "news"
  | "blog"
  | "webkr"
  | "image"
  | "book"
  | "encyc"
  | "cafearticle";

export type NaverSearchItem = Record<string, string>;

export type NaverSearchResult = {
  kind: NaverSearchKind;
  query: string;
  total: number;
  start: number;
  display: number;
  items: NaverSearchItem[];
};

export type NaverLocalItem = {
  title: string;
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
};
