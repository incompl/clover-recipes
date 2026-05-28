# clover-recipes

Clover Food Lab was a Boston-area vegetarian chain that started as an MIT food truck in 2008; after 17 years it [closed all 11 locations on May 28, 2026](https://www.bostonglobe.com/2026/05/26/business/clover-closing-restaurants-prices-jobs/) when no buyer was found. This repo archives the recipes and food posts from [their blog](https://www.cloverfoodlab.com/category/recipes-menu/) before it disappears, plus a small static site to browse them.

## Usage

```
python3 scrape.py    # fetch / refresh recipes and assets
npm install
npm run build        # generate site/
npm run serve        # build, then serve site/ via `npx serve`
```

Or just `open site/index.html` after building — the site is pure static files and works over `file://`.
