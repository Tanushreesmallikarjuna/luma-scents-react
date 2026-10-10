export const CATS = ["All", "Perfumes", "Candles", "Discovery Kits", "Gift Sets"];
const GRAD = { Perfumes: ["#5d3f73", "#c48a6a"], Candles: ["#8a5a2b", "#e0b56a"], "Discovery Kits": ["#2f6f68", "#9fd0c0"], "Gift Sets": ["#8c2f4e", "#e6a3b5"] };
const rows = [
["LS-P01","Amber Dusk","Perfumes",4200,5200,"Amber, vanilla, sandalwood"],
["LS-P02","Fig & Rain","Perfumes",3800,0,"Green fig, petrichor, cedar"],
["LS-P03","Night Jasmine","Perfumes",4600,5400,"Jasmine, musk, tonka"],
["LS-P04","Salt Cedar","Perfumes",3400,0,"Sea salt, cedar, bergamot"],
["LS-P05","Rose Paper","Perfumes",4900,0,"Damask rose, pink pepper, oud"],
["LS-P06","Saffron Silk","Perfumes",5400,0,"Saffron, iris, leather"],
["LS-C01","Hearth Candle","Candles",1800,0,"Smoked vanilla, birch"],
["LS-C02","Orchard Candle","Candles",1600,2000,"Pear, apple blossom"],
["LS-C03","Monsoon Candle","Candles",1900,0,"Wet earth, vetiver"],
["LS-C04","Lotus Hour Candle","Candles",1700,0,"Lotus, white tea"],
["LS-D01","Discovery Kit: Woods","Discovery Kits",1400,0,"Five 5ml woody scents"],
["LS-D02","Discovery Kit: Florals","Discovery Kits",1400,0,"Five 5ml floral scents"],
["LS-D03","Discovery Kit: Signature","Discovery Kits",2200,0,"Eight 5ml bestsellers"],
["LS-G01","Evening Gift Set","Gift Sets",6200,7400,"Night Jasmine + Hearth Candle"],
["LS-G02","Garden Gift Set","Gift Sets",5600,0,"Fig & Rain + Orchard Candle"],
["LS-G03","Traveller Gift Set","Gift Sets",3900,0,"Three 10ml travel sprays"],
];
export const PRODUCTS = rows.map(([id, name, cat, price, was, notes], i) => ({
  id, name, cat, price, was, notes, stock: i % 7 === 5 ? 0 : 12,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
}));
export const byId = (id) => PRODUCTS.find((p) => p.id === id);
export const bySlug = (s) => PRODUCTS.find((p) => p.slug === s);
export const inr = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
export const swatch = (p) => ({ background: `linear-gradient(150deg,${GRAD[p.cat][0]},${GRAD[p.cat][1]})` });
