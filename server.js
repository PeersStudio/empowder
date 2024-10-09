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

// Verwende raw bodyParser NUR für den Webhook
app.post("/webhook", bodyParser.raw({ type: "application/json" }));

// Verwende JSON-Parser für alle anderen Routen
app.use(bodyParser.json());

const FREE_SHIPPING_RATE_ID = "shr_1Q7ehDRtlGIboCBeb7MQYoDp"; // Kostenloser Versand

// Preis-IDs für die Produkte
const PRICE_MAP = {
  prod_QfIkk0NfzHXl3Y: "price_1Q803tRtlGIboCBe8hal7UCp", // Einmalkauf
  prod_QeOzW9DQaxaFNe: "price_1Pn6BrRtlGIboCBeLcku9Xvt", // Subscription
  prod_QzwSTkTVrgHIrI: "price_1Q7wZFRtlGIboCBe3GzHk9do", // Starterkit (Einmalkauf)
  prod_QzwRUGBqnSUkMj: "price_1Q7wYxRtlGIboCBeerp8fgS8",
  prod_Qv3UQUqtKyynIk: "price_1Q7zTDRtlGIboCBedcBWpnbO",
  prod_QzeKZuNUPtw8sT: "price_1Q806nRtlGIboCBeBEAGgyHT"
};

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

    const lineItems = products
      .filter((product) => product.quantity > 0)
      .map((product) => {
        const priceId = PRICE_MAP[product.id];
        if (!priceId) {
          throw new Error(`No price found for product ${product.id}`);
        }
        return {
          price: priceId,
          quantity: product.quantity,
        };
      });

    const hasStarterKit = products.some(
      (product) => product.id === "prod_QzwSTkTVrgHIrI"
    );

    let sessionParams;

    if (hasStarterKit) {
      // Erstelle Checkout-Session für das Starterkit als Einmalkauf
      sessionParams = {
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price: PRICE_MAP["prod_QzeKZuNUPtw8sT"],
            quantity: 1,
          },
        ],
        customer_creation: "always",
        billing_address_collection: "required", // Rechnungsadresse abfragen
        shipping_address_collection: {
          allowed_countries: STRIPE_SUPPORTED_COUNTRIES, // Versandadresse abfragen
        },
        success_url:
          "https://www.empowder.eu/order-complete",
        cancel_url: "https://www.empowder.eu/",
        customer_email: customerEmail,
        shipping_options: [
          {
            shipping_rate: FREE_SHIPPING_RATE_ID,
          },
        ],
      };
    } else {
      // Standard-Checkout-Logik für Einmalkäufe und Subscriptions
      const hasSubscription = products.some(
        (product) => product.paymentType === "subscription"
      );
      const mode = hasSubscription ? "subscription" : "payment";

      sessionParams = {
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: mode,
        customer_creation: "always",
        billing_address_collection: "required", // Rechnungsadresse abfragen
        shipping_address_collection: {
          allowed_countries: STRIPE_SUPPORTED_COUNTRIES, // Versandadresse abfragen
        },
        success_url: "https://www.empowder.eu/order-complete",
        cancel_url: "https://www.empowder.eu/",
        customer_email: customerEmail,
      };

      if (mode === "payment") {
        sessionParams.shipping_options = [
          {
            shipping_rate: FREE_SHIPPING_RATE_ID,
          },
        ];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    console.log(`Checkout session created: ${session.id}`);
    res.json({ id: session.id });
  } catch (error) {
    console.error(`Error creating checkout session: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// Webhook to handle subscription scheduling after successful payment
app.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_ENDPOINT_SECRET;

  let event;

  try {
    // Verwende den rohen Datenstrom für die Signaturprüfung
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`⚠️  Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const customerId = session.customer;

    // Erstelle die Subscription Schedule für den zweiten Monat
    try {
      await stripe.subscriptionSchedules.create({
        customer: customerId,
        start_date: "now",
        end_behavior: "release",
        phases: [
          {
            items: [
              {
                price: PRICE_MAP["prod_QeOzW9DQaxaFNe"],
                quantity: 1,
              },
            ],
            iterations: 12,
          },
        ],
      });

      console.log(`Subscription schedule created for customer: ${customerId}`);
    } catch (error) {
      console.error(`Error creating subscription schedule: ${error.message}`);
    }
  }

  res.json({ received: true });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
