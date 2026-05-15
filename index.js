const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
const { MessagingResponse } = twilio.twiml;
const sessions = {};

const CONFIG = {
  businessName: "Balaji Travels",
  ownerPhone: "+91 98765 43210",
  advancePercent: 30,
  rates: {
    "1": { label: "💒 Wedding Booking", perCar: 3500 },
    "2": { label: "🎉 Event Booking", perCar: 2500 },
    "3": { label: "🏖️ Outstation/Tour", perCar: 4500 },
    "4": { label: "🏙️ Local/City Drop", perCar: 1500 },
  },
};

function getReply(state, booking) {
  const r = CONFIG.rates[booking?.type];
  switch (state) {
    case "TYPE":
      return `Namaste! 🙏 *${CONFIG.businessName}* mein swagat hai!\n\nBooking type chunein:\n1️⃣ 💒 Wedding Booking\n2️⃣ 🎉 Event Booking\n3️⃣ 🏖️ Outstation/Tour\n4️⃣ 🏙️ Local/City Drop\n\nNumber type karein (1, 2, 3 ya 4)`;
    case "DATE":
      return `*${r.label}* ke liye booking! 🎊\n\n📅 *Date* bataein:\n(Format: DD/MM/YYYY, jaise: 15/06/2025)`;
    case "TIME":
      return `✅ Date: *${booking.date}*\n\n⏰ *Time* bataein:\n(Jaise: 10:00 AM)`;
    case "CARS":
      return `✅ Time: *${booking.time}*\n\n🚗 Kitni *gaadiyaan* chahiye?\n(Sirf number likhein)`;
    case "PICKUP":
      return `✅ Cars: *${booking.cars}*\n\n📍 *Pick-up location* bataein:`;
    case "DROP":
      return `✅ Pick-up: *${booking.pickup}*\n\n🏁 *Drop location* bataein:`;
    case "CONFIRM": {
      const total = r.perCar * booking.cars;
      const adv = Math.round(total * CONFIG.advancePercent / 100);
      return `📋 *Booking Summary*\n──────────────\n${r.label}\n📅 ${booking.date} | ⏰ ${booking.time}\n🚘 Cars: ${booking.cars}\n📍 ${booking.pickup} → ${booking.drop}\n──────────────\n💰 Total: ₹${total.toLocaleString("en-IN")}\n💳 Advance (30%): ₹${adv.toLocaleString("en-IN")}\n──────────────\n\nConfirm? *YES* ya *NO* type karein`;
    }
    case "DONE":
      return `🎉 *Booking Confirmed!*\n\nHumari team jald call karegi.\n📞 ${CONFIG.ownerPhone}\n\nNayi booking ke liye "Hi" type karein 😊`;
    case "RESTART":
      return `Booking cancel ho gayi.\nNayi booking ke liye "Hi" type karein 😊`;
    default:
      return `"Hi" type karke shuru karein.`;
  }
}

app.post("/webhook", (req, res) => {
  const from = req.body.From;
  const input = (req.body.Body || "").trim();
  if (!sessions[from]) sessions[from] = { state: "TYPE", booking: {} };
  let { state, booking } = sessions[from];
  if (["hi","hello","start","namaste","helo"].includes(input.toLowerCase())) {
    state = "TYPE"; booking = {};
  } else {
    if (state === "TYPE") {
      if (["1","2","3","4"].includes(input)) { booking.type = input; state = "DATE"; }
    } else if (state === "DATE") {
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(input)) { booking.date = input; state = "TIME"; }
    } else if (state === "TIME") {
      booking.time = input; state = "CARS";
    } else if (state === "CARS") {
      const n = parseInt(input);
      if (!isNaN(n) && n > 0) { booking.cars = n; state = "PICKUP"; }
    } else if (state === "PICKUP") {
      booking.pickup = input; state = "DROP";
    } else if (state === "DROP") {
      booking.drop = input; state = "CONFIRM";
    } else if (state === "CONFIRM") {
      if (input.toUpperCase() === "YES") state = "DONE";
      else if (input.toUpperCase() === "NO") state = "RESTART";
    } else { state = "TYPE"; booking = {}; }
  }
  sessions[from] = { state, booking };
  const twiml = new MessagingResponse();
  twiml.message(getReply(state, booking));
  res.type("text/xml").send(twiml.toString());
});

app.get("/", (req, res) => res.send("VK Travels Bot Running! 🚗"));
app.listen(3000, () => console.log("Bot live! 🚀"));
