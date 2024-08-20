require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const Stripe = require("stripe");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY,
  { apiVersion: "2024-06-20" }
);

// CORS configuration
app.use(cors());
app.use(bodyParser.json());

const SHIPPING_RATES = {
    DE: "shr_1PnyAqRtlGIboCBe0toAlZz2", // Deutschland
}

// Supported countries list
const STRIPE_SUPPORTED_COUNTRIES = [
  "AC",
  "AD",
  "AE",
  "AF",
  "AG",
  "AI",
  "AL",
  "AM",
  "AO",
  "AQ",
  "AR",
  "AT",
  "AU",
  "AW",
  "AX",
  "AZ",
  "BA",
  "BB",
  "BD",
  "BE",
  "BF",
  "BG",
  "BH",
  "BI",
  "BJ",
  "BL",
  "BM",
  "BN",
  "BO",
  "BQ",
  "BR",
  "BS",
  "BT",
  "BV",
  "BW",
  "BY",
  "BZ",
  "CA",
  "CD",
  "CF",
  "CG",
  "CH",
  "CI",
  "CK",
  "CL",
  "CM",
  "CN",
  "CO",
  "CR",
  "CV",
  "CW",
  "CY",
  "CZ",
  "DE",
  "DJ",
  "DK",
  "DM",
  "DO",
  "DZ",
  "EC",
  "EE",
  "EG",
  "EH",
  "ER",
  "ES",
  "ET",
  "FI",
  "FJ",
  "FK",
  "FO",
  "FR",
  "GA",
  "GB",
  "GD",
  "GE",
  "GF",
  "GG",
  "GH",
  "GI",
  "GL",
  "GM",
  "GN",
  "GP",
  "GQ",
  "GR",
  "GS",
  "GT",
  "GU",
  "GW",
  "GY",
  "HK",
  "HN",
  "HR",
  "HT",
  "HU",
  "ID",
  "IE",
  "IL",
  "IM",
  "IN",
  "IO",
  "IQ",
  "IS",
  "IT",
  "JE",
  "JM",
  "JO",
  "JP",
  "KE",
  "KG",
  "KH",
  "KI",
  "KM",
  "KN",
  "KR",
  "KW",
  "KY",
  "KZ",
  "LA",
  "LB",
  "LC",
  "LI",
  "LK",
  "LR",
  "LS",
  "LT",
  "LU",
  "LV",
  "LY",
  "MA",
  "MC",
  "MD",
  "ME",
  "MF",
  "MG",
  "MK",
  "ML",
  "MM",
  "MN",
  "MO",
  "MQ",
  "MR",
  "MS",
  "MT",
  "MU",
  "MV",
  "MW",
  "MX",
  "MY",
  "MZ",
  "NA",
  "NC",
  "NE",
  "NG",
  "NI",
  "NL",
  "NO",
  "NP",
  "NR",
  "NU",
  "NZ",
  "OM",
  "PA",
  "PE",
  "PF",
  "PG",
  "PH",
  "PK",
  "PL",
  "PM",
  "PN",
  "PR",
  "PS",
  "PT",
  "PY",
  "QA",
  "RE",
  "RO",
  "RS",
  "RU",
  "RW",
  "SA",
  "SB",
  "SC",
  "SE",
  "SG",
  "SH",
  "SI",
  "SJ",
  "SK",
  "SL",
  "SM",
  "SN",
  "SO",
  "SR",
  "SS",
  "ST",
  "SV",
  "SX",
  "SZ",
  "TA",
  "TC",
  "TD",
  "TF",
  "TG",
  "TH",
  "TJ",
  "TK",
  "TL",
  "TM",
  "TN",
  "TO",
  "TR",
  "TT",
  "TV",
  "TW",
  "TZ",
  "UA",
  "UG",
  "US",
  "UY",
  "UZ",
  "VA",
  "VC",
  "VE",
  "VG",
  "VN",
  "VU",
  "WF",
  "WS",
  "XK",
  "YE",
  "YT",
  "ZA",
  "ZM",
  "ZW",
  "ZZ",
];

// Endpoint to create checkout session
app.post("/create-checkout-session", async (req, res) => {
  const { products, country, countryCode } = req.body;

  // Validate products
  if (!products || !Array.isArray(products)) {
    console.error("Invalid products format");
    return res.status(400).json({ error: "Invalid products format" });
  }

  // Validate country and countryCode
  if (!country || !countryCode) {
    console.error("Country and country code are required");
    return res
      .status(400)
      .json({ error: "Country and country code are required" });
  }

  // Check if country code is supported
  if (!STRIPE_SUPPORTED_COUNTRIES.includes(countryCode)) {
    console.error(`Country code ${countryCode} is not supported`);
    return res
      .status(400)
      .json({ error: `Country code ${countryCode} is not supported` });
  }

  try {
    console.log("Products:", products);
    console.log("Country:", country);
    console.log("Country Code:", countryCode);

    const lineItems = await Promise.all(
      products
        .filter((product) => product.quantity > 0)
        .map(async (product) => {
          console.log(`Fetching prices for product: ${product.id}`);
          const prices = await stripe.prices.list({ product: product.id });
          if (!prices.data || prices.data.length === 0) {
            throw new Error(`No prices found for product ${product.id}`);
          }
          let priceId;
          if (product.paymentType === "subscription") {
            const [interval_count, interval] = product.frequency.split("_");
            const singularInterval =
              parseInt(interval_count) > 1 ? interval.slice(0, -1) : interval;
            const price = prices.data.find(
              (price) =>
                price.recurring &&
                price.recurring.interval === singularInterval &&
                price.recurring.interval_count === parseInt(interval_count)
            );
            if (!price) {
              throw new Error(
                `No matching recurring price found for product ${product.id} with frequency ${product.frequency}`
              );
            }
            priceId = price.id;
          } else {
            priceId = prices.data.find((price) => !price.recurring).id;
          }
          console.log(`Found price ID for product ${product.id}: ${priceId}`);

          return {
            price: priceId,
            quantity: product.quantity,
            adjustable_quantity: {
              enabled: true,
              minimum: 0,
              maximum: 999,
            },
          };
        })
    );

    console.log("Line Items:", lineItems);

    const hasSubscription = products.some(
      (product) => product.paymentType === "subscription"
    );
    const mode = hasSubscription ? "subscription" : "payment";

    let sessionParams = {
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: mode,
      success_url: "https://www.empowder.com/order-complete",
      cancel_url: "https://www.empowder.com",
      allow_promotion_codes: true,
      shipping_address_collection: {
        allowed_countries: Object.keys(SHIPPING_RATES).filter((code) =>
          STRIPE_SUPPORTED_COUNTRIES.includes(code)
        ),
      },
    };

    if (mode === "subscription") {
      sessionParams.subscription_data = {
        items: lineItems
          .filter((item) =>
            products.find(
              (product) =>
                product.id === item.price &&
                product.paymentType === "subscription"
            )
          )
          .map((item) => ({
            price: item.price,
            quantity: item.quantity,
          })),
      };
    }

    if (mode === "payment") {
      const hasFreeShippingProduct = products.some((p) =>
        ["prod_Q3ZEOEhS6BKHPB", "prod_Q3Z7kbxV4sI41w"].includes(p.id)
      );
      const quantityProd1 = products
        .filter((p) => p.id === "prod_PyP0RUcPHiIPaT")
        .reduce((acc, p) => acc + p.quantity, 0);
      const quantityProd2 = products
        .filter((p) => p.id === "prod_PyOzSDkacbJWSa")
        .reduce((acc, p) => acc + p.quantity, 0);
      const totalQuantity = quantityProd1 + quantityProd2;

      let shippingRate;
      if (countryCode === "DE" && hasFreeShippingProduct) {
        // Kostenloser Versand, wenn es ein Produkt mit kostenlosem Versand gibt
        shippingRate = FREE_SHIPPING_RATE_ID;
      } else if (countryCode === "DE" && totalQuantity >= 8) {
        // Kostenloser Versand ab 8 Packungen nur in Deutschland
        shippingRate = FREE_SHIPPING_RATE_ID;
      } else {
        // Standard-Versandrate oder länderspezifische Versandrate
        shippingRate = SHIPPING_RATES[countryCode] || STANDARD_SHIPPING_RATE_ID;
      }

      sessionParams.shipping_options = [
        {
          shipping_rate: shippingRate,
        },
      ];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log(session);

    console.log(`Checkout session created: ${session.id}`);
    res.json({ id: session.id });
  } catch (error) {
    console.error(`Error creating checkout session: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
