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

const SHIPPING_RATES = {
  DE: "shr_1PnyAqRtlGIboCBe0toAlZz2", // Deutschland
};

const FREE_SHIPPING_RATE_ID = "shr_1Q7ehDRtlGIboCBeb7MQYoDp"; // Dummy ID für kostenlosen Versand

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

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.post("/create-checkout-session", async (req, res) => {
  const { products, customerEmail } = req.body;

  try {
    // Prüfen, ob das Starterkit als Subscription ausgewählt wurde
    const hasSubscriptionStarterKit = products.some(
      (product) => product.id === "prod_QzeKZuNUPtw8sT"
    );

    let session;

    if (hasSubscriptionStarterKit) {
      // Subscription Schedule erstellen
      const subscriptionSchedule = await stripe.subscriptionSchedules.create({
        customer: "cus_example", // Hier die Kunden-ID einfügen
        start_date: "now",
        end_behavior: "release",
        phases: [
          {
            items: [
              {
                price: "price_id_of_starter_kit", // Preis-ID des Starterkits
                quantity: 1,
              },
            ],
            iterations: 1,
          },
          {
            items: [
              {
                price: "price_id_of_powder_subscription", // Preis-ID des Pulvers
                quantity: 1,
              },
            ],
            iterations: 12,
          },
        ],
      });

      // Checkout-Session für das Subscription Schedule erstellen
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "subscription",
        line_items: [
          {
            price: "price_id_of_starter_kit", // Zeigt das Starterkit im Checkout an
            quantity: 1,
          },
        ],
        success_url: "https://www.yourwebsite.com/order-complete",
        cancel_url: "https://www.yourwebsite.com/cancel",
        customer_email: customerEmail,
        subscription_data: {
          subscription_schedule: subscriptionSchedule.id,
        },
      });
    } else {
      // Normaler Checkout für Einzelprodukte
      const lineItems = products.map((product) => ({
        price: product.priceId, // Preis-ID des Produkts
        quantity: product.quantity,
      }));

      // Checkout-Session für Einzelprodukte erstellen
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: lineItems,
        success_url: "https://www.yourwebsite.com/order-complete",
        cancel_url: "https://www.yourwebsite.com/cancel",
        customer_email: customerEmail,
      });
    }

    res.json({ id: session.id });
  } catch (error) {
    console.error("Fehler beim Erstellen der Checkout-Session:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
