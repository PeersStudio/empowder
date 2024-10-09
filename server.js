require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const Stripe = require("stripe");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// CORS configuration
app.use(cors());
app.use(bodyParser.json());

const FREE_SHIPPING_RATE_ID = "shr_1Q7ehDRtlGIboCBeb7MQYoDp"; // Kostenloser Versand

const SHIPPING_RATES = {
  DE: "shr_1PnyAqRtlGIboCBe0toAlZz2", // Deutschland
};

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
  const { products, country, countryCode, customerEmail } = req.body;

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

    const hasSubscriptionStarterKit = products.some(
      (product) => product.id === "prod_QzeKZuNUPtw8sT"
    );

    let sessionParams;

    if (hasSubscriptionStarterKit) {
      // Preise für das Starterkit und Abo-Produkt abrufen
      const starterKitPrices = await stripe.prices.list({
        product: "prod_QzeKZuNUPtw8sT",
      });
      const subscriptionPrices = await stripe.prices.list({
        product: "prod_QeOzW9DQaxaFNe",
      });

      // Sicherstellen, dass Preise gefunden wurden
      if (!starterKitPrices.data.length || !subscriptionPrices.data.length) {
        throw new Error("Prices for Starterkit or Subscription not found");
      }

      const starterKitPrice = starterKitPrices.data[0].id;
      const subscriptionPrice = subscriptionPrices.data[0].id;

      // Kunden erstellen
      const customer = await stripe.customers.create({ email: customerEmail });

      // Subscription Schedule erstellen
      const subscriptionSchedule = await stripe.subscriptionSchedules.create({
        customer: customer.id,
        start_date: "now",
        end_behavior: "release",
        phases: [
          {
            items: [
              {
                price: starterKitPrice,
                quantity: 1,
              },
            ],
            iterations: 1, // Starterkit wird einmal versendet
          },
          {
            items: [
              {
                price: subscriptionPrice,
                quantity: 1,
              },
            ],
            iterations: 12, // Ab dem zweiten Monat beginnt das Pulver-Abo
          },
        ],
      });

      // Checkout-Session für das Subscription Schedule erstellen
      sessionParams = {
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [
          {
            price: starterKitPrice,
            quantity: 1,
          },
        ],
        success_url: "https://www.empowder.eu/order-complete",
        cancel_url: "https://www.empowder.eu/cancel",
        customer_email: customerEmail,
        subscription_data: {
          subscription_schedule: subscriptionSchedule.id,
        },
      };
    } else {
      // Normale Checkout-Logik für Produkte ohne Subscription
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const prices = await stripe.prices.list({ product: product.id });
          if (!prices.data.length) {
            throw new Error(`No prices found for product ${product.id}`);
          }
          const priceId = prices.data.find((price) => !price.recurring).id;
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

      sessionParams = {
        payment_method_types: ["card"],
        mode: "payment",
        line_items: lineItems,
        success_url: "https://www.empowder.eu/order-complete",
        cancel_url: "https://www.empowder.eu/cancel",
        customer_email: customerEmail,
        shipping_options: [
          {
            shipping_rate: FREE_SHIPPING_RATE_ID,
          },
        ],
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ id: session.id });
  } catch (error) {
    console.error(`Error creating checkout session: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
