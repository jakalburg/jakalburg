// Centralised placeholder imagery. Every remote image URL used across the
// site lives here so it can be swapped for brand assets in one place later.
const u = (id: string, w = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const heroImages = {
  primary: u("1483985988355-763728e1935b", 1800),
  secondary: u("1495121605193-b116b5b9c5fe", 1400),
  editorial: u("1441984904996-e0b6ba687e04", 1600),
  campaign: u("1490481651871-ab68de25d43d", 1600),
  women: u("1492707892479-7bc8d5a4ee93", 1200),
  men: u("1488161628813-04466f872be2", 1200),
  essentials: u("1520975916090-3105956dac38", 1400),
  about: u("1558769132-cb1aea458c5e", 1600),
  newsletter: u("1509631179647-0177331693ae", 1600),
};

export const productImages = {
  ivoryTee: [u("1521572163474-6864f9cf17ab"), u("1618354691373-d851c5c3a990")],
  linenShirt: [u("1602810318383-e386cc2a3ccf"), u("1600185365483-26d7a4cc7519")],
  slipDress: [u("1595777457583-95e059d581b8"), u("1585487000160-6ebcfceb0d03")],
  wideLegTrouser: [u("1594633312681-425c7b97ccd1"), u("1509551388413-e18d05e0b57e")],
  knitCardigan: [u("1583744946564-b52ac1c389c8"), u("1591047139829-d91aecb6caea")],
  denimJacket: [u("1544022613-e87ca75a784a"), u("1578681994506-b8f463449011")],
  cropTop: [u("1503342217505-b0a15ec3261c"), u("1515886657613-9f3515b0c78f")],
  midiSkirt: [u("1583496661160-fb5886a13d16"), u("1591369822096-ffd140ec948f")],
  coordSet: [u("1552573367-8b48c076c1e2"), u("1554568218-0f1715e72254")],
  poplinShirt: [u("1596755094514-f87e34085b2c"), u("1603252109303-2751441dd157")],
  cottonBlazer: [u("1591369822096-ffd140ec948f", 1000), u("1509551388413-e18d05e0b57e", 1000)],
  ribbedTank: [u("1580106285538-05c8d0e69f42"), u("1503342217505-b0a15ec3261c", 1000)],

  merinoPolo: [u("1583743814966-8936f5b7be1a"), u("1516826957135-700dedea698c")],
  oxfordShirt: [u("1620012253295-c15cc3e65df4"), u("1594938298603-c8148c4dae35")],
  chinoTrouser: [u("1584865288642-42078afe6942"), u("1473966968600-fa801b869a1a")],
  rawDenim: [u("1542272604-787c3835535d"), u("1516257984-b1b4d707412e")],
  overshirt: [u("1611312449408-fcece27cdbb7"), u("1591047139756-eb1e21c0a68b")],
  merinoCrew: [u("1620799140408-edc6dcb6d633"), u("1503341504253-dff4815485f1")],
  wovenShorts: [u("1600185365926-3a2ce3cdb9eb"), u("1591195853828-11db59a44f6b")],
  bomberJacket: [u("1591047139756-eb1e21c0a68b", 1000), u("1578932750294-f5075e85f44a")],
  essentialTee: [u("1503341504253-dff4815485f1"), u("1521572163474-6864f9cf17ab", 1000)],
  cottonPolo: [u("1516826957135-700dedea698c"), u("1583743814966-8936f5b7be1a", 1000)],
  linenTrouser: [u("1473966968600-fa801b869a1a"), u("1584865288642-42078afe6942", 1000)],
  woolCoat: [u("1544441893-675973e31985"), u("1591047139829-d91aecb6caea", 1000)],
};

export const collectionImages = {
  summerEssentials: u("1523381210434-271e8be1f52b", 1400),
  monochrome: u("1490481651871-ab68de25d43d", 1400),
  workwear: u("1516826957135-700dedea698c", 1400),
  weekend: u("1441984904996-e0b6ba687e04", 1400),
  atelier: u("1495121605193-b116b5b9c5fe", 1400),
};

export const categoryImages = {
  dresses: u("1585487000160-6ebcfceb0d03", 900),
  shirts: u("1600185365483-26d7a4cc7519", 900),
  trousers: u("1509551388413-e18d05e0b57e", 900),
  knitwear: u("1583744946564-b52ac1c389c8", 900),
  tShirts: u("1521572163474-6864f9cf17ab", 900),
  jeans: u("1542272604-787c3835535d", 900),
  jackets: u("1544441893-675973e31985", 900),
  polos: u("1516826957135-700dedea698c", 900),
};
