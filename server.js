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

app.post("/create-checkout-session", async (req, res) => {
  const { products, customerEmail, country, countryCode } = req.body;

  try {
    const lineItems = await Promise.all(
      products.map(async (product) => {
        console.log(`Fetching prices for product: ${product.id}`);
        
        // Preise für das Produkt abrufen
        const prices = await stripe.prices.list({ product: product.id });

        if (!prices.data || prices.data.length === 0) {
          throw new Error(`No prices found for product ${product.id}`);
        }

        let priceId;

        // Überprüfen, ob es sich um eine Subscription handelt
        if (product.paymentType === "subscription") {
          // Abonnementpreis finden basierend auf der Frequenz
          const [interval_count, interval] = product.frequency.split("_");
          const singularInterval = interval_count > 1 ? interval.slice(0, -1) : interval;
          
          const subscriptionPrice = prices.data.find((price) => 
            price.recurring && 
            price.recurring.interval === singularInterval && 
            price.recurring.interval_count === parseInt(interval_count)
          );

          if (!subscriptionPrice) {
            throw new Error(`No matching recurring price found for product ${product.id} with frequency ${product.frequency}`);
          }

          priceId = subscriptionPrice.id;

        } else {
          // Einmalige Preis-ID
          priceId = prices.data.find((price) => !price.recurring).id;
        }

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

    const mode = products.some((product) => product.paymentType === "subscription") ? "subscription" : "payment";

    let sessionParams = {
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: mode,
      success_url: "https://www.yourwebsite.com/order-complete",
      cancel_url: "https://www.yourwebsite.com/cancel",
      customer_email: customerEmail,
      allow_promotion_codes: true,
    };

    if (mode === "subscription") {
      // Handling for subscriptions (adding trial period, etc.)
      sessionParams.subscription_data = {
        trial_period_days: 30, // Set a trial period if applicable
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
